import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Alert,
  TouchableOpacity, TextInput, Keyboard, Platform, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { Card, CardTitle, CardSubtitle, Button, Badge, RoomMapView } from '../components';
import { roomsApi } from '../api';

const GAME_TYPE_SHORT = {
  texas_holdem: "NL Hold'em",
  pot_limit_omaha: 'PLO',
  omaha_hi_lo: 'O8',
  stud: 'Stud',
  mixed: 'Mixed',
  other: 'Other',
};

const GAME_TYPE_FILTERS = [
  { label: 'All', value: null },
  { label: "Hold'em", value: 'texas_holdem' },
  { label: 'PLO', value: 'pot_limit_omaha' },
  { label: 'O8', value: 'omaha_hi_lo' },
  { label: 'Stud', value: 'stud' },
  { label: 'Mixed', value: 'mixed' },
  { label: 'Other', value: 'other' },
];

const FORMAT_FILTERS = [
  { label: 'All', value: null },
  { label: 'Cash', value: 'cash' },
  { label: 'Tournament', value: 'tournament' },
];

const STAKES_FILTERS = [
  { label: 'Any', value: null },
  { label: 'Micro ($0-$25)', value: { min: 0, max: 25 } },
  { label: 'Low ($25-$100)', value: { min: 25, max: 100 } },
  { label: 'Mid ($100-$500)', value: { min: 100, max: 500 } },
  { label: 'High ($500+)', value: { min: 500, max: null } },
];

const formatGameTag = (room) => {
  const parts = [];
  if (room.blind_structure) parts.push(room.blind_structure);
  if (room.game_type) parts.push(GAME_TYPE_SHORT[room.game_type] || room.game_type);
  if (room.max_players) parts.push(`${room.max_players}-max`);
  if (room.game_format) parts.push(room.game_format === 'cash' ? 'Cash' : 'Tournament');
  return parts.length > 0 ? parts.join(' \u00B7 ') : null;
};

const getTimeUntil = (dateStr) => {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (ms <= 0) return 'Starting soon';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return `Starts in ${days} days`;
  }
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
};

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
  { label: '25 km', value: 25000 },
  { label: '50 km', value: 50000 },
  { label: '100 km', value: 100000 },
];

const SEARCH_MODES = {
  GPS: 'gps',
  ADDRESS: 'address',
};

const VIEW_MODES = {
  LIST: 'list',
  MAP: 'map',
};

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const SearchScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [searchMode, setSearchMode] = useState(SEARCH_MODES.GPS);
  const [viewMode, setViewMode] = useState(VIEW_MODES.MAP);

  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [searchAddress, setSearchAddress] = useState('');
  const [radius, setRadius] = useState(10000);

  // Filter state
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterGameType, setFilterGameType] = useState(null);
  const [filterFormat, setFilterFormat] = useState(null);
  const [filterStakes, setFilterStakes] = useState(null);
  const [filterHasSeats, setFilterHasSeats] = useState(false);

  // Map state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchExpanded, setSearchExpanded] = useState(true);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterGameType) count++;
    if (filterFormat) count++;
    if (filterStakes) count++;
    if (filterHasSeats) count++;
    return count;
  }, [filterGameType, filterFormat, filterStakes, filterHasSeats]);

  const clearFilters = () => {
    setFilterGameType(null);
    setFilterFormat(null);
    setFilterStakes(null);
    setFilterHasSeats(false);
  };

  const buildFilterParams = () => {
    const params = {};
    if (filterGameType) params.game_type = filterGameType;
    if (filterFormat) params.game_format = filterFormat;
    if (filterStakes) {
      if (filterStakes.min != null) params.buy_in_min = filterStakes.min;
      if (filterStakes.max != null) params.buy_in_max = filterStakes.max;
    }
    if (filterHasSeats) params.has_seats = true;
    return params;
  };

  const getLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setLocationError('Location permission denied');
        Alert.alert('Permission Denied', 'Please enable location permissions to search nearby rooms.');
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };

      setLocation(coords);
      return coords;
    } catch (err) {
      setLocationError('Could not get location');
      Alert.alert('Error', 'Could not get your location. Please try again.');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const searchByCoords = async (coords) => {
    setLoading(true);
    setHasSearched(true);

    try {
      const data = await roomsApi.list({
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius,
        limit: 50,
        ...buildFilterParams(),
      });
      const scheduledRooms = data
        .filter((room) => room.status === 'scheduled')
        .sort((a, b) => {
          if (a.scheduled_at && b.scheduled_at) return new Date(a.scheduled_at) - new Date(b.scheduled_at);
          if (a.scheduled_at) return -1;
          if (b.scheduled_at) return 1;
          return 0;
        });
      setRooms(scheduledRooms);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to search rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const searchByAddress = async () => {
    if (!searchAddress || searchAddress.trim().length < 2) {
      Alert.alert('Error', 'Please enter a valid address, city, or zipcode');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      try {
        const geocoded = await Location.geocodeAsync(searchAddress.trim());
        if (geocoded.length > 0) {
          setLocation({
            latitude: geocoded[0].latitude,
            longitude: geocoded[0].longitude,
          });
        }
      } catch {}

      const data = await roomsApi.list({
        address: searchAddress.trim(),
        radius,
        limit: 50,
        ...buildFilterParams(),
      });
      const scheduledRooms = data
        .filter((room) => room.status === 'scheduled')
        .sort((a, b) => {
          if (a.scheduled_at && b.scheduled_at) return new Date(a.scheduled_at) - new Date(b.scheduled_at);
          if (a.scheduled_at) return -1;
          if (b.scheduled_at) return 1;
          return 0;
        });
      setRooms(scheduledRooms);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to search rooms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (searchMode === SEARCH_MODES.GPS && !location) {
        getLocation();
      }
    }, [searchMode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (searchMode === SEARCH_MODES.ADDRESS) {
      await searchByAddress();
    } else {
      const coords = location || (await getLocation());
      if (coords) {
        await searchByCoords(coords);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleSearch = async () => {
    Keyboard.dismiss();
    if (viewMode === VIEW_MODES.MAP) {
      setSearchExpanded(false);
    }
    setSelectedRoom(null);

    if (searchMode === SEARCH_MODES.ADDRESS) {
      await searchByAddress();
    } else {
      const coords = location || (await getLocation());
      if (coords) {
        await searchByCoords(coords);
      }
    }
  };

  const renderRoom = ({ item }) => {
    const timeUntil = getTimeUntil(item.scheduled_at);
    const gameTag = formatGameTag(item);
    return (
      <Card onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}>
        <View style={styles.cardHeader}>
          <CardTitle>{item.name}</CardTitle>
          <Badge text={item.status} variant={item.status} />
        </View>
        {gameTag && (
          <View style={styles.gameTagRow}>
            <Text style={styles.gameTagText}>{gameTag}</Text>
          </View>
        )}
        {timeUntil && (
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleText}>{timeUntil}</Text>
            {item.scheduled_at && (
              <Text style={styles.scheduleDateText}>
                {new Date(item.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                {' '}
                {new Date(item.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            )}
          </View>
        )}
        {item.skill_level && (
          <Badge text={item.skill_level} variant={item.skill_level} style={styles.skillBadge} />
        )}
        <CardSubtitle>
          {item.max_players
            ? `${item.member_count ?? 0}/${item.max_players} players`
            : `${item.member_count ?? 0} players`}
          {item.buy_in_info && ` \u2022 ${item.buy_in_info}`}
        </CardSubtitle>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        {item.distance_meters && (
          <Text style={styles.distance}>
            {item.distance_meters < 1000
              ? `${Math.round(item.distance_meters)} m away`
              : `${(item.distance_meters / 1000).toFixed(1)} km away`}
          </Text>
        )}
      </Card>
    );
  };

  const renderSearchControls = () => {
    if (viewMode === VIEW_MODES.MAP && !searchExpanded) {
      return (
        <TouchableOpacity
          style={styles.compactSearch}
          onPress={() => setSearchExpanded(true)}
        >
          <View style={styles.compactSearchContent}>
            <Text style={styles.compactSearchIcon}>
              {searchMode === SEARCH_MODES.GPS ? '📍' : '🔍'}
            </Text>
            <View style={styles.compactSearchTextContainer}>
              <Text style={styles.compactSearchText} numberOfLines={1}>
                {searchMode === SEARCH_MODES.ADDRESS
                  ? searchAddress || 'Search by address'
                  : location
                    ? 'Near your location'
                    : 'Enable GPS'}
              </Text>
              <Text style={styles.compactSearchRadius}>
                {radius / 1000} km • {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                {activeFilterCount > 0 ? ` • ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            <Text style={styles.compactSearchExpand}>Edit</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.searchContainer}>
        {/* Search Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, searchMode === SEARCH_MODES.GPS && styles.modeButtonActive]}
            onPress={() => setSearchMode(SEARCH_MODES.GPS)}
          >
            <Text style={[styles.modeButtonText, searchMode === SEARCH_MODES.GPS && styles.modeButtonTextActive]}>
              GPS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, searchMode === SEARCH_MODES.ADDRESS && styles.modeButtonActive]}
            onPress={() => setSearchMode(SEARCH_MODES.ADDRESS)}
          >
            <Text style={[styles.modeButtonText, searchMode === SEARCH_MODES.ADDRESS && styles.modeButtonTextActive]}>
              Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* GPS Mode */}
        {searchMode === SEARCH_MODES.GPS && (
          <TouchableOpacity
            style={[styles.locationBox, location && styles.locationBoxSuccess]}
            onPress={getLocation}
            disabled={locationLoading}
          >
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Your Location</Text>
              {locationLoading ? (
                <Text style={styles.locationText}>Getting location...</Text>
              ) : location ? (
                <Text style={styles.locationTextSuccess}>Location acquired</Text>
              ) : (
                <Text style={styles.locationTextError}>
                  {locationError || 'Tap to enable location'}
                </Text>
              )}
            </View>
            <Button
              title={location ? 'Refresh' : 'Enable'}
              onPress={getLocation}
              variant={location ? 'secondary' : 'primary'}
              loading={locationLoading}
              style={styles.locationButton}
            />
          </TouchableOpacity>
        )}

        {/* Address Mode */}
        {searchMode === SEARCH_MODES.ADDRESS && (
          <View style={styles.addressContainer}>
            <TextInput
              style={styles.addressInput}
              placeholder='City, zipcode, or address...'
              placeholderTextColor="#999"
              value={searchAddress}
              onChangeText={setSearchAddress}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
        )}

        {/* Radius */}
        <View style={styles.radiusRow}>
          <Text style={styles.radiusLabel}>Radius:</Text>
          <View style={styles.radiusPicker}>
            <Picker
              selectedValue={radius}
              onValueChange={(value) => setRadius(value)}
              style={styles.picker}
            >
              {RADIUS_OPTIONS.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        <Button
          title="Search"
          onPress={handleSearch}
          loading={loading}
          disabled={
            searchMode === SEARCH_MODES.GPS
              ? !location || locationLoading
              : !searchAddress || searchAddress.trim().length < 2
          }
          style={styles.searchButton}
        />

        {/* Filter toggle */}
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setFiltersVisible(!filtersVisible)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterToggleText}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
          <Text style={styles.filterToggleChevron}>
            {filtersVisible ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>

        {filtersVisible && (
          <View style={styles.filtersContainer}>
            {/* Game Type */}
            <Text style={styles.filterLabel}>Game Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {GAME_TYPE_FILTERS.map((opt) => (
                <FilterChip
                  key={String(opt.value)}
                  label={opt.label}
                  active={filterGameType === opt.value}
                  onPress={() => setFilterGameType(opt.value)}
                />
              ))}
            </ScrollView>

            {/* Format */}
            <Text style={styles.filterLabel}>Format</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {FORMAT_FILTERS.map((opt) => (
                <FilterChip
                  key={String(opt.value)}
                  label={opt.label}
                  active={filterFormat === opt.value}
                  onPress={() => setFilterFormat(opt.value)}
                />
              ))}
            </ScrollView>

            {/* Stakes */}
            <Text style={styles.filterLabel}>Stakes Range</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {STAKES_FILTERS.map((opt, i) => (
                <FilterChip
                  key={i}
                  label={opt.label}
                  active={filterStakes === opt.value}
                  onPress={() => setFilterStakes(opt.value)}
                />
              ))}
            </ScrollView>

            {/* Availability */}
            <TouchableOpacity
              style={[styles.availabilityToggle, filterHasSeats && styles.availabilityToggleActive]}
              onPress={() => setFilterHasSeats(!filterHasSeats)}
              activeOpacity={0.7}
            >
              <Text style={[styles.availabilityText, filterHasSeats && styles.availabilityTextActive]}>
                Open seats only
              </Text>
              <View style={[styles.toggleIndicator, filterHasSeats && styles.toggleIndicatorActive]}>
                <Text style={styles.toggleCheck}>{filterHasSeats ? '✓' : ''}</Text>
              </View>
            </TouchableOpacity>

            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFilters}>
                <Text style={styles.clearFiltersText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Find Rooms</Text>
            <Text style={styles.subtitle}>Discover poker games near you</Text>
          </View>
          {/* Map/List toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === VIEW_MODES.MAP && styles.viewButtonActive]}
              onPress={() => { setViewMode(VIEW_MODES.MAP); setSelectedRoom(null); }}
            >
              <Text style={[styles.viewButtonText, viewMode === VIEW_MODES.MAP && styles.viewButtonTextActive]}>
                Map
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === VIEW_MODES.LIST && styles.viewButtonActive]}
              onPress={() => { setViewMode(VIEW_MODES.LIST); setSearchExpanded(true); }}
            >
              <Text style={[styles.viewButtonText, viewMode === VIEW_MODES.LIST && styles.viewButtonTextActive]}>
                List
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Controls */}
      {renderSearchControls()}

      {/* Results Info */}
      {hasSearched && !loading && viewMode === VIEW_MODES.LIST && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {rooms.length} scheduled room{rooms.length !== 1 ? 's' : ''} found within {radius / 1000} km
          </Text>
        </View>
      )}

      {/* Map View */}
      {viewMode === VIEW_MODES.MAP && (
        <RoomMapView
          rooms={rooms}
          userLocation={location}
          searchRadius={radius}
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
          onDeselectRoom={() => setSelectedRoom(null)}
          onRoomPress={(room) => navigation.navigate('RoomDetail', { roomId: room.id })}
        />
      )}

      {/* List View */}
      {viewMode === VIEW_MODES.LIST && (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            hasSearched && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No rooms found nearby</Text>
                <Text style={styles.emptySubtext}>
                  Try increasing the search radius or check back later
                </Text>
              </View>
            ) : !hasSearched && !loading ? (
              <View style={styles.prompt}>
                <Text style={styles.promptIcon}>🎯</Text>
                <Text style={styles.promptTitle}>Ready to find a game?</Text>
                <Text style={styles.promptSubtext}>
                  Enable location and tap "Search" to discover poker games in your area.
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1a1a2e',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 3,
  },
  viewButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: '#fff',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  viewButtonTextActive: {
    color: '#1a1a2e',
  },

  // Full search controls
  searchContainer: {
    backgroundColor: '#fff',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 3,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  addressContainer: {
    marginBottom: 10,
  },
  addressInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  locationBoxSuccess: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  locationTextSuccess: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  locationTextError: {
    fontSize: 13,
    color: '#e74c3c',
  },
  locationButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radiusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    width: 50,
  },
  radiusPicker: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  searchButton: {
    marginTop: 2,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4a90d9',
  },
  filterToggleChevron: {
    fontSize: 10,
    color: '#4a90d9',
    marginLeft: 6,
  },
  filtersContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 4,
  },
  chipRow: {
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#1a1a2e',
    borderColor: '#1a1a2e',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  availabilityToggleActive: {
    backgroundColor: '#e8f4fd',
    borderColor: '#4a90d9',
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  availabilityTextActive: {
    color: '#4a90d9',
    fontWeight: '600',
  },
  toggleIndicator: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIndicatorActive: {
    borderColor: '#4a90d9',
    backgroundColor: '#4a90d9',
  },
  toggleCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  clearFilters: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '500',
  },

  // Compact search bar (map mode, collapsed)
  compactSearch: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  compactSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactSearchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  compactSearchTextContainer: {
    flex: 1,
  },
  compactSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  compactSearchRadius: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  compactSearchExpand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90d9',
    paddingLeft: 12,
  },

  // Results info
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#e8f4fd',
  },
  resultsText: {
    fontSize: 13,
    color: '#4a90d9',
    fontWeight: '500',
  },

  // List styles
  list: {
    padding: 16,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gameTagRow: {
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  gameTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  scheduleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e67e22',
  },
  scheduleDateText: {
    fontSize: 12,
    color: '#4a90d9',
    fontWeight: '500',
  },
  skillBadge: {
    marginTop: 4,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  distance: {
    fontSize: 13,
    color: '#4a90d9',
    marginTop: 8,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  prompt: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  promptIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  promptSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

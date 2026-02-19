import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { Card, CardTitle, CardSubtitle, Button, Badge } from '../components';
import { roomsApi } from '../api';

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

export const SearchScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Search mode: 'gps' or 'address'
  const [searchMode, setSearchMode] = useState(SEARCH_MODES.GPS);
  
  // GPS location state
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Address search state
  const [searchAddress, setSearchAddress] = useState('');
  
  const [radius, setRadius] = useState(10000);

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
      
      // Debug logging
      console.log('=== USER LOCATION DEBUG ===');
      console.log('User Latitude:', coords.latitude);
      console.log('User Longitude:', coords.longitude);
      console.log('===========================');
      
      setLocation(coords);
      return coords;
    } catch (err) {
      console.error('Location error:', err);
      setLocationError('Could not get location');
      Alert.alert('Error', 'Could not get your location. Please try again.');
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  // Search by GPS coordinates
  const searchByCoords = async (coords) => {
    setLoading(true);
    setHasSearched(true);
    
    try {
      const params = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        radius: radius,
        limit: 50,
      };
      
      const data = await roomsApi.list(params);
      const scheduledRooms = data.filter(room => room.status === 'scheduled');
      
      console.log('=== GPS SEARCH DEBUG ===');
      console.log('Search params:', { lat: coords.latitude, lon: coords.longitude, radius });
      console.log('Total rooms found:', scheduledRooms.length);
      console.log('========================');
      
      setRooms(scheduledRooms);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to search rooms');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Search by address (geocoded on backend)
  const searchByAddress = async () => {
    if (!searchAddress || searchAddress.trim().length < 2) {
      Alert.alert('Error', 'Please enter a valid address, city, or zipcode');
      return;
    }
    
    setLoading(true);
    setHasSearched(true);
    
    try {
      const params = {
        address: searchAddress.trim(),
        radius: radius,
        limit: 50,
      };
      
      console.log('=== ADDRESS SEARCH DEBUG ===');
      console.log('Search params:', { address: searchAddress, radius });
      
      const data = await roomsApi.list(params);
      const scheduledRooms = data.filter(room => room.status === 'scheduled');
      
      console.log('Total rooms found:', scheduledRooms.length);
      console.log('============================');
      
      setRooms(scheduledRooms);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to search rooms');
      console.error(err);
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
      const coords = location || await getLocation();
      if (coords) {
        await searchByCoords(coords);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleSearch = async () => {
    if (searchMode === SEARCH_MODES.ADDRESS) {
      await searchByAddress();
    } else {
      const coords = location || await getLocation();
      if (coords) {
        await searchByCoords(coords);
      }
    }
  };

  const renderRoom = ({ item }) => (
    <Card onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}>
      <View style={styles.cardHeader}>
        <CardTitle>{item.name}</CardTitle>
        <Badge text={item.status} variant={item.status} />
      </View>
      {item.skill_level && (
        <Badge text={item.skill_level} variant={item.skill_level} style={styles.skillBadge} />
      )}
      <CardSubtitle>
        {item.max_players ? `Max ${item.max_players} players` : 'No player limit'}
        {item.buy_in_info && ` • ${item.buy_in_info}`}
      </CardSubtitle>
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.distance_meters && (
        <Text style={styles.distance}>
          📍 {item.distance_meters < 1000 
            ? `${Math.round(item.distance_meters)} m away`
            : `${(item.distance_meters / 1000).toFixed(1)} km away`}
        </Text>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find Rooms</Text>
        <Text style={styles.subtitle}>Discover poker games near you</Text>
      </View>

      <View style={styles.searchContainer}>
        {/* Search Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              searchMode === SEARCH_MODES.GPS && styles.modeButtonActive,
            ]}
            onPress={() => setSearchMode(SEARCH_MODES.GPS)}
          >
            <Text style={[
              styles.modeButtonText,
              searchMode === SEARCH_MODES.GPS && styles.modeButtonTextActive,
            ]}>
              📍 Use GPS
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              searchMode === SEARCH_MODES.ADDRESS && styles.modeButtonActive,
            ]}
            onPress={() => setSearchMode(SEARCH_MODES.ADDRESS)}
          >
            <Text style={[
              styles.modeButtonText,
              searchMode === SEARCH_MODES.ADDRESS && styles.modeButtonTextActive,
            ]}>
              🔍 Search Address
            </Text>
          </TouchableOpacity>
        </View>

        {/* GPS Location Mode */}
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
                <Text style={styles.locationTextSuccess}>✓ Location acquired</Text>
              ) : (
                <Text style={styles.locationTextError}>
                  {locationError || 'Tap to enable location'}
                </Text>
              )}
            </View>
            <Button
              title={location ? "Refresh" : "Enable"}
              onPress={getLocation}
              variant={location ? "secondary" : "primary"}
              loading={locationLoading}
              style={styles.locationButton}
            />
          </TouchableOpacity>
        )}

        {/* Address Search Mode */}
        {searchMode === SEARCH_MODES.ADDRESS && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressLabel}>Search Location</Text>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter city, zipcode, or address..."
              placeholderTextColor="#999"
              value={searchAddress}
              onChangeText={setSearchAddress}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <Text style={styles.addressHint}>
              Examples: "San Francisco", "90210", "123 Main St, NYC"
            </Text>
          </View>
        )}

        <View style={styles.radiusContainer}>
          <Text style={styles.radiusLabel}>Search Radius</Text>
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
          title={searchMode === SEARCH_MODES.ADDRESS ? "Search by Address" : "Search Nearby Rooms"}
          onPress={handleSearch}
          loading={loading}
          disabled={
            searchMode === SEARCH_MODES.GPS 
              ? (!location || locationLoading)
              : (!searchAddress || searchAddress.trim().length < 2)
          }
          style={styles.searchButton}
        />
      </View>

      {hasSearched && !loading && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {rooms.length} scheduled room{rooms.length !== 1 ? 's' : ''} found within {radius / 1000} km
          </Text>
        </View>
      )}

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
                Enable location and tap "Search Nearby Rooms" to discover scheduled poker games in your area.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  addressInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  addressHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    fontStyle: 'italic',
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
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
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  locationTextSuccess: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  locationTextError: {
    fontSize: 14,
    color: '#e74c3c',
  },
  locationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radiusContainer: {
    marginBottom: 12,
  },
  radiusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  radiusPicker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
  },
  searchButton: {
    marginTop: 4,
  },
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
  list: {
    padding: 16,
    flexGrow: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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

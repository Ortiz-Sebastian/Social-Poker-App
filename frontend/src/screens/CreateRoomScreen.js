import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { Button, Input, OptionSheet } from '../components';
import { roomsApi } from '../api';

const SKILL_LEVELS = [
  { label: 'Any skill level', value: null },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

const GAME_TYPES = [
  { label: 'Select game type', value: null },
  { label: "No-Limit Hold'em", value: 'texas_holdem' },
  { label: 'Pot-Limit Omaha', value: 'pot_limit_omaha' },
  { label: 'Omaha Hi-Lo', value: 'omaha_hi_lo' },
  { label: 'Stud', value: 'stud' },
  { label: 'Mixed Games', value: 'mixed' },
  { label: 'Other', value: 'other' },
];

const GAME_FORMATS = [
  { label: 'Cash Game', value: 'cash' },
  { label: 'Tournament', value: 'tournament' },
];

export const CreateRoomScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [buyInInfo, setBuyInInfo] = useState('');
  const [skillLevel, setSkillLevel] = useState(null);
  const [gameType, setGameType] = useState(null);
  const [gameFormat, setGameFormat] = useState('cash');
  const [blindStructure, setBlindStructure] = useState('');
  const [houseRules, setHouseRules] = useState('');
  const [scheduledAt, setScheduledAt] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Get current GPS location
  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions to use this feature.');
        return;
      }
      
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setLatitude(currentLocation.coords.latitude.toString());
      setLongitude(currentLocation.coords.longitude.toString());
      
      console.log('Room location set from GPS:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
      
      Alert.alert('Success', 'Location set from GPS!');
    } catch (err) {
      console.error('Location error:', err);
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Geocode address to coordinates
  const geocodeAddress = async () => {
    if (!address || address.trim().length < 5) {
      Alert.alert('Error', 'Please enter a valid address first');
      return;
    }
    
    setLocationLoading(true);
    try {
      const results = await Location.geocodeAsync(address);
      
      if (results && results.length > 0) {
        const { latitude: lat, longitude: lon } = results[0];
        
        setLatitude(lat.toString());
        setLongitude(lon.toString());
        
        console.log('Address geocoded:', {
          address: address,
          latitude: lat,
          longitude: lon,
        });
        
        Alert.alert('Success', 'Address converted to coordinates!');
      } else {
        Alert.alert('Not Found', 'Could not find coordinates for this address. Try a more specific address or use GPS.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      Alert.alert('Error', 'Failed to geocode address. Try using GPS instead.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Room name is required');
      return;
    }

    // Auto-geocode address if no coordinates but address exists
    let finalLat = latitude ? parseFloat(latitude) : null;
    let finalLon = longitude ? parseFloat(longitude) : null;

    if (!finalLat && !finalLon && address && address.trim().length >= 5) {
      setLoading(true);
      try {
        const results = await Location.geocodeAsync(address);
        if (results && results.length > 0) {
          finalLat = results[0].latitude;
          finalLon = results[0].longitude;
          console.log('Auto-geocoded on submit:', { address, lat: finalLat, lon: finalLon });
        }
      } catch (err) {
        console.error('Auto-geocode failed:', err);
      }
    }

    if (!finalLat || !finalLon) {
      Alert.alert(
        'No Location',
        'Your room needs a location to appear in searches. Use GPS or enter an address.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Anyway', onPress: () => createRoom(null, null) },
        ]
      );
      setLoading(false);
      return;
    }

    createRoom(finalLat, finalLon);
  };

  const createRoom = async (lat, lon) => {
    setLoading(true);
    try {
      let scheduledAtStr = null;
      if (scheduledAt) {
        const pad = (n) => String(n).padStart(2, '0');
        scheduledAtStr =
          `${scheduledAt.getFullYear()}-${pad(scheduledAt.getMonth() + 1)}-${pad(scheduledAt.getDate())}` +
          `T${pad(scheduledAt.getHours())}:${pad(scheduledAt.getMinutes())}:00`;
      }

      const roomData = {
        name,
        description: description || null,
        address: address || null,
        latitude: lat,
        longitude: lon,
        max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
        buy_in_info: buyInInfo || null,
        skill_level: skillLevel,
        game_type: gameType,
        game_format: gameFormat,
        blind_structure: blindStructure || null,
        house_rules: houseRules || null,
        scheduled_at: scheduledAtStr,
      };

      console.log('Creating room with data:', roomData);

      const room = await roomsApi.create(roomData);
      Alert.alert('Success', 'Room created!', [
        { text: 'OK', onPress: () => navigation.replace('RoomDetail', { roomId: room.id }) },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const hasLocation = latitude && longitude;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create a Room</Text>

      <Input
        label="Room Name *"
        value={name}
        onChangeText={setName}
        placeholder="Friday Night Poker"
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Casual game with friends..."
        multiline
      />

      {/* Location Section */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.sectionHint}>
          Required for your room to appear in nearby searches
        </Text>

        <Input
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St, San Francisco, CA"
        />

        <View style={styles.locationButtons}>
          <Button
            title="📍 Use GPS"
            onPress={useMyLocation}
            variant={hasLocation ? "secondary" : "primary"}
            loading={locationLoading}
            style={styles.locationBtn}
          />
          <Button
            title="🔍 Geocode Address"
            onPress={geocodeAddress}
            variant="secondary"
            loading={locationLoading}
            disabled={!address}
            style={styles.locationBtn}
          />
        </View>

        {hasLocation && (
          <View style={styles.locationConfirmed}>
            <Text style={styles.locationConfirmedText}>
              ✓ Location set ({parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)})
            </Text>
          </View>
        )}
      </View>

      {/* Schedule Section */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <Text style={styles.sectionHint}>
          When is the game happening?
        </Text>

        {scheduledAt ? (
          <View style={styles.scheduledInfo}>
            <View style={styles.scheduledDateTime}>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonLabel}>Date</Text>
                <Text style={styles.dateButtonValue}>
                  {scheduledAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.dateButtonLabel}>Time</Text>
                <Text style={styles.dateButtonValue}>
                  {scheduledAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={() => setScheduledAt(null)}
            >
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title="Set Date & Time"
            onPress={() => {
              const defaultDate = new Date();
              defaultDate.setHours(defaultDate.getHours() + 2);
              defaultDate.setMinutes(0, 0, 0);
              setScheduledAt(defaultDate);
              setShowDatePicker(true);
            }}
            variant="secondary"
          />
        )}

        {showDatePicker && (
          <DateTimePicker
            value={scheduledAt || new Date()}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) {
                const updated = new Date(scheduledAt || new Date());
                updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setScheduledAt(updated);
                if (Platform.OS !== 'ios') setShowTimePicker(true);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={scheduledAt || new Date()}
            mode="time"
            minuteInterval={15}
            onChange={(event, date) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (date) {
                const updated = new Date(scheduledAt || new Date());
                updated.setHours(date.getHours(), date.getMinutes(), 0, 0);
                setScheduledAt(updated);
              }
            }}
          />
        )}
      </View>

      {/* Game Details Section */}
      <View style={styles.locationSection}>
        <Text style={styles.sectionTitle}>Game Details</Text>
        <Text style={styles.sectionHint}>
          What kind of poker are you playing?
        </Text>

        <OptionSheet
          label="Game Type"
          options={GAME_TYPES}
          selectedValue={gameType}
          onValueChange={setGameType}
          placeholder="Select game type"
        />

        <Text style={styles.label}>Format</Text>
        <View style={styles.formatToggle}>
          {GAME_FORMATS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.formatButton,
                gameFormat === f.value && styles.formatButtonActive,
              ]}
              onPress={() => setGameFormat(f.value)}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  gameFormat === f.value && styles.formatButtonTextActive,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Blind Structure"
          value={blindStructure}
          onChangeText={setBlindStructure}
          placeholder="$1/$2"
        />

        <Input
          label="House Rules"
          value={houseRules}
          onChangeText={setHouseRules}
          placeholder="Straddle allowed, no rabbit hunting..."
          multiline
        />
      </View>

      <Input
        label="Max Players"
        value={maxPlayers}
        onChangeText={setMaxPlayers}
        placeholder="8"
        keyboardType="number-pad"
      />

      <Input
        label="Buy-in Info (informational only)"
        value={buyInInfo}
        onChangeText={setBuyInInfo}
        placeholder="$20-$50 friendly stakes"
      />

      <OptionSheet
        label="Skill Level"
        options={SKILL_LEVELS}
        selectedValue={skillLevel}
        onValueChange={setSkillLevel}
        placeholder="Any skill level"
      />

      <Button
        title="Create Room"
        onPress={handleCreate}
        loading={loading}
        style={styles.button}
      />

      <Button
        title="Cancel"
        onPress={() => navigation.goBack()}
        variant="secondary"
        style={styles.button}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 24,
  },
  locationSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  locationBtn: {
    flex: 1,
  },
  locationConfirmed: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
  },
  locationConfirmedText: {
    color: '#2e7d32',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  scheduledInfo: {
    gap: 8,
  },
  scheduledDateTime: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#e8f4fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateButtonLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  dateButtonValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  clearDateButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  clearDateText: {
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: '500',
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  formatButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formatButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#1a1a2e',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  button: {
    marginTop: 12,
  },
});

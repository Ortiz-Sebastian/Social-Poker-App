import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Location from 'expo-location';
import { Button, Input } from '../components';
import { roomsApi } from '../api';

const SKILL_LEVELS = [
  { label: 'Any skill level', value: null },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
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
      const roomData = {
        name,
        description: description || null,
        address: address || null,
        latitude: lat,
        longitude: lon,
        max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
        buy_in_info: buyInInfo || null,
        skill_level: skillLevel,
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

      <Text style={styles.label}>Skill Level</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={skillLevel}
          onValueChange={setSkillLevel}
          style={styles.picker}
        >
          {SKILL_LEVELS.map((level) => (
            <Picker.Item key={level.value} label={level.label} value={level.value} />
          ))}
        </Picker>
      </View>

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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
  },
  picker: {
    height: 50,
  },
  button: {
    marginTop: 12,
  },
});

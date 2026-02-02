import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
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

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Room name is required');
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        name,
        description: description || null,
        address: address || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        max_players: maxPlayers ? parseInt(maxPlayers, 10) : null,
        buy_in_info: buyInInfo || null,
        skill_level: skillLevel,
      };

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

      <Input
        label="Address"
        value={address}
        onChangeText={setAddress}
        placeholder="123 Main St, City"
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Latitude"
            value={latitude}
            onChangeText={setLatitude}
            placeholder="40.7128"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Longitude"
            value={longitude}
            onChangeText={setLongitude}
            placeholder="-74.0060"
            keyboardType="decimal-pad"
          />
        </View>
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
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    paddingHorizontal: 8,
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

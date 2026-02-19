import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, CardTitle, Button, Input } from '../components';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api';

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export const EditProfileScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [skillLevel, setSkillLevel] = useState(user?.skill_level || null);
  const [loading, setSaving] = useState(false);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        username: username.trim(),
        full_name: fullName.trim() || null,
        skill_level: skillLevel,
      };

      await usersApi.updateMe(updateData);
      await refreshUser();
      Alert.alert('Success', 'Profile updated!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Failed to update profile';
      Alert.alert('Error', detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card>
        <CardTitle>Edit Profile</CardTitle>

        <View style={styles.field}>
          <Text style={styles.label}>Username *</Text>
          <Input
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Full Name</Text>
          <Input
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Skill Level</Text>
          <View style={styles.skillRow}>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.skillChip,
                  skillLevel === level && styles.skillChipSelected,
                ]}
                onPress={() => setSkillLevel(skillLevel === level ? null : level)}
              >
                <Text
                  style={[
                    styles.skillChipText,
                    skillLevel === level && styles.skillChipTextSelected,
                  ]}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={styles.saveButton}
        />
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  field: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#eee',
  },
  skillChipSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#4a90d9',
  },
  skillChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  skillChipTextSelected: {
    color: '#4a90d9',
    fontWeight: '700',
  },
  saveButton: {
    marginTop: 24,
    marginBottom: 12,
  },
});

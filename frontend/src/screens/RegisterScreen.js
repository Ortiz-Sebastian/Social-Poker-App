import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Button, Input } from '../components';
import { useAuth } from '../context/AuthContext';

const SKILL_LEVELS = [
  { label: 'Select skill level (optional)', value: null },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];

export const RegisterScreen = ({ navigation }) => {
  const { register, error } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !username || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(email, username, password, skillLevel);
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.detail || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the PocketPoker community</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email *"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
        />

        <Input
          label="Username *"
          value={username}
          onChangeText={setUsername}
          placeholder="Choose a username"
        />

        <Input
          label="Password *"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
        />

        <Input
          label="Confirm Password *"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry
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

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          style={styles.button}
        />

        <Button
          title="Already have an account? Sign In"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    flex: 1,
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
  error: {
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 12,
  },
});

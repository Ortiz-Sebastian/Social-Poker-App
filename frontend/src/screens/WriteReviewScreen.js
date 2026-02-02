import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, CardTitle, Button, Input } from '../components';
import { roomsApi, reputationApi, joinRequestsApi } from '../api';
import { useAuth } from '../context/AuthContext';

export const WriteReviewScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoomData();
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      const roomData = await roomsApi.get(roomId);
      setRoom(roomData);
      
      // Get waitlist data which includes member info
      try {
        const waitlistData = await joinRequestsApi.getWaitlist(roomId);
        // In a real app, you'd have an endpoint to get all room members
        // For now, we'll show a simplified version
      } catch (err) {
        // Not host, that's fine
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load room data');
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      Alert.alert('Error', 'Please select a user to review');
      return;
    }
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await reputationApi.createReview(roomId, selectedUser, rating, comment || null);
      Alert.alert('Success', 'Review submitted!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = () => (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => setRating(star)}>
          <Text style={[styles.star, star <= rating && styles.starSelected]}>
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Card>
        <CardTitle>Write a Review</CardTitle>
        <Text style={styles.subtitle}>
          Room: {room?.name || `#${roomId}`}
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>User ID to Review *</Text>
          <Input
            value={selectedUser?.toString() || ''}
            onChangeText={(text) => setSelectedUser(text ? parseInt(text, 10) : null)}
            placeholder="Enter user ID"
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            Note: You can only review users who participated in this room.
            In a full app, you'd see a list of room participants here.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Rating *</Text>
          {renderStarSelector()}
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Tap to rate'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Comment (optional)</Text>
          <Input
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience..."
            multiline
          />
        </View>

        <Button
          title="Submit Review"
          onPress={handleSubmit}
          loading={loading}
          disabled={!selectedUser || rating === 0}
          style={styles.submitButton}
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
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  star: {
    fontSize: 40,
    color: '#ddd',
    marginHorizontal: 4,
  },
  starSelected: {
    color: '#f39c12',
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 12,
  },
});

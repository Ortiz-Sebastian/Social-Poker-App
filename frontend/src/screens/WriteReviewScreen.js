import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card, CardTitle, Button, Input, Badge } from '../components';
import { roomsApi, reputationApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

export const WriteReviewScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  useEffect(() => {
    loadRoomData();
  }, [roomId]);

  const loadRoomData = async () => {
    try {
      const roomData = await roomsApi.get(roomId);
      setRoom(roomData);

      const membersList = [];

      // Load room members
      try {
        const membersData = await roomsApi.getMembers(roomId);
        membersData.forEach((m) => {
          if (m.user_id !== user.id) {
            membersList.push({
              id: m.user_id,
              username: m.username,
              isHost: m.is_host,
            });
          }
        });
      } catch {
        // May not have access to members list
      }

      // If the host isn't in the members list and isn't the current user, add them
      if (roomData.host_id !== user.id) {
        const hostInList = membersList.some((m) => m.id === roomData.host_id);
        if (!hostInList) {
          try {
            const hostUser = await usersApi.get(roomData.host_id);
            membersList.unshift({
              id: hostUser.id,
              username: hostUser.username,
              isHost: true,
            });
          } catch {
            membersList.unshift({
              id: roomData.host_id,
              username: `User #${roomData.host_id}`,
              isHost: true,
            });
          }
        }
      }

      setParticipants(membersList);
    } catch (err) {
      Alert.alert('Error', 'Failed to load room data');
      navigation.goBack();
    } finally {
      setLoadingParticipants(false);
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
      await reputationApi.createReview(roomId, selectedUser.id, rating, comment || null);
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

        {/* Participant Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Select a participant to review *</Text>
          {loadingParticipants ? (
            <ActivityIndicator style={styles.participantLoading} color="#4a90d9" />
          ) : participants.length === 0 ? (
            <Text style={styles.hint}>No other participants found for this room.</Text>
          ) : (
            <View style={styles.participantList}>
              {participants.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.participantChip,
                    selectedUser?.id === p.id && styles.participantChipSelected,
                  ]}
                  onPress={() => setSelectedUser(selectedUser?.id === p.id ? null : p)}
                >
                  <Text
                    style={[
                      styles.participantName,
                      selectedUser?.id === p.id && styles.participantNameSelected,
                    ]}
                  >
                    {p.username}
                  </Text>
                  {p.isHost && (
                    <Text style={[
                      styles.hostLabel,
                      selectedUser?.id === p.id && styles.hostLabelSelected,
                    ]}>
                      Host
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Rating */}
        <View style={styles.section}>
          <Text style={styles.label}>Rating *</Text>
          {renderStarSelector()}
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} star${rating !== 1 ? 's' : ''}` : 'Tap to rate'}
          </Text>
        </View>

        {/* Comment */}
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
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  participantLoading: {
    paddingVertical: 16,
  },
  participantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  participantChipSelected: {
    backgroundColor: '#e8f0fe',
    borderColor: '#4a90d9',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  participantNameSelected: {
    color: '#4a90d9',
    fontWeight: '700',
  },
  hostLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginLeft: 6,
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  hostLabelSelected: {
    color: '#4a90d9',
    backgroundColor: '#d0e0f5',
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

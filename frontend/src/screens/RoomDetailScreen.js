import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Card, CardTitle, CardBody, Button, Badge } from '../components';
import { roomsApi, joinRequestsApi, usersApi } from '../api';
import { useAuth } from '../context/AuthContext';

const formatTimeRemaining = (ms) => {
  if (ms <= 0) return null;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatScheduledDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' at ' + date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const RoomDetailScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const { user } = useAuth();
  const [room, setRoom] = useState(null);
  const [privateRoom, setPrivateRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [hostUsername, setHostUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [kickLoading, setKickLoading] = useState(null);

  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  const isHost = room?.host_id === user?.id;
  const isMember = privateRoom !== null;

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (room?.scheduled_at && room.status === 'scheduled') {
      const tick = () => {
        const remaining = new Date(room.scheduled_at).getTime() - Date.now();
        setCountdown(remaining > 0 ? remaining : 0);
      };
      tick();
      countdownRef.current = setInterval(tick, 1000);
      return () => clearInterval(countdownRef.current);
    } else {
      setCountdown(null);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [room?.scheduled_at, room?.status]);

  const loadRoom = async () => {
    try {
      const publicData = await roomsApi.get(roomId);
      setRoom(publicData);

      // Load host username
      try {
        const hostUser = await usersApi.get(publicData.host_id);
        setHostUsername(hostUser.username);
      } catch {
        setHostUsername(null);
      }

      try {
        const privateData = await roomsApi.getPrivate(roomId);
        setPrivateRoom(privateData);

        try {
          const membersData = await roomsApi.getMembers(roomId);
          setMembers(membersData);
        } catch {}
      } catch {
        setPrivateRoom(null);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load room');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    setActionLoading(true);
    try {
      await joinRequestsApi.create(roomId, 'I would like to join this game!');
      Alert.alert('Success', 'Join request sent!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      const updated = await roomsApi.updateStatus(roomId, newStatus);
      setRoom(updated);
      Alert.alert('Success', `Room status changed to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    Alert.alert(
      'Leave Room',
      'Are you sure you want to leave this room?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await roomsApi.leave(roomId);
              Alert.alert('Success', 'You have left the room');
              setPrivateRoom(null);
              setMembers([]);
              loadRoom();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to leave room');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleKickMember = async (memberId, username) => {
    Alert.alert(
      'Kick Member',
      `Are you sure you want to kick ${username} from the room?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Kick',
          style: 'destructive',
          onPress: async () => {
            setKickLoading(memberId);
            try {
              await roomsApi.kickMember(roomId, memberId);
              Alert.alert('Success', `${username} has been kicked from the room`);
              const membersData = await roomsApi.getMembers(roomId);
              setMembers(membersData);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to kick member');
            } finally {
              setKickLoading(null);
            }
          },
        },
      ]
    );
  };

  const navigateToProfile = (userId) => {
    navigation.navigate('UserProfile', { userId });
  };

  if (loading || !room) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card>
        <View style={styles.header}>
          <CardTitle>{room.name}</CardTitle>
          <Badge text={room.status} variant={room.status} />
        </View>

        {room.skill_level && (
          <View style={styles.row}>
            <Text style={styles.label}>Skill Level:</Text>
            <Badge text={room.skill_level} variant={room.skill_level} />
          </View>
        )}

        {room.description && (
          <Text style={styles.description}>{room.description}</Text>
        )}

        {room.scheduled_at && (
          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleLabel}>Scheduled</Text>
            <Text style={styles.scheduleValue}>{formatScheduledDate(room.scheduled_at)}</Text>
            {countdown !== null && countdown > 0 && (
              <Text style={styles.countdownText}>Starts in {formatTimeRemaining(countdown)}</Text>
            )}
            {countdown !== null && countdown <= 0 && room.status === 'scheduled' && (
              <Text style={styles.readyText}>Ready to start</Text>
            )}
          </View>
        )}

        <CardBody>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Max Players:</Text>
            <Text style={styles.infoValue}>{room.max_players || 'No limit'}</Text>
          </View>

          {room.buy_in_info && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Buy-in Info:</Text>
              <Text style={styles.infoValue}>{room.buy_in_info}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Host:</Text>
            <TouchableOpacity onPress={() => navigateToProfile(room.host_id)}>
              <Text style={styles.linkText}>
                {hostUsername || `User #${room.host_id}`}
              </Text>
            </TouchableOpacity>
          </View>
        </CardBody>
      </Card>

      {/* Location Card */}
      <Card>
        <CardTitle>Location</CardTitle>
        <CardBody>
          {privateRoom ? (
            <>
              <Text style={styles.locationTitle}>Exact Location (Member Access)</Text>
              <Text style={styles.location}>
                Lat: {privateRoom.latitude}, Lon: {privateRoom.longitude}
              </Text>
              {privateRoom.address && (
                <Text style={styles.address}>{privateRoom.address}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.locationTitle}>Approximate Location</Text>
              <Text style={styles.location}>
                Lat: {room.public_latitude?.toFixed(4)}, Lon: {room.public_longitude?.toFixed(4)}
              </Text>
              <Text style={styles.note}>Join room to see exact location</Text>
            </>
          )}
        </CardBody>
      </Card>

      {/* Members List */}
      {(isHost || isMember) && members.length > 0 && (
        <Card>
          <CardTitle>Room Members ({members.filter(m => m.status === 'active').length})</CardTitle>
          <CardBody>
            {members.filter(m => m.status === 'active').map((member) => (
              <View key={member.id} style={styles.memberRow}>
                <TouchableOpacity
                  style={styles.memberInfo}
                  onPress={() => navigateToProfile(member.user_id)}
                >
                  <Text style={styles.memberNameLink}>
                    {member.username} {member.is_host && '(Host)'}
                  </Text>
                  <Text style={styles.memberDate}>
                    Joined: {new Date(member.joined_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
                {isHost && !member.is_host && (
                  <Button
                    title="Kick"
                    onPress={() => handleKickMember(member.id, member.username)}
                    variant="danger"
                    loading={kickLoading === member.id}
                    style={styles.kickButton}
                  />
                )}
              </View>
            ))}

            {/* Waitlisted members */}
            {members.filter(m => m.status === 'waitlisted').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Waitlist</Text>
                {members.filter(m => m.status === 'waitlisted')
                  .sort((a, b) => a.queue_position - b.queue_position)
                  .map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      <TouchableOpacity
                        style={styles.memberInfo}
                        onPress={() => navigateToProfile(member.user_id)}
                      >
                        <Text style={styles.memberNameLink}>
                          #{member.queue_position} - {member.username}
                        </Text>
                      </TouchableOpacity>
                      {isHost && (
                        <Button
                          title="Remove"
                          onPress={() => handleKickMember(member.id, member.username)}
                          variant="danger"
                          loading={kickLoading === member.id}
                          style={styles.kickButton}
                        />
                      )}
                    </View>
                  ))}
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardTitle>Actions</CardTitle>
        <CardBody>
          {isHost ? (
            <>
              <Button
                title="Manage Join Requests"
                onPress={() => navigation.navigate('ManageRequests', { roomId })}
                style={styles.actionButton}
              />
              <Button
                title="Manage Waitlist"
                onPress={() => navigation.navigate('Waitlist', { roomId })}
                variant="secondary"
                style={styles.actionButton}
              />

              {room.status === 'scheduled' && (
                <>
                  <Button
                    title={
                      countdown !== null && countdown > 0
                        ? `Start Game (${formatTimeRemaining(countdown)})`
                        : 'Start Game'
                    }
                    onPress={() => handleStatusChange('active')}
                    variant="success"
                    loading={actionLoading}
                    disabled={countdown !== null && countdown > 0}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Cancel Room"
                    onPress={() => handleStatusChange('cancelled')}
                    variant="danger"
                    loading={actionLoading}
                    style={styles.actionButton}
                  />
                </>
              )}

              {room.status === 'active' && (
                <Button
                  title="Finish Game"
                  onPress={() => handleStatusChange('finished')}
                  variant="success"
                  loading={actionLoading}
                  style={styles.actionButton}
                />
              )}

              {room.status === 'finished' && (
                <>
                  <Button
                    title="Write Reviews"
                    onPress={() => navigation.navigate('WriteReview', { roomId })}
                    style={styles.actionButton}
                  />
                  <Button
                    title="View Room Reviews"
                    onPress={() => navigation.navigate('RoomReviews', { roomId })}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {!privateRoom && (
                <Button
                  title="Request to Join"
                  onPress={handleJoinRequest}
                  loading={actionLoading}
                  style={styles.actionButton}
                />
              )}

              {privateRoom && room.status !== 'finished' && room.status !== 'cancelled' && (
                <Button
                  title="Leave Room"
                  onPress={handleLeaveRoom}
                  variant="danger"
                  loading={actionLoading}
                  style={styles.actionButton}
                />
              )}

              {privateRoom && room.status === 'finished' && (
                <>
                  <Button
                    title="Write Reviews"
                    onPress={() => navigation.navigate('WriteReview', { roomId })}
                    style={styles.actionButton}
                  />
                  <Button
                    title="View Room Reviews"
                    onPress={() => navigation.navigate('RoomReviews', { roomId })}
                    variant="secondary"
                    style={styles.actionButton}
                  />
                </>
              )}

              <Button
                title="Check My Waitlist Position"
                onPress={async () => {
                  try {
                    const result = await joinRequestsApi.getMyWaitlistPosition(roomId);
                    Alert.alert('Waitlist Status', result.message);
                  } catch (err) {
                    Alert.alert('Error', err.response?.data?.detail || 'Not on waitlist');
                  }
                }}
                variant="secondary"
                style={styles.actionButton}
              />
            </>
          )}
        </CardBody>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 12,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90d9',
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#666',
  },
  address: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  note: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  scheduleBox: {
    backgroundColor: '#e8f4fd',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4a90d9',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e67e22',
    marginTop: 6,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#27ae60',
    marginTop: 6,
  },
  actionButton: {
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a90d9',
  },
  memberDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  kickButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 60,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
});

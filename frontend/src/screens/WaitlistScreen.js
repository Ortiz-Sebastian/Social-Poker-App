import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardBody, Button, Badge } from '../components';
import { joinRequestsApi } from '../api';

export const WaitlistScreen = ({ route }) => {
  const { roomId } = route.params;
  const [waitlistData, setWaitlistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadWaitlist = async () => {
    try {
      const data = await joinRequestsApi.getWaitlist(roomId);
      setWaitlistData(data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to load waitlist');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWaitlist();
    }, [roomId])
  );

  const handlePromote = async (memberId) => {
    setActionLoading(memberId);
    try {
      await joinRequestsApi.promoteFromWaitlist(roomId, memberId);
      Alert.alert('Success', 'User promoted to active member');
      loadWaitlist();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to promote user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (memberId) => {
    Alert.alert(
      'Confirm Remove',
      'Are you sure you want to remove this user from the waitlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(memberId);
            try {
              await joinRequestsApi.removeFromWaitlist(roomId, memberId);
              Alert.alert('Success', 'User removed from waitlist');
              loadWaitlist();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to remove user');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const renderWaitlistItem = ({ item }) => (
    <Card>
      <View style={styles.header}>
        <View>
          <CardTitle>User #{item.user_id}</CardTitle>
          <Text style={styles.position}>Position: #{item.queue_position}</Text>
        </View>
        <Badge text={`#${item.queue_position}`} variant="waitlisted" />
      </View>

      <View style={styles.actions}>
        {item.queue_position === 1 && (
          <Button
            title="Promote"
            onPress={() => handlePromote(item.id)}
            variant="success"
            loading={actionLoading === item.id}
            style={styles.actionButton}
          />
        )}
        <Button
          title="Remove"
          onPress={() => handleRemove(item.id)}
          variant="danger"
          loading={actionLoading === item.id}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Card */}
      <Card style={styles.summaryCard}>
        <CardTitle>Room Capacity</CardTitle>
        <CardBody>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{waitlistData?.active_count || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{waitlistData?.max_players || '∞'}</Text>
              <Text style={styles.statLabel}>Max</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{waitlistData?.waitlist_count || 0}</Text>
              <Text style={styles.statLabel}>Waiting</Text>
            </View>
          </View>
        </CardBody>
      </Card>

      {/* Waitlist */}
      <Text style={styles.sectionTitle}>Waitlist</Text>
      <FlatList
        data={waitlistData?.waitlist || []}
        renderItem={renderWaitlistItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadWaitlist();
          }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No one on waitlist</Text>
          </View>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  position: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

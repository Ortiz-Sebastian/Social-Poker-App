import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardSubtitle, Button, Badge } from '../components';
import { joinRequestsApi } from '../api';

export const MyRequestsScreen = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadRequests = async () => {
    try {
      const data = await joinRequestsApi.list();
      setRequests(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load your requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const handleCancel = async (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(requestId);
            try {
              await joinRequestsApi.cancel(requestId);
              loadRequests();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to cancel');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const renderRequest = ({ item }) => (
    <Card onPress={() => navigation.navigate('RoomDetail', { roomId: item.room_id })}>
      <View style={styles.header}>
        <CardTitle>Room #{item.room_id}</CardTitle>
        <Badge text={item.status} variant={item.status} />
      </View>
      {item.message && <CardSubtitle>{item.message}</CardSubtitle>}
      <Text style={styles.date}>
        Submitted: {new Date(item.created_at).toLocaleDateString()}
      </Text>

      {item.status === 'pending' && (
        <Button
          title="Cancel Request"
          onPress={() => handleCancel(item.id)}
          variant="danger"
          loading={actionLoading === item.id}
          style={styles.cancelButton}
        />
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            loadRequests();
          }} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No requests yet</Text>
              <Text style={styles.emptySubtext}>
                Find a room and request to join!
              </Text>
            </View>
          )
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
  list: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  cancelButton: {
    marginTop: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
});

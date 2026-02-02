import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardSubtitle, Button, Badge } from '../components';
import { joinRequestsApi } from '../api';

export const ManageRequestsScreen = ({ route }) => {
  const { roomId } = route.params;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadRequests = async () => {
    try {
      const data = await joinRequestsApi.list(roomId);
      setRequests(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [roomId])
  );

  const handleAction = async (requestId, status) => {
    setActionLoading(requestId);
    try {
      await joinRequestsApi.update(requestId, status);
      Alert.alert('Success', `Request ${status}`);
      loadRequests();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const renderRequest = ({ item }) => (
    <Card>
      <View style={styles.header}>
        <CardTitle>User #{item.user_id}</CardTitle>
        <Badge text={item.status} variant={item.status} />
      </View>
      {item.message && <CardSubtitle>{item.message}</CardSubtitle>}
      <Text style={styles.date}>
        Requested: {new Date(item.created_at).toLocaleDateString()}
      </Text>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="Approve"
            onPress={() => handleAction(item.id, 'approved')}
            variant="success"
            loading={actionLoading === item.id}
            style={styles.actionButton}
          />
          <Button
            title="Reject"
            onPress={() => handleAction(item.id, 'rejected')}
            variant="danger"
            loading={actionLoading === item.id}
            style={styles.actionButton}
          />
        </View>
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
              <Text style={styles.emptyText}>No join requests</Text>
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

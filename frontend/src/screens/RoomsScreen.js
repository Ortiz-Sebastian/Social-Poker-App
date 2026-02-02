import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardSubtitle, CardBody, Button, Badge } from '../components';
import { roomsApi } from '../api';

export const RoomsScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await roomsApi.list({ limit: 50 });
      setRooms(data);
    } catch (err) {
      Alert.alert('Error', 'Failed to load rooms');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const renderRoom = ({ item }) => (
    <Card onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}>
      <View style={styles.cardHeader}>
        <CardTitle>{item.name}</CardTitle>
        <Badge text={item.status} variant={item.status} />
      </View>
      {item.skill_level && (
        <Badge text={item.skill_level} variant={item.skill_level} style={styles.skillBadge} />
      )}
      <CardSubtitle>
        {item.max_players ? `Max ${item.max_players} players` : 'No player limit'}
        {item.buy_in_info && ` • ${item.buy_in_info}`}
      </CardSubtitle>
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      {item.distance_meters && (
        <Text style={styles.distance}>
          {(item.distance_meters / 1000).toFixed(1)} km away
        </Text>
      )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Poker Rooms</Text>
        <Button
          title="+ Create"
          onPress={() => navigation.navigate('CreateRoom')}
          style={styles.createButton}
        />
      </View>

      <FlatList
        data={rooms}
        renderItem={renderRoom}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No rooms found</Text>
              <Text style={styles.emptySubtext}>Create one to get started!</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  skillBadge: {
    marginTop: 4,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  distance: {
    fontSize: 12,
    color: '#4a90d9',
    marginTop: 8,
    fontWeight: '600',
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

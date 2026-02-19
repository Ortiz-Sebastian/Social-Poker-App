import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardSubtitle, Button, Badge } from '../components';
import { roomsApi } from '../api';

export const RoomsScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await roomsApi.getMyRooms();
      setRooms(data);
    } catch (err) {
      if (err.response?.status === 404) {
        setRooms([]);
      } else {
        Alert.alert('Error', 'Failed to load your rooms');
        console.error(err);
      }
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

  // Separate rooms into sections
  const upcomingRooms = rooms.filter(r => r.status === 'scheduled' || r.status === 'active');
  const pastRooms = rooms.filter(r => r.status === 'finished' || r.status === 'cancelled');

  const sections = [
    { title: 'Upcoming Games', data: upcomingRooms },
    { title: 'Past Games', data: pastRooms },
  ].filter(section => section.data.length > 0);

  const renderRoom = ({ item }) => (
    <Card onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <CardTitle>{item.name}</CardTitle>
          {item.is_host && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>HOST</Text>
            </View>
          )}
        </View>
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
      <Text style={styles.date}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </Card>
  );

  const renderSectionHeader = ({ section: { title, data } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{data.length}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Rooms</Text>
          <Text style={styles.subtitle}>Games you're hosting or playing in</Text>
        </View>
        <Button
          title="+ Create"
          onPress={() => navigation.navigate('CreateRoom')}
          style={styles.createButton}
        />
      </View>

      {rooms.length === 0 && !loading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎴</Text>
          <Text style={styles.emptyText}>No rooms yet</Text>
          <Text style={styles.emptySubtext}>
            Create a room to host a game, or use the Search tab to find rooms near you!
          </Text>
          <Button
            title="Create a Room"
            onPress={() => navigation.navigate('CreateRoom')}
            style={styles.emptyButton}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderRoom}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
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
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  createButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  list: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#eee',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  hostBadge: {
    backgroundColor: '#4a90d9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
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
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
});

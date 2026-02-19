import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Card, CardBody } from '../components';
import { reputationApi, usersApi } from '../api';

export const RoomReviewsScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState({});

  useEffect(() => {
    loadReviews();
  }, [roomId]);

  const loadReviews = async () => {
    try {
      const data = await reputationApi.getRoomReviews(roomId);
      setReviews(data);

      const userIds = new Set();
      data.forEach((r) => {
        userIds.add(r.reviewer_id);
        userIds.add(r.target_user_id);
      });

      const cache = {};
      await Promise.allSettled(
        [...userIds].map(async (id) => {
          try {
            const u = await usersApi.get(id);
            cache[id] = u.username;
          } catch {
            cache[id] = `User #${id}`;
          }
        })
      );
      setUserCache(cache);
    } catch (err) {
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? '★' : '☆');
    }
    return stars.join('');
  };

  const renderReview = ({ item }) => (
    <Card>
      <CardBody>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewRating}>{renderStars(item.rating)}</Text>
          <Text style={styles.reviewDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.reviewParties}>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.reviewer_id })}>
            <Text style={styles.link}>{userCache[item.reviewer_id] || `User #${item.reviewer_id}`}</Text>
          </TouchableOpacity>
          <Text style={styles.arrow}> → </Text>
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.target_user_id })}>
            <Text style={styles.link}>{userCache[item.target_user_id] || `User #${item.target_user_id}`}</Text>
          </TouchableOpacity>
        </View>

        {item.comment && (
          <Text style={styles.reviewComment}>{item.comment}</Text>
        )}
      </CardBody>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90d9" />
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      renderItem={renderReview}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No reviews for this room yet.</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewRating: {
    fontSize: 18,
    color: '#f39c12',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewParties: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  link: {
    fontSize: 14,
    color: '#4a90d9',
    fontWeight: '600',
  },
  arrow: {
    fontSize: 14,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    lineHeight: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
});

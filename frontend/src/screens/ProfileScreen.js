import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, CardTitle, CardBody, Button, Badge } from '../components';
import { useAuth } from '../context/AuthContext';
import { reputationApi } from '../api';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const [reputation, setReputation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadReputation = async () => {
    if (!user) return;
    try {
      const data = await reputationApi.getUserReputation(user.id);
      setReputation(data);
    } catch (err) {
      console.log('No reputation data yet');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refreshUser();
      loadReputation();
    }, [user?.id])
  );

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? '★' : '☆');
    }
    return stars.join('');
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            refreshUser();
            loadReputation();
          }}
        />
      }
    >
      {/* Profile Card */}
      <Card>
        <CardTitle>{user.username}</CardTitle>
        <Text style={styles.email}>{user.email}</Text>
        {user.full_name && <Text style={styles.name}>{user.full_name}</Text>}
        
        <View style={styles.badges}>
          {user.skill_level && (
            <Badge text={user.skill_level} variant={user.skill_level} style={styles.badge} />
          )}
          {user.isHost && (
            <Badge text="Host" variant="primary" style={styles.badge} />
          )}
        </View>
      </Card>

      {/* Reputation Card */}
      <Card>
        <CardTitle>Reputation</CardTitle>
        <CardBody>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.rating}>
                {renderStars(user.avg_rating || 0)}
              </Text>
              <Text style={styles.statValue}>{(user.avg_rating || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user.review_count || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{user.games_completed || 0}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
          </View>

          {reputation?.rating_breakdown && (
            <View style={styles.breakdown}>
              <Text style={styles.breakdownTitle}>Rating Breakdown</Text>
              {[5, 4, 3, 2, 1].map((star) => (
                <View key={star} style={styles.breakdownRow}>
                  <Text style={styles.breakdownStar}>{star}★</Text>
                  <View style={styles.breakdownBar}>
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${
                            reputation.total_reviews > 0
                              ? (reputation.rating_breakdown[star] / reputation.total_reviews) * 100
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownCount}>
                    {reputation.rating_breakdown[star] || 0}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </CardBody>
      </Card>

      {/* Recent Reviews */}
      {reputation?.recent_reviews?.length > 0 && (
        <Card>
          <CardTitle>Recent Reviews</CardTitle>
          <CardBody>
            {reputation.recent_reviews.map((review, index) => (
              <View key={index} style={styles.review}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>
                    {renderStars(review.rating)}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <Button
          title="View My Reviews"
          onPress={() => navigation.navigate('UserReviews', { userId: user.id })}
          style={styles.actionButton}
        />
        <Button
          title="Edit Profile"
          onPress={() => navigation.navigate('EditProfile')}
          variant="secondary"
          style={styles.actionButton}
        />
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="danger"
          style={styles.actionButton}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  name: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  badges: {
    flexDirection: 'row',
    marginTop: 12,
  },
  badge: {
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  stat: {
    alignItems: 'center',
  },
  rating: {
    fontSize: 20,
    color: '#f39c12',
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
  breakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownStar: {
    width: 30,
    fontSize: 12,
    color: '#f39c12',
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#f39c12',
    borderRadius: 4,
  },
  breakdownCount: {
    width: 30,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  review: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewRating: {
    color: '#f39c12',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
});

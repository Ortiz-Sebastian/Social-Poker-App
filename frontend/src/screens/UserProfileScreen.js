import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native';
import { Card, CardTitle, CardBody, Button, Badge } from '../components';
import { usersApi, reputationApi } from '../api';
import { useAuth } from '../context/AuthContext';

export const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const [userData, repData] = await Promise.allSettled([
        usersApi.get(userId),
        reputationApi.getUserReputation(userId),
      ]);

      if (userData.status === 'fulfilled') {
        setProfile(userData.value);
      } else {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }

      if (repData.status === 'fulfilled') {
        setReputation(repData.value);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load profile');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating) ? '★' : '☆');
    }
    return stars.join('');
  };

  if (loading || !profile) {
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
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} />
      }
    >
      {/* Profile Card */}
      <Card>
        <CardTitle>{profile.username}</CardTitle>
        {profile.full_name && <Text style={styles.name}>{profile.full_name}</Text>}

        <View style={styles.badges}>
          {profile.skill_level && (
            <Badge text={profile.skill_level} variant={profile.skill_level} style={styles.badge} />
          )}
          {profile.isHost && (
            <Badge text="Host" variant="primary" style={styles.badge} />
          )}
        </View>

        <Text style={styles.memberSince}>
          Member since {new Date(profile.created_at).toLocaleDateString()}
        </Text>
      </Card>

      {/* Reputation Card */}
      <Card>
        <CardTitle>Reputation</CardTitle>
        <CardBody>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.ratingStars}>
                {renderStars(profile.avg_rating || 0)}
              </Text>
              <Text style={styles.statValue}>{(profile.avg_rating || 0).toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.review_count || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{profile.games_completed || 0}</Text>
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
                  <Text style={styles.reviewRating}>{renderStars(review.rating)}</Text>
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
          title="View All Reviews"
          onPress={() => navigation.navigate('UserReviews', { userId, username: profile.username })}
          style={styles.actionButton}
        />
        {isOwnProfile && (
          <Button
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
            variant="secondary"
            style={styles.actionButton}
          />
        )}
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
  name: {
    fontSize: 15,
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
  memberSince: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  stat: {
    alignItems: 'center',
  },
  ratingStars: {
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

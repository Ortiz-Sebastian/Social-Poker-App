import apiClient from './client';

// Reputation & Reviews API endpoints
export const reputationApi = {
  // Create a review for a room
  createReview: async (roomId, targetUserId, rating, comment = null) => {
    const response = await apiClient.post(`/rooms/${roomId}/reviews`, {
      target_user_id: targetUserId,
      rating,
      comment,
    });
    return response.data;
  },

  // Get reviews for a room
  getRoomReviews: async (roomId, skip = 0, limit = 20) => {
    const response = await apiClient.get(`/rooms/${roomId}/reviews`, {
      params: { skip, limit },
    });
    return response.data;
  },

  // Get user reputation
  getUserReputation: async (userId, includeRecentReviews = true) => {
    const response = await apiClient.get(`/users/${userId}/reputation`, {
      params: { include_recent_reviews: includeRecentReviews },
    });
    return response.data;
  },

  // Get user reviews
  getUserReviews: async (userId, reviewType = 'received', skip = 0, limit = 20) => {
    const response = await apiClient.get(`/users/${userId}/reviews`, {
      params: { review_type: reviewType, skip, limit },
    });
    return response.data;
  },
};

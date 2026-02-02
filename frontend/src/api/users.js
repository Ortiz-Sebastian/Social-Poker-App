import apiClient from './client';

// Users API endpoints
export const usersApi = {
  // Get current user profile
  getMe: async () => {
    const response = await apiClient.get('/users/me');
    return response.data;
  },

  // Get user by ID
  get: async (userId) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // Update current user
  updateMe: async (userData) => {
    const response = await apiClient.put('/users/me', userData);
    return response.data;
  },
};

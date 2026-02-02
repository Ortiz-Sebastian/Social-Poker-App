import apiClient from './client';

// Join Requests API endpoints
export const joinRequestsApi = {
  // Create a join request
  create: async (roomId, message = null) => {
    const response = await apiClient.post('/join-requests/', {
      room_id: roomId,
      message,
    });
    return response.data;
  },

  // List join requests
  list: async (roomId = null) => {
    const params = roomId ? { room_id: roomId } : {};
    const response = await apiClient.get('/join-requests/', { params });
    return response.data;
  },

  // Get join request by ID
  get: async (requestId) => {
    const response = await apiClient.get(`/join-requests/${requestId}`);
    return response.data;
  },

  // Update join request (approve/reject)
  update: async (requestId, status, message = null) => {
    const response = await apiClient.put(`/join-requests/${requestId}`, {
      status,
      message,
    });
    return response.data;
  },

  // Cancel join request
  cancel: async (requestId) => {
    const response = await apiClient.delete(`/join-requests/${requestId}`);
    return response.data;
  },

  // ========== WAITLIST ENDPOINTS ==========

  // Get room waitlist (host only)
  getWaitlist: async (roomId) => {
    const response = await apiClient.get(`/join-requests/rooms/${roomId}/waitlist`);
    return response.data;
  },

  // Promote user from waitlist (host only)
  promoteFromWaitlist: async (roomId, memberId) => {
    const response = await apiClient.post(
      `/join-requests/rooms/${roomId}/waitlist/${memberId}/promote`
    );
    return response.data;
  },

  // Remove user from waitlist (host only)
  removeFromWaitlist: async (roomId, memberId) => {
    const response = await apiClient.delete(
      `/join-requests/rooms/${roomId}/waitlist/${memberId}`
    );
    return response.data;
  },

  // Get my waitlist position
  getMyWaitlistPosition: async (roomId) => {
    const response = await apiClient.get(`/join-requests/rooms/${roomId}/waitlist/position`);
    return response.data;
  },
};

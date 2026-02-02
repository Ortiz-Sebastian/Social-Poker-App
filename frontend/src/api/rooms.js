import apiClient from './client';

// Rooms API endpoints
export const roomsApi = {
  // Create a new room
  create: async (roomData) => {
    const response = await apiClient.post('/rooms/', roomData);
    return response.data;
  },

  // List rooms (with optional geo filtering)
  list: async (params = {}) => {
    const response = await apiClient.get('/rooms/', { params });
    return response.data;
  },

  // Get room by ID (public view)
  get: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data;
  },

  // Get room with private details (members only)
  getPrivate: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/private`);
    return response.data;
  },

  // Update room
  update: async (roomId, roomData) => {
    const response = await apiClient.put(`/rooms/${roomId}`, roomData);
    return response.data;
  },

  // Update room status
  updateStatus: async (roomId, status) => {
    const response = await apiClient.patch(`/rooms/${roomId}/status`, { status });
    return response.data;
  },

  // Delete room
  delete: async (roomId) => {
    const response = await apiClient.delete(`/rooms/${roomId}`);
    return response.data;
  },

  // Get room members
  getMembers: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/members`);
    return response.data;
  },

  // Leave room (for members)
  leave: async (roomId) => {
    const response = await apiClient.post(`/rooms/${roomId}/leave`);
    return response.data;
  },

  // Kick member (for host)
  kickMember: async (roomId, memberId) => {
    const response = await apiClient.post(`/rooms/${roomId}/members/${memberId}/kick`);
    return response.data;
  },
};

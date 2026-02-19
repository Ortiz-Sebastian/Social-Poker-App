import apiClient from './client';

export const roomsApi = {
  // List rooms with optional filters (geospatial search)
  list: async (params = {}) => {
    const response = await apiClient.get('/rooms/', { params });
    return response.data;
  },

  // Get rooms the user is hosting or is an active member of
  getMyRooms: async () => {
    const response = await apiClient.get('/rooms/my-rooms');
    return response.data;
  },

  // Get a single room by ID (public info)
  get: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}`);
    return response.data;
  },

  // Get private room info (exact location - members only)
  getPrivate: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/private`);
    return response.data;
  },

  // Update room status (host only)
  updateStatus: async (roomId, newStatus) => {
    const response = await apiClient.patch(`/rooms/${roomId}/status`, {
      status: newStatus,
    });
    return response.data;
  },

  // Create a new room
  create: async (roomData) => {
    const response = await apiClient.post('/rooms/', roomData);
    return response.data;
  },

  // Update a room
  update: async (roomId, roomData) => {
    const response = await apiClient.put(`/rooms/${roomId}`, roomData);
    return response.data;
  },

  // Delete a room
  delete: async (roomId) => {
    const response = await apiClient.delete(`/rooms/${roomId}`);
    return response.data;
  },

  // Get room members (active and waitlisted)
  getMembers: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/members`);
    return response.data;
  },

  // Leave a room (for non-host members)
  leave: async (roomId) => {
    const response = await apiClient.post(`/rooms/${roomId}/leave`);
    return response.data;
  },

  // Kick a member from a room (for hosts)
  kickMember: async (roomId, memberId) => {
    const response = await apiClient.post(`/rooms/${roomId}/members/${memberId}/kick`);
    return response.data;
  },

  // Get exact address (for approved members only)
  getExactAddress: async (roomId) => {
    const response = await apiClient.get(`/rooms/${roomId}/exact-address`);
    return response.data;
  },

  // Request to join a room
  requestJoin: async (roomId, message = null) => {
    const response = await apiClient.post(`/rooms/${roomId}/join-request`, { message });
    return response.data;
  },
};

export default roomsApi;

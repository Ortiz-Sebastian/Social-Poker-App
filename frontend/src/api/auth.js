import apiClient, { setAuthToken, clearAuthToken } from './client';

// Auth API endpoints
export const authApi = {
  // Register new user
  register: async (email, username, password, skillLevel = null) => {
    const response = await apiClient.post('/auth/register', {
      email,
      username,
      password,
      skill_level: skillLevel,
    });
    if (response.data.access_token) {
      await setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  // Login with email/password
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });
    if (response.data.access_token) {
      await setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  // Google sign-in
  googleSignIn: async (idToken) => {
    const response = await apiClient.post('/auth/google', {
      id_token: idToken,
    });
    if (response.data.access_token) {
      await setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  // Apple sign-in
  appleSignIn: async (idToken, user = null) => {
    const response = await apiClient.post('/auth/apple', {
      id_token: idToken,
      user,
    });
    if (response.data.access_token) {
      await setAuthToken(response.data.access_token);
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      await clearAuthToken();
    }
  },
};

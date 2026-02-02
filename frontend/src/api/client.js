import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_TIMEOUT } from './config';

// Token storage keys
const TOKEN_KEY = 'auth_token';

// Token management
export const setAuthToken = async (token) => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getAuthToken = async () => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const clearAuthToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// Create a fetch-based API client that mimics axios interface
const createApiClient = () => {
  const makeRequest = async (method, url, data = null, customConfig = {}) => {
    const token = await getAuthToken();
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...customConfig.headers,
      },
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data && method !== 'GET') {
      config.body = JSON.stringify(data);
    }

    // Build URL with query params (like axios)
    let fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    
    // Handle params option (convert to query string)
    if (customConfig.params) {
      const queryParams = new URLSearchParams();
      Object.entries(customConfig.params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value);
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    config.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, config);
      clearTimeout(timeoutId);

      const responseData = await response.text();
      let parsedData;
      try {
        parsedData = responseData ? JSON.parse(responseData) : null;
      } catch {
        parsedData = responseData;
      }

      if (!response.ok) {
        const error = new Error(parsedData?.detail || `HTTP error ${response.status}`);
        error.response = {
          status: response.status,
          data: parsedData,
        };
        console.error('API Error:', response.status, parsedData);
        throw error;
      }

      return { data: parsedData, status: response.status };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timeout');
        error.message = 'Request timeout';
      } else if (!error.response) {
        console.error('Network Error:', error.message);
      }
      throw error;
    }
  };

  return {
    get: (url, config) => makeRequest('GET', url, null, config),
    post: (url, data, config) => makeRequest('POST', url, data, config),
    put: (url, data, config) => makeRequest('PUT', url, data, config),
    patch: (url, data, config) => makeRequest('PATCH', url, data, config),
    delete: (url, config) => makeRequest('DELETE', url, null, config),
  };
};

const apiClient = createApiClient();

export default apiClient;

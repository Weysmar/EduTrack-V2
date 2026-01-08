import axios from 'axios';

// Get API URL from env or default to relative (for Nginx proxy)
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor for JWT
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor for centralized error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            // Token expired or invalid
            // Circular dependency avoidance: Import store dynamically or use window dispatch?
            // Safer: Just clear storage and let the store sync eventually, or redirect.
            // Best practice: useAuthStore.getState().logout() if possible.
            // Since client.ts is used by store, importing store here causes cycle.
            // Workaround: Manually clear storage and redirect.
            // BUT with our fix in authStore, re-initializing from localStorage is key.

            localStorage.removeItem('jwt_token');
            // Force reload/redirect to ensure store re-initializes correctly
            if (window.location.pathname !== '/auth') {
                window.location.href = '/auth';
            }
        }
        return Promise.reject(error);
    }
);

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
        console.error(`[API Client] Error ${error.response?.status} on ${error.config?.url}:`, error.response?.data || error.message);

        if (error.response?.status === 401 || error.response?.status === 403) {
            console.warn('[API Client] Unauthorized/Forbidden. Clearing session and redirecting to login...');

            // Clean up
            localStorage.removeItem('jwt_token');

            // If we're not already on the auth page, force a reload to auth
            // This ensures all stores (authStore, profileStore) are reset
            if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth';
            }
        }
        return Promise.reject(error);
    }
);

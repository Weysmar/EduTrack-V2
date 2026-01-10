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
let isSessionExpired = false;

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Suppress duplicate logs if session is already known to be expired
        if (isSessionExpired && (error.response?.status === 401 || error.response?.status === 403)) {
            return Promise.reject(error);
        }

        console.error(`[API Client] Error ${error.response?.status} on ${error.config?.url}:`, error.response?.data || error.message);

        if (error.response?.status === 401 || error.response?.status === 403) {
            isSessionExpired = true;
            console.warn('[API Client] Unauthorized. Redirecting to login...');

            // Clean up
            localStorage.removeItem('jwt_token');

            // Force reload if not already on auth page
            if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth';
            }
        }
        return Promise.reject(error);
    }
);

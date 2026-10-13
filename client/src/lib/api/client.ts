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
        if (isSessionExpired && error.response?.status === 401) {
            return Promise.reject(error);
        }

        console.error(`[API Client] Error ${error.response?.status} on ${error.config?.url}:`, error.response?.data || error.message);

        // Only 401 (Unauthorized: invalid or expired JWT) on core EduTrack endpoints should terminate the session
        // Proxy endpoints (like /calendar/proxy) or 403 (Forbidden) must NEVER log the user out
        const isCalendarProxy = !!error.config?.url?.includes('/calendar/proxy');
        const isCoreAuthError = error.response?.status === 401 && !isCalendarProxy;

        // Only an expired/invalid session (a token was actually sent) ends the session: a 401 on a request
        // made without token must not redirect, otherwise any stray call on the public login page
        // reloaded it forever (/auth redirects to "/", which fired the call again)
        const sentToken = !!(error.config?.headers?.Authorization || error.config?.headers?.authorization);

        if (isCoreAuthError && sentToken) {
            isSessionExpired = true;
            console.warn('[API Client] Unauthorized (401). Session expired, redirecting to login...');

            // Clean up, and log the in-memory auth store out too (dynamic import: authStore imports this module)
            localStorage.removeItem('jwt_token');
            import('@/store/authStore').then(({ useAuthStore }) => useAuthStore.getState().logout()).catch(() => {});

            // Full reload to reset every store, except on public pages and at most once per 10 s
            // (last-resort guard against any redirect loop)
            const isPublicPage = ['/', '/auth', '/privacy', '/terms'].includes(window.location.pathname);
            let lastRedirect = 0;
            try { lastRedirect = Number(sessionStorage.getItem('auth_redirect_at') || 0); } catch { /* storage unavailable */ }
            if (!isPublicPage && Date.now() - lastRedirect > 10_000) {
                try { sessionStorage.setItem('auth_redirect_at', String(Date.now())); } catch { /* storage unavailable */ }
                window.location.href = '/auth';
            }
        }
        return Promise.reject(error);
    }
);

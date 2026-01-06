export const getApiUrl = (): string => {
    // 1. Env Override
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // 2. Default Strategy: Same Origin (Production with Nginx)
    // If we're on http://192.168.x.x, API is on same host/port via Nginx proxy
    return window.location.origin;
};

export const API_URL = getApiUrl();

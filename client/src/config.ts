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

/**
 * Absolute, token-free URL of a stored file, for third-party viewers (Microsoft Office / Google Docs)
 * that must fetch the file themselves. Never hand them a /storage/proxy URL: it carries the user's JWT.
 */
export const getPublicFileUrl = (storageKey: string): string => {
    const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
    const cleanKey = storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
    return `${cleanApiBase}/storage/public${cleanKey}`;
};


import { useProfileStore } from '@/store/profileStore';

export const DEFAULT_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const DEFAULT_GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export const GOOGLE_DRIVE_SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file'
].join(' ');

export function getGoogleDriveCredentials() {
    const apiKeys = useProfileStore.getState().apiKeys;
    const clientId = (apiKeys?.google_client_id?.trim()) || DEFAULT_GOOGLE_CLIENT_ID;
    const apiKey = (apiKeys?.google_drive_api_key?.trim()) || DEFAULT_GOOGLE_API_KEY;

    return {
        clientId,
        apiKey,
        isConfigured: !!clientId
    };
}


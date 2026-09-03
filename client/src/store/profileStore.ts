import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'

interface Profile {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    theme: 'light' | 'dark' | 'system';
    language: 'fr' | 'en';
    settings?: any;
    aiGenerationsCount?: number;
}

interface ApiKeyMap {
    perplexity_summaries: string | null;
    perplexity_exercises: string | null;
    google_calendar: string | null;
    google_gemini_summaries: string | null;
    google_gemini_exercises: string | null;
    google_client_id?: string | null;
    google_drive_api_key?: string | null;
    finance_audit_provider: 'google' | 'perplexity' | null;
    finance_audit_model: string | null;
}

interface ProfileState {
    activeProfile: Profile | null;
    apiKeys: ApiKeyMap;
    isLoading: boolean;

    // Actions
    loadProfile: () => Promise<void>;
    updateProfile: (data: Partial<Profile>) => Promise<void>;
    deleteProfile: (id: string) => Promise<void>;
    createProfile: (data: Partial<Profile>) => Promise<string>;
    switchProfile: (id: string) => Promise<void>;
    logout: () => void;

    // API Keys
    setApiKey: (service: keyof ApiKeyMap, key: string) => Promise<void>;
    updateApiKeys: (keys: ApiKeyMap) => Promise<void>;
    getApiKey: (service: keyof ApiKeyMap) => string | null;
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            activeProfile: null,
            apiKeys: {
                perplexity_summaries: null,
                perplexity_exercises: null,
                google_calendar: null,
                google_gemini_summaries: null,
                google_gemini_exercises: null,
                google_client_id: null,
                google_drive_api_key: null,
                finance_audit_provider: 'google',
                finance_audit_model: 'gemini-3.7-flash'
            },
            isLoading: false,

            loadProfile: async () => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.get('/auth/me');
                    const profile = response.data;

                    const defaultKeys: ApiKeyMap = {
                        perplexity_summaries: null,
                        perplexity_exercises: null,
                        google_calendar: null,
                        google_gemini_summaries: null,
                        google_gemini_exercises: null,
                        google_client_id: null,
                        google_drive_api_key: null,
                        finance_audit_provider: 'google',
                        finance_audit_model: 'gemini-3.7-flash'
                    };

                    const keys = profile.settings ? { ...defaultKeys, ...profile.settings } : defaultKeys;

                    set({ activeProfile: profile, apiKeys: keys, isLoading: false });
                } catch (e) {
                    console.error("Failed to load profile", e);
                    set({ isLoading: false });
                }
            },

            updateProfile: async (data: Partial<Profile>) => {
                const { activeProfile } = get();
                const targetId = activeProfile?.id || 'me';

                const response = await apiClient.put(`/profiles/${targetId}`, data);
                set({ activeProfile: { ...(activeProfile || {}), ...response.data } });
            },

            deleteProfile: async (id: string) => {
                try {
                    await apiClient.delete(`/profiles/${id}`);
                    set({ activeProfile: null });
                } catch (e) {
                    console.error("Failed to delete profile", e);
                }
            },

            logout: () => {
                set({
                    activeProfile: null,
                    apiKeys: {
                        perplexity_summaries: null,
                        perplexity_exercises: null,
                        google_calendar: null,
                        google_gemini_summaries: null,
                        google_gemini_exercises: null,
                        google_client_id: null,
                        google_drive_api_key: null,
                        finance_audit_provider: 'google',
                        finance_audit_model: 'gemini-3.7-flash'
                    }
                });
            },

            setApiKey: async (service: keyof ApiKeyMap, key: string) => {
                const { activeProfile, apiKeys } = get();
                const trimmedKey = typeof key === 'string' ? key.trim() : key;
                const newKeys = { ...apiKeys, [service]: trimmedKey };
                set({ apiKeys: newKeys });

                const targetId = activeProfile?.id || 'me';
                try {
                    const mergedSettings = {
                        ...(activeProfile?.settings || {}),
                        ...newKeys
                    };
                    const response = await apiClient.put(`/profiles/${targetId}`, {
                        settings: mergedSettings
                    });
                    set({ activeProfile: response.data, apiKeys: newKeys });
                } catch (e) {
                    console.error("Failed to sync API key to server", e);
                }
            },

            updateApiKeys: async (newKeys: ApiKeyMap) => {
                const { activeProfile } = get();
                const targetId = activeProfile?.id || 'me';

                const trimmedKeys: any = {};
                for (const [k, v] of Object.entries(newKeys)) {
                    trimmedKeys[k] = typeof v === 'string' ? v.trim() : v;
                }

                // 1. Update local state
                set({ apiKeys: trimmedKeys });

                // 2. Sync to backend with merged settings to preserve aiGenerationCount
                try {
                    const mergedSettings = {
                        ...(activeProfile?.settings || {}),
                        ...trimmedKeys
                    };
                    const response = await apiClient.put(`/profiles/${targetId}`, {
                        settings: mergedSettings
                    });
                    set({ activeProfile: response.data, apiKeys: trimmedKeys });
                } catch (e) {
                    console.error("Failed to sync API keys to server", e);
                    throw e;
                }
            },

            getApiKey: (service: keyof ApiKeyMap) => {
                const { activeProfile, apiKeys } = get();
                const key = apiKeys?.[service] || (activeProfile?.settings as any)?.[service];
                return typeof key === 'string' ? key.trim() : (key || null);
            },

            createProfile: async (data: Partial<Profile>) => {
                const response = await apiClient.post('/profiles', data);
                return response.data.id;
            },

            switchProfile: async (id: string) => {
                try {
                    const response = await apiClient.get(`/profiles/${id}`);
                    const profile = response.data;

                    const defaultKeys: ApiKeyMap = {
                        perplexity_summaries: null,
                        perplexity_exercises: null,
                        google_calendar: null,
                        google_gemini_summaries: null,
                        google_gemini_exercises: null,
                        google_client_id: null,
                        google_drive_api_key: null,
                        finance_audit_provider: 'google',
                        finance_audit_model: 'gemini-3.7-flash'
                    };

                    const keys = profile.settings ? { ...defaultKeys, ...profile.settings } : defaultKeys;

                    set({ activeProfile: profile, apiKeys: keys });
                } catch (e) {
                    console.error("Failed to switch profile", e);
                }
            }
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeProfile: state.activeProfile,
                apiKeys: state.apiKeys
            }),
        }
    )
)

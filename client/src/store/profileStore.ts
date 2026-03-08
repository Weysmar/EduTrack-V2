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
}

interface ApiKeyMap {
    perplexity_summaries: string | null;
    perplexity_exercises: string | null;
    google_calendar: string | null;
    google_gemini_summaries: string | null;
    google_gemini_exercises: string | null;
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
                finance_audit_provider: 'google',
                finance_audit_model: 'gemini-1.5-flash'
            },
            isLoading: false,

            loadProfile: async () => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.get('/auth/me');
                    const profile = response.data;

                    // Load settings/keys from profile if available
                    let keys = get().apiKeys;
                    if (profile.settings) {
                        keys = { ...keys, ...profile.settings };
                    }

                    set({ activeProfile: profile, apiKeys: keys, isLoading: false });
                } catch (e) {
                    console.error("Failed to load profile", e);
                    set({ isLoading: false });
                }
            },

            updateProfile: async (data: Partial<Profile>) => {
                const { activeProfile } = get();
                if (!activeProfile) return;

                await apiClient.put(`/profiles/${activeProfile.id}`, data);
                // Optimistic update
                set({ activeProfile: { ...activeProfile, ...data } });
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
                        finance_audit_provider: 'google',
                        finance_audit_model: 'gemini-1.5-flash'
                    }
                });
            },

            setApiKey: async (service: keyof ApiKeyMap, key: string) => {
                set(state => ({
                    apiKeys: { ...state.apiKeys, [service]: key }
                }));
            },

            updateApiKeys: async (newKeys: ApiKeyMap) => {
                const { activeProfile } = get();
                // 1. Update local state
                set({ apiKeys: newKeys });

                // 2. Sync to backend if logged in
                if (activeProfile) {
                    try {
                        await apiClient.put(`/profiles/${activeProfile.id}`, {
                            settings: newKeys
                        });
                        // Update active profile settings reference too
                        set({ activeProfile: { ...activeProfile, settings: newKeys } as any });
                    } catch (e) {
                        console.error("Failed to sync API keys to server", e);
                        throw e;
                    }
                }
            },

            getApiKey: (service: keyof ApiKeyMap) => {
                return get().apiKeys[service];
            },

            createProfile: async (data: Partial<Profile>) => {
                const response = await apiClient.post('/profiles', data);
                return response.data.id;
            },

            switchProfile: async (id: string) => {
                const response = await apiClient.get(`/profiles/${id}`);
                const profile = response.data;

                // Sync API keys from the switched profile
                let keys = get().apiKeys;
                if (profile.settings) {
                    keys = { ...keys, ...profile.settings };
                }

                set({ activeProfile: profile, apiKeys: keys });
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

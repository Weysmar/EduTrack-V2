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
}

interface ApiKeyMap {
    perplexity_summaries: string | null;
    perplexity_exercises: string | null;
    google_calendar: string | null;
    google_gemini_summaries: string | null;
    google_gemini_exercises: string | null;
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
                google_gemini_exercises: null
            },
            isLoading: false,

            loadProfile: async () => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.get('/auth/me');
                    // Assuming response.data returns the profile including apiKeys or we fetch them separately
                    // For now, let's assume auth/me returns profile details.
                    // We might need a separate endpoint for keys if they are sensitive or just send them down.
                    // Let's assume keys are fetched via /profiles/keys or included.
                    // For simplicty in this migration, let's stick to core profile.

                    set({ activeProfile: response.data, isLoading: false });
                } catch (e) {
                    console.error("Failed to load profile", e);
                    set({ isLoading: false });
                }
            },

            updateProfile: async (data: Partial<Profile>) => {
                const { activeProfile } = get();
                if (!activeProfile) return;

                await apiClient.put(`/profiles/${activeProfile.id}`, data);
                // Optimistic update or refetch
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
                    apiKeys: { perplexity_summaries: null, perplexity_exercises: null, google_calendar: null, google_gemini_summaries: null, google_gemini_exercises: null }
                });
            },

            setApiKey: async (service: keyof ApiKeyMap, key: string) => {
                set(state => ({
                    apiKeys: { ...state.apiKeys, [service]: key }
                }));
            },

            getApiKey: (service: keyof ApiKeyMap) => {
                return get().apiKeys[service];
            },

            createProfile: async (data: Partial<Profile>) => {
                const response = await apiClient.post('/profiles', data);
                return response.data.id;
            },

            switchProfile: async (id: string) => {
                // Assuming we just fetch the new profile or setting it active
                // For now, let's just reload the profile or set it if we had the full object
                // If the backend handles session switching, we might need an endpoint.
                // But let's assume we just set it as active if we have it, or fetch it.
                const response = await apiClient.get(`/profiles/${id}`);
                set({ activeProfile: response.data });
            }
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                activeProfile: state.activeProfile,
                apiKeys: state.apiKeys // Persist keys locally for now if not server synced yet
            }),
        }
    )
)

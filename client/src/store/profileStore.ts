import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiClient } from '@/lib/api/client'
import { DEFAULT_GEMINI_MODEL, type AIProvider } from '@/config/aiModels'
import { PROVIDER_KEY_FIELDS, clearedLegacyKeyFields, resolveProviderKey, resolveProviderKeys } from '@/lib/ai/apiKeys'

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

export interface ApiKeyMap {
    /** Une seule clé par fournisseur IA (voir lib/ai/apiKeys.ts) */
    google_gemini_api_key: string | null;
    perplexity_api_key: string | null;
    anthropic_api_key: string | null;
    google_calendar: string | null;
    google_client_id?: string | null;
    google_drive_api_key?: string | null;
    finance_audit_provider: AIProvider | null;
    finance_audit_model: string | null;
}

const defaultApiKeys = (): ApiKeyMap => ({
    google_gemini_api_key: null,
    perplexity_api_key: null,
    anthropic_api_key: null,
    google_calendar: null,
    google_client_id: null,
    google_drive_api_key: null,
    finance_audit_provider: 'google',
    finance_audit_model: DEFAULT_GEMINI_MODEL
})

/** Clés du profil, anciens emplacements (résumés/exercices) repris dans l'emplacement unique de chaque fournisseur */
export const apiKeysFromSettings = (settings?: Record<string, any> | null): ApiKeyMap => {
    const keys: ApiKeyMap = settings ? { ...defaultApiKeys(), ...settings, ...clearedLegacyKeyFields() } : defaultApiKeys()
    const providerKeys = resolveProviderKeys(settings)
    for (const [provider, field] of Object.entries(PROVIDER_KEY_FIELDS) as [AIProvider, keyof ApiKeyMap][]) {
        (keys as any)[field] = providerKeys[provider]
    }
    return keys
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
    /** Clé API du fournisseur IA (emplacement unique, avec repli sur les anciens emplacements) */
    getProviderKey: (provider: AIProvider) => string | null;

    // Folder Expansion State (saved in user account)
    isFolderExpanded: (folderId: string) => boolean;
    toggleFolderExpanded: (folderId: string) => void;
    setFolderExpanded: (folderId: string, isOpen: boolean) => void;
}

let folderSyncTimeout: any = null;
const debouncedSyncSettings = (profileId: string, settings: any) => {
    if (folderSyncTimeout) clearTimeout(folderSyncTimeout);
    folderSyncTimeout = setTimeout(async () => {
        try {
            await apiClient.put(`/profiles/${profileId || 'me'}`, { settings });
        } catch (err) {
            console.error('[ProfileStore] Failed to sync folder expansion settings:', err);
        }
    }, 400);
};

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            activeProfile: null,
            apiKeys: defaultApiKeys(),
            isLoading: false,

            loadProfile: async () => {
                set({ isLoading: true });
                try {
                    const response = await apiClient.get('/auth/me');
                    const profile = response.data;

                    const keys = apiKeysFromSettings(profile.settings);

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
                    apiKeys: defaultApiKeys()
                });
            },

            setApiKey: async (service: keyof ApiKeyMap, key: string) => {
                const { activeProfile, apiKeys } = get();
                const trimmedKey = typeof key === 'string' ? key.trim() : key;
                const newKeys = { ...apiKeys, [service]: trimmedKey, ...clearedLegacyKeyFields() };
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
                // Les anciens emplacements (une clé par usage) sont vidés : la clé unique fait foi
                Object.assign(trimmedKeys, clearedLegacyKeyFields());

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

            getProviderKey: (provider: AIProvider) => {
                const { activeProfile, apiKeys } = get();
                return resolveProviderKey(provider, apiKeys, activeProfile?.settings);
            },

            createProfile: async (data: Partial<Profile>) => {
                const response = await apiClient.post('/profiles', data);
                return response.data.id;
            },

            switchProfile: async (id: string) => {
                try {
                    const response = await apiClient.get(`/profiles/${id}`);
                    const profile = response.data;

                    const keys = apiKeysFromSettings(profile.settings);

                    set({ activeProfile: profile, apiKeys: keys });
                } catch (e) {
                    console.error("Failed to switch profile", e);
                }
            },

            isFolderExpanded: (folderId: string) => {
                const { activeProfile } = get();
                const expandedFolders = (activeProfile?.settings as any)?.expandedFolders || {};
                return expandedFolders[folderId] ?? true;
            },

            toggleFolderExpanded: (folderId: string) => {
                const { isFolderExpanded, setFolderExpanded } = get();
                const current = isFolderExpanded(folderId);
                setFolderExpanded(folderId, !current);
            },

            setFolderExpanded: (folderId: string, isOpen: boolean) => {
                const { activeProfile } = get();
                if (!activeProfile) return;

                const currentSettings = (activeProfile.settings as Record<string, any>) || {};
                const currentExpanded = { ...(currentSettings.expandedFolders || {}) };
                currentExpanded[folderId] = isOpen;

                const updatedSettings = {
                    ...currentSettings,
                    expandedFolders: currentExpanded
                };

                // Immediate optimistic update (also saved to localStorage via Zustand persist)
                set({
                    activeProfile: {
                        ...activeProfile,
                        settings: updatedSettings
                    }
                });

                // Debounced sync to database in the user's account
                debouncedSyncSettings(activeProfile.id, updatedSettings);
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

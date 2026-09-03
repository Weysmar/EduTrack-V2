import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/lib/api/client';

interface User {
    id: string;
    email: string;
    name: string;
    profileId: string;
    theme: string;
    language: string;
    isAdmin?: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password?: string) => Promise<void>;
    register: (name: string, email: string, password?: string) => Promise<any>;
    logout: () => void;
    deleteAccount: () => Promise<void>;
    fetchUsers: () => Promise<any[]>;
    updateUser: (id: string, data: { name?: string; email?: string; password?: string }) => Promise<any>;
    deleteUser: (id: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: localStorage.getItem('jwt_token'), // Init from localStorage
            isAuthenticated: !!localStorage.getItem('jwt_token'), // Init auth state based on token existence
            login: async (email, password) => {
                try {
                    const response = await apiClient.post('/auth/login', { email, password });
                    const { token, user } = response.data;

                    localStorage.setItem('jwt_token', token);
                    set({ user, token, isAuthenticated: true });

                    // Synchronize the profile store immediately with the logged-in user
                    try {
                        const { useProfileStore } = await import('@/store/profileStore');
                        await useProfileStore.getState().loadProfile();
                    } catch (err) {
                        console.error('Failed to load profile on login:', err);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    throw error;
                }
            },
            register: async (name, email, password) => {
                try {
                    const response = await apiClient.post('/auth/register', { name, email, password });
                    const { token, user } = response.data;

                    // Only switch current session if not already logged in
                    const currentToken = localStorage.getItem('jwt_token');
                    if (!currentToken) {
                        localStorage.setItem('jwt_token', token);
                        set({ user, token, isAuthenticated: true });
                        try {
                            const { useProfileStore } = await import('@/store/profileStore');
                            await useProfileStore.getState().loadProfile();
                        } catch (err) {}
                    }
                    return response.data;
                } catch (error) {
                    console.error('Registration error:', error);
                    throw error;
                }
            },
            logout: () => {
                localStorage.removeItem('jwt_token');
                set({ user: null, token: null, isAuthenticated: false });
                import('@/store/profileStore').then(({ useProfileStore }) => {
                    useProfileStore.getState().logout();
                }).catch(() => {});
            },
            deleteAccount: async () => {
                try {
                    await apiClient.delete('/auth/me');
                    localStorage.removeItem('jwt_token');
                    set({ user: null, token: null, isAuthenticated: false });
                } catch (error) {
                    console.error('Delete account error:', error);
                    throw error;
                }
            },
            fetchUsers: async () => {
                try {
                    const response = await apiClient.get('/auth/users');
                    return response.data;
                } catch (error) {
                    console.error('Failed to fetch users:', error);
                    throw error;
                }
            },
            updateUser: async (id: string, data: { name?: string; email?: string; password?: string }) => {
                try {
                    const response = await apiClient.put(`/auth/users/${id}`, data);
                    return response.data;
                } catch (error) {
                    console.error('Failed to update user:', error);
                    throw error;
                }
            },
            deleteUser: async (id: string) => {
                try {
                    await apiClient.delete(`/auth/users/${id}`);
                } catch (error) {
                    console.error('Failed to delete user:', error);
                    throw error;
                }
            }
        }),
        {
            name: 'auth-storage-v2', // Version bump to invalidate old cache
            // Only persist user object, not token/auth state to avoid desync
            // Or persist everything but rely on rehydration logic?
            // Safer to let token be the single source of truth for auth state
            partialize: (state) => ({ user: state.user }),
        }
    )
);

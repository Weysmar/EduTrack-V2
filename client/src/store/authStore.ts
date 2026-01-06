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
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (email: string, password?: string) => Promise<void>;
    register: (name: string, email: string, password?: string) => Promise<void>;
    logout: () => void;
    deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: async (email, password) => {
                try {
                    const response = await apiClient.post('/auth/login', { email, password });
                    const { token, user } = response.data;

                    localStorage.setItem('jwt_token', token);
                    set({ user, token, isAuthenticated: true });
                } catch (error) {
                    console.error('Login error:', error);
                    throw error;
                }
            },
            register: async (name, email, password) => {
                try {
                    const response = await apiClient.post('/auth/register', { name, email, password });
                    const { token, user } = response.data;

                    localStorage.setItem('jwt_token', token);
                    set({ user, token, isAuthenticated: true });
                } catch (error) {
                    console.error('Registration error:', error);
                    throw error;
                }
            },
            logout: () => {
                localStorage.removeItem('jwt_token');
                set({ user: null, token: null, isAuthenticated: false });
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
            }
        }),
        {
            name: 'auth-storage',
        }
    )
);

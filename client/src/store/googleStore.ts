import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GoogleState {
    accessToken: string | null
    tokenExpiration: number | null
    userEmail: string | null
    isConnected: boolean

    setToken: (token: string, expiresIn: number) => void
    setUserEmail: (email: string) => void
    disconnect: () => void
    checkExpiration: () => boolean
}

export const useGoogleStore = create<GoogleState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            tokenExpiration: null,
            userEmail: null,
            isConnected: false,

            setToken: (token, expiresIn) => {
                const expirationTime = Date.now() + (expiresIn * 1000)
                set({
                    accessToken: token,
                    tokenExpiration: expirationTime,
                    isConnected: true
                })
            },

            setUserEmail: (email) => set({ userEmail: email }),

            disconnect: () => set({
                accessToken: null,
                tokenExpiration: null,
                userEmail: null,
                isConnected: false
            }),

            checkExpiration: () => {
                const { tokenExpiration } = get()
                if (!tokenExpiration) return false

                if (Date.now() > tokenExpiration) {
                    get().disconnect()
                    return false
                }
                return true
            }
        }),
        {
            name: 'google-calendar-storage',
        }
    )
)

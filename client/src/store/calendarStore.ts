import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CalendarState {
    icalUrl: string | null
    isConnected: boolean

    setUrl: (url: string) => void
    disconnect: () => void
}

export const useCalendarStore = create<CalendarState>()(
    persist(
        (set) => ({
            icalUrl: null,
            isConnected: false,

            setUrl: (url) => set({
                icalUrl: url,
                isConnected: true
            }),

            disconnect: () => set({
                icalUrl: null,
                isConnected: false
            }),
        }),
        {
            name: 'calendar-storage',
        }
    )
)

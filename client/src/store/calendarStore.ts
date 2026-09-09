import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ICalFeed {
    id: string;
    name: string;
    url: string;
    color: string;
    enabled: boolean;
}

export const DEFAULT_CALENDAR_COLORS = [
    '#3b82f6', // Bleu (Cours / Promo)
    '#10b981', // Émeraude (Personnel)
    '#8b5cf6', // Violet (Révisions / Projets)
    '#f59e0b', // Ambre (Job étudiant / Tutorat)
    '#f43f5e', // Rose (Sport / Loisirs)
    '#06b6d4', // Cyan (Autre)
];

interface CalendarState {
    // Gestion multi-flux iCal
    feeds: ICalFeed[];
    addFeed: (feed: Omit<ICalFeed, 'id'>) => string;
    updateFeed: (id: string, updates: Partial<Omit<ICalFeed, 'id'>>) => void;
    removeFeed: (id: string) => void;
    toggleFeed: (id: string) => void;

    // Horaires & Zoom d'affichage
    startHour: number;      // 0..23 (défaut: 7h)
    endHour: number;        // 1..24 (défaut: 21h)
    hourHeight: number;     // hauteur d'1 heure en px (défaut: 60px, zoom: 40px..100px)
    autoFitHours: boolean;  // calcule auto les min/max des cours de la semaine
    setTimeRange: (startHour: number, endHour: number) => void;
    setHourHeight: (height: number) => void;
    setAutoFitHours: (autoFit: boolean) => void;

    // Rétrocompatibilité avec l'ancien système à flux unique
    icalUrl: string | null;
    isConnected: boolean;
    setUrl: (url: string) => void;
    disconnect: () => void;
}

export const useCalendarStore = create<CalendarState>()(
    persist(
        (set, get) => ({
            feeds: [],
            startHour: 7,
            endHour: 21,
            hourHeight: 60,
            autoFitHours: false,

            icalUrl: null,
            isConnected: false,

            addFeed: (feedData) => {
                const id = `feed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
                const newFeed: ICalFeed = { ...feedData, id };
                set((state) => {
                    const newFeeds = [...state.feeds, newFeed];
                    const primaryUrl = newFeeds.find(f => f.enabled)?.url || newFeed.url;
                    return {
                        feeds: newFeeds,
                        icalUrl: primaryUrl,
                        isConnected: true,
                    };
                });
                return id;
            },

            updateFeed: (id, updates) => {
                set((state) => {
                    const newFeeds = state.feeds.map(f => (f.id === id ? { ...f, ...updates } : f));
                    const hasActive = newFeeds.some(f => f.enabled);
                    const activeUrl = newFeeds.find(f => f.enabled)?.url || null;
                    return {
                        feeds: newFeeds,
                        icalUrl: activeUrl,
                        isConnected: hasActive,
                    };
                });
            },

            removeFeed: (id) => {
                set((state) => {
                    const newFeeds = state.feeds.filter(f => f.id !== id);
                    const hasActive = newFeeds.some(f => f.enabled);
                    const activeUrl = newFeeds.find(f => f.enabled)?.url || null;
                    return {
                        feeds: newFeeds,
                        icalUrl: activeUrl,
                        isConnected: hasActive,
                    };
                });
            },

            toggleFeed: (id) => {
                set((state) => {
                    const newFeeds = state.feeds.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f));
                    const hasActive = newFeeds.some(f => f.enabled);
                    const activeUrl = newFeeds.find(f => f.enabled)?.url || null;
                    return {
                        feeds: newFeeds,
                        icalUrl: activeUrl,
                        isConnected: hasActive,
                    };
                });
            },

            setTimeRange: (startHour, endHour) => {
                const safeStart = Math.max(0, Math.min(22, Math.floor(startHour)));
                const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)));
                set({ startHour: safeStart, endHour: safeEnd });
            },

            setHourHeight: (height) => {
                const safeHeight = Math.max(35, Math.min(120, Math.round(height)));
                set({ hourHeight: safeHeight });
            },

            setAutoFitHours: (autoFit) => {
                set({ autoFitHours: autoFit });
            },

            // Compatibilité flux unique
            setUrl: (url) => {
                const trimmed = url.trim();
                set((state) => {
                    const existingIndex = state.feeds.findIndex(f => f.url === trimmed);
                    let newFeeds = [...state.feeds];
                    if (existingIndex >= 0) {
                        newFeeds[existingIndex] = { ...newFeeds[existingIndex], enabled: true };
                    } else {
                        newFeeds.push({
                            id: `feed-migrated-${Date.now()}`,
                            name: 'Agenda principal',
                            url: trimmed,
                            color: DEFAULT_CALENDAR_COLORS[0],
                            enabled: true,
                        });
                    }
                    return {
                        feeds: newFeeds,
                        icalUrl: trimmed,
                        isConnected: true,
                    };
                });
            },

            disconnect: () => {
                set({
                    feeds: [],
                    icalUrl: null,
                    isConnected: false,
                });
            },
        }),
        {
            name: 'calendar-storage',
            // Migration automatique si un ancien icalUrl existe dans le storage sans feeds
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.icalUrl && (!state.feeds || state.feeds.length === 0)) {
                        state.feeds = [{
                            id: 'feed-initial',
                            name: 'Agenda principal',
                            url: state.icalUrl,
                            color: DEFAULT_CALENDAR_COLORS[0],
                            enabled: true,
                        }];
                        state.isConnected = true;
                    }
                    if (!state.startHour && state.startHour !== 0) state.startHour = 7;
                    if (!state.endHour) state.endHour = 21;
                    if (!state.hourHeight) state.hourHeight = 60;
                }
            },
        }
    )
)

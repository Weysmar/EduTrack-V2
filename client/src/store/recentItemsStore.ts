import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useProfileStore } from '@/store/profileStore'

/** Maximum number of recent documents remembered per profile. */
export const MAX_RECENT_ITEMS = 8

export interface RecentItem {
    itemId: string
    courseId: string
    title: string
    /** Item type (note, resource, exercise, link...) - optional, used for the icon. */
    type?: string
    /** Epoch milliseconds of the last time the item was opened. */
    openedAt: number
}

export interface RecordRecentItemInput {
    itemId: string | number
    courseId: string | number
    title: string
    type?: string
}

interface RecentItemsState {
    /** Recent items keyed by profile id (most recent first). */
    byProfile: Record<string, RecentItem[]>
    recordRecentItem: (item: RecordRecentItemInput, profileId?: string) => void
    removeRecentItem: (itemId: string | number, profileId?: string) => void
    clearRecentItems: (profileId?: string) => void
}

const NO_PROFILE = '__none__'
const EMPTY: RecentItem[] = []

const resolveProfileId = (profileId?: string) =>
    profileId ?? useProfileStore.getState().activeProfile?.id ?? NO_PROFILE

export const useRecentItemsStore = create<RecentItemsState>()(
    persist(
        (set) => ({
            byProfile: {},

            recordRecentItem: (item, profileId) => {
                if (item?.itemId == null || item.courseId == null) return
                const pid = resolveProfileId(profileId)
                const entry: RecentItem = {
                    itemId: String(item.itemId),
                    courseId: String(item.courseId),
                    title: item.title || '',
                    type: item.type,
                    openedAt: Date.now(),
                }
                set((state) => {
                    const current = state.byProfile[pid] ?? []
                    const next = [entry, ...current.filter((r) => r.itemId !== entry.itemId)].slice(0, MAX_RECENT_ITEMS)
                    return { byProfile: { ...state.byProfile, [pid]: next } }
                })
            },

            removeRecentItem: (itemId, profileId) => {
                const pid = resolveProfileId(profileId)
                set((state) => {
                    const current = state.byProfile[pid]
                    if (!current) return state
                    return {
                        byProfile: {
                            ...state.byProfile,
                            [pid]: current.filter((r) => r.itemId !== String(itemId)),
                        },
                    }
                })
            },

            clearRecentItems: (profileId) => {
                const pid = resolveProfileId(profileId)
                set((state) => {
                    const { [pid]: _removed, ...rest } = state.byProfile
                    return { byProfile: rest }
                })
            },
        }),
        {
            name: 'edutrack-recent-items',
            version: 1,
            partialize: (state) => ({ byProfile: state.byProfile }),
        }
    )
)

/**
 * Record that a document was opened (call it from the item page once the item is loaded).
 * Uses the active profile unless `profileId` is given. Safe to call outside React.
 */
export function recordRecentItem(item: RecordRecentItemInput, profileId?: string): void {
    useRecentItemsStore.getState().recordRecentItem(item, profileId)
}

/** Remove a document from the recent list (e.g. after it was deleted). */
export function removeRecentItem(itemId: string | number, profileId?: string): void {
    useRecentItemsStore.getState().removeRecentItem(itemId, profileId)
}

/** React hook: recent items of the active profile, most recent first. */
export function useRecentItems(): RecentItem[] {
    const profileId = useProfileStore((state) => state.activeProfile?.id) ?? NO_PROFILE
    return useRecentItemsStore((state) => state.byProfile[profileId] ?? EMPTY)
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundUtils } from '@/lib/soundUtils';

type FocusMode = 'work' | 'break' | 'longBreak';

interface FocusState {
    isActive: boolean;
    mode: FocusMode;
    timeLeft: number;
    // Wall-clock end of the running countdown. timeLeft is derived from it on each tick, so the timer
    // survives reloads and doesn't drift when the browser throttles timers in background tabs.
    endsAt: number | null;
    cycles: number;
    zenMode: boolean; // Hide UI distractions

    start: () => void;
    pause: () => void;
    reset: () => void;
    tick: () => void;
    setMode: (mode: FocusMode) => void;
    toggleZen: () => void;
    completeSession: () => void;
}

const MODES = {
    work: 25 * 60,
    break: 5 * 60,
    longBreak: 15 * 60
}

// `Notification` doesn't exist on iOS Safari (outside installed PWAs): reading it unguarded threw and
// aborted the end of the session (no logging, no switch to the break)
const notify = (title: string, body: string) => {
    try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    } catch {
        // Notifications are best-effort
    }
};

const secondsUntil = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

export const useFocusStore = create<FocusState>()(
    persist(
        (set, get) => ({
            isActive: false,
            mode: 'work',
            timeLeft: MODES.work,
            endsAt: null,
            cycles: 0,
            zenMode: false,

            start: () => {
                const { isActive, timeLeft } = get();
                if (isActive) return;
                // Ask once, from this user gesture, so the end-of-session notification can be shown
                if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    Notification.requestPermission().catch(() => {});
                }
                set({ isActive: true, endsAt: Date.now() + timeLeft * 1000 });
            },
            pause: () => {
                const { endsAt, timeLeft } = get();
                set({ isActive: false, endsAt: null, timeLeft: endsAt ? secondsUntil(endsAt) : timeLeft });
            },
            reset: () => {
                const mode = get().mode;
                set({ timeLeft: MODES[mode], isActive: false, endsAt: null });
            },
            tick: () => {
                const { isActive, endsAt, timeLeft } = get();
                if (!isActive) return;
                // Older persisted state may lack endsAt: anchor it now
                if (!endsAt) {
                    set({ endsAt: Date.now() + timeLeft * 1000 });
                    return;
                }
                const remaining = secondsUntil(endsAt);
                if (remaining === 0) {
                    set({ timeLeft: 0 });
                    get().completeSession();
                } else if (remaining !== timeLeft) {
                    set({ timeLeft: remaining });
                }
            },
            setMode: (mode) => set({ mode, timeLeft: MODES[mode], isActive: false, endsAt: null }),
            toggleZen: () => set((state) => ({ zenMode: !state.zenMode })),
            completeSession: () => {
                const { mode, cycles } = get();

                if (mode === 'work') {
                    const newCycles = cycles + 1;
                    const nextMode = newCycles % 4 === 0 ? 'longBreak' : 'break';

                    // Native Notification
                    notify("Session terminée !", "Prenez une pause bien méritée ☕");

                    // Play notification sound
                    soundUtils.playSessionComplete();

                    // Record Session in Backend
                    const state = get();
                    // We need a way to get the current profile ID and course ID
                    // Since this store doesn't have access to profile directly, we might need to pass it or use a getter if we had it.
                    // For now, let's assume we can get it from localStorage or the API client handles auth, 
                    // BUT recordSession payload expects profileId. 
                    // Let's rely on the fact that we can get the active profile from the profile store persistence or just pass 'current' if backend handles it.
                    // Ideally, we should pass profileId to completeSession or read it from localStorage.

                    try {
                        const storage = localStorage.getItem('profile-storage');
                        if (storage) {
                            const { state: profileState } = JSON.parse(storage);
                            const profileId = profileState.activeProfile?.id;

                            if (profileId) {
                                // @ts-ignore
                                import('@/lib/api/queries').then(({ analyticsQueries }) => {
                                    analyticsQueries.recordSession({
                                        profileId,
                                        date: new Date(),
                                        startTime: new Date(Date.now() - MODES['work'] * 1000), // Approx start time
                                        durationMinutes: MODES['work'] / 60,
                                        type: 'work',
                                        courseId: null, // We don't track course selection yet in store explicitly as "active course"
                                        notes: null
                                    });
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Failed to record analytics", e);
                    }

                    set({
                        mode: nextMode,
                        timeLeft: MODES[nextMode],
                        endsAt: null,
                        cycles: newCycles,
                        isActive: false,
                        zenMode: false // Auto-exit Zen on break
                    });
                } else {
                    // Back to work
                    notify("Fin de la pause", "C'est reparti pour une session ! 🚀");

                    // Play break end sound
                    soundUtils.playBreakEnd();

                    set({
                        mode: 'work',
                        timeLeft: MODES.work,
                        endsAt: null,
                        isActive: false,
                        zenMode: false // User must manually re-enable zen or auto? Let's say manual start
                    });
                }
            }
        }),
        {
            name: 'focus-storage',
            // The running countdown is persisted as its end time: a reload resumes it (or completes it if
            // it ended while the tab was closed) instead of showing 25:00 in break mode
            partialize: (state) => ({
                mode: state.mode,
                cycles: state.cycles,
                timeLeft: state.timeLeft,
                isActive: state.isActive,
                endsAt: state.endsAt
            }),
            onRehydrateStorage: () => (state) => {
                if (!state) return;
                const max = MODES[state.mode] ?? MODES.work;
                if (typeof state.timeLeft !== 'number' || state.timeLeft < 0 || state.timeLeft > max) {
                    state.timeLeft = max;
                }
                if (state.isActive && !state.endsAt) state.isActive = false;
            }
        }
    )
);

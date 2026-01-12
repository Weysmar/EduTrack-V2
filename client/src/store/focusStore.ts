import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { soundUtils } from '@/lib/soundUtils';

type FocusMode = 'work' | 'break' | 'longBreak';

interface FocusState {
    isActive: boolean;
    mode: FocusMode;
    timeLeft: number;
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

export const useFocusStore = create<FocusState>()(
    persist(
        (set, get) => ({
            isActive: false,
            mode: 'work',
            timeLeft: MODES.work,
            cycles: 0,
            zenMode: false,

            start: () => set({ isActive: true }),
            pause: () => set({ isActive: false }),
            reset: () => {
                const mode = get().mode;
                set({ timeLeft: MODES[mode], isActive: false });
            },
            tick: () => {
                const { timeLeft, isActive } = get();
                if (isActive && timeLeft > 0) {
                    set({ timeLeft: timeLeft - 1 });
                } else if (isActive && timeLeft === 0) {
                    get().completeSession();
                }
            },
            setMode: (mode) => set({ mode, timeLeft: MODES[mode], isActive: false }),
            toggleZen: () => set((state) => ({ zenMode: !state.zenMode })),
            completeSession: () => {
                const { mode, cycles } = get();

                if (mode === 'work') {
                    const newCycles = cycles + 1;
                    const nextMode = newCycles % 4 === 0 ? 'longBreak' : 'break';

                    // Native Notification
                    if (Notification.permission === 'granted') {
                        new Notification("Session terminée !", { body: "Prenez une pause bien méritée ☕" });
                    }

                    // Play notification sound
                    soundUtils.playSessionComplete();

                    set({
                        mode: nextMode,
                        timeLeft: MODES[nextMode],
                        cycles: newCycles,
                        isActive: false,
                        zenMode: false // Auto-exit Zen on break
                    });
                } else {
                    // Back to work
                    if (Notification.permission === 'granted') {
                        new Notification("Fin de la pause", { body: "C'est reparti pour une session ! 🚀" });
                    }

                    // Play break end sound
                    soundUtils.playBreakEnd();

                    set({
                        mode: 'work',
                        timeLeft: MODES.work,
                        isActive: false,
                        zenMode: false // User must manually re-enable zen or auto? Let's say manual start
                    });
                }
            }
        }),
        {
            name: 'focus-storage',
            partialize: (state) => ({
                mode: state.mode,
                cycles: state.cycles,
                // Don't persist isActive to avoid running on load immediately
            })
        }
    )
);

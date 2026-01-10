import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TTSStore {
    rate: number;
    pitch: number;
    volume: number;
    autoPlay: boolean;
    setRate: (rate: number) => void;
    setPitch: (pitch: number) => void;
    setVolume: (volume: number) => void;
    toggleAutoPlay: () => void;
}

export const useTTSStore = create<TTSStore>()(
    persist(
        (set) => ({
            rate: 1,
            pitch: 1,
            volume: 1,
            autoPlay: false,
            setRate: (rate) => set({ rate }),
            setPitch: (pitch) => set({ pitch }),
            setVolume: (volume) => set({ volume }),
            toggleAutoPlay: () => set((state) => ({ autoPlay: !state.autoPlay })),
        }),
        {
            name: 'tts-storage',
        }
    )
);

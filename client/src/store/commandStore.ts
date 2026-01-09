import { create } from 'zustand';

interface CommandStore {
    isOpen: boolean;
    page: string; // 'root' | 'courses' | 'items' | 'commands'
    search: string;

    open: () => void;
    close: () => void;
    toggle: () => void;
    setPage: (page: string) => void;
    setSearch: (search: string) => void;
}

export const useCommandStore = create<CommandStore>((set) => ({
    isOpen: false,
    page: 'root',
    search: '',

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    setPage: (page) => set({ page }),
    setSearch: (search) => set({ search }),
}));

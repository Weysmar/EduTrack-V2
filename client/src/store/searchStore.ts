import { create } from 'zustand'

interface SearchStore {
    isOpen: boolean
    query: string
    setIsOpen: (isOpen: boolean) => void
    setQuery: (query: string) => void
    toggle: () => void
}

export const useSearchStore = create<SearchStore>((set) => ({
    isOpen: false,
    query: '',
    setIsOpen: (isOpen) => set({ isOpen }),
    setQuery: (query) => set({ query }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))

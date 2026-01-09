import { create } from 'zustand'

interface UIStore {
    isSidebarOpen: boolean
    isCollapsed: boolean
    toggleSidebar: () => void
    closeSidebar: () => void
    toggleCollapse: () => void
}

export const useUIStore = create<UIStore>((set) => ({
    isSidebarOpen: true,
    isCollapsed: false,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    closeSidebar: () => set({ isSidebarOpen: false }),
    toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
}))

import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/Sidebar'
import { Menu } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

import { SearchModal } from '@/components/SearchModal'
import { ChangelogModal } from '@/components/ChangelogModal'
import { useSearchStore } from '@/store/searchStore'
import { Search, History } from 'lucide-react'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'

export function AppLayout() {
    // Initialize Socket Connection
    useSocket()

    const { user, isAuthenticated } = useAuthStore()
    const { activeProfile, switchProfile } = useProfileStore()

    useEffect(() => {
        if (isAuthenticated && user?.id && !activeProfile) {
            switchProfile(user.id).catch(console.error)
        }
    }, [isAuthenticated, user, activeProfile, switchProfile])

    const { isSidebarOpen, toggleSidebar, closeSidebar } = useUIStore()
    const { setIsOpen } = useSearchStore()
    const [isChangelogOpen, setIsChangelogOpen] = useState(false)
    const location = useLocation()
    const navigate = useNavigate()

    // Auto-close sidebar on mobile on initial load
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                closeSidebar()
            }
        }

        // Check once on mount
        handleResize()

        // Optional: Listen to resize if we want dynamic behavior (can be annoying if resizing window on desktop)
        // window.addEventListener('resize', handleResize)
        // return () => window.removeEventListener('resize', handleResize)
    }, [closeSidebar])

    // Auto-close on navigation (Mobile only ideally, but harmless on desktop if we check width or just allow it)
    useEffect(() => {
        if (window.innerWidth < 1024) {
            closeSidebar()
        }
    }, [location.pathname, closeSidebar])

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative">
            <SearchModal />
            <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar Area */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                    !isSidebarOpen && "-translate-x-full lg:w-0 lg:border-none"
                )}
            >
                <Sidebar />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6 justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-accent rounded-md lg:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search Trigger */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex-1 max-w-xl mx-2 lg:mx-4 relative flex items-center group"
                    >
                        <div className="relative w-full flex items-center">
                            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <div className="w-full h-9 rounded-md border border-input bg-background px-9 py-2 text-sm text-muted-foreground text-left shadow-sm transition-colors group-hover:bg-accent/50 group-hover:text-accent-foreground">
                                Search...
                            </div>
                            <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </button>



                    <div className="flex items-center gap-2">
                        {/* Hide Drive Button on very small screens if needed, or keep it */}
                        <div className="hidden sm:block">
                            <GoogleConnectButton />
                        </div>

                        <LanguageToggle />
                        <ModeToggle />
                        <button
                            onClick={() => setIsChangelogOpen(true)}
                            className="p-2 hover:bg-accent rounded-md transition-colors"
                            title="Changelog"
                        >
                            <History className="h-5 w-5" />
                        </button>
                    </div>
                </header >

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Outlet />
                </div>
            </main >
        </div >
    )
}

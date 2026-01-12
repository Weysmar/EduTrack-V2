import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/Sidebar'
import { Menu, Map as MapIcon } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

import { CommandPalette } from '@/components/CommandPalette'
import { useCommandStore } from '@/store/commandStore'
import { Search } from 'lucide-react'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useFocusStore } from '@/store/focusStore'

import { KnowledgeMapModal } from '@/components/knowledge-map/KnowledgeMapModal'
import { CompactFocusTimer } from '@/components/CompactFocusTimer' // Added

import { useLanguage } from '@/components/language-provider'

export function AppLayout() {
    const { t } = useLanguage()
    // Initialize Socket Connection
    useSocket()

    const { user, isAuthenticated } = useAuthStore()
    const { activeProfile, switchProfile } = useProfileStore()
    const [isMapOpen, setIsMapOpen] = useState(false)

    // Keyboard shortcut to open map
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyM') {
                e.preventDefault()
                setIsMapOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        if (isAuthenticated && user?.id && !activeProfile) {
            switchProfile(user.id).catch(console.error)
        }
    }, [isAuthenticated, user, activeProfile, switchProfile])

    const { setUrl, disconnect } = useCalendarStore()

    // Sync Calendar Connection from Profile
    useEffect(() => {
        if (activeProfile?.settings?.google_calendar) {
            setUrl(activeProfile.settings.google_calendar)
        } else if (activeProfile && !activeProfile.settings?.google_calendar) {
            disconnect()
        }
    }, [activeProfile, setUrl, disconnect])

    const { isSidebarOpen, isCollapsed, toggleSidebar, closeSidebar } = useUIStore()
    const { open: openCommandPalette } = useCommandStore()
    const location = useLocation()
    const navigate = useNavigate()

    // Focus Timer Global Tick
    const { tick, isActive } = useFocusStore();
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive) {
            interval = setInterval(tick, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, tick]);

    // Auto-close sidebar on mobile on initial load
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                closeSidebar()
            }
        }

        // Check once on mount
        handleResize()
    }, [closeSidebar])

    // Auto-close on navigation (Mobile only ideally, but harmless on desktop if we check width or just allow it)
    useEffect(() => {
        if (window.innerWidth < 1024) {
            closeSidebar()
        }
    }, [location.pathname, closeSidebar])

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative">
            <CommandPalette />
            <KnowledgeMapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />

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
                    "fixed inset-y-0 left-0 z-50 transform border-r bg-card transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden",
                    // Width logic: Mobile always 64 (w-64), Desktop depends on collapsed state
                    isSidebarOpen ? (isCollapsed ? "w-64 lg:w-20" : "w-64") : "-translate-x-full lg:w-0 lg:border-none"
                    // Note: w-64 is 16rem (256px). lg:w-20 is 5rem (80px).
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
                            aria-label="Toggle Sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Search Trigger */}
                    <button
                        onClick={openCommandPalette}
                        className="flex-1 max-w-xl mx-2 lg:mx-4 relative flex items-center group"
                        aria-label="Search"
                    >
                        <div className="relative w-full flex items-center">
                            <Search className="absolute left-3 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <div className="w-full h-9 rounded-md border border-input bg-background px-9 py-2 text-sm text-muted-foreground text-left shadow-sm transition-colors group-hover:bg-accent/50 group-hover:text-accent-foreground">
                                {t('app.search')}
                            </div>
                            <kbd className="pointer-events-none absolute right-3 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100 sm:flex">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        </div>
                    </button>



                    <div className="flex items-center gap-2">
                        <CompactFocusTimer />
                        <div className="hidden sm:block">
                            <GoogleConnectButton />
                        </div>

                        <LanguageToggle />
                        <ModeToggle />
                    </div>
                </header >

                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <Outlet />
                </div>
            </main >
        </div >
    )
}

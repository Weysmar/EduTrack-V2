import { Outlet } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { FinanceSidebar } from '@/components/layout/FinanceSidebar'
import { Menu } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import { useEffect } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { useCommandStore } from '@/store/commandStore'
import { Search } from 'lucide-react'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'


export function FinanceLayout() {
    const { t } = useLanguage()
    useSocket()

    const { user, isAuthenticated } = useAuthStore()
    const { activeProfile, switchProfile } = useProfileStore()

    useEffect(() => {
        if (isAuthenticated && user?.id && !activeProfile) {
            switchProfile(user.id).catch(console.error)
        }
    }, [isAuthenticated, user, activeProfile, switchProfile])

    const { isSidebarOpen, isCollapsed, toggleSidebar, closeSidebar } = useUIStore()
    const { open: openCommandPalette } = useCommandStore()

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) closeSidebar()
        }
        handleResize()
    }, [closeSidebar])

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative">
            <CommandPalette />

            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={closeSidebar}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 transform border-r bg-card transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-hidden",
                    isSidebarOpen ? (isCollapsed ? "w-64 lg:w-20" : "w-64") : "-translate-x-full lg:w-0 lg:border-none"
                )}
            >
                <FinanceSidebar />
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300">
                <header className="flex h-14 items-center gap-2 md:gap-4 border-b bg-card px-3 md:px-4 lg:px-6 justify-between">
                    <div className="flex items-center gap-2 md:gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Toggle Sidebar"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                    </div>

                    <button
                        onClick={openCommandPalette}
                        className="flex-1 max-w-xl mx-2 lg:mx-4 relative hidden sm:flex items-center group"
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

                    <button onClick={openCommandPalette} className="sm:hidden p-2 hover:bg-accent rounded-md">
                        <Search className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Finance might not need focus timer or google connect? Kept minimalistic for Finance. */}
                        {/* Removing FocusTimer/GoogleConnect for Finance Context */}
                        <LanguageToggle />
                        <ModeToggle />
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-0 md:p-4 lg:p-6">
                    <Outlet />
                </main>


            </div>
        </div>
    )
}

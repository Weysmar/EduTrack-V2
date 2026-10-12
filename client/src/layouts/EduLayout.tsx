import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { EduSidebar } from '@/components/layout/EduSidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { shouldHideTabBar } from '@/components/layout/navItems'
import { useNavT } from '@/components/layout/navI18n'
import { Menu, ArrowLeft, Search } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CommandPalette } from '@/components/CommandPalette'
import { useCommandStore } from '@/store/commandStore'
import { useSocket } from '@/hooks/useSocket'
import { useAuthStore } from '@/store/authStore'
import { useProfileStore } from '@/store/profileStore'
import { useCalendarStore } from '@/store/calendarStore'
import { useFocusStore } from '@/store/focusStore'
import { CompactFocusTimer } from '@/components/CompactFocusTimer'
import { useLanguage } from '@/components/language-provider'
import type { Course, Folder } from '@/lib/types'

// Loaded on demand: the map pulls reactflow and fetches every folder/course/item.
const KnowledgeMapModal = lazy(() =>
    import('@/components/knowledge-map/KnowledgeMapModal').then(m => ({ default: m.KnowledgeMapModal }))
)

const IS_MAC = typeof navigator !== 'undefined'
    && /Mac|iPhone|iPad|iPod/i.test((navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || '')

export function EduLayout() {
    const { t } = useLanguage()
    const tr = useNavT()
    useSocket()
    const location = useLocation()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const user = useAuthStore(state => state.user)
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)
    const activeProfile = useProfileStore(state => state.activeProfile)
    const switchProfile = useProfileStore(state => state.switchProfile)
    const [isMapOpen, setIsMapOpen] = useState(false)
    const openMap = useCallback(() => setIsMapOpen(true), [])
    const closeMap = useCallback(() => setIsMapOpen(false), [])

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
        if (isAuthenticated && user?.id && (!activeProfile || activeProfile.id !== user.id)) {
            switchProfile(user.id).catch(console.error)
        }
    }, [isAuthenticated, user?.id, activeProfile?.id, switchProfile])

    const setUrl = useCalendarStore(state => state.setUrl)
    const disconnect = useCalendarStore(state => state.disconnect)

    useEffect(() => {
        if (activeProfile?.settings?.google_calendar) {
            setUrl(activeProfile.settings.google_calendar)
        } else if (activeProfile && !activeProfile.settings?.google_calendar) {
            disconnect()
        }
    }, [activeProfile, setUrl, disconnect])

    const isSidebarOpen = useUIStore(state => state.isSidebarOpen)
    const isCollapsed = useUIStore(state => state.isCollapsed)
    const toggleSidebar = useUIStore(state => state.toggleSidebar)
    const closeSidebar = useUIStore(state => state.closeSidebar)
    const openCommandPalette = useCommandStore(state => state.open)

    // Focus timer: subscribe to the two fields we need only (timeLeft changes every second).
    const isFocusActive = useFocusStore(state => state.isActive)
    const tick = useFocusStore(state => state.tick)
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        if (isFocusActive) {
            interval = setInterval(tick, 1000);
        }
        return () => clearInterval(interval);
    }, [isFocusActive, tick]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) closeSidebar()
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [closeSidebar])

    useEffect(() => {
        if (window.innerWidth < 1024) closeSidebar()
    }, [location.pathname, closeSidebar])

    /** Hierarchical parent of the current page, or null when there is none. */
    const getBackTarget = (pathname: string): string | null => {
        const itemMatch = pathname.match(/^\/edu\/course\/([^/]+)\/item\//)
        if (itemMatch) return `/edu/course/${itemMatch[1]}`

        const courseMatch = pathname.match(/^\/edu\/course\/([^/]+)\/?$/)
        if (courseMatch) {
            const data = queryClient.getQueryData<{ courses?: Course[] }>(['courses'])
            const course = data?.courses?.find(c => String(c.id) === courseMatch[1])
            return course?.folderId != null && course.folderId !== '' ? `/edu/folder/${course.folderId}` : '/edu/dashboard'
        }

        const folderMatch = pathname.match(/^\/edu\/folder\/([^/]+)\/?$/)
        if (folderMatch) {
            const folders = queryClient.getQueryData<Folder[]>(['folders'])
            const folder = Array.isArray(folders) ? folders.find(f => String(f.id) === folderMatch[1]) : undefined
            return folder?.parentId != null && folder.parentId !== '' ? `/edu/folder/${folder.parentId}` : '/edu/dashboard'
        }

        if (pathname.startsWith('/edu/flashcards/study/')) return '/edu/flashcards'

        return null
    }

    const handleBack = () => {
        const target = getBackTarget(location.pathname)
        if (target) {
            navigate(target)
        } else if (location.key !== 'default') {
            // There is in-app history: going back stays inside the app.
            navigate(-1)
        } else {
            navigate('/edu/dashboard')
        }
    }

    const showBack = location.pathname !== '/edu/dashboard' && location.pathname !== '/edu' && location.pathname !== '/edu/'
    const showTabBar = !shouldHideTabBar(location.pathname)

    return (
        <div className="flex h-dvh w-full overflow-hidden bg-background relative">
            <CommandPalette onOpenKnowledgeMap={openMap} />
            {isMapOpen && (
                <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" aria-busy="true" />}>
                    <KnowledgeMapModal isOpen onClose={closeMap} />
                </Suspense>
            )}

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
                <EduSidebar onOpenKnowledgeMap={openMap} />
            </aside>

            <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-hidden transition-all duration-300">
                <header className="flex h-14 items-center gap-2 md:gap-4 border-b bg-card px-3 md:px-4 lg:px-6 justify-between shrink-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={tr('nav.toggleSidebar')}
                            title={tr('nav.toggleSidebar')}
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        {/* Back arrow: hierarchical parent (item -> course -> folder -> dashboard) */}
                        {showBack && (
                            <button
                                onClick={handleBack}
                                className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-xs font-medium"
                                aria-label={t('common.back')}
                                title={t('common.back')}
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span className="hidden sm:inline">{t('common.back')}</span>
                            </button>
                        )}
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
                                {IS_MAC ? <><span className="text-xs">⌘</span>K</> : 'Ctrl K'}
                            </kbd>
                        </div>
                    </button>

                    <button
                        onClick={openCommandPalette}
                        className="sm:hidden p-2 hover:bg-accent rounded-md"
                        aria-label={t('app.search')}
                        title={t('app.search')}
                    >
                        <Search className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1 md:gap-2">
                        <CompactFocusTimer />
                        <ModeToggle />
                    </div>
                </header>

                <main className={cn(
                    "flex-1 flex flex-col min-h-0 w-full max-w-full overflow-x-hidden",
                    location.pathname.includes('/study/')
                        ? "p-0 overflow-y-auto"
                        : location.pathname.includes('/item/')
                            ? "p-0 overflow-hidden"
                            : "overflow-y-auto p-0 md:p-4 lg:p-6"
                )}>
                    <Outlet />
                </main>

                {/* Mobile bottom tab bar: in the flex flow, so <main> is shortened by its height (+ safe area). */}
                {showTabBar && <MobileTabBar onOpenMenu={toggleSidebar} />}
            </div>
        </div>
    )
}

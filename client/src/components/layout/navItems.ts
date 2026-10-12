import { Home, Library, Layers, Network, CalendarDays, Timer, type LucideIcon } from 'lucide-react'

export interface PrimaryNavItem {
    to: string
    labelKey: string
    icon: LucideIcon
    /** Only active on an exact path match. */
    end?: boolean
    /** Shown in the mobile bottom tab bar. */
    inTabBar?: boolean
}

/** Primary navigation of the Edu app, shared by the sidebar, the mobile tab bar and the command palette. */
export const PRIMARY_NAV: PrimaryNavItem[] = [
    { to: '/edu/dashboard', labelKey: 'nav.home', icon: Home, end: true, inTabBar: true },
    { to: '/edu/library', labelKey: 'nav.library', icon: Library, inTabBar: true },
    { to: '/edu/flashcards', labelKey: 'nav.flashcards', icon: Layers, inTabBar: true },
    { to: '/edu/mindmaps', labelKey: 'nav.mindmaps', icon: Network },
    { to: '/edu/calendar', labelKey: 'nav.calendar', icon: CalendarDays, inTabBar: true },
    { to: '/edu/focus', labelKey: 'nav.focus', icon: Timer },
]

/** Paths where the mobile tab bar must be hidden (item page has its own toolbar, study sessions are full screen). */
export function shouldHideTabBar(pathname: string): boolean {
    return pathname.includes('/item/') || pathname.includes('/study/')
}

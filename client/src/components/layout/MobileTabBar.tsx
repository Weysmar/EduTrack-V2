import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRIMARY_NAV } from './navItems'
import { useNavT } from './navI18n'

interface MobileTabBarProps {
    onOpenMenu: () => void
}

const TAB_ITEMS = PRIMARY_NAV.filter((item) => item.inTabBar)

const tabClass = (active: boolean) =>
    cn(
        'relative flex h-full min-h-[44px] w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground'
    )

/**
 * Bottom tab bar for small screens (< md). It is rendered in the layout flow
 * (not fixed), so the scrollable <main> above it is automatically shortened.
 */
export function MobileTabBar({ onOpenMenu }: MobileTabBarProps) {
    const tr = useNavT()

    return (
        <nav
            aria-label={tr('nav.mainNav')}
            className="md:hidden shrink-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85 pb-[env(safe-area-inset-bottom)]"
        >
            <ul className="grid h-16 grid-cols-5">
                {TAB_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
                    <li key={to} className="min-w-0">
                        <NavLink to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
                            {({ isActive }) => (
                                <>
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute top-0 h-0.5 w-8 rounded-full bg-primary transition-opacity',
                                            isActive ? 'opacity-100' : 'opacity-0'
                                        )}
                                    />
                                    <Icon className="h-5 w-5 shrink-0" />
                                    <span className="max-w-full truncate">{tr(labelKey)}</span>
                                </>
                            )}
                        </NavLink>
                    </li>
                ))}
                <li className="min-w-0">
                    <button type="button" onClick={onOpenMenu} className={tabClass(false)} aria-label={tr('nav.menu')}>
                        <Menu className="h-5 w-5 shrink-0" />
                        <span className="max-w-full truncate">{tr('nav.menu')}</span>
                    </button>
                </li>
            </ul>
        </nav>
    )
}

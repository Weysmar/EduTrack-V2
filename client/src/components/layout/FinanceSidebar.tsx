import { LayoutGrid, PieChart, Wallet, CreditCard, Settings, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '@/components/language-provider'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'

export function FinanceSidebar() {
    const { t } = useLanguage()
    const { isCollapsed, toggleCollapse } = useUIStore()
    const location = useLocation()
    const logoSrc = '/logo.svg'

    const NavLink = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
        const isActive = location.pathname === to;
        return (
            <Link
                to={to}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors",
                    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    isCollapsed ? "justify-center p-2" : "px-3 py-2"
                )}
                title={label}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="text-sm">{label}</span>}
            </Link>
        )
    }

    return (
        <div className={cn("flex flex-col h-full bg-card border-r transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
            {/* Header */}
            <div className={cn("h-14 flex items-center border-b transition-all shrink-0", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
                {!isCollapsed && (
                    <Link to="/finance/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden">
                        <img src={logoSrc} alt="FinanceTrack" className="h-8 w-8 object-contain hue-rotate-90" /> {/* Hue rotate for diff color */}
                        <span className="font-bold text-lg whitespace-nowrap">FinanceTrack</span>
                    </Link>
                )}
                {isCollapsed && (
                    <Link to="/finance/dashboard" className="shrink-0 hover:opacity-80 flex justify-center w-full">
                        <img src={logoSrc} alt="FinanceTrack" className="h-8 w-8 object-contain hue-rotate-90" />
                    </Link>
                )}

                <button
                    onClick={toggleCollapse}
                    className={cn("text-muted-foreground hover:text-foreground transition-colors hidden lg:block", !isCollapsed && "ml-auto")}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>

            {/* Back to Hub */}
            <div className={cn("p-4 border-b", isCollapsed && "p-2")}>
                <Link
                    to="/hub"
                    className={cn(
                        "w-full flex items-center gap-2 bg-muted text-foreground font-medium rounded-md hover:opacity-90 transition-all border border-transparent hover:border-border",
                        isCollapsed ? "justify-center p-2" : "justify-center py-2 px-4"
                    )}
                >
                    <LayoutGrid className="h-4 w-4" />
                    {!isCollapsed && <span>Hub</span>}
                </Link>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                <NavLink to="/finance/dashboard" icon={LayoutGrid} label={t('finance.title') || "Dashboard"} />
                {/* Placeholder routes for future expansion */}
                {/* <NavLink to="/finance/transactions" icon={CreditCard} label="Transactions" /> */}
                {/* <NavLink to="/finance/budget" icon={PieChart} label="Budgets" /> */}
            </div>

            {/* Footer */}
            <div className={cn("border-t mt-auto flex items-center gap-2 transition-all", isCollapsed ? "p-2 justify-center" : "p-4")}>
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <ProfileDropdown />
                    </div>
                )}

                <Link
                    to="/finance/settings"
                    className="flex items-center justify-center p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border"
                >
                    <Settings className="h-5 w-5 text-muted-foreground" />
                </Link>
            </div>
        </div>
    )
}

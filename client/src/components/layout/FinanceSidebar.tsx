import { LayoutGrid, PieChart, Wallet, CreditCard, Settings, PanelLeftClose, PanelLeftOpen, LogOut, Plus, ChevronRight, ChevronDown, Building } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '@/components/language-provider'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { useFinanceStore } from '@/store/financeStore'
import { useFinance } from '@/hooks/useFinance';
import { useEffect, useState } from 'react'
import { BankFormModal } from '../finance/BankFormModal'

export function FinanceSidebar() {
    const { t } = useLanguage()
    const { isCollapsed, toggleCollapse } = useUIStore()
    // Use useFinance hook directly for better sync with TanStack Query
    const { banks, accounts, createBank } = useFinance()
    const location = useLocation()
    const logoSrc = '/logo.svg'

    const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);

    // Initial expansion logic
    useEffect(() => {
        if (banks.length > 0 && Object.keys(expandedBanks).length === 0) {
            const initialstate = banks.reduce((acc, bank) => ({ ...acc, [bank.id]: true }), {});
            // Also add "other" section
            setExpandedBanks({ ...initialstate, 'other': true });
        }
    }, [banks]);

    const toggleBank = (bankId: string) => {
        setExpandedBanks(prev => ({ ...prev, [bankId]: !prev[bankId] }));
    };

    const handleCreateBank = async (data: any) => {
        await createBank(data);
        setIsBankModalOpen(false);
    };

    // Group accounts by Bank
    const accountsByBank = accounts.reduce((acc, account) => {
        const key = account.bankId || 'other';
        if (!acc[key]) acc[key] = [];
        acc[key].push(account);
        return acc;
    }, {} as Record<string, typeof accounts>);

    const hasOtherAccounts = accountsByBank['other'] && accountsByBank['other'].length > 0;

    const NavLink = ({ to, icon: Icon, label, isActive }: { to: string, icon: any, label: string, isActive?: boolean }) => {
        const active = isActive || location.pathname === to;
        return (
            <Link
                to={to}
                className={cn(
                    "flex items-center gap-2 rounded-md transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    isCollapsed ? "justify-center p-2" : "px-3 py-2"
                )}
                title={label}
            >
                <Icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="text-sm truncate">{label}</span>}
            </Link>
        )
    }

    return (
        <div className={cn("flex flex-col h-full bg-card border-r transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
            {/* Header */}
            <div className={cn("h-14 flex items-center border-b transition-all shrink-0", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
                {!isCollapsed && (
                    <Link to="/finance/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden">
                        <img src={logoSrc} alt="FinanceTrack" className="h-8 w-8 object-contain hue-rotate-90" />
                        <span className="font-bold text-lg whitespace-nowrap">FinanceTrack</span>
                    </Link>
                )}
                {isCollapsed && (
                    <Link to="/finance/dashboard" className="shrink-0 hover:opacity-80 flex justify-center w-full">
                        <img src={logoSrc} alt="FinanceTrack" className="h-8 w-8 object-contain hue-rotate-90" />
                    </Link>
                )}
            </div>

            {/* Back to Hub */}
            <div className={cn("p-4 border-b space-y-2", isCollapsed && "p-2")}>
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

                {/* Divider */}
                <div className="my-4 border-t border-border/50" />

                {/* Banks Header */}
                {!isCollapsed && (
                    <div className="px-3 flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banques</h3>
                        <button onClick={() => setIsBankModalOpen(true)} className="hover:bg-muted p-1 rounded-full transition-colors">
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>
                )}

                {isCollapsed && (
                    <div className="flex justify-center mb-2">
                        <button onClick={() => setIsBankModalOpen(true)} className="hover:bg-muted p-2 rounded-full transition-colors">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Bank List */}
                <div className="space-y-4">
                    {banks.map(bank => (
                        <div key={bank.id} className="space-y-1">
                            {!isCollapsed ? (
                                <>
                                    <div className="w-full flex items-center gap-1 group/bank">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                toggleBank(bank.id);
                                            }}
                                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                                        >
                                            {expandedBanks[bank.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        </button>

                                        <Link
                                            to={`/finance/bank/${bank.id}`}
                                            className={cn(
                                                "flex-1 flex items-center gap-2 py-1.5 px-2 text-sm font-medium rounded-md transition-colors",
                                                location.pathname === `/finance/bank/${bank.id}`
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-foreground hover:bg-muted/50"
                                            )}
                                        >
                                            {bank.icon && !bank.icon.startsWith('http') ? (
                                                <span style={{ color: bank.color }}>{bank.icon}</span>
                                            ) : (
                                                <Building className="h-3 w-3" />
                                            )}
                                            <span className="truncate">{bank.name}</span>
                                        </Link>
                                    </div>

                                    {expandedBanks[bank.id] && (
                                        <div className="ml-4 pl-2 border-l border-border/50 space-y-1 mt-1">
                                            {accountsByBank[bank.id]?.map(account => (
                                                <NavLink
                                                    key={account.id}
                                                    to={`/finance/dashboard?accountId=${account.id}`}
                                                    icon={Wallet}
                                                    label={account.name}
                                                    isActive={location.search === `?accountId=${account.id}`}
                                                />
                                            ))}
                                            {(!accountsByBank[bank.id] || accountsByBank[bank.id].length === 0) && (
                                                <div className="px-3 py-1 text-xs text-muted-foreground italic">Aucun compte</div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-1 group relative">
                                    <Link to={`/finance/bank/${bank.id}`} className="p-2 rounded-md hover:bg-muted cursor-pointer relative block">
                                        {bank.icon && !bank.icon.startsWith('http') ? (
                                            <span style={{ color: bank.color }}>{bank.icon}</span>
                                        ) : (
                                            <Building className="h-4 w-4" />
                                        )}
                                        {/* Hover Tooltip for collapsed mode */}
                                        <div className="absolute left-10 top-0 bg-popover border text-popover-foreground px-2 py-1 rounded shadow-md hidden group-hover:block whitespace-nowrap z-50">
                                            {bank.name}
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Other Accounts (No Bank) */}
                    {hasOtherAccounts && (
                        <div className="space-y-1 mt-4">
                            {!isCollapsed ? (
                                <>
                                    <button
                                        onClick={() => toggleBank('other')}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                    >
                                        {expandedBanks['other'] ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                        <Wallet className="h-3 w-3 text-muted-foreground" />
                                        <span className="truncate">Autres Comptes</span>
                                    </button>

                                    {expandedBanks['other'] && (
                                        <div className="ml-4 pl-2 border-l border-border/50 space-y-1 mt-1">
                                            {accountsByBank['other'].map(account => (
                                                <NavLink
                                                    key={account.id}
                                                    to={`/finance/dashboard?accountId=${account.id}`}
                                                    icon={Wallet}
                                                    label={account.name}
                                                    isActive={location.search === `?accountId=${account.id}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex justify-center">
                                    <Wallet className="h-4 w-4 text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    )}
                </div>

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

            <BankFormModal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
                onSubmit={handleCreateBank}
            />
        </div>
    )
}

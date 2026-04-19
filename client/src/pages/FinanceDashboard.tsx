import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinanceStore } from '@/store/financeStore';
import { useFinance } from '@/hooks/useFinance';
import { useUIStore } from '@/store/uiStore';
import { Wallet, RefreshCw, Loader2, Filter, Trash2, Plus, ArrowLeftRight, Download, ShieldCheck } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionEditModal } from '@/components/finance/TransactionEditModal';
import { TransactionCreateModal } from '@/components/finance/TransactionCreateModal';
import { FinanceStatsCards } from '@/components/finance/dashboard/FinanceStatsCards';
import { ExpenseChart } from '@/components/finance/dashboard/ExpenseChart';
import { CashflowChart } from '@/components/finance/dashboard/CashflowChart';
import { HealthScoreWidget } from '@/components/finance/dashboard/HealthScoreWidget';
import { NetWorthChart } from '@/components/finance/dashboard/NetWorthChart';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { BudgetManager } from '@/components/finance/BudgetManager';
import { AdvancedFilterBar } from '@/components/finance/AdvancedFilterBar';
import { generateLocalAudit } from '@/lib/finance/auditEngine';

// Helper to get HSL values from CSS variables
const getHslColor = (variable: string) => {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variable).trim();
    return value ? `hsl(${value})` : '#64748b'; // fallback
};

export default function FinanceDashboard() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const accountIdParam = searchParams.get('accountId');

    // Data from React Query
    const { 
        transactions, accounts, banks, categories, budgets,
        isLoadingTransactions, isLoadingAccounts, isLoadingBanks,
        deleteAccount, deleteTransaction, updateTransaction,
        createTransaction,
        useBalanceHistory,
        refresh
    } = useFinance();

    const { data: balanceHistory, isLoading: isLoadingHistory } = useBalanceHistory(6);

    // UI/Filter state from Zustand
    const { 
        filters, setFilters, hideInternalTransfers, toggleInternalTransfers,
        editingTransaction, setEditingTransaction 
    } = useFinanceStore();

    useEffect(() => {
        console.log("💰 FinanceDashboard V4.0 (Unified Architecture) Loaded");
    }, []);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [auditContent, setAuditContent] = useState<string | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [showInternal, setShowInternal] = useState(!hideInternalTransfers);


    useEffect(() => {
        // Update colors on mount and when theme changes could happen (simplest is on mount or via observer, 
        // but for now mount + timeout usually catches initial theme load)
        const updateColors = () => {
            // We can read directly or rely on hardcoded Tailwind HSL maps if we know them.
            // Best dynamic way:
            setColors({
                primary: getHslColor('--primary'),
                green: '#10b981', // These standard colors might not change with theme, unlike primary
                red: '#ef4444'
            });
        };
        updateColors();
        // A simple way to react to theme change is listening to class changes on HTML, but useEffect dependency on nothing usually runs once.
        // We can re-calc if needed.
    }, []);

    // Filter transactions based on 'accountId' + store internal filtering
    const filteredTransactions = useMemo(() => {
        let base = transactions;
        
        // Month/Year Filter
        if (filters.month !== null && filters.year !== null) {
            base = base.filter(t => {
                const d = new Date(t.date);
                return d.getMonth() === filters.month && d.getFullYear() === filters.year;
            });
        }

        // Account Filter
        if (accountIdParam) {
            base = base.filter(t => t.accountId === accountIdParam);
        }

        // Internal Transfers Filter
        if (hideInternalTransfers) {
            base = base.filter(t => {
                const lowerDesc = t.description?.toLowerCase() || '';
                const isInternal = t.category === 'Virement Interne' ||
                    lowerDesc.includes('virement compte à compte') ||
                    t.classification?.startsWith('INTERNAL');
                return !isInternal;
            });
        }

        return base;
    }, [transactions, filters, accountIdParam, hideInternalTransfers]);

    const selectedAccount = accountIdParam ? accounts?.find(a => a.id === accountIdParam) : null;
    const totalBalance = useMemo(() => accounts.reduce((sum, a) => sum + (a.balance || 0), 0), [accounts]);
    const displayedBalance = selectedAccount ? (selectedAccount.balance || 0) : totalBalance;

    // Dynamic Title
    const title = selectedAccount ? selectedAccount.name : t('finance.dashboard.title');

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-3">
                        <span role="img" aria-label="finance">💰</span>
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg italic">
                        {t('finance.subtitle')}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {selectedAccount && (
                        <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                                if (confirm(t('finance.dashboard.deleteAccount.confirm'))) {
                                    await deleteAccount(selectedAccount.id);
                                    setSearchParams({});
                                }
                            }}
                            title={t('finance.dashboard.deleteAccount')}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={refresh}
                        disabled={isLoadingTransactions}
                        title={t('finance.refresh')}
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoadingTransactions && "animate-spin")} />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => window.open(`${import.meta.env.VITE_API_URL || '/api'}/finance/export?format=csv`, '_blank')}
                    >
                        <Download className="h-4 w-4" />
                        {t('action.export')} CSV
                    </Button>
                </div>
            </div>
            {/* Onboarding / Empty State */}
            {banks.length === 0 && !isLoadingBanks && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg mb-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold mb-2">{t('finance.banks.welcome')}</h2>
                            <p className="text-blue-100 max-w-xl">
                                {t('finance.banks.welcome.desc')}
                            </p>
                        </div>
                        <button
                            onClick={() => useUIStore.getState().openBankModal()}
                            className="bg-white text-blue-600 px-4 py-2 rounded-md font-semibold hover:bg-blue-50 transition"
                        >
                            {t('finance.banks.add')}
                        </button>
                    </div>
                </div>
            )}

            {/* Header / Active Filter */}
            {accountIdParam && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center justify-between border border-primary/20">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="font-medium">{t('finance.filter.active')} <strong>{selectedAccount ? selectedAccount.name : accountIdParam}</strong></span>
                    </div>
                    <button
                        onClick={() => {
                            setSearchParams({}); // Clear params
                        }}
                        className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Advanced Filters */}
            <AdvancedFilterBar
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
            />

            {/* Stats Cards */}
            <FinanceStatsCards
                transactions={filteredTransactions} // Pass filtered tx (respect both account + internal filter)
                totalBalance={displayedBalance}
                hideInternalTransfers={!showInternal} // Pass the inverted logic to the component
            />

            {/* Charts Section */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('finance.chart.activity')}</h2>
                <ExpenseChart transactions={filteredTransactions} hideInternalTransfers={!showInternal} />
            </div>

            {/* Cashflow Forecast */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('finance.chart.cashflow')}</h2>
                <CashflowChart />
            </div>

            {/* Net Worth History */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">{t('finance.chart.netWorth')}</h2>
                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Reconstruction rétroactive</div>
                </div>
                <NetWorthChart data={balanceHistory || []} isLoading={isLoadingHistory} />
            </div>

            {/* Health Score */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <HealthScoreWidget />
            </div>

            {/* Budgets Section */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <BudgetManager />
            </div>

            {/* Transaction List */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-6">{t('finance.history')}</h2>
                <TransactionList
                    transactions={filteredTransactions}
                    onDelete={deleteTransaction}
                    onEdit={(tx) => {
                        setEditingTransaction(tx);
                    }}
                    onEnrich={enrichTransaction}
                />
            </div>

            {editingTransaction && (
                <TransactionEditModal
                    transaction={editingTransaction}
                    accounts={accounts}
                    isOpen={!!editingTransaction}
                    onClose={() => {
                        setEditingTransaction(null);
                    }}
                    onSave={async (id, data) => {
                        await updateTransaction({ id, data });
                        setEditingTransaction(null);
                    }}
                />
            )}

            {isCreateOpen && (
                <TransactionCreateModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSave={async (data) => {
                        await createTransaction(data);
                        setIsCreateOpen(false);
                    }}
                    accountId={selectedAccount ? selectedAccount.id : undefined}
                    accounts={accounts}
                    categories={categories}
                />
            )}

            {/* Audit Modal Overlay */}
            {isAuditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl border flex flex-col max-h-[85vh] animate-in zoom-in-95">
                        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-purple-500" />
                                <h2 className="text-lg font-semibold">{t('finance.audit')}</h2>
                            </div>
                            <button onClick={() => setIsAuditOpen(false)} className="text-muted-foreground hover:text-foreground">{t('action.close')}</button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 prose dark:prose-invert max-w-none">
                            {isAuditing ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                    <p>{t('finance.dashboard.audit.generating')}</p>
                                </div>
                            ) : (
                                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                    {auditContent || t('finance.dashboard.audit.error')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/uiStore';
import { Wallet, RefreshCw, Sparkles, Loader2, Upload, Filter, X, Eye, EyeOff } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { TransactionEditModal } from '@/components/finance/TransactionEditModal';
import { FinanceStatsCards } from '@/components/finance/dashboard/FinanceStatsCards';
import { ExpenseChart } from '@/components/finance/dashboard/ExpenseChart';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

// Helper to get HSL values from CSS variables
const getHslColor = (variable: string) => {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variable).trim();
    return value ? `hsl(${value})` : '#64748b'; // fallback
};

// Import BankRightPanel

import { BudgetManager } from '@/components/finance/BudgetManager';

export default function FinanceDashboard() {
    useEffect(() => {
        console.log("💰 FinanceDashboard V3.1 (Account Filter) Loaded");
    }, []);

    const {
        transactions,
        fetchTransactions,
        getTotalIncome,
        getTotalExpenses,
        getBalance,
        getCategoryBreakdown,
        deleteTransaction,
        generateLocalAudit,
        enrichTransaction,
        importTransactions,
        accounts,
        fetchAccounts,
        fetchBanks,
        fetchBudgets // New action
    } = useFinanceStore();


    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const accountIdParam = searchParams.get('accountId');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [auditContent, setAuditContent] = useState<string | null>(null);
    const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);

    // Theme-aware colors
    const [colors, setColors] = useState({
        primary: '#3b82f6',
        green: '#10b981',
        red: '#ef4444'
    });

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

    useEffect(() => {
        console.log("💰 FinanceDashboard V2.2 (Chunk Fix) Loaded");
        fetchTransactions();
        fetchBudgets();
        fetchAccounts(); // Ensure accounts are loaded
        fetchBanks();    // Ensure banks are loaded
    }, []);

    const handleGenerateAudit = async () => {
        setIsAuditOpen(true);
        if (!auditContent) {
            setIsGeneratingAudit(true);
            const result = await generateLocalAudit();
            setAuditContent(result);
            setIsGeneratingAudit(false);
        }
    };

    const navigate = useNavigate();
    // Use store filters instead of local state
    const { filters, setFilters } = useFinanceStore();
    const hideInternal = filters.hideInternalTransfers ?? false;

    // Filter transactions based on 'accountId' only (hideInternal is handled by components)
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (accountIdParam) {
                return t.accountId === accountIdParam;
            }
            return true;
        });
    }, [transactions, accountIdParam]);

    // Calculate dynamic balance
    // If accountId is present, we should find that specific account's balance from store (if available) or calculate from transactions (less accurate for bank sync).
    // Better: use the account object from store if available.
    const selectedAccount = accountIdParam ? accounts?.find(a => a.id === accountIdParam) : null;

    // If filtering by account, use its specific balance. Otherwise use global calculated balance.
    // If filtering by account, use its specific balance. Otherwise use global calculated balance.
    const totalBalance = getBalance();
    const displayedBalance = selectedAccount
        ? selectedAccount.balance
        : totalBalance;

    // Dynamic Title
    const dashboardTitle = selectedAccount ? selectedAccount.name : "Portefeuille";



    return (
        <div className="flex h-screen overflow-hidden animate-in fade-in">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{dashboardTitle} 💰</h1>
                        <p className="text-muted-foreground">{t('finance.subtitle') || 'Gérez vos finances comme un pro.'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        {/* Filter Toggle */}
                        <button
                            onClick={() => setFilters({ hideInternalTransfers: !hideInternal })}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer",
                                hideInternal
                                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30"
                                    : "bg-card hover:bg-accent hover:text-accent-foreground"
                            )}
                            title={hideInternal ? 'Afficher les virements internes' : 'Masquer les virements internes'}
                        >
                            {hideInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span className="hidden sm:inline">Virements internes</span>
                        </button>

                        <button
                            onClick={() => navigate('/finance/import')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:opacity-90 transition shadow-sm font-medium"
                            title="Importer"
                        >
                            <Upload className="h-4 w-4" />
                            <span className="hidden sm:inline">Importer</span>
                        </button>
                        <button
                            onClick={() => { setAuditContent(null); handleGenerateAudit(); }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition shadow-sm font-medium"
                            title={t('finance.audit')}
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">{t('finance.audit')}</span>
                        </button>
                        <button
                            onClick={() => fetchTransactions()}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-md"
                            title={t('finance.refresh')}
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                {/* Onboarding / Empty State */}
                {useFinanceStore.getState().banks.length === 0 && (
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white shadow-lg mb-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold mb-2">Bienvenue sur FinanceTrack ! 👋</h2>
                                <p className="text-blue-100 max-w-xl">
                                    Commencez par ajouter votre première banque pour suivre vos comptes et importer vos transactions.
                                </p>
                            </div>
                            <button
                                onClick={() => useUIStore.getState().openBankModal()}
                                className="bg-white text-blue-600 px-4 py-2 rounded-md font-semibold hover:bg-blue-50 transition"
                            >
                                Ajouter une banque
                            </button>
                        </div>
                    </div>
                )}

                {/* Header / Active Filter */}
                {accountIdParam && selectedAccount && (
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg flex items-center justify-between border border-primary/20">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span className="font-medium">Filtré par compte : <strong>{selectedAccount.name}</strong></span>
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

                {/* Stats Cards */}
                {/* Stats Cards */}
                <FinanceStatsCards
                    transactions={filteredTransactions} // Pass filtered tx (by account) or all tx? Usually all tx but filtered by hideInternal in component
                    totalBalance={displayedBalance}
                    hideInternalTransfers={hideInternal}
                />

                {/* Charts Section */}
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">{t('finance.chart.activity')}</h2>
                    <ExpenseChart transactions={filteredTransactions} hideInternalTransfers={hideInternal} />
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
                            setIsModalOpen(true);
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
                            setIsModalOpen(false);
                            setEditingTransaction(null);
                        }}
                        onSave={async (id, data) => {
                            await useFinanceStore.getState().updateTransaction(id, data);
                            setEditingTransaction(null);
                            setIsModalOpen(false);
                        }}
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
                                {isGeneratingAudit ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                        <p>Analyse de vos dépenses en cours...</p>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                        {auditContent || "Erreur d'analyse."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* Closing Main Content Area via flex-1 div end */}
            </div>


        </div >
    );
}

import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFinanceStore } from '@/store/financeStore';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Plus, RefreshCw, Sparkles, Loader2, Upload, Filter, X } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { CreateTransactionModal } from '@/components/finance/CreateTransactionModal';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { StatCardVariant } from '@/components/ui/StatCard';

// Helper to get HSL values from CSS variables
const getHslColor = (variable: string) => {
    const root = document.documentElement;
    const value = getComputedStyle(root).getPropertyValue(variable).trim();
    return value ? `hsl(${value})` : '#64748b'; // fallback
};

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
        accounts
    } = useFinanceStore();

    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const accountIdParam = searchParams.get('accountId');

    const [isModalOpen, setIsModalOpen] = useState(false);
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
    const [hideInternal, setHideInternal] = useState(false);

    // Filter transactions based on 'hideInternal' and 'accountId'
    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (hideInternal) {
                if (t.classification === 'INTERNAL_INTRA_BANK' || t.classification === 'INTERNAL_INTER_BANK') return false;
            }
            if (accountIdParam) {
                return t.accountId === accountIdParam;
            }
            return true;
        });
    }, [transactions, hideInternal, accountIdParam]);

    // Helper to calculate totals based on filtered view
    const calculateTotals = (txs: typeof transactions) => {
        const income = txs.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
        const expense = txs.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
        return { income, expense };
    };

    // Calculate dynamic balance
    // If accountId is present, we should find that specific account's balance from store (if available) or calculate from transactions (less accurate for bank sync).
    // Better: use the account object from store if available.
    const selectedAccount = accountIdParam ? accounts?.find(a => a.id === accountIdParam) : null;

    // If filtering by account, use its specific balance. Otherwise use global calculated balance.
    const displayedBalance = selectedAccount
        ? selectedAccount.balance
        : getBalance(); // Global balance (sum of all accounts)

    const { income: filteredIncome, expense: filteredExpenses } = calculateTotals(filteredTransactions);

    // Re-calculate chart data
    const chartData = filteredTransactions
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .reduce((acc: any[], t) => {
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            const existing = acc.find(d => d.date === dateStr);
            if (existing) {
                if (t.amount > 0) existing.income += t.amount;
                else existing.expense += Math.abs(t.amount);
            } else {
                acc.push({
                    date: dateStr,
                    income: t.amount > 0 ? t.amount : 0,
                    expense: t.amount < 0 ? Math.abs(t.amount) : 0
                });
            }
            return acc;
        }, [])
        .slice(-30);

    // Re-calculate Pie Data
    const getFilteredCategoryBreakdown = () => {
        const breakdown = new Map<string, number>();
        filteredTransactions.forEach(t => {
            if (t.amount < 0) {
                const category = t.category || 'Uncategorized';
                breakdown.set(category, (breakdown.get(category) || 0) + Math.abs(t.amount));
            }
        });
        return Array.from(breakdown.entries()).map(([category, amount]) => ({ category, amount }));
    };
    const pieData = getFilteredCategoryBreakdown();

    const COLORS = [colors.green, colors.primary, '#f59e0b', colors.red, '#8b5cf6', '#ec4899'];

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('finance.title')} 💰</h1>
                    <p className="text-muted-foreground">{t('finance.subtitle') || 'Gérez vos finances comme un pro.'}</p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {/* Filter Toggle */}
                    <div className="flex items-center gap-2 mr-4 bg-card border px-3 py-2 rounded-md">
                        <input
                            type="checkbox"
                            id="hideInternal"
                            checked={hideInternal}
                            onChange={(e) => setHideInternal(e.target.checked)}
                            className="w-4 h-4 rounded text-primary focus:ring-primary"
                        />
                        <label htmlFor="hideInternal" className="text-sm font-medium cursor-pointer select-none">
                            Masquer virements internes
                        </label>
                    </div>

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
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        {t('finance.tx.new')}
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
                            onClick={() => { /* Ideally open Bank Manager, but it's in the sidebar. For now, prompt user to check sidebar. */
                                // Or we could expose a store action to open it? 
                                // Let's just point to it.
                                (document.querySelector('aside button') as HTMLElement)?.click(); // Hacky but effective if we don't have global UI state for sidebar modals
                            }}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCardVariant
                    title={accountIdParam ? "Solde du compte" : t('finance.balance')}
                    value={`${(Number(displayedBalance) || 0).toFixed(2)} €`}
                    icon={<Wallet className="h-6 w-6" />}
                    variant="primary"
                />
                <StatCardVariant
                    title={t('finance.income')}
                    value={`+${filteredIncome.toFixed(2)} €`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    variant="green"
                />
                <StatCardVariant
                    title={t('finance.expense')}
                    value={`-${filteredExpenses.toFixed(2)} €`}
                    icon={<TrendingDown className="h-6 w-6" />}
                    variant="red"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">{t('finance.chart.activity')}</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.green} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={colors.green} stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors.red} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={colors.red} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                                />
                                <Area type="monotone" dataKey="income" stroke={colors.green} fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name={t('finance.tx.income')} />
                                <Area type="monotone" dataKey="expense" stroke={colors.red} fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name={t('finance.tx.expense')} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">{t('finance.chart.categories')}</h2>
                    <div className="h-[300px] w-full relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="amount"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value.toFixed(2)} €`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                {t('item.noContent')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-6">{t('finance.history')}</h2>
                <TransactionList
                    transactions={transactions}
                    onDelete={deleteTransaction}
                    onEnrich={enrichTransaction}
                />
            </div>

            <CreateTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

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
        </div>
    );
}

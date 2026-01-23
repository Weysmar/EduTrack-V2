import { useEffect, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Plus, RefreshCw, Sparkles, Loader2, Upload } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { CreateTransactionModal } from '@/components/finance/CreateTransactionModal';
import { ImportTransactionModal } from '@/components/finance/ImportTransactionModal';
import { cn } from '@/lib/utils';
// import ReactMarkdown from 'react-markdown'; // Removed for stability
import { useLanguage } from '@/components/language-provider';

// Custom Card Component for stats
function StatCard({ title, value, icon, color }: any) {
    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className={cn("text-2xl font-bold mt-1", color)}>{value}</h3>
            </div>
            <div className={cn("p-3 rounded-full bg-muted/50", color ? `bg-${color.split('-')[1]}-500/10` : '')}>
                {icon}
            </div>
        </div>
    );
}

export default function FinanceDashboard() {
    const {
        transactions,
        fetchTransactions,
        getTotalIncome,
        getTotalExpenses,
        getBalance,
        getCategoryBreakdown,
        deleteTransaction,
        generateLocalAudit,
        enrichTransaction
    } = useFinanceStore();

    const { t } = useLanguage();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAuditOpen, setIsAuditOpen] = useState(false);
    const [auditContent, setAuditContent] = useState<string | null>(null);
    const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);

    useEffect(() => {
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

    const balance = getBalance();
    const income = getTotalIncome();
    const expenses = getTotalExpenses();

    // Prepare Chart Data
    const chartData = transactions
        .slice()
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .reduce((acc: any[], t) => {
            const dateStr = t.date.toISOString().split('T')[0];
            const existing = acc.find(d => d.date === dateStr);
            if (existing) {
                if (t.type === 'INCOME') existing.income += t.amount;
                else existing.expense += t.amount;
            } else {
                acc.push({
                    date: dateStr,
                    income: t.type === 'INCOME' ? t.amount : 0,
                    expense: t.type === 'EXPENSE' ? t.amount : 0
                });
            }
            return acc;
        }, [])
        .slice(-30);

    const pieData = getCategoryBreakdown();
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Placeholder import handler - will connect to backend API later
    const handleImport = async (file: File): Promise<void> => {
        // TODO: Call API endpoint
        console.log("Importing file:", file.name);
        await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));
    };

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('finance.title')} 💰</h1>
                    <p className="text-muted-foreground">{t('finance.subtitle') || 'Gérez vos finances comme un pro.'}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title={t('finance.balance')}
                    value={`${balance.toFixed(2)} €`}
                    icon={<Wallet className="h-6 w-6 text-primary" />}
                    color="text-primary"
                />
                <StatCard
                    title={t('finance.income')}
                    value={`+${income.toFixed(2)} €`}
                    icon={<TrendingUp className="h-6 w-6 text-green-500" />}
                    color="text-green-500"
                />
                <StatCard
                    title={t('finance.expense')}
                    value={`-${expenses.toFixed(2)} €`}
                    icon={<TrendingDown className="h-6 w-6 text-red-500" />}
                    color="text-red-500"
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
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                    formatter={(value: number) => [`${value.toFixed(2)} €`, '']}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name={t('finance.tx.income')} />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name={t('finance.tx.expense')} />
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
            <ImportTransactionModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={handleImport}
            />

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

import { useEffect, useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Plus, Filter, RefreshCw } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { CreateTransactionModal } from '@/components/finance/CreateTransactionModal';
import { cn } from '@/lib/utils'; // Assuming global util exists

// Custom Card Component for stats
function StatCard({ title, value, icon, trend, color }: any) {
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
        deleteTransaction
    } = useFinanceStore();

    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTransactions();
    }, []);

    const balance = getBalance();
    const income = getTotalIncome();
    const expenses = getTotalExpenses();

    // Prepare Chart Data
    // Group transactions by Date for AreaChart
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
        .slice(-30); // Last 30 points

    const pieData = getCategoryBreakdown();
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Portefeuille 💰</h1>
                    <p className="text-muted-foreground">Gérez vos finances comme un pro.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => fetchTransactions()}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-md"
                        title="Actualiser"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn-primary flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Nouvelle Transaction
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Solde Actuel"
                    value={`${balance.toFixed(2)} €`}
                    icon={<Wallet className="h-6 w-6 text-primary" />}
                    color="text-primary"
                />
                <StatCard
                    title="Revenus (Mois)"
                    value={`+${income.toFixed(2)} €`}
                    icon={<TrendingUp className="h-6 w-6 text-green-500" />}
                    color="text-green-500"
                />
                <StatCard
                    title="Dépenses (Mois)"
                    value={`-${expenses.toFixed(2)} €`}
                    icon={<TrendingDown className="h-6 w-6 text-red-500" />}
                    color="text-red-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Chart */}
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Activité Récente</h2>
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
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Categories Chart */}
                <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Répartition Dépenses</h2>
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
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                Pas assez de données
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Historique</h2>
                    <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <Filter className="h-4 w-4" />
                        Filtres
                    </button>
                </div>
                <TransactionList
                    transactions={transactions}
                    onDelete={deleteTransaction}
                />
            </div>

            <CreateTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}

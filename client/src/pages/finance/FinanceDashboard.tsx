import React from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { ArrowUpCircle, ArrowDownCircle, Wallet, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExpenseDistributionChart } from './ExpenseDistributionChart';
import { TransactionList } from './TransactionList';
import { AddTransactionModal } from './AddTransactionModal';
import { AdvancedFilterBar } from '../../components/finance/AdvancedFilterBar';
import { BankManager } from '../../components/finance/BankManager';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const FinanceDashboard: React.FC = () => {
    const { filters, setFilters, transactions, accounts, getTotalIncome, getTotalExpenses, getBalance } = useFinanceStore();

    // Derived state for display
    const currentDate = (filters.month !== null && filters.year !== null)
        ? new Date(filters.year, filters.month)
        : new Date();

    const isAllTime = filters.month === null;

    // Actions
    const handlePrevMonth = () => {
        if (isAllTime) {
            const now = new Date();
            setFilters({ month: now.getMonth(), year: now.getFullYear() });
            return;
        }
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        setFilters({ month: d.getMonth(), year: d.getFullYear() });
    };

    const handleNextMonth = () => {
        if (isAllTime) {
            const now = new Date();
            setFilters({ month: now.getMonth(), year: now.getFullYear() });
            return;
        }
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + 1);
        setFilters({ month: d.getMonth(), year: d.getFullYear() });
    };

    const toggleAllTime = () => {
        if (isAllTime) {
            const now = new Date();
            setFilters({ month: now.getMonth(), year: now.getFullYear() });
        } else {
            setFilters({ month: null, year: null });
        }
    };

    const balanceAmount = getBalance();
    const incomeAmount = getTotalIncome();
    const expenseAmount = getTotalExpenses();

    // Chart data based on transactions
    // (Simplified for now, using mock or existing transactions)
    // Ideally we aggregate transactions by month from the store
    const chartData = [
        { name: 'Jan', solde: 1200 },
        { name: 'Fév', solde: 1900 },
        { name: 'Mar', solde: 1500 },
        { name: 'Avr', solde: 2100 },
        { name: 'Mai', solde: 2400 },
        { name: 'Juin', solde: balanceAmount }, // Current
    ];


    // ... existing imports ...

    // ... inside FinanceDashboard ...
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isBankModalOpen, setIsBankModalOpen] = React.useState(false);

    return (
        <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-100 pb-24 md:pb-6">
            {/* Header & Navigation Mois */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Portefeuille
                    </h1>
                    <p className="text-slate-400 text-sm">Gérez vos finances comme un pro avec l'IA.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleAllTime}
                        className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isAllTime ? 'bg-blue-600 text-white' : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'}`}
                    >
                        Tout
                    </button>

                    <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </button>
                        <span className="font-medium min-w-[120px] text-center capitalize">
                            {isAllTime ? "Historique complet" : format(currentDate, 'MMMM yyyy', { locale: fr })}
                        </span>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBankModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition-all border border-slate-700"
                    >
                        <Wallet className="w-5 h-5" />
                        <span className="hidden md:inline">Banques</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Transaction</span>
                    </button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="w-full">
                <AdvancedFilterBar />
            </div>

            {/* ... rest of grid ... */}




            {/* KPIs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Solde / Reste à vivre */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet className="w-24 h-24 text-blue-500" />
                    </div>
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <Wallet className="w-5 h-5 text-blue-400" />
                        <span className="text-sm font-medium">Reste à vivre</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tight">
                        {balanceAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Solde actuel disponible</div>
                </div>

                {/* Revenus */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-sm font-medium">Entrées</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-400/90">
                        +{incomeAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }} />
                    </div>
                </div>

                {/* Dépenses */}
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                        <ArrowDownCircle className="w-5 h-5 text-rose-400" />
                        <span className="text-sm font-medium">Sorties</span>
                    </div>
                    <div className="text-2xl font-bold text-rose-400/90">
                        -{expenseAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((expenseAmount / (incomeAmount || 1)) * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Charts & Analysis */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Evolution Chart */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 h-[300px]">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            Évolution du solde
                        </h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorSolde" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}€`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="solde" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSolde)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Transactions List */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                        <TransactionList />
                    </div>
                </div>

                {/* Right Column: Distribution & Budgets */}
                <div className="space-y-6">
                    {/* Distribution Pie Chart */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 h-[350px]">
                        <h3 className="text-lg font-semibold mb-4 text-center">Répartition</h3>
                        <ExpenseDistributionChart />
                    </div>

                    {/* Budgets Progress */}
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 space-y-4">
                        <h3 className="text-lg font-semibold mb-2">Budgets</h3>

                        {/* Exemple Budget Item */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Alimentation</span>
                                <span className="text-slate-400">320€ / 400€</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-yellow-500 h-full rounded-full" style={{ width: '80%' }} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Loisirs</span>
                                <span className="text-slate-400">50€ / 150€</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full" style={{ width: '33%' }} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-300">Loyer</span>
                                <span className="text-slate-400 text-rose-400">800€ / 800€</span>
                            </div>
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-rose-500 h-full rounded-full" style={{ width: '100%' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            {isBankModalOpen && <BankManager onClose={() => setIsBankModalOpen(false)} />}
        </div >
    );
};

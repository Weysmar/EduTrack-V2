import { Transaction } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { useMemo } from 'react';
import clsx from 'clsx';
import { startOfMonth, isAfter } from 'date-fns';

interface Props {
    transactions?: Transaction[];
    totalBalance?: number;
}

export function FinanceStatsCards({ transactions = [], totalBalance = 0 }: Props) {

    const stats = useMemo(() => {
        const startOfCurrentMonth = startOfMonth(new Date());

        // Filter transactions for current month
        const currentMonthTransactions = transactions.filter(t =>
            isAfter(new Date(t.date), startOfCurrentMonth)
        );

        let income = 0;
        let expenses = 0;

        currentMonthTransactions.forEach(t => {
            // Ignore Internal transfers for income/expense calc to avoid noise
            if (t.classification === 'INTERNAL_INTRA_BANK' || t.classification === 'INTERNAL_INTER_BANK') return;

            if (t.amount > 0) {
                income += t.amount;
            } else {
                expenses += Math.abs(t.amount);
            }
        });

        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        return { income, expenses, savings, savingsRate };
    }, [transactions]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total Balance */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Solde Total</CardTitle>
                    <Wallet className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalBalance)}</div>
                    <p className="text-xs text-slate-500 mt-1">Tous comptes confondus</p>
                </CardContent>
            </Card>

            {/* Income */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Revenus (Mois)</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">+{formatCurrency(stats.income)}</div>
                    <p className="text-xs text-slate-500 mt-1">Ce mois-ci</p>
                </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Dépenses (Mois)</CardTitle>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-400">-{formatCurrency(stats.expenses)}</div>
                    <p className="text-xs text-slate-500 mt-1">Ce mois-ci</p>
                </CardContent>
            </Card>

            {/* Savings / Rate */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Épargne</CardTitle>
                    <PiggyBank className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                    <div className={clsx("text-2xl font-bold", stats.savings >= 0 ? "text-purple-400" : "text-amber-500")}>
                        {formatCurrency(stats.savings)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Taux: <span className={stats.savingsRate > 20 ? "text-green-400" : "text-slate-400"}>{stats.savingsRate.toFixed(1)}%</span>
                    </p>
                </CardContent>
            </Card>

        </div>
    );
}

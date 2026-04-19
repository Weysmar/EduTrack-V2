import { Transaction } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useMemo } from 'react';
import clsx from 'clsx';
import { startOfMonth, isAfter } from 'date-fns';
import { useLanguage } from '@/components/language-provider';

interface Props {
    transactions?: Transaction[];
    totalBalance?: number;
    hideInternalTransfers?: boolean;
}

export function FinanceStatsCards({ transactions = [], totalBalance = 0, hideInternalTransfers = false }: Props) {
    const { t } = useLanguage();

    const stats = useMemo(() => {
        const startOfCurrentMonth = startOfMonth(new Date());

        const currentMonthTransactions = transactions.filter(t =>
            isAfter(new Date(t.date), startOfCurrentMonth)
        );

        let income = 0;
        let expenses = 0;

        currentMonthTransactions.forEach(t => {
            if (t.classification?.startsWith('INTERNAL')) return;

            if (t.amount > 0) {
                income += t.amount;
            } else {
                expenses += Math.abs(t.amount);
            }
        });

        const savings = income - expenses;
        const savingsRate = income > 0 ? (savings / income) * 100 : 0;

        const uncategorizedCount = transactions.filter(t => !t.category || t.category === 'Non catégorisé' || t.category === 'Sans catégorie' || t.category === '').length;

        return { income, expenses, savings, savingsRate, uncategorizedCount };
    }, [transactions]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat(t('common.locale') || 'fr-FR', { style: 'currency', currency: 'EUR' }).format(val);

    const rateColor = stats.savingsRate >= 20 ? 'text-green-400' : stats.savingsRate >= 5 ? 'text-amber-400' : 'text-red-400';
    const rateBarColor = stats.savingsRate >= 20 ? 'bg-green-500' : stats.savingsRate >= 5 ? 'bg-amber-500' : 'bg-red-500';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Total Balance */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('finance.stats.balance') || 'Solde Total'}</CardTitle>
                    <Wallet className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-100">{formatCurrency(totalBalance)}</div>
                    <p className="text-xs text-slate-500 mt-1">{t('finance.stats.balance.all') || 'Tous comptes confondus'}</p>
                </CardContent>
            </Card>

            {/* Income */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('finance.stats.income.month') || 'Revenus (Mois)'}</CardTitle>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-400">+{formatCurrency(stats.income)}</div>
                    <p className="text-xs text-slate-500 mt-1">{t('finance.stats.currentMonth') || 'Ce mois-ci'}</p>
                </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">{t('finance.stats.expenses.month') || 'Dépenses (Mois)'}</CardTitle>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-400">-{formatCurrency(stats.expenses)}</div>
                    <p className="text-xs text-slate-500 mt-1">{t('finance.stats.currentMonth') || 'Ce mois-ci'}</p>
                </CardContent>
            </Card>

            {/* Savings Rate */}
            <Card className="bg-slate-900 border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">Taux d'épargne</CardTitle>
                    <PiggyBank className="w-4 h-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${rateColor}`}>
                        {stats.savingsRate.toFixed(1)}%
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${rateBarColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, stats.savingsRate))}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {stats.savingsRate >= 20 ? 'Excellent !' : stats.savingsRate >= 5 ? 'Correct' : 'À améliorer'}
                    </p>
                </CardContent>
            </Card>

            {/* Uncategorized Warning (Visible only if > 0) */}
            {stats.uncategorizedCount > 0 && (
                <Card className="bg-amber-500/10 border-amber-500/20 md:col-span-2 lg:col-span-4 border-dashed">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-500">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                {stats.uncategorizedCount} transactions en attente de catégorisation. Améliorez vos rapports !
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-amber-600 hover:bg-amber-500/20" onClick={() => {/* Future: Trigger auto-categorize modal */}}>
                            Catégoriser
                        </Button>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

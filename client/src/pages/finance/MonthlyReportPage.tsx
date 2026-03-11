import { useEffect, useState } from 'react';
import { financeApi } from '@/lib/api/financeApi';
import { MonthlyReport } from '@/types/finance';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Loader2, FileBarChart, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

const ChangeIndicator = ({ value }: { value: number }) => {
    if (Math.abs(value) < 0.5) return <span className="text-xs text-slate-500 flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0%</span>;
    const isPositive = value > 0;
    return (
        <span className={`text-xs flex items-center gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isPositive ? '+' : ''}{value.toFixed(1)}%
        </span>
    );
};

const BUDGET_STATUS_ICON = {
    OK: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    WARNING: <AlertCircle className="h-4 w-4 text-amber-400" />,
    EXCEEDED: <XCircle className="h-4 w-4 text-red-400" />
};

export default function MonthlyReportPage() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [report, setReport] = useState<MonthlyReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        financeApi.getMonthlyReport(year, month)
            .then(setReport)
            .catch(() => setReport(null))
            .finally(() => setLoading(false));
    }, [month, year]);

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };
    const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                        <FileBarChart className="h-6 w-6 text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100">Rapport mensuel</h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors">
                        <ChevronLeft className="h-4 w-4 text-slate-400" />
                    </button>
                    <span className="text-sm font-medium text-slate-200 min-w-[140px] text-center">
                        {MONTH_NAMES[month - 1]} {year}
                    </span>
                    <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-30">
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Génération du rapport...</span>
                </div>
            ) : !report ? (
                <div className="text-center py-16 text-slate-500">Erreur lors du chargement.</div>
            ) : report.summary.totalIncome === 0 && report.summary.totalExpenses === 0 ? (
                <div className="text-center py-20 px-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                    <FileBarChart className="h-12 w-12 text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-300">Aucune donnée</h3>
                    <p className="text-slate-500 mt-1">Aucune transaction n'a été enregistrée pour le mois de {MONTH_NAMES[month - 1].toLowerCase()} {year}.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-400 mb-1">Revenus</p>
                                <p className="text-xl font-bold text-emerald-400">{formatCurrency(report.summary.totalIncome)}</p>
                                <ChangeIndicator value={report.summary.incomeVsPreviousMonth} />
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-400 mb-1">Dépenses</p>
                                <p className="text-xl font-bold text-red-400">{formatCurrency(report.summary.totalExpenses)}</p>
                                <ChangeIndicator value={report.summary.expensesVsPreviousMonth} />
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <p className="text-xs text-slate-400 mb-1">Épargne</p>
                                <p className={`text-xl font-bold ${report.summary.savingsAmount >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                                    {formatCurrency(report.summary.savingsAmount)}
                                </p>
                                <span className="text-xs text-slate-500">{report.summary.savingsRate.toFixed(1)}% du revenu</span>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Two-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Expenses */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-200 mb-3">Top dépenses</h3>
                                <div className="space-y-2.5">
                                    {report.topExpenses.map((exp, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-300">{exp.category}</span>
                                                <span className="text-slate-400">{formatCurrency(exp.amount)} ({exp.percentOfTotal}%)</span>
                                            </div>
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                    style={{ width: `${exp.percentOfTotal}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Budget Report */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-200 mb-3">Budgets</h3>
                                {report.budgetReport.length === 0 ? (
                                    <p className="text-sm text-slate-500">Aucun budget configuré</p>
                                ) : (
                                    <div className="space-y-2">
                                        {report.budgetReport.map((b, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                {BUDGET_STATUS_ICON[b.status as keyof typeof BUDGET_STATUS_ICON] || BUDGET_STATUS_ICON.OK}
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm text-slate-300 truncate block">{b.category}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">{formatCurrency(b.spent)} / {formatCurrency(b.budgeted)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recurring Report */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-200 mb-3">Récurrences</h3>
                                {report.recurringReport.length === 0 ? (
                                    <p className="text-sm text-slate-500">Aucune récurrence détectée</p>
                                ) : (
                                    <div className="space-y-1.5">
                                        {report.recurringReport.map((r, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                {r.status === 'OK'
                                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                                    : <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                                                }
                                                <span className="text-slate-300 flex-1 truncate">{r.description}</span>
                                                <span className="text-xs text-slate-500">{formatCurrency(r.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Savings Goals */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-slate-200 mb-3">Objectifs d'épargne</h3>
                                {report.savingsGoals.length === 0 ? (
                                    <p className="text-sm text-slate-500">Aucun objectif actif</p>
                                ) : (
                                    <div className="space-y-3">
                                        {report.savingsGoals.map((g, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm text-slate-300">{g.name}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${g.onTrack ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {g.onTrack ? 'En bonne voie' : 'En retard'}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(g.progress, 100)}%`,
                                                            backgroundColor: g.onTrack ? '#10b981' : '#ef4444'
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    {formatCurrency(g.current)} / {formatCurrency(g.target)} ({g.progress.toFixed(0)}%)
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Health Score */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                                <span className="text-2xl font-bold" style={{
                                    color: report.healthScore >= 75 ? '#10b981' : report.healthScore >= 50 ? '#eab308' : '#ef4444'
                                }}>
                                    {report.healthScore}
                                </span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-200">Score de santé financière</h3>
                                <p className="text-xs text-slate-400">
                                    {report.healthScore >= 75 ? 'Très bonne santé financière ! 💪' :
                                        report.healthScore >= 50 ? 'Correct, des améliorations possibles.' :
                                            'Attention, votre situation financière nécessite des ajustements.'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

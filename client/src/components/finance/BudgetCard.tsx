import { Trash2, Edit2, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is here

interface BudgetCardProps {
    budget: any; // Type accurately
    spent: number;
    onEdit: (budget: any) => void;
    onDelete: (id: string) => void;
}

export function BudgetCard({ budget, spent, onEdit, onDelete }: BudgetCardProps) {
    const percentage = Math.min((spent / Number(budget.amount)) * 100, 100);
    const isOverBudget = spent > Number(budget.amount);

    // Determine color based on meaningful thresholds
    let colorClass = "bg-green-500";
    if (percentage > 80) colorClass = "bg-amber-500";
    if (percentage > 95 || isOverBudget) colorClass = "bg-red-500";

    // Pacing calculations (only applicable for MONTHLY budgets)
    const isMonthly = budget.period === 'MONTHLY';
    let pacingStatus = null;
    let projectedSpend = 0;

    if (isMonthly) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const totalDays = endOfMonth.getDate();
        const currentDay = now.getDate();
        const percentMonthElapsed = currentDay / totalDays;

        // Expected spend linearly
        const expectedSpend = Number(budget.amount) * percentMonthElapsed;

        // Projected total spend by end of month
        projectedSpend = (spent / currentDay) * totalDays;

        // Threshold: if we are 20% over the expected spend for this point in the month
        if (spent > expectedSpend * 1.2 && currentDay > 3) { // Ignore first 3 days noise
            pacingStatus = 'high';
        } else if (spent < expectedSpend * 0.8 && currentDay > 3) {
            pacingStatus = 'low';
        } else {
            pacingStatus = 'on_track';
        }
    }

    return (
        <div className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
                        {budget.category.icon || '💰'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">{budget.category.name}</h3>
                        <p className="text-xs text-muted-foreground">{budget.period === 'MONTHLY' ? 'Mensuel' : 'Annuel'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(budget)}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => onDelete(budget.id)}
                        className="p-1.5 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-1 mb-2">
                <div className="flex justify-between text-sm">
                    <span className={cn("font-medium", isOverBudget ? "text-red-500" : "text-slate-700 dark:text-slate-300")}>
                        {spent.toFixed(2)} €
                    </span>
                    <span className="text-muted-foreground">
                        / {Number(budget.amount).toFixed(0)} €
                    </span>
                </div>

                {/* Progress Bar Container */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500 ease-out", colorClass)}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            <div className="text-xs text-right">
                {isOverBudget ? (
                    <span className="text-red-500 font-medium flex items-center justify-end gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Dépas. de {(spent - Number(budget.amount)).toFixed(2)} €
                    </span>
                ) : (
                    <div className="flex flex-col items-end">
                        <span className="text-green-600 dark:text-green-400">
                            Reste {(Number(budget.amount) - spent).toFixed(2)} €
                        </span>
                        {isMonthly && pacingStatus === 'high' && !isOverBudget && (
                            <span className="text-amber-500 font-medium flex items-center justify-end gap-1 mt-1">
                                <TrendingUp className="w-3 h-3" />
                                Rythme élevé (Projec: {projectedSpend.toFixed(0)} €)
                            </span>
                        )}
                        {isMonthly && pacingStatus === 'low' && !isOverBudget && (
                            <span className="text-emerald-500 flex items-center justify-end gap-1 mt-1 opacity-80">
                                <TrendingDown className="w-3 h-3" />
                                Rythme sain
                            </span>
                        )}
                        {isMonthly && pacingStatus === 'on_track' && !isOverBudget && (
                            <span className="text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1 mt-1 opacity-80">
                                <ArrowRight className="w-3 h-3" />
                                Dans les clous
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

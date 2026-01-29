import { Trash2, Edit2, AlertCircle } from 'lucide-react';
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
                    <span className="text-green-600 dark:text-green-400">
                        Reste {(Number(budget.amount) - spent).toFixed(2)} €
                    </span>
                )}
            </div>
        </div>
    );
}

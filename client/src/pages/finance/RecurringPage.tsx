import { useState, useEffect, useMemo } from 'react';
import { financeApi } from '@/lib/api/financeApi';
import { RecurringTransaction } from '@/types/finance';
import { toast } from 'sonner';
import {
    RefreshCw, Loader2, TrendingDown, TrendingUp, Wallet,
    Pause, Play, Trash2, Calendar, BarChart3, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const FREQ_LABELS: Record<string, string> = {
    WEEKLY: 'Hebdomadaire',
    MONTHLY: 'Mensuel',
    QUARTERLY: 'Trimestriel',
    YEARLY: 'Annuel'
};

const FREQ_COLORS: Record<string, string> = {
    WEEKLY: 'bg-purple-500/20 text-purple-400',
    MONTHLY: 'bg-blue-500/20 text-blue-400',
    QUARTERLY: 'bg-amber-500/20 text-amber-400',
    YEARLY: 'bg-emerald-500/20 text-emerald-400'
};

export default function RecurringPage() {
    const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetecting, setIsDetecting] = useState(false);

    const fetchRecurring = async () => {
        setIsLoading(true);
        try {
            const data = await financeApi.getRecurring();
            setRecurring(data);
        } catch (err) {
            toast.error('Erreur lors du chargement des récurrences');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchRecurring(); }, []);

    const handleDetect = async () => {
        setIsDetecting(true);
        try {
            const result = await financeApi.detectRecurring();
            toast.success(`${result.detected} récurrences détectées (${result.created} nouvelles, ${result.updated} mises à jour)`);
            fetchRecurring();
        } catch (err) {
            toast.error('Erreur lors de la détection');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleTogglePause = async (item: RecurringTransaction) => {
        try {
            await financeApi.updateRecurring(item.id, { isPaused: !item.isPaused });
            setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, isPaused: !r.isPaused } : r));
            toast.success(item.isPaused ? 'Récurrence réactivée' : 'Récurrence mise en pause');
        } catch { toast.error('Erreur'); }
    };

    const handleDelete = async (id: string) => {
        try {
            await financeApi.deleteRecurring(id);
            setRecurring(prev => prev.filter(r => r.id !== id));
            toast.success('Récurrence supprimée');
        } catch { toast.error('Erreur'); }
    };

    const stats = useMemo(() => {
        const active = recurring.filter(r => !r.isPaused && r.isActive);
        const fixedExpenses = active.filter(r => r.type === 'EXPENSE').reduce((s, r) => s + Math.abs(r.averageAmount), 0);
        const fixedIncome = active.filter(r => r.type === 'INCOME').reduce((s, r) => s + r.averageAmount, 0);
        return { fixedExpenses, fixedIncome, count: active.length };
    }, [recurring]);

    const incomeRecurring = recurring.filter(r => r.type === 'INCOME');
    const expenseRecurring = recurring.filter(r => r.type === 'EXPENSE');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <RefreshCw className="h-6 w-6 text-blue-400" />
                        Transactions récurrentes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Identifiez automatiquement vos charges fixes et revenus réguliers
                    </p>
                </div>
                <button
                    onClick={handleDetect}
                    disabled={isDetecting}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {isDetecting ? 'Détection...' : 'Détecter'}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingDown className="h-4 w-4 text-red-400" />
                        Charges fixes mensuelles
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                        -{stats.fixedExpenses.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        Revenus fixes mensuels
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        +{stats.fixedIncome.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                </div>
                <div className="bg-card border rounded-xl p-4">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Wallet className="h-4 w-4 text-blue-400" />
                        Récurrences actives
                    </div>
                    <div className="text-2xl font-bold">{stats.count}</div>
                </div>
            </div>

            {/* Empty State */}
            {recurring.length === 0 && (
                <div className="text-center py-16 bg-card/50 border border-dashed rounded-xl">
                    <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucune récurrence détectée</h3>
                    <p className="text-muted-foreground mb-4">
                        Cliquez sur "Détecter" pour analyser vos transactions et identifier les paiements récurrents.
                    </p>
                </div>
            )}

            {/* Income Section */}
            {incomeRecurring.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                        Revenus récurrents ({incomeRecurring.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {incomeRecurring.map(item => (
                            <RecurringCard
                                key={item.id}
                                item={item}
                                onTogglePause={handleTogglePause}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Expense Section */}
            {expenseRecurring.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ArrowDownRight className="h-5 w-5 text-red-400" />
                        Charges récurrentes ({expenseRecurring.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {expenseRecurring.map(item => (
                            <RecurringCard
                                key={item.id}
                                item={item}
                                onTogglePause={handleTogglePause}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function RecurringCard({
    item,
    onTogglePause,
    onDelete
}: {
    item: RecurringTransaction;
    onTogglePause: (item: RecurringTransaction) => void;
    onDelete: (id: string) => void;
}) {
    const isExpense = item.type === 'EXPENSE';
    const formattedAmount = Math.abs(item.averageAmount).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const nextDate = item.nextExpectedDate ? new Date(item.nextExpectedDate) : null;

    return (
        <div className={`bg-card border rounded-xl p-4 transition-all hover:shadow-md ${item.isPaused ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FREQ_COLORS[item.frequency]}`}>
                            {FREQ_LABELS[item.frequency]}
                        </span>
                        {item.category && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                                {item.category}
                            </span>
                        )}
                        {item.isPaused && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                                En pause
                            </span>
                        )}
                    </div>
                    <p className="font-medium truncate" title={item.description}>
                        {item.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            ~{item.estimatedDay > 0 ? `le ${item.estimatedDay}` : 'variable'}
                        </span>
                        {nextDate && (
                            <span>
                                Prochaine : {nextDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        <span className="text-xs">
                            {item.occurrenceCount} occurrences • confiance {Math.round(item.confidenceScore * 100)}%
                        </span>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${isExpense ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isExpense ? '-' : '+'}{formattedAmount} €
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        <button
                            onClick={() => onTogglePause(item)}
                            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title={item.isPaused ? 'Réactiver' : 'Mettre en pause'}
                        >
                            {item.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={() => onDelete(item.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Supprimer"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Confidence bar */}
            <div className="mt-3">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${
                            item.confidenceScore > 0.7 ? 'bg-emerald-500' :
                            item.confidenceScore > 0.5 ? 'bg-blue-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.confidenceScore * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

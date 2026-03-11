import { useState, useEffect } from 'react';
import { financeApi } from '@/lib/api/financeApi';
import { SavingsGoal, SavingsProjection } from '@/types/finance';
import { toast } from 'sonner';
import {
    PiggyBank, Plus, Loader2, Target, Calendar, TrendingUp,
    Edit3, Trash2, CheckCircle2, XCircle, Sparkles
} from 'lucide-react';

const EMOJI_OPTIONS = ['🎯', '🏖️', '🏠', '🚗', '💻', '🎓', '💍', '🎸', '🏋️', '✈️', '🛡️', '💰'];

export default function SavingsPage() {
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [projections, setProjections] = useState<Record<string, SavingsProjection>>({});
    const [savingsRate, setSavingsRate] = useState<{ rate: number; income: number; expenses: number; savings: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [goalsData, rateData] = await Promise.all([
                financeApi.getSavingsGoals(),
                financeApi.getSavingsRate()
            ]);
            setGoals(goalsData);
            setSavingsRate(rateData);

            // Fetch projections for active goals
            const activeGoals = goalsData.filter(g => g.status === 'ACTIVE');
            const projResults: Record<string, SavingsProjection> = {};
            await Promise.all(activeGoals.map(async (g) => {
                try {
                    projResults[g.id] = await financeApi.getSavingsProjection(g.id);
                } catch { /* ignore individual errors */ }
            }));
            setProjections(projResults);
        } catch (err) {
            toast.error('Erreur lors du chargement');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async (data: { name: string; targetAmount: number; deadline?: string; icon?: string; color?: string }) => {
        try {
            await financeApi.createSavingsGoal(data);
            toast.success('Objectif créé !');
            setShowModal(false);
            fetchData();
        } catch { toast.error('Erreur lors de la création'); }
    };

    const handleUpdate = async (id: string, data: Partial<SavingsGoal>) => {
        try {
            await financeApi.updateSavingsGoal(id, data);
            toast.success('Objectif mis à jour');
            setEditingGoal(null);
            setShowModal(false);
            fetchData();
        } catch { toast.error('Erreur lors de la mise à jour'); }
    };

    const handleDelete = async (id: string) => {
        try {
            await financeApi.deleteSavingsGoal(id);
            setGoals(prev => prev.filter(g => g.id !== id));
            toast.success('Objectif supprimé');
        } catch { toast.error('Erreur'); }
    };

    const handleComplete = async (id: string) => {
        await handleUpdate(id, { status: 'COMPLETED' });
    };

    const handleAbandon = async (id: string) => {
        await handleUpdate(id, { status: 'ABANDONED' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const activeGoals = goals.filter(g => g.status === 'ACTIVE');
    const completedGoals = goals.filter(g => g.status === 'COMPLETED');
    const abandonedGoals = goals.filter(g => g.status === 'ABANDONED');

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PiggyBank className="h-6 w-6 text-emerald-400" />
                        Objectifs d'épargne
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Définissez vos objectifs et suivez votre progression
                    </p>
                </div>
                <button
                    onClick={() => { setEditingGoal(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nouvel objectif
                </button>
            </div>

            {/* Savings Rate Banner */}
            {savingsRate && (
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        <span className="font-semibold">Taux d'épargne ce mois</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Taux</div>
                            <div className={`text-2xl font-bold ${savingsRate.rate >= 20 ? 'text-emerald-400' : savingsRate.rate >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                                {savingsRate.rate.toFixed(1)}%
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Revenus</div>
                            <div className="text-lg font-semibold text-emerald-400">
                                +{savingsRate.income.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Dépenses</div>
                            <div className="text-lg font-semibold text-red-400">
                                -{savingsRate.expenses.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Épargné</div>
                            <div className={`text-lg font-semibold ${savingsRate.savings >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {savingsRate.savings.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                            </div>
                        </div>
                    </div>
                    {/* Rate bar */}
                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${savingsRate.rate >= 20 ? 'bg-emerald-500' : savingsRate.rate >= 5 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, savingsRate.rate))}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span className="text-emerald-400">Objectif: 20%</span>
                        <span>50%</span>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
                <div className="text-center py-16 bg-card/50 border border-dashed rounded-xl">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Aucun objectif d'épargne</h3>
                    <p className="text-muted-foreground mb-4">
                        Créez votre premier objectif pour commencer à suivre votre épargne.
                    </p>
                </div>
            )}

            {/* Active Goals */}
            {activeGoals.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-400" />
                        Objectifs actifs ({activeGoals.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeGoals.map(goal => (
                            <SavingsGoalCard
                                key={goal.id}
                                goal={goal}
                                projection={projections[goal.id]}
                                onEdit={(g) => { setEditingGoal(g); setShowModal(true); }}
                                onDelete={handleDelete}
                                onComplete={handleComplete}
                                onAbandon={handleAbandon}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        Objectifs atteints ({completedGoals.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {completedGoals.map(goal => (
                            <SavingsGoalCard
                                key={goal.id}
                                goal={goal}
                                onEdit={() => {}}
                                onDelete={handleDelete}
                                onComplete={() => {}}
                                onAbandon={() => {}}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Abandoned Goals */}
            {abandonedGoals.length > 0 && (
                <div className="space-y-3 opacity-60">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                        Objectifs abandonnés ({abandonedGoals.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {abandonedGoals.map(goal => (
                            <SavingsGoalCard
                                key={goal.id}
                                goal={goal}
                                onEdit={() => {}}
                                onDelete={handleDelete}
                                onComplete={() => {}}
                                onAbandon={() => {}}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <SavingsGoalModal
                    goal={editingGoal}
                    onSave={(data) => {
                        if (editingGoal) {
                            handleUpdate(editingGoal.id, data);
                        } else {
                            handleCreate(data as any);
                        }
                    }}
                    onClose={() => { setShowModal(false); setEditingGoal(null); }}
                />
            )}
        </div>
    );
}

// --- Goal Card Component ---

function SavingsGoalCard({
    goal,
    projection,
    onEdit,
    onDelete,
    onComplete,
    onAbandon
}: {
    goal: SavingsGoal;
    projection?: SavingsProjection;
    onEdit: (goal: SavingsGoal) => void;
    onDelete: (id: string) => void;
    onComplete: (id: string) => void;
    onAbandon: (id: string) => void;
}) {
    const progress = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0;
    const isActive = goal.status === 'ACTIVE';
    const isCompleted = goal.status === 'COMPLETED';

    // SVG circular progress
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className={`bg-card border rounded-xl p-5 transition-all hover:shadow-md ${isCompleted ? 'border-emerald-500/30' : ''}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{goal.icon || '🎯'}</span>
                    <div>
                        <h3 className="font-semibold">{goal.name}</h3>
                        {goal.deadline && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(goal.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>
                {isActive && (
                    <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(goal)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
                            <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Circular Progress */}
            <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                    <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
                        <circle
                            cx="48" cy="48" r={radius} fill="none"
                            strokeWidth="6" strokeLinecap="round"
                            style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
                            stroke={isCompleted ? '#10b981' : (goal.color || '#3b82f6')}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold">{Math.round(progress)}%</span>
                    </div>
                </div>
                <div className="flex-1">
                    <div className="text-sm text-muted-foreground">Progression</div>
                    <div className="text-lg font-bold">
                        {goal.currentAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                    <div className="text-sm text-muted-foreground">
                        sur {goal.targetAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                    </div>
                </div>
            </div>

            {/* Projection Info */}
            {projection && isActive && (
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-muted-foreground">Épargne mensuelle :</span>
                        <span className="font-medium">{projection.monthlyActualSavings.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    {projection.projectedCompletionDate && (
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-blue-400" />
                            <span className="text-muted-foreground">Estimation :</span>
                            <span className={`font-medium ${projection.onTrack ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {new Date(projection.projectedCompletionDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                {projection.onTrack ? ' ✅' : ' ⚠️'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Action buttons for active goals */}
            {isActive && (
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => onComplete(goal.id)}
                        className="flex-1 text-xs py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    >
                        Marquer atteint
                    </button>
                    <button
                        onClick={() => onAbandon(goal.id)}
                        className="text-xs py-1.5 px-3 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    >
                        Abandonner
                    </button>
                </div>
            )}

            {isCompleted && (
                <div className="flex items-center gap-2 mt-3 text-emerald-400 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Objectif atteint !
                </div>
            )}
        </div>
    );
}

// --- Modal Component ---

function SavingsGoalModal({
    goal,
    onSave,
    onClose
}: {
    goal: SavingsGoal | null;
    onSave: (data: any) => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(goal?.name || '');
    const [targetAmount, setTargetAmount] = useState(goal?.targetAmount?.toString() || '');
    const [currentAmount, setCurrentAmount] = useState(goal?.currentAmount?.toString() || '0');
    const [deadline, setDeadline] = useState(goal?.deadline ? goal.deadline.split('T')[0] : '');
    const [icon, setIcon] = useState(goal?.icon || '🎯');
    const [color, setColor] = useState(goal?.color || '#10b981');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !targetAmount) return;

        onSave({
            name,
            targetAmount: parseFloat(targetAmount),
            currentAmount: parseFloat(currentAmount || '0'),
            deadline: deadline || undefined,
            icon,
            color
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-card border rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-bold mb-4">
                    {goal ? 'Modifier l\'objectif' : 'Nouvel objectif d\'épargne'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Icon selector */}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">Icône</label>
                        <div className="flex flex-wrap gap-2">
                            {EMOJI_OPTIONS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={`text-xl p-1.5 rounded-md transition-all ${icon === emoji ? 'bg-primary/20 ring-2 ring-primary scale-110' : 'hover:bg-muted'}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">Nom de l'objectif *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Vacances été 2026"
                            className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground block mb-1">Montant cible (€) *</label>
                            <input
                                type="number"
                                value={targetAmount}
                                onChange={e => setTargetAmount(e.target.value)}
                                placeholder="2000"
                                step="0.01"
                                min="0"
                                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                                required
                            />
                        </div>
                        {goal && (
                            <div>
                                <label className="text-sm font-medium text-muted-foreground block mb-1">Montant actuel (€)</label>
                                <input
                                    type="number"
                                    value={currentAmount}
                                    onChange={e => setCurrentAmount(e.target.value)}
                                    step="0.01"
                                    min="0"
                                    className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">Deadline (optionnel)</label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-muted-foreground block mb-1">Couleur</label>
                        <input
                            type="color"
                            value={color}
                            onChange={e => setColor(e.target.value)}
                            className="h-9 w-full rounded-md border cursor-pointer"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-md border hover:bg-muted transition-colors text-sm"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors text-sm"
                        >
                            {goal ? 'Modifier' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

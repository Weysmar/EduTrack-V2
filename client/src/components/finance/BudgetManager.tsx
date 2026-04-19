import { useState, useMemo } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BudgetCard } from './BudgetCard';
import { useLanguage } from '@/components/language-provider';

// Simple Modal specific to Budget creation if standard Dialog is too complex to mock
const SimpleModal = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card w-full max-w-md rounded-xl border shadow-xl animate-in zoom-in-95">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export function BudgetManager() {
    const { t } = useLanguage();
    const { 
        budgets, transactions, categories, updateBudget, deleteCategory 
    } = useFinance();
    // updateBudget in useFinance handles both create and update via the same endpoint in this implementation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        period: 'MONTHLY'
    });

    // Calculate spent per category (current month)
    const categorySpend = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const spendMap = new Map<string, number>();
        const spendMapByName = new Map<string, number>();

        transactions.forEach(t => {
            if (t.amount < 0 && t.category) { // Expenses only
                const date = new Date(t.date);
                if (date >= startOfMonth && date <= endOfMonth) {
                    // Les catégories dans les transactions sont des chaînes (noms)
                    spendMapByName.set(t.category, (spendMapByName.get(t.category) || 0) + Math.abs(t.amount));

                    // On tente aussi de faire correspondre avec l'ID depuis la liste des catégories globales
                    const matchCat = categories.find(c => c.name === t.category);
                    if (matchCat) {
                        spendMap.set(matchCat.id, (spendMap.get(matchCat.id) || 0) + Math.abs(t.amount));
                    }
                }
            }
        });

        return { byId: spendMap, byName: spendMapByName };
    }, [transactions, categories]);

    const globalStats = useMemo(() => {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const totalDays = endOfMonth.getDate();
        const currentDay = now.getDate();
        const percentMonthElapsed = Math.round((currentDay / totalDays) * 100);

        let totalBudget = 0;
        let totalSpent = 0;

        budgets.forEach(b => {
            if (b.period === 'MONTHLY') {
                totalBudget += Number(b.amount);
                const spent = categorySpend.byId.get(b.categoryId) || categorySpend.byName.get(b.category?.name) || 0;
                totalSpent += spent;
            }
        });

        const percentBudgetUsed = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

        return {
            percentMonthElapsed,
            percentBudgetUsed,
            totalBudget,
            totalSpent
        };
    }, [budgets, categorySpend]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateBudget({
            categoryId: formData.categoryId,
            amount: parseFloat(formData.amount),
            period: formData.period as 'MONTHLY' | 'YEARLY'
        });
        setIsModalOpen(false);
        setEditingBudget(null);
        setFormData({ categoryId: '', amount: '', period: 'MONTHLY' });
    };

    const handleEdit = (budget: any) => {
        setEditingBudget(budget);
        setFormData({
            categoryId: budget.categoryId,
            amount: budget.amount,
            period: budget.period
        });
        setIsModalOpen(true);
    };

    const availableCategories = categories.filter(c =>
        !budgets.some(b => b.categoryId === c.id) || (editingBudget && editingBudget.categoryId === c.id)
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('finance.budget.title') || "Budgets Mensuels"}</h2>
                <Button size="sm" onClick={() => { setEditingBudget(null); setFormData({ categoryId: '', amount: '', period: 'MONTHLY' }); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('finance.budget.add') || "Nouveau Budget"}
                </Button>
            </div>

            {budgets.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
                    <p className="text-muted-foreground text-sm">{t('finance.budget.none') || "Aucun budget défini. Commencez à suivre vos dépenses !"}</p>
                </div>
            ) : (
                <>
                    {/* Global Pacing Banner */}
                    <div className="bg-muted/30 border rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground">{t('finance.budgets.overview') || "Vue d'ensemble du mois"}</h3>
                            <p className="text-sm mt-1">
                                {t('finance.budgets.pacing', { pmonth: globalStats.percentMonthElapsed, pbudget: globalStats.percentBudgetUsed }) ||
                                    `Vous êtes à ${globalStats.percentMonthElapsed}% du mois et avez consommé ${globalStats.percentBudgetUsed}% de votre enveloppe globale.`}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">{t('finance.budgets.total') || "Total Budgété"}</p>
                            <p className="text-lg font-bold">{globalStats.totalSpent.toFixed(0)} {t('common.currency')} / {globalStats.totalBudget.toFixed(0)} {t('common.currency')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {budgets.map(budget => (
                            <BudgetCard
                                key={budget.id}
                                budget={budget}
                                spent={categorySpend.byId.get(budget.categoryId) || categorySpend.byName.get(budget.category?.name) || 0}
                                onEdit={handleEdit}
                                onDelete={(id) => deleteBudget(id)}
                            />
                        ))}
                    </div>
                </>
            )
            }

            <SimpleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBudget ? t('finance.budget.edit') : t('finance.budget.add')}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingBudget && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">{t('finance.tx.category') || "Catégorie"}</label>
                            <select
                                className="w-full p-2 rounded-md bg-background border"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                            >
                                <option value="">{t('finance.tx.category.select') || "Choisir une catégorie..."}</option>
                                {availableCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium mb-1 block">{t('finance.budget.limit') || "Montant Limite (€)"}</label>
                        <input
                            type="number"
                            className="w-full p-2 rounded-md bg-background border"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button>
                        <Button type="submit">{editingBudget ? t('common.update') : t('common.add')}</Button>
                    </div>
                </form>
            </SimpleModal>
        </div >
    );
}

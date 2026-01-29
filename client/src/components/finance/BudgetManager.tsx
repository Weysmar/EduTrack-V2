import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BudgetCard } from './BudgetCard';

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
    const { budgets, transactions, categories, addBudget, updateBudget, deleteBudget } = useFinanceStore();
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

        transactions.forEach(t => {
            if (t.amount < 0 && t.category) { // Expenses only - use category string field
                const date = new Date(t.date);
                if (date >= startOfMonth && date <= endOfMonth) {
                    spendMap.set(t.category, (spendMap.get(t.category) || 0) + Math.abs(t.amount));
                }
            }
        });

        return spendMap;
    }, [transactions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBudget) {
            await updateBudget(editingBudget.id, {
                amount: parseFloat(formData.amount),
                period: formData.period
            });
        } else {
            await addBudget({
                categoryId: formData.categoryId,
                amount: parseFloat(formData.amount),
                period: formData.period
            });
        }
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
                <h2 className="text-lg font-semibold">Budgets Mensuels</h2>
                <Button size="sm" onClick={() => { setEditingBudget(null); setFormData({ categoryId: '', amount: '', period: 'MONTHLY' }); setIsModalOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nouveau Budget
                </Button>
            </div>

            {budgets.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed">
                    <p className="text-muted-foreground text-sm">Aucun budget défini. Commencez à suivre vos dépenses !</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgets.map(budget => (
                        <BudgetCard
                            key={budget.id}
                            budget={budget}
                            spent={categorySpend.get(budget.category.name) || categorySpend.get(budget.categoryId) || 0} // Try name match if ID fails, store logic varies
                            onEdit={handleEdit}
                            onDelete={(id) => deleteBudget(id)}
                        />
                    ))}
                </div>
            )}

            <SimpleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBudget ? "Modifier le budget" : "Créer un budget"}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingBudget && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">Catégorie</label>
                            <select
                                className="w-full p-2 rounded-md bg-background border"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                required
                            >
                                <option value="">Choisir une catégorie...</option>
                                {availableCategories.map(c => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium mb-1 block">Montant Limite (€)</label>
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
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button type="submit">{editingBudget ? "Mettre à jour" : "Créer"}</Button>
                    </div>
                </form>
            </SimpleModal>
        </div>
    );
}

import { Dialog } from '@headlessui/react';
import { Account, TransactionCategory } from '@/types/finance';
import { X, Check, Calendar, Tag, CreditCard, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/components/language-provider';

interface TransactionCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    accountId: string;
    categories: TransactionCategory[];
}

export function TransactionCreateModal({
    isOpen,
    onClose,
    onSave,
    accountId,
    categories
}: TransactionCreateModalProps) {
    const { t } = useLanguage();
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'EXPENSE',
        category: '',
        classification: 'EXTERNAL'
    });

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const amount = parseFloat(formData.amount);
            const finalAmount = formData.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);

            await onSave({
                ...formData,
                accountId,
                amount: finalAmount,
                date: new Date(formData.date).toISOString()
            });
            onClose();
        } catch (error) {
            console.error('Failed to create transaction:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-slate-100 italic">
                                {t('finance.dashboard.newOp') || "Ajouter une opération ✍️"}
                            </Dialog.Title>
                            <p className="text-sm text-slate-400 mt-1">{t('finance.tx.manual') || "Saisie manuelle"}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">
                                {t('finance.tx.description') || "Description"}
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('finance.tx.description.placeholder') || "ex: Courses Leclerc, Loyer..."}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">
                                    {t('finance.tx.type') || "Type"}
                                </label>
                                <div className="flex p-1 bg-slate-800 rounded-lg border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${formData.type === 'EXPENSE'
                                            ? 'bg-red-500/20 text-red-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {t('finance.tx.type.expense') || "Dépense"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${formData.type === 'INCOME'
                                            ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {t('finance.tx.type.income') || "Revenu"}
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1">
                                    {t('finance.tx.amount') || "Montant"}
                                </label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-4 pr-8 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="0.00"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                                </div>
                            </div>
                        </div>

                        {/* Date & Category */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                    <Calendar size={12} />
                                    {t('finance.tx.date') || "Date"}
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                    <Tag size={12} />
                                    {t('finance.tx.category') || "Catégorie"}
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-sm"
                                    >
                                        <option value="">{t('finance.tx.category.none') || "Non classé"}</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mt-8 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSaving}
                                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-lg"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                <Check size={18} />
                                {isSaving ? t('common.loading') : t('common.submit')}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

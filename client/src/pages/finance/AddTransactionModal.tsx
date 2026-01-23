import React from 'react';
import { X } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { TransactionType } from '../../types/finance';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose }) => {
    const addTransaction = useFinanceStore(s => s.addTransaction);

    // State simple pour le formulaire (à remplacer par react-hook-form pour prod)
    const [formData, setFormData] = React.useState({
        amount: '',
        description: '',
        type: 'EXPENSE' as TransactionType,
        category: 'ALIMENTATION'
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addTransaction({
            id: Math.random().toString(), // Temp ID
            profileId: 'current-user-id', // Would come from auth context
            amount: parseFloat(formData.amount),
            description: formData.description,
            type: formData.type,
            date: new Date(),
            categoryId: null, // Should be selected from categories
            isRecurring: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        onClose();
        // Reset form
        setFormData({
            amount: '',
            description: '',
            type: 'EXPENSE',
            category: 'ALIMENTATION'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-100">Nouvelle Transaction</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Type Switcher */}
                    <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'EXPENSE'
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Dépense
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === 'INCOME'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Revenu
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Montant</label>
                        <div className="relative">
                            <input
                                type="number"
                                required
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pl-10"
                                placeholder="0.00"
                                step="0.01"
                            />
                            <span className="absolute left-4 top-3 text-slate-500">€</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-400 mb-1">Description</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="Ex: Courses, Loyer..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all mt-4"
                    >
                        Ajouter la transaction
                    </button>
                </form>
            </div>
        </div>
    );
};

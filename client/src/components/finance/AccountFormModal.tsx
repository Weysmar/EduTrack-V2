import { Dialog } from '@headlessui/react';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { Account } from '@/types/finance';
import { Check } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Account | null;
    bankId: string;
}

export function AccountFormModal({ isOpen, onClose, onSubmit, initialData, bankId }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'CHECKING',
        balance: 0,
        currency: 'EUR',
        accountNumber: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                balance: initialData.balance || 0,
                currency: initialData.currency,
                accountNumber: initialData.accountNumber || ''
            });
        } else {
            setFormData({
                name: '',
                type: 'CHECKING',
                balance: 0,
                currency: 'EUR',
                accountNumber: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...formData, bankId });
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-xl">
                    <Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">
                        {initialData ? 'Modifier le compte' : 'Ajouter un compte'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="block text-sm font-medium text-slate-300">Nom du compte</label>
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="ex: Compte Courant"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="type" className="block text-sm font-medium text-slate-300">Type</label>
                            <select
                                id="type"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="CHECKING">Compte Courant</option>
                                <option value="SAVINGS">Épargne</option>
                                <option value="CREDIT">Crédit</option>
                                <option value="INVESTMENT">Investissement</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="balance" className="block text-sm font-medium text-slate-300">Solde Initial</label>
                                <input
                                    id="balance"
                                    type="number"
                                    step="0.01"
                                    value={formData.balance}
                                    onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="currency" className="block text-sm font-medium text-slate-300">Devise</label>
                                <input
                                    id="currency"
                                    type="text"
                                    value={formData.currency}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="number" className="block text-sm font-medium text-slate-300">Numéro de compte (Optionnel)</label>
                            <input
                                id="number"
                                type="text"
                                value={formData.accountNumber}
                                onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                placeholder="ex: ****1234"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                            >
                                <Check size={18} />
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

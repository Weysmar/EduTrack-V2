import { Dialog } from '@headlessui/react';
import { Transaction, TransactionClassification, Account } from '@/types/finance';
import { X, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ClassificationBadge } from './ClassificationBadge';

interface TransactionEditModalProps {
    transaction: Transaction;
    accounts: Account[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactionId: string, updates: Partial<Transaction>) => Promise<void>;
    onReclassify?: (transactionId: string) => Promise<void>;
}

const CLASSIFICATION_OPTIONS: { value: TransactionClassification; label: string; description: string }[] = [
    {
        value: 'EXTERNAL',
        label: 'Paiement Externe',
        description: 'Transaction vers un tiers (paiements, prélèvements, virements externes)'
    },
    {
        value: 'INTERNAL_INTRA_BANK',
        label: 'Virement Interne (Même Banque)',
        description: 'Transfert entre comptes de la même banque'
    },
    {
        value: 'INTERNAL_INTER_BANK',
        label: 'Virement Interne (Banques Différentes)',
        description: 'Transfert entre vos comptes dans des banques différentes'
    },
    {
        value: 'UNKNOWN',
        label: 'Inconnu',
        description: 'Classification incertaine ou ambiguë'
    }
];

export function TransactionEditModal({
    transaction,
    accounts,
    isOpen,
    onClose,
    onSave,
    onReclassify
}: TransactionEditModalProps) {
    const [classification, setClassification] = useState<TransactionClassification>(transaction.classification);
    const [linkedAccountId, setLinkedAccountId] = useState<string>(transaction.linkedAccountId || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setClassification(transaction.classification);
        setLinkedAccountId(transaction.linkedAccountId || '');
    }, [transaction, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: Partial<Transaction> = {
                classification,
                linkedAccountId: classification.startsWith('INTERNAL_') ? linkedAccountId : null
            };
            await onSave(transaction.id, updates);
            onClose();
        } catch (error) {
            console.error('Failed to save transaction:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReclassify = async () => {
        if (!onReclassify) return;
        setIsSaving(true);
        try {
            await onReclassify(transaction.id);
            onClose();
        } catch (error) {
            console.error('Failed to reclassify:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isInternalTransfer = classification.startsWith('INTERNAL_');

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-slate-100">
                                Éditer la transaction
                            </Dialog.Title>
                            <p className="text-sm text-slate-400 mt-1">{transaction.description}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Transaction Details */}
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-slate-500">Date</div>
                                <div className="text-slate-200 font-medium">
                                    {new Date(transaction.date).toLocaleDateString('fr-FR')}
                                </div>
                            </div>
                            <div>
                                <div className="text-slate-500">Montant</div>
                                <div className={`font-bold ${transaction.amount >= 0 ? 'text-green-400' : 'text-slate-200'}`}>
                                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(transaction.amount)}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <div className="text-slate-500 mb-1">Classification actuelle</div>
                                <ClassificationBadge
                                    classification={transaction.classification}
                                    confidence={transaction.classificationConfidence}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Classification Selector */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Nouvelle classification
                            </label>
                            <div className="space-y-2">
                                {CLASSIFICATION_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setClassification(option.value)}
                                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${classification === option.value
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="font-medium text-slate-200">{option.label}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{option.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Linked Account Selector (only for Internal transfers) */}
                        {isInternalTransfer && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Compte bénéficiaire
                                </label>
                                <select
                                    value={linkedAccountId}
                                    onChange={(e) => setLinkedAccountId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sélectionnez un compte...</option>
                                    {accounts
                                        .filter(acc => acc.id !== transaction.accountId)
                                        .map((acc) => (
                                            <option key={acc.id} value={acc.id}>
                                                {acc.name} ({acc.bank?.name})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
                        {onReclassify && (
                            <button
                                onClick={handleReclassify}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={16} />
                                Re-classifier automatiquement
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Save size={18} />
                                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

import { Dialog } from '@headlessui/react';
import { Transaction, TransactionClassification, Account } from '@/types/finance';
import { X, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ClassificationBadge } from './ClassificationBadge';
import { useLanguage } from '@/components/language-provider';

interface TransactionEditModalProps {
    transaction: Transaction;
    accounts: Account[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactionId: string, updates: Partial<Transaction>) => Promise<void>;
    onReclassify?: (transactionId: string) => Promise<void>;
}


export function TransactionEditModal({
    transaction,
    accounts,
    isOpen,
    onClose,
    onSave,
    onReclassify
}: TransactionEditModalProps) {
    const { t } = useLanguage();

    const CLASSIFICATION_OPTIONS: { value: TransactionClassification; label: string; description: string }[] = [
        {
            value: 'EXTERNAL',
            label: t('finance.tx.classification.external'),
            description: t('finance.tx.classification.external.desc')
        },
        {
            value: 'INTERNAL_INTRA_BANK',
            label: t('finance.tx.classification.internal_intra'),
            description: t('finance.tx.classification.internal_intra.desc')
        },
        {
            value: 'INTERNAL_INTER_BANK',
            label: t('finance.tx.classification.internal_inter'),
            description: t('finance.tx.classification.internal_inter.desc')
        },
        {
            value: 'UNKNOWN',
            label: t('finance.tx.classification.unknown'),
            description: t('finance.tx.classification.unknown.desc')
        }
    ];
    const [classification, setClassification] = useState<TransactionClassification>(transaction.classification);
    const [linkedAccountId, setLinkedAccountId] = useState<string>(transaction.linkedAccountId || '');
    const [date, setDate] = useState<string>(new Date(transaction.date).toISOString().split('T')[0]);
    const [amount, setAmount] = useState<string>(Math.abs(transaction.amount).toString());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setClassification(transaction.classification);
        setLinkedAccountId(transaction.linkedAccountId || '');
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
        setAmount(Math.abs(transaction.amount).toString());
    }, [transaction, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const numAmount = parseFloat(amount);
            const finalAmount = transaction.amount >= 0 ? Math.abs(numAmount) : -Math.abs(numAmount);

            const updates: Partial<Transaction> = {
                classification,
                linkedAccountId: classification.startsWith('INTERNAL_') ? linkedAccountId : null,
                date: new Date(date).toISOString(),
                amount: finalAmount
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
                                {t('finance.tx.edit.title')}
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
                            <div className="space-y-1">
                                <label className="text-slate-500 block">{t('finance.tx.date')}</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full [color-scheme:dark]"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-slate-500 block">{t('finance.tx.amount')} ({t('common.currency')})</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className={`bg-slate-900 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full pr-6 ${transaction.amount >= 0 ? 'text-green-400' : 'text-slate-100'}`}
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">€</span>
                                </div>
                            </div>
                            <div className="col-span-2 mt-2">
                                <div className="text-slate-500 mb-1">{t('finance.tx.edit.currentClassification')}</div>
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
                                {t('finance.tx.classification.new') || "Nouvelle classification"}
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
                                    {t('finance.tx.linkedAccount') || "Compte bénéficiaire"}
                                </label>
                                <select
                                    value={linkedAccountId}
                                    onChange={(e) => setLinkedAccountId(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">{t('finance.import.account.select') || "Sélectionnez un compte..."}</option>
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
                                {t('finance.tx.edit.reclassify')}
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                onClick={onClose}
                                disabled={isSaving}
                                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Save size={18} />
                                {isSaving ? t('common.loading') : t('common.save')}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

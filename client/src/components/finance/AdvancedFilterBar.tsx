import React, { useState } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguage } from '@/components/language-provider';
import { Filter, X, Check } from 'lucide-react';

interface AdvancedFilterBarProps {
    isOpen: boolean;
    onClose: () => void;
}

import { useFinance } from '@/hooks/useFinance';

export const AdvancedFilterBar = ({ isOpen, onClose }: AdvancedFilterBarProps) => {
    const { filters, setFilters } = useFinanceStore();
    const { accounts, banks, transactions } = useFinance();
    const { t } = useLanguage();

    // Local state for deferred update (don't update on every keystroke)
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');

    const applyFilters = () => {
        setFilters({
            ...filters,
            minAmount: minAmount ? parseFloat(minAmount) : null,
            maxAmount: maxAmount ? parseFloat(maxAmount) : null
        });
        onClose();
    };

    const clearFilters = () => {
        setFilters({
            accountId: null,
            categoryId: null,
            minAmount: null,
            maxAmount: null,
            month: new Date().getMonth(),
            year: new Date().getFullYear()
        });
        setMinAmount('');
        setMaxAmount('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 relative">
            <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-slate-200">{t('finance.filter.advanced')}</span>
                {(filters.accountId || filters.categoryId) && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">{t('finance.filter.active')}</span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">

                {/* Amount Range */}
                <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t('finance.tx.amount')} (€)</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            placeholder="Min"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-slate-600">-</span>
                        <input
                            type="number"
                            placeholder="Max"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Account Select */}
                <div className="space-y-2">
                    <label className="text-sm text-slate-400">{t('finance.filter.account')}</label>
                    <select
                        value={filters.accountId || ''}
                        onChange={(e) => setFilters({ accountId: e.target.value || null })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="">{t('finance.filter.account.all')}</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {/* Masquer Virements Internes */}
                <div className="space-y-2 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                        <input
                            type="checkbox"
                            checked={filters.hideInternalTransfers || false}
                            onChange={(e) => setFilters({ hideInternalTransfers: e.target.checked })}
                            className="w-4 h-4 text-blue-600 bg-slate-950 border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <span className="text-sm text-slate-300 font-medium">{t('finance.filter.internal.hide')}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{t('finance.filter.internal.desc')}</p>
                        </div>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2 pr-2">
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={applyFilters}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                    >
                        <Check className="w-4 h-4" />
                        {t('common.submit')}
                    </button>
                </div>
            </div>
        </div>
    );
};

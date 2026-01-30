import React, { useState } from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguage } from '@/components/language-provider'; // If exists? Or use t from somewhere else
import { Filter, X, Check } from 'lucide-react';

export const AdvancedFilterBar = () => {
    const { filters, setFilters, accounts, banks, transactions } = useFinanceStore();
    const [isOpen, setIsOpen] = useState(false);

    // Local state for deferred update (don't update on every keystroke)
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');

    const applyFilters = () => {
        setFilters({
            ...filters,
            // Add min/max logic to store filters later. 
            // For now, we need to update the store interface to accept these.
        });
        setIsOpen(false);
    };

    const clearFilters = () => {
        setFilters({
            accountId: null,
            categoryId: null,
            month: new Date().getMonth(),
            year: new Date().getFullYear()
        });
        setMinAmount('');
        setMaxAmount('');
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-slate-200">Filtres Avancés</span>
                    {(filters.accountId || filters.categoryId) && (
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">Actif</span>
                    )}
                </div>
                <button className="text-slate-400 hover:text-white transition-colors">
                    {isOpen ? 'Masquer' : 'Afficher'}
                </button>
            </div>

            {isOpen && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-2">

                    {/* Amount Range */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Montant (€)</label>
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
                        <label className="text-sm text-slate-400">Compte</label>
                        <select
                            value={filters.accountId || ''}
                            onChange={(e) => setFilters({ accountId: e.target.value || null })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Tous les comptes</option>
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
                                <span className="text-sm text-slate-300 font-medium">Masquer virements internes</span>
                                <p className="text-xs text-slate-500 mt-0.5">Afficher uniquement les flux externes</p>
                            </div>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end gap-2">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Réinitialiser
                        </button>
                        <button
                            onClick={applyFilters}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Check className="w-4 h-4" />
                            Appliquer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

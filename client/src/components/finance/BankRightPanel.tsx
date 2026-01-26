import React, { useState } from 'react';
import { useFinanceStore } from '@/store/financeStore';
// Fix: Import Account instead of FinancialAccount
import { Bank, Account } from '@/types/finance';
import { Plus, ChevronDown, ChevronRight, MoreVertical, CreditCard, Building2, Wallet, PiggyBank, Globe, Trash2, Edit2, Archive } from 'lucide-react';
import { cn, maskIban } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { BankManager } from '@/components/finance/BankManager';

const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
};

export const BankRightPanel: React.FC = () => {
    const { banks, accounts, fetchBanks, deleteBank, updateBank, deleteAccount, updateAccount } = useFinanceStore();
    const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
    const [isBankManagerOpen, setIsBankManagerOpen] = useState(false);

    // Group Accounts by Bank (Account type matches now)
    const accountsByBank = (bankId: string) => accounts.filter(a => a.bankId === bankId && !a.isArchived) as Account[];

    const toggleExpand = (bankId: string) => {
        setExpandedBanks(prev => ({ ...prev, [bankId]: !prev[bankId] }));
    };

    const handleDeleteBank = async (id: string, name: string) => {
        if (confirm(`Voulez-vous vraiment supprimer la banque "${name}" et tous ses comptes associés ?`)) {
            await deleteBank(id);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-[300px]">
            {/* Header Removed */}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {banks.filter(b => !b.isArchived).map(bank => {
                    const bankAccounts = accountsByBank(bank.id);
                    const isExpanded = expandedBanks[bank.id] ?? true; // Default expanded

                    return (
                        <div key={bank.id} className="space-y-1">
                            {/* Bank Header */}
                            <div className="flex items-center justify-between group">
                                <button
                                    onClick={() => toggleExpand(bank.id)}
                                    className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary transition-colors flex-1 text-left"
                                >
                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    {bank.icon && (
                                        <img
                                            src={`/logos/${bank.name.toLowerCase().replace(/ /g, '_')}.svg`}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            className="w-5 h-5 object-contain"
                                            alt=""
                                        />
                                    )}
                                    <span className="truncate">{bank.name}</span>
                                    <span className="text-xs text-slate-400 font-normal ml-auto mr-2">
                                        {bankAccounts.length}
                                    </span>
                                </button>

                                {/* Context Menu */}
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                    <button onClick={() => { /* Open Edit Modal */ setIsBankManagerOpen(true); }} className="text-slate-400 hover:text-blue-500" title="Éditer">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => updateBank(bank.id, { isArchived: !bank.isArchived })} className="text-slate-400 hover:text-amber-500" title="Archiver">
                                        <Archive className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteBank(bank.id, bank.name)} className="text-slate-400 hover:text-red-500" title="Supprimer">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Accounts List */}
                            {isExpanded && (
                                <div className="pl-6 space-y-1 mt-1 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                                    {bankAccounts.length === 0 && (
                                        <div className="text-xs text-slate-400 italic pl-2 py-1">Aucun compte</div>
                                    )}
                                    {bankAccounts.map(account => (
                                        <div key={account.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer">
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    {/* Icon based on type */}
                                                    {account.type === 'CHECKING' && <CreditCard className="w-3 h-3 text-slate-500" />}
                                                    {account.type === 'SAVINGS' && <PiggyBank className="w-3 h-3 text-emerald-500" />}
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{account.name}</span>
                                                </div>
                                                <div className="flex justify-between items-baseline mt-0.5">
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        {formatCurrency(Number(account.balance), account.currency)}
                                                    </span>
                                                    {/* Assuming account metadata has accountNumber/iban. If not, hidden. */}
                                                    {account.metadata?.accountNumber && (
                                                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                                                            {maskIban(account.metadata.accountNumber)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100">
                                                {/* Small actions */}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer Removed */}

            {/* MODAL WRAPPER OR INLINE */}
            {isBankManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-card rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl relative">
                        <button
                            onClick={() => setIsBankManagerOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full z-10"
                        >
                            <span className="sr-only">Fermer</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <div className="p-6">
                            <BankManager />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

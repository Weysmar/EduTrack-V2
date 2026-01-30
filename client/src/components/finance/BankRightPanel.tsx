import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinanceStore } from '@/store/financeStore';
// Fix: Import Account instead of FinancialAccount
import { Bank, Account } from '@/types/finance';
import { Plus, ChevronDown, ChevronRight, MoreVertical, CreditCard, Building2, Wallet, PiggyBank, Globe, Trash2, Edit2, Archive, Tag, Download, Calendar, Sparkles } from 'lucide-react';
import { cn, maskIban } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { BankManager } from '@/components/finance/BankManager';
import { CategoryManager } from '@/components/finance/CategoryManager';

const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount);
};

const isNew = (createdAt: string | Date | undefined) => {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - created) < 24 * 60 * 60 * 1000; // 24 hours
};

export const BankRightPanel: React.FC = () => {
    const navigate = useNavigate();
    const {
        banks,
        accounts,
        fetchBanks,
        deleteBank,
        updateBank,
        deleteAccount,
        updateAccount,
        showArchived,
        toggleShowArchived
    } = useFinanceStore();
    const [expandedBanks, setExpandedBanks] = useState<Record<string, boolean>>({});
    const [isBankManagerOpen, setIsBankManagerOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    // Listen for external open requests
    React.useEffect(() => {
        const handleOpen = () => setIsBankManagerOpen(true);
        window.addEventListener('open-bank-manager', handleOpen);
        return () => window.removeEventListener('open-bank-manager', handleOpen);
    }, []);

    // Group Accounts by Bank
    const accountsByBank = (bankId: string) => accounts.filter(a => a.bankId === bankId && (showArchived ? true : a.active));

    const toggleExpand = (bankId: string) => {
        setExpandedBanks(prev => ({ ...prev, [bankId]: !prev[bankId] }));
    };

    const handleDeleteBank = async (id: string, name: string) => {
        if (confirm(`Voulez-vous vraiment supprimer la banque "${name}" et tous ses comptes associés ?`)) {
            await deleteBank(id);
        }
    };

    // Filter banks
    const visibleBanks = banks.filter(b => showArchived ? true : b.active);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-[300px]">
            {/* Header / Actions */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsBankManagerOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-md text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Banque
                    </button>
                    <button
                        onClick={() => setIsCategoryManagerOpen(true)}
                        className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                        title="Gérer les catégories"
                    >
                        <Tag className="w-4 h-4" />
                    </button>
                    <div className="flex gap-1 ml-2">
                        <button
                            onClick={() => useFinanceStore.getState().exportData?.('json')}
                            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                            title="Exporter en JSON"
                        >
                            <span className="text-xs font-bold">JSON</span>
                        </button>
                        <button
                            onClick={() => useFinanceStore.getState().exportData?.('csv')}
                            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-md transition-colors"
                            title="Exporter en CSV"
                        >
                            <span className="text-xs font-bold">CSV</span>
                        </button>
                    </div>
                </div>

                {/* Archive Toggle */}
                <button
                    onClick={toggleShowArchived}
                    className={cn(
                        "flex items-center justify-center gap-2 text-xs py-1 px-2 rounded-md transition-colors border",
                        showArchived
                            ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
                            : "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    <Archive className="w-3 h-3" />
                    {showArchived ? "Masquer les archives" : "Voir les archives"}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {visibleBanks.map(bank => {
                    const bankAccounts = accountsByBank(bank.id);
                    // Hide bank if no accounts and we are filtering? No, keep it visible if active/archived matches
                    const isExpanded = expandedBanks[bank.id] ?? true;
                    const isArchived = !bank.active;

                    return (
                        <div key={bank.id} className={cn("space-y-1 transition-opacity", isArchived && "opacity-60")}>
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
                                    <span className="truncate">
                                        {bank.name}
                                        {isArchived && <span className="ml-2 text-[10px] uppercase bg-slate-200 dark:bg-slate-700 px-1 rounded">Archivé</span>}
                                    </span>
                                    <span className="text-xs text-slate-400 font-normal ml-auto mr-2">
                                        {bankAccounts.length}
                                    </span>
                                </button>

                                {/* Context Menu */}
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                    <button onClick={() => setIsBankManagerOpen(true)} className="text-slate-400 hover:text-blue-500" title="Éditer">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => updateBank(bank.id, { active: !bank.active })} // Toggle active
                                        className={cn("text-slate-400 hover:text-amber-500", !bank.active && "text-amber-500")}
                                        title={bank.active ? "Archiver" : "Désarchiver"}
                                    >
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
                                    {bankAccounts.map(account => {
                                        const isAccArchived = !account.active;
                                        return (
                                            <div key={account.id} className={cn("group flex items-center justify-between p-2 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer", isAccArchived && "opacity-60 bg-slate-50 dark:bg-slate-800/50")}>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {/* Icon based on type */}
                                                        {account.type === 'CHECKING' && <CreditCard className="w-3 h-3 text-slate-500" />}
                                                        {account.type === 'SAVINGS' && <PiggyBank className="w-3 h-3 text-emerald-500" />}
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                            {account.name}
                                                            {isAccArchived && <span className="ml-1 text-[9px] uppercase border border-slate-300 px-1 rounded text-slate-500">Arch.</span>}
                                                            {!isAccArchived && isNew(account.createdAt) && (
                                                                <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/10 text-green-400 text-[9px] font-medium rounded-full border border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                                                                    <Sparkles className="w-2 h-2" />
                                                                    Nouveau
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-baseline mt-0.5">
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            {formatCurrency(Number(account.balance), account.currency)}
                                                        </span>
                                                        {account.metadata?.accountNumber && (
                                                            <span className="text-[10px] text-slate-400 font-mono ml-2">
                                                                {maskIban(account.metadata.accountNumber)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {account.balanceDate && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 ml-0.5">
                                                            <Calendar className="w-2.5 h-2.5 opacity-70" />
                                                            <span>
                                                                Maj : {new Date(account.balanceDate).toLocaleDateString('fr-FR', {
                                                                    day: 'numeric',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Account Actions (On Hover) */}
                                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); updateAccount(account.id, { active: !account.active }); }}
                                                        className={cn("p-1 hover:bg-slate-200 rounded", !account.active && "text-amber-600")}
                                                        title={account.active ? "Archiver le compte" : "Désarchiver"}
                                                    >
                                                        <Archive className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
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
            {/* Category Manager Modal */}
            {isCategoryManagerOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <CategoryManager onClose={() => setIsCategoryManagerOpen(false)} />
                </div>
            )}
        </div>
    );
};

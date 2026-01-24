import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinanceStore } from '../../store/financeStore';
import { BANK_PRESETS, getLogoUrl } from '../../constants/bankPresets';
import { X, Plus, Trash2, Check, Building, ImageOff, Pencil, ChevronDown, ChevronUp, AlertCircle, Save } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn exists, else use simple template literal

export const BankManager = ({ onClose }: { onClose: () => void }) => {
    const { banks, createBank, deleteBank, updateBank, deleteAccount, updateAccount } = useFinanceStore();
    const [selectedPreset, setSelectedPreset] = useState<any>(null);
    const [customName, setCustomName] = useState('');
    const [imageError, setImageError] = useState<Record<string, boolean>>({});

    // Editing States
    const [editingBankId, setEditingBankId] = useState<string | null>(null);
    const [editBankName, setEditBankName] = useState('');

    const [expandedBankId, setExpandedBankId] = useState<string | null>(null);

    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [editAccountName, setEditAccountName] = useState('');

    // Derived value for creation preview
    const name = selectedPreset ? selectedPreset.name : customName;
    const logo = selectedPreset ? getLogoUrl(selectedPreset.domain) : null;
    const color = selectedPreset ? selectedPreset.color : '#64748b';

    const handleCreate = async () => {
        if (!name) return;
        await createBank({
            name,
            icon: logo || 'building',
            color
        });
        setCustomName('');
        setSelectedPreset(null);
    };

    const handleImageError = (id: string) => {
        setImageError(prev => ({ ...prev, [id]: true }));
    };

    // Bank Actions
    const startEditBank = (bank: any) => {
        setEditingBankId(bank.id);
        setEditBankName(bank.name);
    }

    const saveEditBank = async (id: string) => {
        if (!editBankName.trim()) return;
        await updateBank(id, { name: editBankName });
        setEditingBankId(null);
    }

    const toggleExpandBank = (id: string) => {
        setExpandedBankId(prev => prev === id ? null : id);
    }

    // Account Actions
    const startEditAccount = (account: any) => {
        setEditingAccountId(account.id);
        setEditAccountName(account.name);
    }

    const saveEditAccount = async (id: string) => {
        if (!editAccountName.trim()) return;
        await updateAccount(id, { name: editAccountName });
        setEditingAccountId(null);
    }

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
                    <div>
                        <h2 className="text-xl font-bold text-white">Vos Banques</h2>
                        <p className="text-sm text-slate-400">Ajoutez et gérez vos établissements bancaires</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* 1. Active Banks List */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Banques Connectées</h3>

                        {banks.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                                <Building className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500">Aucune banque configurée</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {banks.map((bank: any) => (
                                    <div key={bank.id} className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">

                                        {/* Bank Header */}
                                        <div className="flex items-center justify-between p-4 group hover:bg-slate-800/80 transition-colors">
                                            <div className="flex items-center gap-3 flex-1">
                                                <button onClick={() => toggleExpandBank(bank.id)} className="text-slate-400 hover:text-white transition-colors">
                                                    {expandedBankId === bank.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </button>

                                                {bank.icon && bank.icon.includes('/logos/') && !imageError[bank.id] ? (
                                                    <img
                                                        src={bank.icon}
                                                        alt={bank.name}
                                                        className="w-10 h-10 rounded-full bg-white p-1 object-contain"
                                                        onError={() => handleImageError(bank.id)}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                                                        <Building className="w-5 h-5 text-slate-300" />
                                                    </div>
                                                )}

                                                <div className="flex-1">
                                                    {editingBankId === bank.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={editBankName}
                                                                onChange={(e) => setEditBankName(e.target.value)}
                                                                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => saveEditBank(bank.id)} className="p-1 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30">
                                                                <Check className="w-3 h-3" />
                                                            </button>
                                                            <button onClick={() => setEditingBankId(null)} className="p-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium text-white">{bank.name}</div>
                                                            <button onClick={() => startEditBank(bank)} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all">
                                                                <Pencil className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-slate-400">{bank.accounts?.length || 0} comptes</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => deleteBank(bank.id).catch(err => alert("Impossible de supprimer une banque qui contient des comptes."))}
                                                    className="p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors"
                                                    title="Supprimer la banque"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Accounts List (Accordion) */}
                                        {expandedBankId === bank.id && (
                                            <div className="border-t border-slate-700/50 bg-slate-900/30 p-2 space-y-1">
                                                <div className="text-xs font-medium text-slate-500 uppercase px-2 py-1">Comptes associés</div>
                                                {bank.accounts && bank.accounts.length > 0 ? (
                                                    bank.accounts.map((acc: any) => (
                                                        <div key={acc.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 group/acc">
                                                            <div className="flex items-center gap-3 pl-2">
                                                                <div className="w-1 h-8 rounded-full" style={{ backgroundColor: acc.color }} />
                                                                <div>
                                                                    {editingAccountId === acc.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={editAccountName}
                                                                                onChange={(e) => setEditAccountName(e.target.value)}
                                                                                className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sm text-white w-32 md:w-48"
                                                                                autoFocus
                                                                            />
                                                                            <button onClick={() => saveEditAccount(acc.id)} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                                                                                <Check className="w-3 h-3" />
                                                                            </button>
                                                                            <button onClick={() => setEditingAccountId(null)} className="p-1 text-slate-400 hover:bg-slate-700 rounded">
                                                                                <X className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium text-slate-200">{acc.name}</span>
                                                                            <button onClick={() => startEditAccount(acc)} className="opacity-0 group-hover/acc:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity">
                                                                                <Pencil className="w-3 h-3" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-slate-500">{Number(acc.balance).toFixed(2)} €</div>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('Supprimer ce compte et toutes ses transactions ?')) {
                                                                        deleteAccount(acc.id);
                                                                    }
                                                                }}
                                                                className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded opacity-0 group-hover/acc:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-slate-500 text-sm italic">
                                                        Aucun compte rattaché
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. Add New */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Ajouter une banque</h3>

                        {/* Custom Input */}
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="Nom de la banque ou recherche..."
                                    value={customName}
                                    onChange={(e) => {
                                        setCustomName(e.target.value);
                                        setSelectedPreset(null);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-11 text-white placeholder:text-slate-500"
                                />
                                {selectedPreset && selectedPreset.domain ? (
                                    <img
                                        src={getLogoUrl(selectedPreset.domain)}
                                        className="w-6 h-6 absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white object-contain p-0.5"
                                        alt=""
                                        onError={(e) => e.currentTarget.style.display = 'none'}
                                    />
                                ) : (
                                    <Building className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                )}
                            </div>
                            <button
                                onClick={handleCreate}
                                disabled={!name}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                                Ajouter
                            </button>
                        </div>

                        {/* Presets Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4">
                            {BANK_PRESETS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => {
                                        setSelectedPreset(preset);
                                        setCustomName('');
                                    }}
                                    className={cn(
                                        "p-3 rounded-xl border transition-all flex flex-col items-center gap-3 hover:bg-slate-800 group",
                                        selectedPreset?.name === preset.name
                                            ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                                            : 'border-slate-800 bg-slate-900/50'
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-full bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                        <img
                                            src={preset.logo || getLogoUrl(preset.domain)}
                                            alt={preset.name}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                // Safer fallback: find the parent and append text if empty, or just rely on the fact that hiding img reveals parent bg
                                                const parent = e.currentTarget.parentElement;
                                                if (parent) {
                                                    parent.classList.add('flex', 'items-center', 'justify-center', 'bg-slate-200');
                                                    // Create a span for initials if not present
                                                    if (!parent.querySelector('.initials-fallback')) {
                                                        const span = document.createElement('span');
                                                        span.className = 'initials-fallback text-slate-900 font-bold text-sm';
                                                        span.innerText = preset.name.substring(0, 2).toUpperCase();
                                                        parent.appendChild(span);
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-center text-slate-300 truncate w-full group-hover:text-white transition-colors">
                                        {preset.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

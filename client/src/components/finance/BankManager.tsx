import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinanceStore } from '../../store/financeStore';
import { BANK_PRESETS, getLogoUrl } from '../../constants/bankPresets';
import { X, Plus, Trash2, Check, Building, ImageOff } from 'lucide-react';

export const BankManager = ({ onClose }: { onClose: () => void }) => {
    const { banks, createBank, deleteBank } = useFinanceStore();
    const [selectedPreset, setSelectedPreset] = useState<any>(null);
    const [customName, setCustomName] = useState('');
    const [imageError, setImageError] = useState<Record<string, boolean>>({});

    // Derived value for preview
    const name = selectedPreset ? selectedPreset.name : customName;
    const logo = selectedPreset ? getLogoUrl(selectedPreset.domain) : null;
    const color = selectedPreset ? selectedPreset.color : '#64748b';

    const handleCreate = async () => {
        if (!name) return;

        await createBank({
            name,
            icon: logo || 'building', // If no logo, use default icon string for now
            color
        });
        setCustomName('');
        setSelectedPreset(null);
    };

    const handleImageError = (id: string) => {
        setImageError(prev => ({ ...prev, [id]: true }));
    };

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/90 backdrop-blur">
                    <div>
                        <h2 className="text-xl font-bold text-white">Vos Banques</h2>
                        <p className="text-sm text-slate-400">Ajoutez vos établissements bancaires</p>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {banks.map((bank: any) => (
                                    <div key={bank.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 group hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            {bank.icon && bank.icon.startsWith('http') && !imageError[bank.id] ? (
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
                                            <div>
                                                <div className="font-medium text-white">{bank.name}</div>
                                                <div className="text-xs text-slate-400">{bank.accounts?.length || 0} comptes</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteBank(bank.id)}
                                            className="p-2 bg-red-500/10 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                                    className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-3 hover:bg-slate-800 group ${selectedPreset?.name === preset.name
                                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                                        : 'border-slate-800 bg-slate-900/50'
                                        }`}
                                >
                                    <div className="w-12 h-12 rounded-full bg-white p-1 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                                        <img
                                            src={getLogoUrl(preset.domain)}
                                            alt={preset.name}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            onError={(e) => {
                                                // Fallback to text initials if image fails
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.innerText = preset.name.substring(0, 2).toUpperCase();
                                                e.currentTarget.parentElement!.className += " text-slate-900 font-bold text-sm";
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

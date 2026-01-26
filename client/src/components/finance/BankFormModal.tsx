import { Dialog } from '@headlessui/react';
import { CreateBankDTO, Bank } from '@/types/finance';
import { BANK_PRESETS } from '@/constants/bankPresets';
import { Check } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BankFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    initialData?: Bank | null;
}

export function BankFormModal({ isOpen, onClose, onSubmit, initialData }: BankFormModalProps) {
    const [formData, setFormData] = useState<CreateBankDTO>({
        name: '',
        color: '#3b82f6',
        icon: '🏦',
        swiftBic: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                color: initialData.color,
                icon: initialData.icon || '🏦',
                swiftBic: initialData.swifBic
            });
        } else {
            setFormData({ name: '', color: '#3b82f6', icon: '🏦', swiftBic: '' });
        }
    }, [initialData, isOpen]);

    const applyPreset = (preset: CreateBankDTO) => {
        setFormData(preset);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-lg shadow-xl">
                    <Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">
                        {initialData ? 'Modifier la banque' : 'Ajouter une banque'}
                    </Dialog.Title>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Preset Selection (Only for Create) */}
                        {!initialData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    Presets rapides
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                                    {BANK_PRESETS.slice(0, 10).map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => applyPreset(preset)}
                                            className="flex-shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors whitespace-nowrap flex items-center gap-2"
                                        >
                                            <span>{preset.icon}</span>
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Nom</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Couleur</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="h-10 w-16 bg-transparent border-0 cursor-pointer"
                                    />
                                    <span className="text-slate-400 text-sm font-mono">{formData.color}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Icône / Emoji</label>
                                <input
                                    type="text"
                                    value={formData.icon}
                                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl"
                                    maxLength={2}
                                />
                            </div>
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
                                {initialData ? 'Sauvegarder' : 'Ajouter'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
}

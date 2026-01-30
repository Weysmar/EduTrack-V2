import { Dialog } from '@headlessui/react';
import { CreateBankDTO, Bank } from '@/types/finance';
import { POPULAR_BANKS } from '@/data/popularBanks';
import { Check, Search, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const SWIFT_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

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
    const [searchQuery, setSearchQuery] = useState('');
    const [swiftError, setSwiftError] = useState('');

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
        setSearchQuery(''); // Reset search when modal opens
    }, [initialData, isOpen]);

    const filteredBanks = useMemo(() => {
        if (!searchQuery) return POPULAR_BANKS;
        const query = searchQuery.toLowerCase();
        return POPULAR_BANKS.filter(bank =>
            bank.name.toLowerCase().includes(query) ||
            bank.swiftBic.toLowerCase().includes(query)
        );
    }, [searchQuery]);

    const applyPreset = (bank: typeof POPULAR_BANKS[0]) => {
        setFormData({
            name: bank.name,
            color: bank.color,
            icon: bank.icon,
            swiftBic: bank.swiftBic
        });
        setSwiftError(''); // Clear any previous error
    };

    const validateSwift = (value: string): boolean => {
        if (!value) {
            setSwiftError('');
            return true;
        }
        const upperValue = value.toUpperCase();
        const isValid = SWIFT_REGEX.test(upperValue);
        setSwiftError(isValid ? '' : 'Format invalide (8 ou 11 caractères, ex: SOGEFRPP ou BNPAFRPPXXX)');
        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validate SWIFT before submitting
        if (formData.swiftBic && !validateSwift(formData.swiftBic)) {
            return;
        }
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
                        {/* Popular Banks Selection (Only for Create) */}
                        {!initialData && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Banques populaires
                                </label>

                                {/* Search Bar */}
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher une banque..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Banks Grid */}
                                <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                                    {filteredBanks.map((bank) => (
                                        <button
                                            key={bank.swiftBic}
                                            type="button"
                                            onClick={() => applyPreset(bank)}
                                            className="flex flex-col items-center gap-2 p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-lg text-xs text-slate-300 transition-all group"
                                            title={`${bank.name} - ${bank.swiftBic}`}
                                        >
                                            <div className="text-2xl">{bank.icon}</div>
                                            <div className="text-center leading-tight font-medium">{bank.name}</div>
                                            <div
                                                className="w-full h-1.5 rounded-full mt-1"
                                                style={{ backgroundColor: bank.color }}
                                            />
                                        </button>
                                    ))}
                                    {filteredBanks.length === 0 && (
                                        <div className="col-span-3 text-center py-8 text-slate-500 text-sm">
                                            Aucune banque trouvée
                                        </div>
                                    )}
                                </div>

                                <div className="mt-2 text-xs text-slate-500">
                                    💡 Cliquez sur une banque pour pré-remplir le formulaire
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

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Code SWIFT/BIC
                                <span className="text-slate-500 font-normal text-xs ml-1">(optionnel)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.swiftBic}
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase();
                                    setFormData({ ...formData, swiftBic: value });
                                    validateSwift(value);
                                }}
                                placeholder="Ex: SOGEFRPP"
                                maxLength={11}
                                className={`w-full bg-slate-800 border ${swiftError ? 'border-red-500' : 'border-slate-700'} rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 ${swiftError ? 'focus:ring-red-500' : 'focus:ring-blue-500'} font-mono uppercase`}
                            />
                            {swiftError && (
                                <div className="flex items-start gap-1.5 mt-1.5">
                                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-400 text-xs">{swiftError}</p>
                                </div>
                            )}
                            {!swiftError && formData.swiftBic && SWIFT_REGEX.test(formData.swiftBic) && (
                                <p className="text-green-400 text-xs mt-1">✓ Format valide</p>
                            )}
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

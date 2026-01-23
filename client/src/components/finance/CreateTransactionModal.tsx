import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Tag, FileText } from 'lucide-react';
import { useFinanceStore } from '@/store/financeStore';

interface CreateTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateTransactionModal({ isOpen, onClose }: CreateTransactionModalProps) {
    const { addTransaction, accounts } = useFinanceStore();

    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');

    // Reset form on open
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setType('EXPENSE');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setCategory('');
            if (accounts.length > 0) setAccountId(accounts[0].id);
        }
    }, [isOpen, accounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) return;

        await addTransaction({
            amount: parseFloat(amount),
            type,
            date: new Date(date),
            description,
            categoryId: category || undefined,
            accountId: accountId || undefined,
            isRecurring: false,
            profileId: 'current-profile', // handled by store usually or auth context
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-card rounded-xl shadow-xl border animate-in zoom-in-95">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Nouvelle Transaction</h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">

                    {/* Type Switcher */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType('INCOME')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'INCOME' ? 'bg-background shadow text-green-500' : 'text-muted-foreground'}`}
                        >
                            Revenu
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('EXPENSE')}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${type === 'EXPENSE' ? 'bg-background shadow text-red-500' : 'text-muted-foreground'}`}
                        >
                            Dépense
                        </button>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Montant</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-lg focus:ring-2 focus:ring-primary/50 text-lg font-bold"
                                placeholder="0.00"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase">Description</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-3 py-2 bg-muted/50 border rounded-lg"
                            placeholder="Ex: Courses Carrefour"
                            required
                        />
                    </div>

                    {/* Date & Category Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-lg"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Catégorie</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-muted/50 border rounded-lg"
                                    placeholder="Ex: Alimentation"
                                    list="categories"
                                />
                                <datalist id="categories">
                                    <option value="Alimentation" />
                                    <option value="Transport" />
                                    <option value="Logement" />
                                    <option value="Loisirs" />
                                    <option value="Santé" />
                                    <option value="Salaire" />
                                </datalist>
                            </div>
                        </div>
                    </div>

                    {/* OCR / File Upload Stub */}
                    <div className="border border-dashed rounded-lg p-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted cursor-not-allowed opacity-50">
                        <FileText className="h-4 w-4" />
                        <span>Scanner un reçu (Bientôt disponible)</span>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Valider
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

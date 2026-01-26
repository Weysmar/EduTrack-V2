import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Account } from '@/types/finance';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialData?: Account | null;
    bankId: string;
}

export function AccountFormModal({ isOpen, onClose, onSubmit, initialData, bankId }: Props) {
    const [formData, setFormData] = useState({
        name: '',
        type: 'CHECKING',
        balance: 0,
        currency: 'EUR',
        accountNumber: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                type: initialData.type,
                balance: initialData.balance || 0,
                currency: initialData.currency,
                accountNumber: initialData.accountNumber || ''
            });
        } else {
            setFormData({
                name: '',
                type: 'CHECKING',
                balance: 0,
                currency: 'EUR',
                accountNumber: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...formData, bankId });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Modifier le compte' : 'Ajouter un compte'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nom du compte</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ex: Compte Courant"
                            className="bg-slate-800 border-slate-700"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                            value={formData.type}
                            onValueChange={val => setFormData({ ...formData, type: val })}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                <SelectItem value="CHECKING">Compte Courant</SelectItem>
                                <SelectItem value="SAVINGS">Épargne</SelectItem>
                                <SelectItem value="CREDIT">Crédit</SelectItem>
                                <SelectItem value="INVESTMENT">Investissement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="balance">Solde Initial</Label>
                            <Input
                                id="balance"
                                type="number"
                                step="0.01"
                                value={formData.balance}
                                onChange={e => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Devise</Label>
                            <Input
                                id="currency"
                                value={formData.currency}
                                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                className="bg-slate-800 border-slate-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="number">Numéro de compte (Optionnel)</Label>
                        <Input
                            id="number"
                            value={formData.accountNumber}
                            onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="ex: ****1234"
                            className="bg-slate-800 border-slate-700"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Enregistrer</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

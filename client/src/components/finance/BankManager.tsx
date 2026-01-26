import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Bank } from '@/types/finance';
import { BankFormModal } from './BankFormModal';

export function BankManager() {
    const { banks, createBank, updateBank, deleteBank } = useFinance();
    const [isInternalModalOpen, setIsModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<Bank | null>(null);

    const openCreateModal = () => {
        setEditingBank(null);
        setIsModalOpen(true);
    };

    const openEditModal = (bank: Bank) => {
        setEditingBank(bank);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const handleSubmit = async (formData: any) => {
        try {
            if (editingBank) {
                await updateBank({ id: editingBank.id, data: formData });
            } else {
                await createBank(formData);
            }
            closeModal();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (bankId: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette banque ? Cela n\'est possible que si aucun compte n\'y est rattaché.')) {
            await deleteBank(bankId);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-100">Mes Banques</h2>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    Ajouter une banque
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {banks?.map((bank) => (
                    <div
                        key={bank.id}
                        className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                                style={{ backgroundColor: `${bank.color}20`, color: bank.color }}
                            >
                                {bank.icon || '🏦'}
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-100">{bank.name}</h3>
                                <div className="text-sm text-slate-400">
                                    {(bank.accounts?.length || 0)} comptes
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => openEditModal(bank)}
                                className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                            >
                                <Pencil size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(bank.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <BankFormModal
                isOpen={isInternalModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                initialData={editingBank}
            />
        </div>
    );
}

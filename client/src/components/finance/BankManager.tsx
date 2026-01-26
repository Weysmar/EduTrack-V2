import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Plus, Pencil, Trash2, Wallet, CreditCard } from 'lucide-react';
import { Bank, Account } from '@/types/finance';
import { BankFormModal } from './BankFormModal';
import { AccountFormModal } from './AccountFormModal';
import { Button } from '@/components/ui/button';

export function BankManager() {
    const { banks, createBank, updateBank, deleteBank, createAccount, updateAccount, deleteAccount } = useFinance();
    const [isInternalModalOpen, setIsModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const [editingBank, setEditingBank] = useState<Bank | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

    // --- BANK HANDLING ---
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

    // --- ACCOUNT HANDLING ---
    const openAddAccount = (bankId: string) => {
        setSelectedBankId(bankId);
        setEditingAccount(null);
        setIsAccountModalOpen(true);
    };

    const openEditAccount = (account: Account) => {
        setSelectedBankId(account.bankId || null);
        setEditingAccount(account);
        setIsAccountModalOpen(true);
    };

    const handleAccountSubmit = async (data: any) => {
        if (!selectedBankId) return;
        try {
            if (editingAccount) {
                await updateAccount({ id: editingAccount.id, data });
            } else {
                await createAccount({ ...data, bankId: selectedBankId });
            }
            setIsAccountModalOpen(false);
        } catch (e) {
            console.error(e);
        }
    };

    const deleteAccountHandler = async (id: string) => {
        if (confirm("Supprimer ce compte et toutes ses transactions ?")) {
            await deleteAccount(id);
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
                        className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-4 group"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
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

                        {/* Accounts List */}
                        <div className="space-y-2 border-t border-slate-700/50 pt-3">
                            {bank.accounts?.map(acc => (
                                <div key={acc.id} className="flex justify-between items-center text-sm p-2 rounded hover:bg-slate-700/30 group/acc">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={14} className="text-slate-500" />
                                        <span>{acc.name}</span>
                                        <span className={acc.balance && acc.balance < 0 ? 'text-red-400' : 'text-green-400 font-mono text-xs'}>
                                            {acc.balance} €
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover/acc:opacity-100">
                                        <button onClick={() => openEditAccount(acc)} className="p-1 hover:text-blue-400"><Pencil size={12} /></button>
                                        <button onClick={() => deleteAccountHandler(acc.id)} className="p-1 hover:text-red-400"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                            {(!bank.accounts || bank.accounts.length === 0) && (
                                <div className="text-xs text-slate-500 italic px-2">Aucun compte</div>
                            )}
                        </div>

                        {/* Add Account Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 border-dashed border-slate-600 hover:bg-slate-700/50 hover:text-slate-200"
                            onClick={() => openAddAccount(bank.id)}
                        >
                            <Plus size={14} className="mr-2" />
                            Ajouter un compte
                        </Button>
                    </div>
                ))}
            </div>

            <BankFormModal
                isOpen={isInternalModalOpen}
                onClose={closeModal}
                onSubmit={handleSubmit}
                initialData={editingBank}
            />

            <AccountFormModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSubmit={handleAccountSubmit}
                initialData={editingAccount}
                bankId={selectedBankId || ''}
            />
        </div>
    );
}

import { useState } from 'react';
import { useFinance } from '@/hooks/useFinance';
import { Plus, Pencil, Trash2, Wallet, CreditCard, Archive, Building } from 'lucide-react';
import { Bank, Account } from '@/types/finance';
import { BankFormModal } from './BankFormModal';
import { AccountFormModal } from './AccountFormModal';
import { TransactionCreateModal } from './TransactionCreateModal';
import { Button } from '@/components/ui/Button';
import { useFinanceStore } from '@/store/financeStore';
import { toast } from 'sonner';
import { useLanguage } from '@/components/language-provider';

export function BankManager() {
    const { t } = useLanguage();
    const { 
        banks, accounts, categories,
        createBank, updateBank, deleteBank, archiveBank, 
        createAccount, updateAccount, deleteAccount, createTransaction 
    } = useFinance();
    
    const [isInternalModalOpen, setIsModalOpen] = useState(false);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);

    const [editingBank, setEditingBank] = useState<Bank | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
    const [selectedAccountIdForTx, setSelectedAccountIdForTx] = useState<string | null>(null);

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

    const handleArchive = async (bankId: string) => {
        if (confirm(t('finance.banks.archive.confirm'))) {
            archiveBank({ id: bankId, archive: true });
        }
    };

    const handleDelete = async (bankId: string) => {
        if (confirm(t('finance.banks.delete.confirm'))) {
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
        if (confirm(t('finance.accounts.delete.confirm'))) {
            await deleteAccount(id);
        }
    };

    const openCreateTransaction = (accountId: string) => {
        setSelectedAccountIdForTx(accountId);
        setIsTxModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {banks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-6 shadow-xl shadow-blue-900/20">
                        <Building className="w-10 h-10 text-blue-400" />
                    </div>

                    <h3 className="text-2xl font-bold text-slate-100 mb-2">
                        {t('finance.banks.welcome')}
                    </h3>

                    <p className="text-slate-400 text-center max-w-md mb-8 leading-relaxed">
                        {t('finance.banks.welcome.desc')}
                    </p>

                    <div className="space-y-4 w-full max-w-sm mb-8">
                        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-400 font-bold border border-blue-500/20">1</div>
                            <div>
                                <h4 className="font-medium text-slate-200">{t('finance.banks.step1.title') || "Ajoutez une banque"}</h4>
                                <p className="text-xs text-slate-400">{t('finance.banks.step1.desc') || "Créez votre première fiche bancaire"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-400 font-bold border border-purple-500/20">2</div>
                            <div>
                                <h4 className="font-medium text-slate-200">{t('finance.banks.step2.title') || "Importez vos relevés"}</h4>
                                <p className="text-xs text-slate-400">{t('finance.banks.step2.desc') || "Support OFX, CSV et Excel"}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-400 font-bold border border-emerald-500/20">3</div>
                            <div>
                                <h4 className="font-medium text-slate-200">{t('finance.banks.step3.title') || "Pilotez votre budget"}</h4>
                                <p className="text-xs text-slate-400">{t('finance.banks.step3.desc') || "Catégorisation et statistiques"}</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all hover:scale-105 active:scale-95"
                    >
                        <Plus size={20} />
                        {t('finance.banks.add.first') || "Ajouter ma première banque"}
                    </button>
                </div>
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-slate-100">{t('finance.banks.title')}</h2>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <Plus size={18} />
                            {t('finance.banks.add')}
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
                                                {t('finance.banks.count', { count: bank.accounts?.length || 0 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => openEditModal(bank)}
                                            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                                            title={t('finance.banks.edit')}
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleArchive(bank.id)}
                                            className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                            title={t('finance.banks.archive')}
                                        >
                                            <Archive size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(bank.id)}
                                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                            title={t('finance.banks.delete')}
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
                                            <div className="flex gap-1 md:opacity-0 md:group-hover/acc:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openCreateTransaction(acc.id)}
                                                    className="p-1 text-slate-400 hover:text-emerald-400"
                                                    title={t('finance.tx.new')}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                                <button onClick={() => openEditAccount(acc)} className="p-1 text-slate-400 hover:text-blue-400"><Pencil size={14} /></button>
                                                <button onClick={() => deleteAccountHandler(acc.id)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!bank.accounts || bank.accounts.length === 0) && (
                                        <div className="text-xs text-slate-500 italic px-2">{t('finance.banks.noAccounts')}</div>
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
                                    {t('finance.accounts.add')}
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}

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

            {isTxModalOpen && selectedAccountIdForTx && (
                <TransactionCreateModal
                    isOpen={isTxModalOpen}
                    onClose={() => setIsTxModalOpen(false)}
                    onSave={async (data) => {
                        await createTransaction(data);
                        toast.success(t('finance.tx.success'));
                    }}
                    accountId={selectedAccountIdForTx}
                    categories={categories}
                    accounts={accounts || []}
                />
            )}
        </div>
    );
}

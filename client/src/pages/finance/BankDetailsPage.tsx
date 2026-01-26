
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '@/hooks/useFinance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowLeft, Pencil, Trash2, CreditCard, Wallet, Building2, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { AccountFormModal } from '@/components/finance/AccountFormModal';
import { BankFormModal } from '@/components/finance/BankFormModal';
import { Bank, Account } from '@/types/finance';
import { toast } from 'sonner';

export default function BankDetailsPage() {
    const { bankId } = useParams<{ bankId: string }>();
    const navigate = useNavigate();
    const { banks, deleteBankAsync, deleteAccountAsync, createAccountAsync, updateAccountAsync } = useFinance();

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);

    // Find the specific bank
    const bank = banks.find(b => b.id === bankId);

    // Initial loading or not found state
    if (!bank) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>Banque non trouvée</p>
                <Button variant="ghost" onClick={() => navigate('/finance/dashboard')}>
                    Retour au tableau de bord
                </Button>
            </div>
        );
    }

    const handleDeleteBank = async () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette banque ? Cette action est irréversible et supprimera tous les comptes associés.')) {
            try {
                await deleteBankAsync(bank.id);
                // toast.success handled in hook
                navigate('/finance/dashboard');
            } catch (error) {
                // handled in hook
            }
        }
    };

    const handleDeleteAccount = async (accountId: string) => {
        if (confirm('Supprimer ce compte ?')) {
            try {
                await deleteAccountAsync(accountId);
            } catch (error) {
                // handled in hook
            }
        }
    };

    const handleAccountSubmit = async (data: any) => {
        try {
            if (editingAccount) {
                await updateAccountAsync({ id: editingAccount.id, data });
            } else {
                await createAccountAsync({ ...data, bankId: bank.id });
            }
            setIsAccountModalOpen(false);
        } catch (error) {
            // handled in hook
        }
    };

    const openAddAccount = () => {
        setEditingAccount(undefined);
        setIsAccountModalOpen(true);
    };

    const openEditAccount = (account: Account) => {
        setEditingAccount(account);
        setIsAccountModalOpen(true);
    };

    // Calculate totals
    const totalBalance = bank.accounts?.reduce((sum, acc) => sum + acc.balance, 0) || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / Navigation */}
            <div className="flex items-center gap-4 text-slate-400 hover:text-slate-200 transition-colors w-fit cursor-pointer" onClick={() => navigate('/finance/dashboard')}>
                <ArrowLeft size={20} />
                <span>Retour au tableau de bord</span>
            </div>

            {/* Bank Header Card */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-center gap-6">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                        style={{ backgroundColor: bank.color || '#3b82f6' }}
                    >
                        <Building2 className="text-white w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100">{bank.name}</h1>
                        <p className="text-slate-400 mt-1">Solde total : <span className="text-emerald-400 font-mono font-medium">{totalBalance.toFixed(2)} €</span></p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsBankModalOpen(true)}>
                        <Pencil size={16} className="mr-2" />
                        Modifier
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteBank}>
                        <Trash2 size={16} className="mr-2" />
                        Supprimer
                    </Button>
                </div>
            </div>

            {/* Accounts Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                        <Wallet className="text-blue-400" size={20} />
                        Comptes associés
                    </h2>
                    <Button onClick={openAddAccount} className="bg-blue-600 hover:bg-blue-500">
                        <Plus size={18} className="mr-2" />
                        Nouveau compte
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bank.accounts?.map((account) => (
                        <Card key={account.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-all group">
                            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                                <div>
                                    <CardTitle className="text-lg font-medium text-slate-200">
                                        {account.name}
                                    </CardTitle>
                                    <CardDescription className="font-mono text-xs text-slate-500 mt-1">
                                        {account.type} • {account.iban || 'Pas d\'IBAN'}
                                    </CardDescription>
                                </div>
                                <div className="p-2 bg-slate-900/50 rounded-lg text-slate-400">
                                    <CreditCard size={18} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-between items-end mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider mb-1">Solde</span>
                                        <span className={`text-2xl font-mono font-bold ${account.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {account.balance.toFixed(2)} €
                                        </span>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => openEditAccount(account)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDeleteAccount(account.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {(!bank.accounts || bank.accounts.length === 0) && (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl text-slate-500">
                            <Wallet size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aucun compte configuré</p>
                            <p className="text-sm mb-6 max-w-md text-center opacity-70">Ajoutez un compte courant, une épargne ou une carte de crédit pour commencer à suivre vos transactions.</p>
                            <Button variant="outline" onClick={openAddAccount}>
                                <Plus size={16} className="mr-2" />
                                Ajouter un premier compte
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AccountFormModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
                onSubmit={handleAccountSubmit}
                initialData={editingAccount}
                bankId={bank.id}
            />

            <BankFormModal
                isOpen={isBankModalOpen}
                onClose={() => setIsBankModalOpen(false)}
                // @ts-ignore - Assuming BankFormModal handles async internally or we pass wrapper
                onSubmit={async (data) => {
                    await useFinance().updateBankAsync({ id: bank.id, data });
                    setIsBankModalOpen(false);
                }}
                initialData={bank}
            />
        </div>
    );
}

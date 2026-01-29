import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '@/hooks/useFinance';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { TransactionList } from '@/components/finance/TransactionList';
import { AccountFormModal } from '@/components/finance/AccountFormModal';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export default function AccountDetailsPage() {
    const { accountId } = useParams<{ accountId: string }>();
    const navigate = useNavigate();
    const { accounts, transactions, deleteAccountAsync, updateAccountAsync, deleteTransaction, updateTransaction } = useFinance();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const account = accounts.find(a => a.id === accountId);

    // Filter transactions for this account
    const accountTransactions = useMemo(() => {
        return transactions
            .filter(t => t.accountId === accountId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, accountId]);

    // Calculate stats
    const stats = useMemo(() => {
        const income = accountTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = accountTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
        return { income, expense };
    }, [accountTransactions]);

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>Compte non trouvé</p>
                <Button variant="ghost" onClick={() => navigate('/finance/dashboard')}>
                    Retour au tableau de bord
                </Button>
            </div>
        );
    }

    const handleDeleteAccount = async () => {
        if (confirm('Êtes-vous sûr de vouloir supprimer ce compte ? Toutes les transactions associées seront supprimées.')) {
            try {
                await deleteAccountAsync(account.id);
                navigate(`/finance/bank/${account.bankId}`);
            } catch (error) {
                // handled in hook
            }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <div
                    className="flex items-center gap-4 text-slate-400 hover:text-slate-200 transition-colors w-fit cursor-pointer"
                    onClick={() => navigate(`/finance/bank/${account.bankId}`)}
                >
                    <ArrowLeft size={20} />
                    <span>Retour à la banque</span>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                        Modifier
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAccount}>
                        Supprimer
                    </Button>
                </div>
            </div>

            {/* Account Header Card */}
            <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center text-3xl shadow-lg text-slate-300">
                            <Wallet className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-100">{account.name}</h1>
                            <p className="text-slate-400 mt-1 font-mono">{account.iban || account.accountNumber}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-400 mb-1">Solde actuel</p>
                        <p className={`text-4xl font-mono font-bold ${Number(account.balance) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {Number(account.balance).toFixed(2)} €
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-700/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Revenus (Total)</p>
                            <p className="text-xl font-bold text-emerald-400">+{stats.income.toFixed(2)} €</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                            <TrendingDown size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Dépenses (Total)</p>
                            <p className="text-xl font-bold text-red-400">-{stats.expense.toFixed(2)} €</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-400">Transactions</p>
                            <p className="text-xl font-bold text-slate-200">{accountTransactions.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-200">Historique des transactions</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <TransactionList
                        transactions={accountTransactions}
                        onDelete={(id) => deleteTransaction(id)}
                    // Edit is handled by TransactionList modal internally if passed, 
                    // but here we might just want basics. 
                    // Actually TransactionList usually takes onEdit to open a parent modal.
                    // For now we'll just support delete. Feature 8 handles more tx management.
                    />
                </div>
            </div>

            <AccountFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={async (data) => {
                    await updateAccountAsync({ id: account.id, data });
                    setIsEditModalOpen(false);
                }}
                initialData={account}
                bankId={account.bankId}
            />
        </div>
    );
}

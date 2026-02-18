import { useFinance } from '@/hooks/useFinance';
import { useFinanceStore } from '@/store/financeStore';
import { FinanceStatsCards } from '@/components/finance/dashboard/FinanceStatsCards';
import { ExpenseChart } from '@/components/finance/dashboard/ExpenseChart';
import { TransactionList } from '@/components/finance/dashboard/TransactionList';
import { BankPanel } from '@/components/finance/dashboard/BankPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download, EyeOff, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FinanceDashboard() {
    const { banks, transactions, isLoadingTransactions } = useFinance();
    const { filters, setFilters } = useFinanceStore();

    const hideInternal = filters.hideInternalTransfers ?? false;

    // Calculate total balance across all banks
    const totalBalance = banks?.reduce((total, bank) => {
        return total + (bank.accounts?.reduce((bTotal, acc) => bTotal + (acc.balance || 0), 0) || 0);
    }, 0);

    return (
        <div className="p-6 h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100">Tableau de Bord</h1>
                    <p className="text-slate-400">Aperçu global de votre situation financière</p>
                </div>
                <div className="flex gap-3 items-center">
                    {/* Toggle virements internes */}
                    <button
                        onClick={() => setFilters({ hideInternalTransfers: !hideInternal })}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${hideInternal
                                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                        title={hideInternal ? 'Afficher les virements internes' : 'Masquer les virements internes'}
                    >
                        {hideInternal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="hidden sm:inline">Virements internes</span>
                    </button>

                    <Link to="/finance/import">
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                            <Download className="mr-2 h-4 w-4" />
                            Importer
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">

                {/* Left Column (Main Content) */}
                <div className="col-span-12 lg:col-span-9 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">

                    {/* Key Stats */}
                    <FinanceStatsCards
                        transactions={transactions}
                        totalBalance={totalBalance}
                        hideInternalTransfers={hideInternal}
                    />

                    {/* Activity Chart — full width */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-medium text-slate-100">Activité Récente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ExpenseChart transactions={transactions} hideInternalTransfers={hideInternal} />
                        </CardContent>
                    </Card>

                    {/* Recent Transactions List */}
                    <TransactionList transactions={transactions} />
                </div>

                {/* Right Column (Bank Panel) */}
                <div className="col-span-12 lg:col-span-3 bg-slate-900/50 border-l border-slate-800/50 -my-6 py-6 pl-6 overflow-y-auto">
                    <BankPanel banks={banks} />
                </div>

            </div>
        </div>
    );
}

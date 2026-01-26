import { useFinance } from '@/hooks/useFinance';
import { FinanceStatsCards } from '@/components/finance/dashboard/FinanceStatsCards';
import { ExpenseChart } from '@/components/finance/dashboard/ExpenseChart';
import { TransactionList } from '@/components/finance/dashboard/TransactionList';
import { BankPanel } from '@/components/finance/dashboard/BankPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FinanceDashboard() {
    const { banks, transactions, isLoadingTransactions } = useFinance();

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
                <div className="flex gap-3">
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
                    <FinanceStatsCards transactions={transactions} totalBalance={totalBalance} />

                    {/* Middle Section: Chart + Recent Transactions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[400px]">
                        {/* Expense Chart */}
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CardTitle className="text-lg font-medium text-slate-100">Répartition des Dépenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ExpenseChart transactions={transactions} />
                            </CardContent>
                        </Card>

                        {/* Recent Transactions List (Embedded in Grid) */}
                        <div className="h-full">
                            <TransactionList transactions={transactions} />
                        </div>
                    </div>
                </div>

                {/* Right Column (Bank Panel) */}
                <div className="col-span-12 lg:col-span-3 bg-slate-900/50 border-l border-slate-800/50 -my-6 py-6 pl-6 overflow-y-auto">
                    <BankPanel banks={banks} />
                </div>

            </div>
        </div>
    );
}

import { Transaction } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ClassificationBadge } from '../ClassificationBadge';
import { MerchantLogo } from '../MerchantLogo';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/financeStore';

interface Props {
    transactions?: Transaction[];
}

export function TransactionList({ transactions = [] }: Props) {
    const [search, setSearch] = useState('');
    const { filters } = useFinanceStore();

    // Filter internal transfers if enabled
    const filteredByType = useMemo(() => {
        if (!filters.hideInternalTransfers) return transactions;
        return transactions.filter(t =>
            t.classification !== 'INTERNAL_INTRA_BANK' &&
            t.classification !== 'INTERNAL_INTER_BANK'
        );
    }, [transactions, filters.hideInternalTransfers]);

    const filtered = filteredByType.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.amount.toString().includes(search)
    );

    // Safe date formatter
    const formatDate = (dateStr: string | Date) => {
        try {
            return new Date(dateStr).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            return 'Date invalide';
        }
    };

    return (
        <Card className="bg-slate-900 border-slate-800 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-800">
                <CardTitle className="text-lg font-medium text-slate-100">Dernières Transactions</CardTitle>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
                <div className="divide-y divide-slate-800">
                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Aucune transaction trouvée</div>
                    ) : (
                        filtered.map(t => (
                            <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-slate-800/50 transition-colors">
                                {/* Merchant Logo */}
                                <MerchantLogo description={t.description} classification={t.classification} size={36} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-xs text-slate-500">
                                            {formatDate(t.date)}
                                        </span>
                                        <ClassificationBadge classification={t.classification} confidence={t.classificationConfidence} />
                                    </div>
                                    <p className="text-slate-200 font-medium truncate text-sm" title={t.description}>{t.description}</p>
                                </div>
                                <div className={clsx("text-right font-bold whitespace-nowrap text-sm", t.amount > 0 ? "text-green-400" : "text-slate-200")}>
                                    {t.amount > 0 ? '+' : ''}{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(t.amount)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

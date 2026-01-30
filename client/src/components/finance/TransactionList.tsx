// import { format } from 'date-fns'; // Removed for stability
// import { fr } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, Trash2, Edit2, Tag, Wand2, Sparkles, ArrowRightLeft } from 'lucide-react';
import { Transaction } from '@/types/finance';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useFinanceStore } from '@/store/financeStore';

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onEdit?: (transaction: Transaction) => void;
    onEnrich?: (id: string) => void;
}

export function TransactionList({ transactions, onDelete, onEdit, onEnrich }: TransactionListProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const { t, language } = useLanguage();
    const { filters } = useFinanceStore();

    // Filter internal transfers if hideInternalTransfers is enabled
    const filteredTransactions = useMemo(() => {
        if (!filters.hideInternalTransfers) return transactions;

        return transactions.filter(tx =>
            tx.classification !== 'INTERNAL_INTRA_BANK' &&
            tx.classification !== 'INTERNAL_INTER_BANK'
        );
    }, [transactions, filters.hideInternalTransfers]);

    const handleEnrich = async (id: string) => {
        if (!onEnrich) return;
        setLoadingMap(prev => ({ ...prev, [id]: true }));
        await onEnrich(id);
        setLoadingMap(prev => ({ ...prev, [id]: false }));
    };

    if (filteredTransactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                {filters.hideInternalTransfers
                    ? "Aucune transaction externe trouvée"
                    : `${t('finance.chart.activity')} - ${t('item.noContent')}`}
            </div>
        );
    }

    // Helper for safe date formatting
    const formatDate = (date: Date) => {
        try {
            return new Date(date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const getTypeColor = (type: string) => {
        if (type === 'INCOME') return 'text-green-500 bg-green-500/10';
        if (type === 'EXPENSE') return 'text-red-500 bg-red-500/10';
        return 'text-blue-500 bg-blue-500/10'; // TRANSFER
    };

    const getTypeIcon = (type: string) => {
        if (type === 'INCOME') return <ArrowUpRight className="h-5 w-5" />;
        if (type === 'EXPENSE') return <ArrowDownLeft className="h-5 w-5" />;
        return <ArrowRightLeft className="h-5 w-5" />; // TRANSFER
    };

    return (
        <div className="space-y-4">
            {filteredTransactions.map((tx) => (
                <div
                    key={tx.id}
                    className="bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${getTypeColor(tx.type)}`}>
                                {getTypeIcon(tx.type)}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{tx.description || t('finance.tx.desc')}</p>
                                    {tx.aiEnriched && <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{formatDate(tx.date)}</span>
                                    {tx.categoryId && (
                                        <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-xs">
                                            <Tag className="h-3 w-3" />
                                            {tx.categoryId}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`font-bold ${tx.type === 'INCOME' ? 'text-green-500' : (tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500')}`}>
                                {tx.type === 'INCOME' ? '+' : (tx.type === 'EXPENSE' ? '-' : '')}{Math.abs(tx.amount).toFixed(2)} €
                            </span>

                            <div className="flex gap-2">
                                {onEnrich && tx.type === 'EXPENSE' && !tx.aiEnriched && (
                                    <button
                                        onClick={() => handleEnrich(tx.id)}
                                        disabled={loadingMap[tx.id]}
                                        className={cn(
                                            "p-1.5 text-muted-foreground hover:bg-purple-100 hover:text-purple-600 rounded-md transition-colors",
                                            loadingMap[tx.id] && "animate-spin opacity-50"
                                        )}
                                        title={t('finance.optimize')}
                                    >
                                        <Wand2 className="h-4 w-4" />
                                    </button>
                                )}

                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(tx)}
                                        className="p-1.5 text-muted-foreground hover:bg-background hover:text-foreground rounded-md transition-colors"
                                        title={t('item.edit')}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm(t('item.delete.confirm'))) {
                                            onDelete(tx.id);
                                        }
                                    }}
                                    className="p-1.5 text-muted-foreground hover:bg-background hover:text-red-500 rounded-md transition-colors"
                                    title={t('action.delete')}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI Suggestions Panel */}
                    {tx.aiEnriched && tx.aiSuggestions && (
                        <div className="bg-purple-50/5 dark:bg-purple-900/10 border-t p-3 text-sm flex flex-col gap-1 mx-4 mb-4 rounded-lg animate-in fade-in slide-in-from-top-2">
                            <p className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Sparkles className="h-3 w-3" />
                                {t('finance.suggestion')}
                            </p>
                            {tx.aiSuggestions.advice && <p className="text-muted-foreground italic">"{tx.aiSuggestions.advice}"</p>}
                            {tx.aiSuggestions.betterOffer && (
                                <p className="text-foreground font-medium mt-1">
                                    {t('finance.betterOffer')} : <span className="underline decoration-purple-500/50">{tx.aiSuggestions.betterOffer}</span>
                                </p>
                            )}
                            {tx.aiSuggestions.savings > 0 && (
                                <p className="text-green-600 font-medium text-xs flex items-center gap-1">
                                    <ArrowDownLeft className="h-3 w-3" />
                                    {t('finance.savings', { amount: tx.aiSuggestions.savings })}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

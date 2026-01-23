import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, Trash2, Edit2, Tag, Wand2, Sparkles } from 'lucide-react';
import { Transaction } from '@/lib/db';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onEdit?: (transaction: Transaction) => void;
    onEnrich?: (id: string) => void;
}

export function TransactionList({ transactions, onDelete, onEdit, onEnrich }: TransactionListProps) {
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const handleEnrich = async (id: string) => {
        if (!onEnrich) return;
        setLoadingMap(prev => ({ ...prev, [id]: true }));
        await onEnrich(id);
        setLoadingMap(prev => ({ ...prev, [id]: false }));
    };

    if (transactions.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Aucune transaction trouvée.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.map((tx) => (
                <div
                    key={tx.id}
                    className="bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border overflow-hidden"
                >
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {tx.type === 'INCOME' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{tx.description || "Sans description"}</p>
                                    {tx.aiEnriched && <Sparkles className="h-3 w-3 text-purple-500 animate-pulse" />}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{format(tx.date, 'dd MMM yyyy', { locale: fr })}</span>
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
                            <span className={`font-bold ${tx.type === 'INCOME' ? 'text-green-500' : 'text-red-500'}`}>
                                {tx.type === 'INCOME' ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)} €
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
                                        title="Optimiser avec IA"
                                    >
                                        <Wand2 className="h-4 w-4" />
                                    </button>
                                )}

                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(tx)}
                                        className="p-1.5 text-muted-foreground hover:bg-background hover:text-foreground rounded-md transition-colors"
                                        title="Modifier"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
                                            onDelete(tx.id);
                                        }
                                    }}
                                    className="p-1.5 text-muted-foreground hover:bg-background hover:text-red-500 rounded-md transition-colors"
                                    title="Supprimer"
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
                                Conseil IA
                            </p>
                            {tx.aiSuggestions.advice && <p className="text-muted-foreground italic">"{tx.aiSuggestions.advice}"</p>}
                            {tx.aiSuggestions.betterOffer && (
                                <p className="text-foreground font-medium mt-1">
                                    Alternative : <span className="underline decoration-purple-500/50">{tx.aiSuggestions.betterOffer}</span>
                                </p>
                            )}
                            {tx.aiSuggestions.savings > 0 && (
                                <p className="text-green-600 font-medium text-xs flex items-center gap-1">
                                    <ArrowDownLeft className="h-3 w-3" />
                                    Économie potentielle : {tx.aiSuggestions.savings}€ / mois
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

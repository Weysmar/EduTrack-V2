import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, Trash2, Edit2, Tag } from 'lucide-react';
import { Transaction } from '@/lib/db';

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onEdit?: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
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
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {tx.type === 'INCOME' ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                        </div>

                        <div>
                            <p className="font-medium">{tx.description || "Sans description"}</p>
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
                            {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toFixed(2)} €
                        </span>

                        <div className="flex gap-2">
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
            ))}
        </div>
    );
}

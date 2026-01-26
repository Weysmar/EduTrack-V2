import { Bank, Account } from '@/types/finance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ChevronDown, ChevronRight, PlusCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';

interface Props {
    banks?: Bank[];
    accounts?: Account[];
}

export function BankPanel({ banks = [] }: Props) {
    const [expandedBanks, setExpandedBanks] = useState<string[]>(banks.map(b => b.id)); // All open by default

    const toggleBank = (id: string) => {
        setExpandedBanks(prev =>
            prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-100">Mes Comptes</h2>
                <Link to="/finance/settings" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors">
                    <PlusCircle size={18} />
                </Link>
            </div>

            {banks.length === 0 && (
                <div className="p-4 border border-dashed border-slate-700 rounded-lg text-center text-slate-500 text-sm">
                    Aucune banque connectée
                </div>
            )}

            {banks.map(bank => {
                const isExpanded = expandedBanks.includes(bank.id);
                // Calculate total for bank
                const bankTotal = bank.accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

                return (
                    <Card key={bank.id} className="bg-slate-900 border-slate-800 overflow-hidden">
                        <div
                            className="p-3 bg-slate-800/50 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                            onClick={() => toggleBank(bank.id)}
                        >
                            <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                <span className="font-medium text-slate-200">{bank.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-slate-300">
                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(bankTotal)}
                            </span>
                        </div>

                        {isExpanded && bank.accounts && (
                            <div className="divide-y divide-slate-800/50">
                                {bank.accounts.length === 0 && (
                                    <p className="p-3 text-xs text-slate-500 italic">Aucun compte</p>
                                )}
                                {bank.accounts.map(acc => (
                                    <div key={acc.id} className="p-3 pl-8 flex items-center justify-between hover:bg-slate-800/30 transition-colors group">
                                        <div className="flex items-center gap-2">
                                            <CreditCard size={12} className="text-slate-500 group-hover:text-blue-400" />
                                            <div className="flex flex-col">
                                                <span className="text-sm text-slate-300">{acc.name}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{acc.accountNumber}</span>
                                            </div>
                                        </div>
                                        <span className={clsx("text-sm font-medium", (acc.balance || 0) < 0 ? "text-red-400" : "text-green-400")}>
                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: acc.currency }).format(acc.balance || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

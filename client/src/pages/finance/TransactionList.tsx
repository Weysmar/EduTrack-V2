import React from 'react';
import { useFinanceStore } from '../../store/financeStore';
import { ShoppingCart, Home, DollarSign, Coffee, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../components/language-provider';
import { fr, enUS } from 'date-fns/locale';

import { useFinance } from '../../hooks/useFinance';

export const TransactionList: React.FC = () => {
    const { t, language } = useLanguage();
    const { filters } = useFinanceStore();
    const { transactions: allTransactions, getFilteredTransactions } = useFinance();
    const transactions = getFilteredTransactions(allTransactions, filters);

    if (transactions.length === 0) {
        return <div className="text-center text-slate-500 py-10">{t('finance.tx.noneMonth')}</div>;
    }

    // Helper pour icones (à dynamiser selon catégorie réelle)
    const getIcon = (type: string) => {
        switch (type) {
            case 'GROCERY': return <ShoppingCart className="w-5 h-5 text-yellow-500" />;
            case 'HOUSING': return <Home className="w-5 h-5 text-blue-500" />;
            case 'SALARY': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
            default: return <DollarSign className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-200">{t('finance.tx.recent')}</h3>
                <button className="text-sm text-blue-400 hover:text-blue-300">{t('finance.tx.viewAll')}</button>
            </div>

            <div className="space-y-3">
                {transactions.map((tx) => (
                    <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800 cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-full border border-slate-700 group-hover:bg-slate-700 transition-colors">
                                {getIcon((tx as any).category?.name || '')}
                            </div>
                            <div>
                                <div className="font-medium text-slate-200">{tx.description || t('common.transaction') || "Transaction"}</div>
                                <div className="text-xs text-slate-500">
                                    {format(new Date(tx.date), 'dd MMM yyyy', { locale: language === 'fr' ? fr : enUS })} • {(tx as any).category?.name || t('finance.tx.category.none')}
                                </div>
                            </div>
                        </div>
                        <div className={`font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {tx.type === 'INCOME' ? '+' : '-'}{Math.abs(tx.amount).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')} {t('common.currency')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

import React, { useEffect } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { CheckCircle, AlertCircle, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';

export const ImportHistory = () => {
    const { t, language } = useLanguage();
    const { importLogs, fetchImportLogs } = useFinanceStore();

    useEffect(() => {
        fetchImportLogs();
    }, []);

    // Helper to format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-blue-400" />
                {t('finance.import.history.title')}
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                            <th className="px-4 py-3">{t('finance.import.history.date')}</th>
                            <th className="px-4 py-3">{t('finance.import.history.file')}</th>
                            <th className="px-4 py-3">{t('finance.import.history.status')}</th>
                            <th className="px-4 py-3">{t('finance.import.history.imported')}</th>
                            <th className="px-4 py-3 text-slate-600">{t('finance.import.history.duplicates')}</th>
                            <th className="px-4 py-3 text-red-900/40">{t('finance.import.history.errors')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-800/50">
                        {importLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-4 text-slate-400 font-mono text-xs whitespace-nowrap">
                                    {formatDate(log.createdAt)}
                                </td>
                                <td className="px-4 py-4 text-slate-200">
                                    <div className="flex flex-col">
                                        <span className="font-medium truncate max-w-[200px]">{log.fileName}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">ID: {log.id.slice(0, 8)}...</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    {log.status === 'SUCCESS' ? (
                                        <div className="flex items-center gap-2 text-green-400 bg-green-400/10 px-2 py-1 rounded-full text-xs w-fit">
                                            <CheckCircle size={12} />
                                            {t('common.status.completed')}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-2 py-1 rounded-full text-xs w-fit">
                                            <AlertCircle size={12} />
                                            {t('common.status.error')}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-4 font-bold text-slate-300">
                                    {log.importedCount}
                                </td>
                                <td className="px-4 py-4 text-slate-500 text-xs">
                                    {log.duplicateCount}
                                </td>
                                <td className="px-4 py-4 text-red-500/60 text-xs">
                                    {log.errorCount}
                                </td>
                            </tr>
                        ))}
                        {importLogs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    {t('finance.import.history.none')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

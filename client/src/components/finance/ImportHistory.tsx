import React, { useEffect } from 'react';
import { useFinanceStore } from '@/store/financeStore';
import { CheckCircle, AlertCircle, FileText, Clock } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists

export const ImportHistory = () => {
    const { importLogs, fetchImportLogs } = useFinanceStore();

    useEffect(() => {
        fetchImportLogs();
    }, []);

    // Helper to format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Historique des Imports
            </h3>

            <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Fichier</th>
                            <th className="px-4 py-3 text-center font-medium text-slate-500">Statut</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500">Importés</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500">Doublons</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500">Erreurs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {importLogs.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                    Aucun historique d'import disponible.
                                </td>
                            </tr>
                        ) : (
                            importLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        {log.filename}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                            log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                                log.status === 'PARTIAL' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                        )}>
                                            {log.status === 'SUCCESS' && <CheckCircle className="w-3 h-3" />}
                                            {log.status === 'ERROR' && <AlertCircle className="w-3 h-3" />}
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                                        +{log.imported}
                                    </td>
                                    <td className="px-4 py-3 text-right text-amber-600">
                                        {log.duplicates}
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-600">
                                        {log.errors}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

import { FileText, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface ExtractionStatsProps {
    stats: {
        words: number;
        pages?: number;
        timeMs: number;
        warnings?: string[];
        method: 'pdf' | 'docx' | 'ppt' | 'ocr' | 'image';
    };
    className?: string;
}

export function ExtractionStats({ stats, className = '' }: ExtractionStatsProps) {
    const hasWarnings = stats.warnings && stats.warnings.length > 0;

    return (
        <div className={`bg-slate-50 dark:bg-slate-900/50 border rounded-lg p-4 ${className}`}>
            <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Statistiques d'Extraction</h4>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {/* Word Count */}
                <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Mots</span>
                    <span className="font-semibold text-lg">{stats.words.toLocaleString()}</span>
                </div>

                {/* Page Count */}
                {stats.pages && (
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Pages</span>
                        <span className="font-semibold text-lg">{stats.pages}</span>
                    </div>
                )}

                {/* Extraction Time */}
                <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Temps
                    </span>
                    <span className="font-semibold text-lg">
                        {stats.timeMs < 1000
                            ? `${stats.timeMs}ms`
                            : `${(stats.timeMs / 1000).toFixed(1)}s`}
                    </span>
                </div>

                {/* Method */}
                <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Méthode</span>
                    <span className="font-semibold text-sm uppercase">{stats.method}</span>
                </div>
            </div>

            {/* Warnings */}
            {hasWarnings && (
                <div className="mt-3 pt-3 border-t">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                                Avertissements :
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                {stats.warnings?.map((warning, i) => (
                                    <li key={i}>• {warning}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Success indicator if no warnings */}
            {!hasWarnings && (
                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Extraction réussie sans erreur</span>
                </div>
            )}
        </div>
    );
}

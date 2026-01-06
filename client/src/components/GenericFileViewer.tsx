import { File, Download } from 'lucide-react';

interface GenericFileViewerProps {
    url: string;
    filename?: string;
    className?: string;
}

export function GenericFileViewer({ url, filename = "Fichier", className = "" }: GenericFileViewerProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed text-center min-h-[400px] ${className}`}>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6">
                <File className="h-16 w-16 text-slate-400" />
            </div>

            <h3 className="text-xl font-semibold mb-2">Aperçu non disponible</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
                Le format de ce fichier (<span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{filename.split('.').pop() || '?'}</span>)
                ne permet pas une visualisation directe.
            </p>

            <a
                href={url}
                download
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors"
            >
                <Download className="h-5 w-5" />
                Télécharger le fichier
            </a>
        </div>
    );
}

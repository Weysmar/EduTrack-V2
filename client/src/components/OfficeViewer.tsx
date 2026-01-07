import { useState } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { DocxViewer } from './DocxViewer';

interface OfficeViewerProps {
    url: string;
    className?: string;
}

export function OfficeViewer({ url, className = "" }: OfficeViewerProps) {
    // Viewer Engine State: 'google' | 'microsoft'
    const [engine, setEngine] = useState<'google' | 'microsoft'>('google');
    const [hasError, setHasError] = useState(false);

    // Extension Check
    const isDocx = /\.docx($|\?)/i.test(url) || url.toLowerCase().includes('docx');

    if (isDocx) {
        return <DocxViewer url={url} className={className} />;
    }

    // URLs for engines
    const encodedUrl = encodeURIComponent(url);
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    const currentSrc = engine === 'google' ? googleViewerUrl : officeViewerUrl;

    if (hasError) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border rounded-lg h-full ${className}`}>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                    <FileText className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aperçu indisponible</h3>
                <p className="text-sm text-center text-muted-foreground max-w-sm mb-6">
                    Le lecteur en ligne n'a pas pu charger ce document (peut-être protégé ou trop volumineux).
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => { setHasError(false); setEngine(engine === 'google' ? 'microsoft' : 'google'); }}
                        className="flex items-center gap-2 px-4 py-2 border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Essayer {engine === 'google' ? 'Microsoft' : 'Google'}
                    </button>
                    <a
                        href={url}
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Télécharger
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 border rounded-lg overflow-hidden ${className}`}>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-950 border-b text-sm">
                <div className="flex items-center gap-3">
                    <span className="font-medium text-muted-foreground flex items-center gap-2">
                        Aperçu ({engine === 'google' ? 'Google' : 'Microsoft'})
                    </span>
                    <button
                        onClick={() => setEngine(engine === 'google' ? 'microsoft' : 'google')}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Changer de lecteur si l'affichage bug"
                    >
                        <RefreshCw className="h-3 w-3" />
                        Changer de moteur
                    </button>
                </div>

                <div className="flex gap-2">
                    <a
                        href={url}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                        title="Télécharger le fichier"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Télécharger</span>
                    </a>
                    <a
                        href={currentSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                        title="Ouvrir dans une nouvelle fenêtre"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>

            {/* Viewer Iframe */}
            <div className="flex-1 relative bg-white">
                <iframe
                    key={engine} // Force remount on engine change
                    src={currentSrc}
                    title="Document Viewer"
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    onError={() => setHasError(true)}
                />
            </div>
        </div>
    );
}

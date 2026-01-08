import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { DocxViewer } from './DocxViewer';
import { apiClient } from '@/lib/api/client';
import { API_URL } from '@/config';

interface OfficeViewerProps {
    url: string;
    storageKey?: string;
    className?: string;
    engine?: 'google' | 'microsoft';
    onEngineChange?: (engine: 'google' | 'microsoft') => void;
}

export function OfficeViewer({ url: initialUrl, storageKey, className = "", engine: controlledEngine, onEngineChange }: OfficeViewerProps) {
    // Viewer Engine State: 'google' | 'microsoft'
    // Use controlled state if provided, otherwise internal
    const [internalEngine, setInternalEngine] = useState<'google' | 'microsoft'>('google');

    const engine = controlledEngine || internalEngine;
    const setEngine = (newEngine: 'google' | 'microsoft') => {
        if (onEngineChange) {
            onEngineChange(newEngine);
        } else {
            setInternalEngine(newEngine);
        }
    };

    const [hasError, setHasError] = useState(false);
    // Construct direct public URL (Option 3 - No Signature)
    const getPublicUrl = () => {
        if (!storageKey) return initialUrl;

        // Construct absolute URL
        // If API_URL is relative (e.g. '/api'), prepend origin
        // If API_URL is absolute, just append path
        const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
        const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;

        // Use direct public route
        const cleanPath = storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
        return `${cleanApiBase}/storage/public${cleanPath}`;
    };

    const viewerUrl = getPublicUrl();

    // Extension Check
    const isDocx = /\.docx($|\?)/i.test(initialUrl) || initialUrl.toLowerCase().includes('docx');

    if (isDocx) {
        return <DocxViewer url={initialUrl} className={className} />;
    }

    if (!viewerUrl) return null;

    // URLs for engines
    const encodedUrl = encodeURIComponent(viewerUrl);
    // Use 'gview' for Google which is sometimes more reliable than 'viewer'
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    const currentSrc = engine === 'google' ? googleViewerUrl : officeViewerUrl;

    if (hasError || (viewerUrl && (viewerUrl.includes('localhost') || viewerUrl.includes('127.0.0.1')))) {
        // If localhost, it will never work with Google/MS
        const isLocalhost = viewerUrl?.includes('localhost') || viewerUrl?.includes('127.0.0.1');

        return (
            <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border rounded-lg h-full ${className}`}>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                    <FileText className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aperçu indisponible</h3>
                <p className="text-sm text-center text-muted-foreground max-w-sm mb-6">
                    {isLocalhost ? (
                        <>
                            Le lecteur en ligne ne peut pas accéder aux fichiers hébergés en <strong>localhost</strong>.
                            <br />
                            <span className="text-xs opacity-75 mt-2 block">
                                C'est normal durant le développement. Déployez l'app ou utilisez `ngrok` pour voir l'aperçu.
                            </span>
                        </>
                    ) : viewerUrl?.startsWith('http://') ? (
                        <>
                            Le lecteur en ligne demande souvent une connexion sécurisée (HTTPS).
                            <br />
                            <span className="text-xs opacity-75 mt-2 block">
                                Votre URL est en <strong>http://</strong>. Google/Microsoft peuvent bloquer le téléchargement.
                                Essayez de passer votre site en HTTPS.
                            </span>
                        </>
                    ) : (
                        <>
                            Le lecteur en ligne ({engine}) n'a pas pu charger ce document.
                            <br />
                            <span className="text-xs opacity-75 mt-2 block">
                                Cela arrive souvent avec les bloqueurs de publicité (Brave Shields, uBlock) ou si le fichier est trop complexe.
                            </span>
                        </>
                    )}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    {!isLocalhost && (
                        <button
                            onClick={() => { setHasError(false); setEngine(engine === 'google' ? 'microsoft' : 'google'); }}
                            className="flex items-center gap-2 px-4 py-2 border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Essayer {engine === 'google' ? 'Microsoft' : 'Google'}
                        </button>
                    )}
                    <a
                        href={viewerUrl} // Signed URL for download
                        download
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Télécharger le fichier
                    </a>
                </div>

                {/* DEBUG INFO */}
                <div className="mt-6 p-2 bg-muted/50 rounded text-[10px] font-mono text-muted-foreground break-all max-w-full">
                    <p className="font-bold">DEBUG INFO:</p>
                    <p>Engine: {engine}</p>
                    <p>File URL: {viewerUrl}</p>
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
                    {/* Add explicit link to open in new tab for debugging */}
                    <a
                        href={currentSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Ouvrir le lecteur
                    </a>
                </div>

                <div className="flex gap-2">
                    <a
                        href={viewerUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                        title="Télécharger le fichier"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Télécharger</span>
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
                    // Add sandbox to prevent scripts if possible? No, viewers need scripts.
                    // But we can try to facilitate permissions.
                    allow="clipboard-write; autoplay"
                />
            </div>
        </div>
    );
}

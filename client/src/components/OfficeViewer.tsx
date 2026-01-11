import { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, RefreshCw, AlertCircle, Loader2, Maximize2, Minimize2, Laptop } from 'lucide-react';
import { DocxViewer } from './DocxViewer';
import { useLanguage } from './language-provider';
import { API_URL } from '@/config';

interface OfficeViewerProps {
    url: string;
    storageKey?: string;
    className?: string;
    engine?: 'google' | 'microsoft' | 'local';
    onEngineChange?: (engine: 'google' | 'microsoft' | 'local') => void;
}

export function OfficeViewer({ url: initialUrl, storageKey, className = "", engine: controlledEngine, onEngineChange }: OfficeViewerProps) {
    const { t } = useLanguage()

    // Determine file type
    const isDocx = /\.docx($|\?)/i.test(initialUrl) || initialUrl.toLowerCase().includes('docx');

    // Default engine: 'microsoft' for DOCX (best fidelity), 'google' otherwise (better wide support)
    // However, if on localhost, we might default to local logic later, but state initialization is simple here.
    const [internalEngine, setInternalEngine] = useState<'google' | 'microsoft' | 'local'>(
        isDocx ? 'microsoft' : 'microsoft'
    );
    const [isZenMode, setIsZenMode] = useState(false);
    const [hasError, setHasError] = useState(false);

    const engine = controlledEngine || internalEngine;
    const setEngine = (newEngine: 'google' | 'microsoft' | 'local') => {
        setHasError(false); // Reset error on switch
        if (onEngineChange) {
            onEngineChange(newEngine);
        } else {
            setInternalEngine(newEngine);
        }
    };

    // Toggle Zen Handler
    const toggleZen = () => setIsZenMode(!isZenMode);

    // Construct direct public URL
    const getPublicUrl = () => {
        if (!storageKey) return initialUrl;
        const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
        const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        const cleanPath = storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
        return `${cleanApiBase}/storage/public${cleanPath}`;
    };

    const viewerUrl = getPublicUrl();

    if (!viewerUrl) return null;

    // Detect Localhost to prevent frustration
    const isLocalhost = viewerUrl.includes('localhost') || viewerUrl.includes('127.0.0.1');

    // URLs for engines
    const encodedUrl = encodeURIComponent(viewerUrl);
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    // Render Local Viewer
    if (engine === 'local') {
        if (isDocx) {
            return (
                <div className={isZenMode ? "fixed inset-0 z-[100] bg-background flex flex-col" : `flex flex-col h-full bg-slate-50 border rounded-lg overflow-hidden ${className}`}>
                    <div className="flex items-center justify-between px-4 py-2 bg-white border-b text-sm">
                        <div className="flex items-center gap-3">
                            <button onClick={toggleZen} className="p-1.5 rounded hover:bg-muted">
                                {isZenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </button>
                            <span className="font-medium text-muted-foreground flex items-center gap-2">
                                <Laptop className="h-4 w-4" />
                                Mode Local (Rapide)
                            </span>
                            <button
                                onClick={() => setEngine('microsoft')}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Passer en Haute Fidélité
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <a href={viewerUrl} download className="flex items-center gap-2 px-3 py-1 bg-primary text-white rounded text-xs">
                                <Download className="h-3 w-3" /> Télécharger
                            </a>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <DocxViewer url={initialUrl} className="h-full w-full" />
                    </div>
                </div>
            )
        }
        // Fallback for non-docx local? usually we only have DocxViewer for now.
        // Could fallback to simple iframe or error.
    }

    // Render Error State for Online Viewers
    if (hasError || (isLocalhost && (engine === 'google' || engine === 'microsoft'))) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900 border rounded-lg h-full ${className}`}>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4">
                    <FileText className="h-10 w-10 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Aperçu indisponible en ligne</h3>

                {isLocalhost ? (
                    <div className="text-sm text-center text-muted-foreground max-w-sm mb-6 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded border border-yellow-200 dark:border-yellow-900">
                        <p className="font-bold text-yellow-700 dark:text-yellow-500 mb-1">Localhost détecté</p>
                        <p>Les lecteurs Microsoft/Google ne peuvent pas accéder à vos fichiers locaux.</p>
                    </div>
                ) : (
                    <p className="text-sm text-center text-muted-foreground max-w-sm mb-6">
                        Le lecteur ({engine}) n'a pas pu charger le fichier.
                    </p>
                )}

                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {/* Primary Action: Use Local Viewer if DOCX */}
                    {isDocx && (
                        <button
                            onClick={() => setEngine('local')}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors font-medium shadow-sm"
                        >
                            <Laptop className="h-4 w-4" />
                            Utiliser le lecteur Local
                        </button>
                    )}

                    {/* Secondary Actions */}
                    {!isLocalhost && (
                        <button
                            onClick={() => { setHasError(false); setEngine(engine === 'google' ? 'microsoft' : 'google'); }}
                            className="flex items-center justify-center gap-2 px-4 py-2 border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-sm"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Essayer {engine === 'google' ? 'Microsoft' : 'Google'}
                        </button>
                    )}

                    <a
                        href={viewerUrl}
                        download
                        className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors text-sm"
                    >
                        <Download className="h-4 w-4" />
                        Télécharger le fichier
                    </a>
                </div>
            </div>
        );
    }

    const currentSrc = engine === 'google' ? googleViewerUrl : officeViewerUrl;

    return (
        <div className={isZenMode
            ? "fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-300"
            : `flex flex-col h-full bg-slate-50 dark:bg-slate-900 border rounded-lg overflow-hidden ${className}`
        }>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-950 border-b text-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleZen}
                        className={`p-1.5 rounded-full transition-all flex items-center gap-2 ${isZenMode ? 'bg-primary text-primary-foreground shadow-lg px-3' : 'text-muted-foreground hover:bg-muted'}`}
                        title={isZenMode ? t('action.exitZen') : t('action.enterZen')}
                    >
                        {isZenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        {isZenMode && <span className="text-xs font-bold">{t('action.exitZen') || 'Quitter Zen'}</span>}
                    </button>

                    <span className="font-medium text-muted-foreground flex items-center gap-2 hidden sm:flex">
                        Aperçu ({engine === 'google' ? 'Google' : 'Microsoft'})
                    </span>

                    {/* Quick Switcher */}
                    {isDocx && (
                        <button
                            onClick={() => setEngine('local')}
                            className="text-xs flex items-center gap-1 text-slate-600 hover:text-slate-900 border px-2 py-0.5 rounded"
                            title="Utiliser le rendu navigateur (plus rapide, moins fidèle)"
                        >
                            <Laptop className="h-3 w-3" />
                            Mode Local
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setEngine(engine === 'google' ? 'microsoft' : 'google')}
                        className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 px-2"
                    >
                        <RefreshCw className="h-3 w-3" />
                        <span className="hidden sm:inline">Changer moteur</span>
                    </button>
                    <a
                        href={viewerUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                    >
                        <Download className="h-4 w-4" />
                    </a>
                </div>
            </div>

            {/* Viewer Iframe */}
            <div className="flex-1 relative bg-white">
                <iframe
                    key={engine}
                    src={currentSrc}
                    title={t('document.viewer')}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    onError={() => setHasError(true)}
                    allow="clipboard-write; autoplay"
                />
            </div>
        </div>
    );
}

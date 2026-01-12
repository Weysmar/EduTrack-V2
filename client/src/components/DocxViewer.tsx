import { useState, useEffect, useRef } from 'react';
import { renderAsync } from 'docx-preview';
import { Loader2, AlertCircle, FileText, Download } from 'lucide-react';

interface DocxViewerProps {
    url: string;
    className?: string;
}

export function DocxViewer({ url, className = "" }: DocxViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadDoc = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch the file as a Blob
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Impossible de charger le document: ${response.status}`);
                }

                const blob = await response.blob();

                if (!isMounted) return;
                if (!containerRef.current) return;

                // Clear previous content
                containerRef.current.innerHTML = '';

                // Render using docx-preview
                await renderAsync(blob, containerRef.current, undefined, {
                    className: "docx-wrapper",
                    inWrapper: true,
                    ignoreWidth: true, // Allow reflow to fit container width
                    breakPages: true,
                    experimental: true, // Needed for advanced features
                    trimXmlDeclaration: true,
                    useBase64URL: true,
                    renderHeaders: true,
                    renderFooters: true,
                    renderFootnotes: true,
                    renderChanges: false, // Don't show tracked changes
                    debug: false,
                });

            } catch (err) {
                console.error("Error loading DOCX:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : "Erreur inconnue");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (url) {
            loadDoc();
        }

        return () => {
            isMounted = false;
        };
    }, [url]);

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-950/20 rounded-lg text-center ${className}`}>
                <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">Impossible d'afficher le document</h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-6 max-w-md">{error}</p>
                <a
                    href={url}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 rounded-md transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Télécharger le fichier
                </a>
            </div>
        );
    }

    return (
        <div className={`relative flex flex-col bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border ${className}`}>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-black/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground font-medium">Rendu du document...</p>
                </div>
            )}

            {/* Viewer Container - Enforce Paper Look */}
            <div className="flex-1 overflow-auto bg-slate-200/50 dark:bg-slate-950 p-4 md:p-8 flex justify-center">

                {/* 
                   docx-preview renders black text by default. 
                   We intentionally force a white paper background to match Word.
                   This fixes "colors are wrong" issues by respecting the original "Print Layout".
                */}
                <div
                    ref={containerRef}
                    className="docx-canvas-wrapper shadow-lg bg-white min-h-[800px] w-full max-w-[21cm]" // A4 max-width approx
                    style={{ color: 'black' }} // Force black text base (docx styles will override)
                />
            </div>

            {/* Custom Styles for styling the rendered output if needed */}
            <style>{`
                .docx_wrapper { background: transparent !important; padding: 0 !important; }
                .docx_wrapper > section { box-shadow: none !important; margin-bottom: 0 !important; }
                /* Ensure images fit */
                .docx_wrapper img { max-width: 100%; height: auto; }
            `}</style>
        </div>
    );
}

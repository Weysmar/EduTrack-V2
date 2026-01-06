import { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { Loader2, AlertCircle, FileText, Download } from 'lucide-react';

interface DocxViewerProps {
    url: string;
    className?: string;
}

export function DocxViewer({ url, className = "" }: DocxViewerProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadDoc = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch the file as an ArrayBuffer
                // Note: We use the proxy URL which is same-origin (or handled via proxy), 
                // so we don't need special headers usually, but we ensure credentials are sent if needed.
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Failed to load document: ${response.status} ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();

                if (!isMounted) return;

                // Convert to HTML using mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer });

                if (!isMounted) return;

                if (!result.value) {
                    throw new Error("Le document semble vide ou illisible.");
                }

                setContent(result.value);

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

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900 rounded-lg ${className}`}>
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Chargement du document...</p>
            </div>
        );
    }

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
        <div className={`bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-lg shadow-sm border overflow-auto ${className}`}>
            {/* Render the HTML content with improved Typography */}
            <div
                className="prose dark:prose-invert max-w-none 
                prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl 
                prose-p:leading-relaxed prose-p:text-justify prose-li:my-1
                prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5
                prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto"
                dangerouslySetInnerHTML={{ __html: content || '' }}
            />
        </div>
    );
}

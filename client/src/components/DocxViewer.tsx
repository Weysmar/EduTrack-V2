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
            {/* Manual CSS for prose since tailwindcss/typography might be missing */}
            <style>{`
                .docx-content h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
                .docx-content h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
                .docx-content h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
                .docx-content p { margin-bottom: 1rem; line-height: 1.6; text-align: justify; }
                .docx-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
                .docx-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
                .docx-content li { margin-bottom: 0.25rem; }
                .docx-content img { max-width: 100%; height: auto; margin: 1rem auto; display: block; border-radius: 0.5rem; }
                .docx-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                .docx-content td, .docx-content th { border: 1px solid #e2e8f0; padding: 0.5rem; }
                .dark .docx-content td, .dark .docx-content th { border-color: #334155; }
            `}</style>

            {/* Render the HTML content with custom class */}
            <div
                className="docx-content text-slate-900 dark:text-slate-100"
                dangerouslySetInnerHTML={{ __html: content || '' }}
            />
        </div>
    );
}

import { FileText, Download, ExternalLink } from 'lucide-react';
import { DocxViewer } from './DocxViewer';

interface OfficeViewerProps {
    url: string;
    className?: string;
}

export function OfficeViewer({ url, className = "" }: OfficeViewerProps) {
    // Determine extension from URL (approximation, but usually works if filename is in path or query)
    // A better way would be passing the filename prop, but for now we parse the URL or try to guess.
    // However, the cleanest way since we might have /proxy/UUID is to rely on what ItemView detects, 
    // BUT ItemView renders this.
    // Let's assume URL ends with .docx OR we can try to detect.

    // Actually, ItemView knows the type. But here we only have URL.
    // Let's check if the URL contains .docx (case insensitive)
    const isDocx = /\.docx($|\?)/i.test(url) || url.toLowerCase().includes('docx');

    if (isDocx) {
        return <DocxViewer url={url} className={className} />;
    }

    // For other Office files (XLS, PPT), simplistic Google Viewer won't work on localhost.
    // We provide a clean "Download/Open" card instead of a broken iframe.
    return (
        <div className={`flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-dashed ${className}`}>
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6">
                <FileText className="h-12 w-12 text-blue-500" />
            </div>

            <h3 className="text-xl font-semibold mb-2">Aperçu non disponible</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
                Ce format de fichier ne peut pas être visualisé directement dans l'application pour le moment.
            </p>

            <div className="flex gap-4">
                <a
                    href={url}
                    download
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-colors"
                >
                    <Download className="h-5 w-5" />
                    Télécharger
                </a>

                {/* Fallback link to Google Viewer just in case they ARE public (rare but possible) */}
                <a
                    href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                >
                    <ExternalLink className="h-5 w-5" />
                    Essayer Google Viewer
                </a>
            </div>
        </div>
    );
}

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

    // For other Office files (XLS, PPT), use Google Docs Viewer (often more robust for simple embedding)
    const encodedUrl = encodeURIComponent(url);
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
    // Microsoft fallback just in case
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    return (
        <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 border rounded-lg overflow-hidden ${className}`}>

            {/* Toolbar / Fallback Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-950 border-b text-sm">
                <span className="font-medium text-muted-foreground flex items-center gap-2">
                    Aperçu du document
                </span>
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
                        href={googleViewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                        title="Ouvrir dans Google Viewer"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Ouvrir</span>
                    </a>
                </div>
            </div>

            {/* Viewer Iframe (Google Docs Viewer) */}
            <div className="flex-1 relative bg-white">
                <iframe
                    src={googleViewerUrl}
                    title="Document Viewer"
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    onError={(e) => console.error("Viewer error", e)}
                />
            </div>

            {/* Disclaimer */}
            <div className="px-4 py-1 text-xs text-center text-muted-foreground bg-slate-100 dark:bg-slate-950 border-t">
                Si le document ne s'affiche pas, il est peut-être protégé. Cliquez sur "Ouvrir" ou "Télécharger".
            </div>
        </div>
    );
}

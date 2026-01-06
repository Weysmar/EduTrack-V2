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

    // For other Office files (XLS, PPT), use Microsoft Office Online Viewer
    // Note: This requires the file URL to be public facing. Localhost will fail.
    const encodedUrl = encodeURIComponent(url);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;

    return (
        <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 border rounded-lg overflow-hidden ${className}`}>

            {/* Toolbar / Fallback Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-950 border-b text-sm">
                <span className="font-medium text-muted-foreground">
                    Aperçu Office Online
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
                        href={viewerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-foreground transition-colors"
                        title="Ouvrir dans une nouvelle fenêtre"
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Ouvrir</span>
                    </a>
                </div>
            </div>

            {/* Viewer Iframe */}
            <div className="flex-1 relative bg-white">
                <iframe
                    src={viewerUrl}
                    title="Office Viewer"
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    onError={(e) => {
                        // Very hard to catch iframe errors due to CORS, but good to have the structure
                        console.error("Office viewer error", e);
                    }}
                />

                {/* Overlay for Loading State (Optional optimization) */}
                {/* Since we can't easily detect load state of cross-origin iframe, we rely on the iframe itself showing a loader */}
            </div>

            {/* Disclaimer for Localhost/Private Networks */}
            <div className="px-4 py-1 text-xs text-center text-muted-foreground bg-slate-100 dark:bg-slate-950 border-t">
                Si l'aperçu ne s'affiche pas, le fichier est peut-être privé ou inaccessible par Microsoft. Utilisez le bouton "Télécharger".
            </div>
        </div>
    );
}

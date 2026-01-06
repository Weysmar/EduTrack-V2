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
        href = { url }
                    target = "_blank"
    rel = "noopener noreferrer"
    className = "text-xs bg-white/80 dark:bg-black/50 px-2 py-1 rounded shadow"
        >
        Ouvrir l'original
                </a >
            </div >
        </div >
    )
}

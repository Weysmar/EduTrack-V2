import { AlertCircle } from 'lucide-react'

interface OfficeViewerProps {
    url: string
    className?: string
}

export function OfficeViewer({ url, className = "" }: OfficeViewerProps) {
    // Encode the URL to ensure special characters are handled correctly
    const encodedUrl = encodeURIComponent(url);
    const googleDocsUrl = `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;

    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative ${className}`}>
            <iframe
                src={googleDocsUrl}
                title="Office Document Viewer"
                className="w-full h-full border-0"
                allowFullScreen
            />
            {/* Fallback link if viewer fails or for convenience */}
            <div className="absolute bottom-2 right-2 opacity-50 hover:opacity-100 transition-opacity">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs bg-white/80 dark:bg-black/50 px-2 py-1 rounded shadow"
                >
                    Ouvrir l'original
                </a>
            </div>
        </div>
    )
}

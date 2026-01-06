import { useState, useEffect } from 'react';
import { Maximize, Minimize, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
    url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Handle Escape key to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const viewerContent = (
        <div className={`flex flex-col w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative ${isFullscreen ? 'h-full' : 'h-[80vh]'}`}>
            {/* Toolbar Overlay */}
            <div className="absolute top-4 right-6 z-10 flex gap-2">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-sm transition-colors"
                    title="Ouvrir dans un nouvel onglet"
                >
                    <ExternalLink className="h-4 w-4" />
                </a>
                <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-sm transition-colors"
                    title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
                >
                    {isFullscreen ? (
                        <>
                            <Minimize className="h-4 w-4" />
                            <span className="text-sm font-medium hidden sm:inline">Réduire</span>
                        </>
                    ) : (
                        <>
                            <Maximize className="h-4 w-4" />
                            <span className="text-sm font-medium hidden sm:inline">Plein écran</span>
                        </>
                    )}
                </button>
            </div>

            {/* Native Browser PDF Viewer */}
            <iframe
                src={`${url}#view=FitH`}
                title="PDF Document"
                className="w-full h-full border-0"
                allowFullScreen
            />
        </div>
    );

    // Render fullscreen modal if active
    if (isFullscreen) {
        return (
            <div className="fixed inset-0 z-[999] bg-slate-900 flex flex-col">
                {viewerContent}
            </div>
        );
    }

    return viewerContent;
}

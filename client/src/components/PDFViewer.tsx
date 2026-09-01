import { useState, useRef, useEffect } from 'react'
import { Document, Page } from 'react-pdf'
import { ZoomIn, ZoomOut, ExternalLink, RotateCw, AlertCircle } from 'lucide-react'
import { useLanguage } from './language-provider'

interface PDFViewerProps {
    url: string
    className?: string
}

export function PDFViewer({ url, className = "" }: PDFViewerProps) {
    const { t } = useLanguage()
    const [numPages, setNumPages] = useState<number | null>(null)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [pageWidth, setPageWidth] = useState<number | null>(null)
    const [key, setKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                // Subtracting a small buffer to avoid horizontal scrollbar appearing due to rounding issues
                setPageWidth(entry.contentRect.width - 2)
            }
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF:', error)
        setLoading(false)
    }

    const handleRetry = () => {
        setLoading(true)
        setKey(prev => prev + 1)
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 md:p-3 border-b bg-slate-200 dark:bg-slate-800 sticky top-0 z-10 gap-2">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <div className="text-xs md:text-sm font-medium px-1 md:px-2 truncate">
                        {loading ? 'Chargement...' : `${numPages} pages`}
                    </div>
                </div>

                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    <button
                        onClick={zoomOut}
                        className="p-1.5 md:p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                        title={t('action.zoomOut')}
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-xs md:text-sm font-medium px-1 md:px-2 min-w-[3ch]">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={zoomIn}
                        className="p-1.5 md:p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                        title={t('action.zoomIn')}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <div className="h-4 w-px bg-border mx-0.5" />

                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 md:p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors text-foreground flex items-center gap-1 text-xs font-medium"
                        title={t('action.openNewTab') || "Ouvrir dans un nouvel onglet"}
                    >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Ouvrir</span>
                    </a>
                </div>
            </div>

            {/* PDF Document - Scrollable Area */}
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-4">
                <div ref={containerRef} className="flex flex-col items-center gap-4 min-h-full w-full">
                    <Document
                        key={key}
                        file={url}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={
                            <div className="flex items-center justify-center p-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                            </div>
                        }
                        error={
                            <div className="text-center p-8 md:p-12 max-w-md mx-auto my-auto flex flex-col items-center justify-center">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-destructive rounded-full mb-3">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <p className="font-semibold text-base mb-1 text-foreground">Erreur de chargement du PDF</p>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Impossible de charger le visualiseur sur cet appareil. Vous pouvez réessayer ou ouvrir le fichier directement.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                                    <button
                                        onClick={handleRetry}
                                        className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <RotateCw className="h-4 w-4" />
                                        <span>Réessayer</span>
                                    </button>
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span>Ouvrir le PDF</span>
                                    </a>
                                </div>
                            </div>
                        }
                        className="flex flex-col gap-4"
                    >
                        {numPages && Array.from(new Array(numPages), (el, index) => (
                            <Page
                                key={`page_${index + 1}`}
                                pageNumber={index + 1}
                                scale={scale}
                                width={pageWidth || undefined}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="shadow-lg bg-white"
                                loading={
                                    <div className="h-[800px] w-full bg-white animate-pulse rounded shadow-lg" />
                                }
                            />
                        ))}
                    </Document>
                </div>
            </div>
        </div>
    )
}


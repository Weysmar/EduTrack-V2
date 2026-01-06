import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

// Configure PDF.js worker
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
    url: string
    className?: string
}

export function PDFViewer({ url, className = "" }: PDFViewerProps) {
    const [numPages, setNumPages] = useState<number | null>(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF:', error)
        setLoading(false)
    }

    const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1))
    const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1))
    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

    return (
        <div className={`w-full bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-slate-200 dark:bg-slate-800 border-b">
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Page précédente"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium px-2">
                        {loading ? '...' : `${pageNumber} / ${numPages || '?'}`}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={!numPages || pageNumber >= numPages}
                        className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Page suivante"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={zoomOut}
                        className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Dézoomer"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium px-2">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={zoomIn}
                        className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                        title="Zoomer"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* PDF Document */}
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 flex items-start justify-center p-4">
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    }
                    error={
                        <div className="text-center p-12 text-destructive">
                            <p className="font-semibold mb-2">Erreur de chargement du PDF</p>
                            <p className="text-sm">Veuillez réessayer ou utiliser le bouton "Ouvrir le PDF"</p>
                        </div>
                    }
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        className="shadow-lg"
                    />
                </Document>
            </div>
        </div>
    )
}

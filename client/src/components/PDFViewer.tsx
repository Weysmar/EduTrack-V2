import { useState, useRef, useEffect } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import { ZoomIn, ZoomOut, RotateCw, AlertCircle, Minimize, Maximize } from 'lucide-react'
import { useLanguage } from './language-provider'
import { cn } from '@/lib/utils'

// Ensure workerSrc is always explicitly pointing to the same-origin worker
if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    pdfjs.GlobalWorkerOptions.workerSrc = `${origin}/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
    url: string
    className?: string
    isFocusMode?: boolean
    onToggleFocusMode?: () => void
    onExitFocusMode?: () => void
}

export function PDFViewer({
    url,
    className = "",
    isFocusMode,
    onToggleFocusMode,
    onExitFocusMode
}: PDFViewerProps) {
    const { t } = useLanguage()
    const [numPages, setNumPages] = useState<number | null>(null)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [pageWidth, setPageWidth] = useState<number | null>(null)
    const [pdfData, setPdfData] = useState<any>(null)
    const [useNativeEmbed, setUseNativeEmbed] = useState(false)
    const [internalFocus, setInternalFocus] = useState(false)
    const [key, setKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const activeFocus = isFocusMode !== undefined ? isFocusMode : internalFocus

    const handleToggleFocus = () => {
        if (onToggleFocusMode) {
            onToggleFocusMode()
        } else if (onExitFocusMode && activeFocus) {
            onExitFocusMode()
        } else {
            setInternalFocus(prev => !prev)
        }
    }

    // Handle Escape key to exit focus mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && activeFocus) {
                if (onExitFocusMode) onExitFocusMode()
                else setInternalFocus(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [activeFocus, onExitFocusMode])

    // Load PDF as raw ArrayBuffer / Uint8Array to transfer cleanly to Web Worker without blob restrictions
    useEffect(() => {
        let isMounted = true

        const loadPdf = async () => {
            setLoading(true)
            try {
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }
                const buffer = await response.arrayBuffer()
                if (isMounted) {
                    setPdfData({ data: new Uint8Array(buffer) })
                }
            } catch (err: any) {
                console.error("PDF arrayBuffer fetch error, falling back to URL:", err)
                if (isMounted) {
                    setPdfData(url)
                }
            }
        }

        loadPdf()

        return () => {
            isMounted = false
        }
    }, [url, key])

    useEffect(() => {
        if (!containerRef.current) return

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry) {
                // Adaptive width calculation: use full width with minimal margin on smartphones
                const paddingBuffer = activeFocus ? 8 : 4
                setPageWidth(Math.floor(entry.contentRect.width - paddingBuffer))
            }
        })

        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [activeFocus])

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages)
        setLoading(false)
    }

    function onDocumentLoadError(error: Error) {
        console.error('Error loading PDF in worker:', error)
        setLoading(false)
    }

    const handleRetry = () => {
        setLoading(true)
        setKey(prev => prev + 1)
    }

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3))
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5))

    return (
        <div className={cn(
            "w-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative flex flex-col transition-all",
            activeFocus
                ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none bg-background shadow-2xl"
                : `rounded-lg border shadow-sm ${className}`
        )}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 md:p-3 border-b bg-slate-200 dark:bg-slate-800 sticky top-0 z-10 gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Focus / Plein écran Toggle Button */}
                    <button
                        onClick={handleToggleFocus}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm shrink-0",
                            activeFocus
                                ? "bg-primary text-primary-foreground hover:opacity-90"
                                : "bg-card hover:bg-muted text-foreground border"
                        )}
                        title={activeFocus ? "Quitter le mode focus (Échap)" : "Mode Focus (Plein écran)"}
                    >
                        {activeFocus ? (
                            <>
                                <Minimize className="h-3.5 w-3.5" />
                                <span>Quitter</span>
                            </>
                        ) : (
                            <>
                                <Maximize className="h-3.5 w-3.5 text-primary" />
                                <span>Focus</span>
                            </>
                        )}
                    </button>

                    <div className="text-xs md:text-sm font-medium px-1 truncate text-muted-foreground">
                        {loading ? 'Chargement...' : `${numPages} p.`}
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
                    <span className="text-xs md:text-sm font-medium px-1 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
                    <button
                        onClick={zoomIn}
                        className="p-1.5 md:p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                        title={t('action.zoomIn')}
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>

                    <div className="h-4 w-px bg-border mx-0.5" />

                    <button
                        onClick={() => setUseNativeEmbed(prev => !prev)}
                        className="px-2 py-1 text-xs font-medium rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border bg-background/50"
                        title={useNativeEmbed ? "Passer au visualiseur interactif" : "Passer au visualiseur intégré"}
                    >
                        {useNativeEmbed ? "Interactif" : "Natif"}
                    </button>
                </div>
            </div>

            {/* PDF Document - Scrollable Area */}
            <div className={cn(
                "flex-1 overflow-auto bg-slate-50 dark:bg-slate-950",
                activeFocus ? "p-1 sm:p-2 md:p-4" : "p-2 md:p-4"
            )}>
                <div ref={containerRef} className="flex flex-col items-center gap-3 min-h-full w-full">
                    {useNativeEmbed ? (
                        <iframe
                            src={/^\s*(javascript|vbscript):/i.test(url) ? 'about:blank' : `${url}#view=FitH`}
                            title="PDF Document"
                            className="w-full h-full border-0 rounded-none bg-white shadow-sm"
                            style={{ height: activeFocus ? 'calc(100dvh - 56px)' : '70vh' }}
                            allowFullScreen
                        />
                    ) : pdfData && (
                        <Document
                            key={key}
                            file={pdfData}
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
                                    <p className="font-semibold text-base mb-1 text-foreground">Erreur de chargement du visualiseur</p>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Le visualiseur interactif n'a pas pu démarrer. Vous pouvez basculer en affichage natif ou ouvrir le fichier directement.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                                        <button
                                            onClick={() => setUseNativeEmbed(true)}
                                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                                        >
                                            <span>Mode natif</span>
                                        </button>
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
                                            className="px-4 py-2 border hover:bg-muted rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            <span>Ouvrir</span>
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
                    )}
                </div>
            </div>
        </div>
    )
}



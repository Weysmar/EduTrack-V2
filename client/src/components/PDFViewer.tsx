import { useState, useRef, useEffect, useMemo } from 'react'
import { pdfjs, Document, Page } from 'react-pdf'
import { ZoomIn, ZoomOut, RotateCw, AlertCircle, Minimize, Maximize, ExternalLink } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
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

const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768 ||
        (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
    );
};

interface LazyPageProps {
    pageNumber: number
    width: number | undefined
    devicePixelRatio: number
}

function LazyPage({ pageNumber, width, devicePixelRatio }: LazyPageProps) {
    // Render first 2 pages immediately, others when scrolled near view
    const [isVisible, setIsVisible] = useState(pageNumber <= 2)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isVisible) return
        const el = containerRef.current
        if (!el) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '800px 0px' }
        )

        observer.observe(el)
        return () => observer.disconnect()
    }, [isVisible])

    return (
        <div ref={containerRef} className="w-full flex justify-center min-h-[300px]">
            {isVisible ? (
                <Page
                    pageNumber={pageNumber}
                    width={width}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-lg bg-white"
                    devicePixelRatio={devicePixelRatio}
                    loading={
                        <div className="h-[600px] w-full bg-white animate-pulse rounded shadow-lg flex items-center justify-center text-xs text-muted-foreground">
                            Chargement page {pageNumber}...
                        </div>
                    }
                />
            ) : (
                <div className="h-[600px] w-full bg-slate-200/40 dark:bg-slate-800/40 rounded flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/40">
                    Page {pageNumber}
                </div>
            )}
        </div>
    )
}

const getTargetDpr = (scale: number) => {
    if (typeof window === 'undefined') return 2.5
    const base = window.devicePixelRatio || 2
    // On high-DPI screens, multiply base by scale so 1 physical screen pixel = 1 rendered canvas pixel
    // Min 2.5 so base view is crisp, Max 5 to avoid GPU memory saturation
    return Math.min(Math.max(scale * base, 2.5), 5)
}

export function PDFViewer({
    url,
    className = "",
    isFocusMode,
    onToggleFocusMode,
    onExitFocusMode
}: PDFViewerProps) {
    const { t } = useLanguage()
    const isMobile = useMemo(() => isMobileDevice(), [])
    const [numPages, setNumPages] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)
    const [zoomScale, setZoomScale] = useState(100)
    const [renderDpr, setRenderDpr] = useState(() => getTargetDpr(1))
    const transformRef = useRef<any>(null)
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    // Initialize pageWidth to mobile width immediately so first render fits screen
    const [pageWidth, setPageWidth] = useState<number | null>(() => {
        if (typeof window !== 'undefined') {
            return Math.min(window.innerWidth - 16, 840)
        }
        return null
    })
    // On mobile devices (smartphones/tablets), Android Chrome and iOS Safari cannot render inline PDFs in iframes,
    // so we default to interactive mode (React-PDF with Canvas) on mobile, and native iframe on desktop.
    const [useNativeEmbed, setUseNativeEmbed] = useState(() => !isMobileDevice())
    const [internalFocus, setInternalFocus] = useState(false)
    const [key, setKey] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Clear debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
        }
    }, [])

    const handleTransformed = (_: any, state: { scale: number }) => {
        const percent = Math.round(state.scale * 100)
        setZoomScale(percent)

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
        }

        // Debounce high-resolution canvas re-render so gestures stay 60fps,
        // and snaps to crisp resolution right after the user stops zooming/panning
        debounceTimerRef.current = setTimeout(() => {
            setRenderDpr(getTargetDpr(state.scale))
        }, 280)
    }

    // PDF.js options to suppress benign font sanitization warnings in console (verbosity: 0 = ERRORS only)
    const documentOptions = useMemo(() => ({
        verbosity: 0,
    }), [])

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
                                <span>Plein écran</span>
                            </>
                        )}
                    </button>

                    <span className="text-xs font-medium px-1 text-muted-foreground truncate hidden sm:inline">
                        Visionneuse PDF
                    </span>
                </div>

                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    {numPages && (
                        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground px-1 hidden sm:inline">
                            {numPages} {numPages > 1 ? 'pages' : 'page'}
                        </span>
                    )}

                    {!useNativeEmbed && (
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-background/80 border rounded-lg p-0.5 shadow-xs">
                            <button
                                type="button"
                                onClick={() => transformRef.current?.zoomOut(0.25)}
                                className="p-1 sm:p-1.5 hover:bg-muted rounded text-foreground transition-colors"
                                title={t('action.zoomOut')}
                            >
                                <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => transformRef.current?.resetTransform()}
                                className="text-[11px] sm:text-xs font-semibold px-1 py-0.5 rounded hover:bg-muted min-w-[3.5ch] text-center text-foreground transition-colors"
                                title="Réinitialiser le zoom (100%)"
                            >
                                {zoomScale}%
                            </button>
                            <button
                                type="button"
                                onClick={() => transformRef.current?.zoomIn(0.25)}
                                className="p-1 sm:p-1.5 hover:bg-muted rounded text-foreground transition-colors"
                                title={t('action.zoomIn')}
                            >
                                <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </button>
                        </div>
                    )}

                    {/* Mode Selector Segmented Pill */}
                    <div className="flex items-center rounded-lg border bg-background/80 p-0.5 text-xs shadow-xs shrink-0">
                        <button
                            type="button"
                            onClick={() => setUseNativeEmbed(false)}
                            className={cn(
                                "px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1",
                                !useNativeEmbed
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Mode interactif (React-PDF - recommandé sur smartphone et tablette)"
                        >
                            <span>Interactif</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setUseNativeEmbed(true)}
                            className={cn(
                                "px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1",
                                useNativeEmbed
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Mode natif (navigateur de bureau)"
                        >
                            <span>Natif</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Native Warning & Action Banner */}
            {isMobile && useNativeEmbed && (
                <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-3 py-2 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-amber-900 dark:text-amber-200 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-amber-500 font-bold text-sm shrink-0">📱</span>
                        <span>
                            <strong>Mode natif sur smartphone :</strong> Les navigateurs mobiles (Android Chrome) ne peuvent pas afficher le PDF directement dans la page.
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                            type="button"
                            onClick={() => setUseNativeEmbed(false)}
                            className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-semibold shadow-xs text-xs hover:bg-primary/90 transition-all"
                        >
                            Basculer en Interactif
                        </button>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md border border-amber-500/40 bg-background text-foreground text-xs hover:bg-muted font-medium transition-all flex items-center gap-1"
                        >
                            <ExternalLink className="h-3 w-3" />
                            <span>Ouvrir dans l'app PDF</span>
                        </a>
                    </div>
                </div>
            )}

            {/* PDF Document - Scrollable Area */}
            <div className={cn(
                "flex-1 overflow-auto bg-slate-50 dark:bg-slate-950",
                activeFocus ? "p-0" : (useNativeEmbed ? "p-0" : "p-2 md:p-4")
            )}>
                <div ref={containerRef} className="flex flex-col items-center gap-3 min-h-full w-full h-full">
                    {useNativeEmbed ? (
                        <iframe
                            src={/^\s*(javascript|vbscript):/i.test(url) ? 'about:blank' : `${url}#view=FitH`}
                            title="Visionneuse PDF"
                            className="w-full h-full border-0 bg-white dark:bg-slate-900"
                            style={{
                                border: 'none',
                                width: '100%',
                                height: '100%',
                                minHeight: activeFocus ? 'calc(100dvh - 48px)' : '75vh'
                            }}
                            allowFullScreen
                        />
                    ) : (
                        <TransformWrapper
                            ref={transformRef}
                            initialScale={1}
                            minScale={0.7}
                            maxScale={4}
                            centerOnInit={false}
                            limitToBounds={true}
                            wheel={{ disabled: true }}
                            pinch={{ disabled: false, step: 5 }}
                            panning={{ disabled: false, velocityDisabled: false }}
                            doubleClick={{ mode: 'toggle', step: 1.5 }}
                            onTransformed={handleTransformed}
                        >
                            <TransformComponent
                                wrapperClass="!w-full !h-full"
                                contentClass="flex flex-col items-center gap-4 py-2 min-w-full"
                            >
                                <Document
                                    key={`${key}-${url}`}
                                    file={url}
                                    options={documentOptions}
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
                                    {numPages && Array.from(new Array(numPages), (_, index) => (
                                        <LazyPage
                                            key={`page_${index + 1}`}
                                            pageNumber={index + 1}
                                            width={pageWidth || undefined}
                                            devicePixelRatio={renderDpr}
                                        />
                                    ))}
                                </Document>
                            </TransformComponent>
                        </TransformWrapper>
                    )}
                </div>
            </div>
        </div>
    )
}



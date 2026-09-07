import { useEffect, useRef, useState, useCallback } from 'react'
import BpmnNavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import { 
    ZoomIn, 
    ZoomOut, 
    RotateCw, 
    Maximize, 
    Minimize, 
    Download, 
    Sun, 
    Moon, 
    AlertCircle, 
    ExternalLink,
    Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BPMNViewerProps {
    url: string
    fileName?: string
    className?: string
    isFocusMode?: boolean
    onToggleFocusMode?: () => void
    onExitFocusMode?: () => void
}

export function BPMNViewer({
    url,
    fileName = "process.bpmn",
    className = "",
    isFocusMode,
    onToggleFocusMode,
    onExitFocusMode
}: BPMNViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const viewerRef = useRef<BpmnNavigatedViewer | null>(null)

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [zoomLevel, setZoomLevel] = useState<number>(100)
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark')
        }
        return false
    })
    const [internalFocus, setInternalFocus] = useState(false)
    const [key, setKey] = useState(0)

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

    // Escape key to exit focus mode
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

    // Load and render BPMN XML
    useEffect(() => {
        if (!containerRef.current || !url) return

        let isMounted = true
        setLoading(true)
        setError(null)

        // Clean up previous viewer instance if exists
        if (viewerRef.current) {
            try {
                viewerRef.current.destroy()
            } catch (err) {
                console.warn("Viewer destroy warning:", err)
            }
            viewerRef.current = null
        }

        const viewer = new BpmnNavigatedViewer({
            container: containerRef.current,
            keyboard: { bindTo: document }
        })
        viewerRef.current = viewer

        const fetchAndRender = async () => {
            try {
                const response = await fetch(url)
                if (!response.ok) {
                    throw new Error(`Erreur réseau (${response.status}) lors du chargement du fichier BPMN.`)
                }
                const xmlData = await response.text()
                if (!isMounted) return

                if (!xmlData.trim().startsWith('<')) {
                    throw new Error("Le contenu téléchargé ne correspond pas à un format XML / BPMN valide.")
                }

                await viewer.importXML(xmlData)
                if (!isMounted) return

                const canvas = viewer.get('canvas')
                canvas.zoom('fit-viewport')
                const currentZoom = canvas.zoom()
                if (typeof currentZoom === 'number') {
                    setZoomLevel(Math.round(currentZoom * 100))
                }

                // Listen for zoom/pan canvas changes to update toolbar percentage
                viewer.on('canvas.viewbox.changed', (event: any) => {
                    if (!isMounted) return
                    const scale = event?.viewbox?.scale || canvas.zoom()
                    if (typeof scale === 'number') {
                        setZoomLevel(Math.round(scale * 100))
                    }
                })

                setLoading(false)
            } catch (err: any) {
                console.error("BPMN Viewer loading error:", err)
                if (isMounted) {
                    setError(err.message || "Impossible d'afficher le diagramme BPMN.")
                    setLoading(false)
                }
            }
        }

        fetchAndRender()

        return () => {
            isMounted = false
            if (viewerRef.current) {
                try {
                    viewerRef.current.destroy()
                } catch (err) {
                    console.warn("Viewer destroy error on unmount:", err)
                }
                viewerRef.current = null
            }
        }
    }, [url, key])

    // Controls
    const handleZoomIn = useCallback(() => {
        if (!viewerRef.current) return
        const canvas = viewerRef.current.get('canvas')
        const nextZoom = canvas.zoom() * 1.25
        canvas.zoom(nextZoom)
        setZoomLevel(Math.round(nextZoom * 100))
    }, [])

    const handleZoomOut = useCallback(() => {
        if (!viewerRef.current) return
        const canvas = viewerRef.current.get('canvas')
        const nextZoom = canvas.zoom() * 0.8
        canvas.zoom(nextZoom)
        setZoomLevel(Math.round(nextZoom * 100))
    }, [])

    const handleResetZoom = useCallback(() => {
        if (!viewerRef.current) return
        const canvas = viewerRef.current.get('canvas')
        canvas.zoom('fit-viewport')
        const currentZoom = canvas.zoom()
        if (typeof currentZoom === 'number') {
            setZoomLevel(Math.round(currentZoom * 100))
        }
    }, [])

    const handleExportSVG = async () => {
        if (!viewerRef.current) return
        try {
            const { svg } = await viewerRef.current.saveSVG()
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
            const downloadUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = downloadUrl
            link.download = fileName.replace(/\.[^/.]+$/, "") + ".svg"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(downloadUrl)
            toast.success("Diagramme exporté en image SVG !")
        } catch (err) {
            console.error("Failed to export SVG:", err)
            toast.error("Erreur lors de l'export SVG")
        }
    }

    return (
        <div className={cn(
            "w-full bg-slate-100 dark:bg-slate-900 overflow-hidden relative flex flex-col transition-all",
            activeFocus
                ? "fixed inset-0 z-50 h-[100dvh] w-screen rounded-none bg-background shadow-2xl"
                : `rounded-lg border shadow-sm ${className}`
        )}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 md:p-3 border-b bg-slate-200/90 dark:bg-slate-800/90 sticky top-0 z-20 gap-2 shrink-0 backdrop-blur-xs">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Focus / Fullscreen Toggle */}
                    <button
                        onClick={handleToggleFocus}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm shrink-0",
                            activeFocus
                                ? "bg-primary text-primary-foreground hover:opacity-90"
                                : "bg-card hover:bg-muted text-foreground border"
                        )}
                        title={activeFocus ? "Quitter le plein écran (Échap)" : "Mode Plein écran"}
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

                    <div className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 rounded-md shrink-0">
                        <Workflow className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{fileName}</span>
                    </div>
                </div>

                {/* Right controls: Zoom, Theme, Export */}
                <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                    {/* Zoom pill */}
                    <div className="flex items-center gap-0.5 sm:gap-1 bg-background/80 border rounded-lg p-0.5 shadow-xs">
                        <button
                            type="button"
                            onClick={handleZoomOut}
                            className="p-1 sm:p-1.5 hover:bg-muted rounded text-foreground transition-colors"
                            title="Zoom arrière"
                        >
                            <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleResetZoom}
                            className="text-[11px] sm:text-xs font-semibold px-1.5 py-0.5 rounded hover:bg-muted min-w-[4ch] text-center text-foreground transition-colors"
                            title="Centrer et adapter la vue (100%)"
                        >
                            {zoomLevel}%
                        </button>
                        <button
                            type="button"
                            onClick={handleZoomIn}
                            className="p-1 sm:p-1.5 hover:bg-muted rounded text-foreground transition-colors"
                            title="Zoom avant"
                        >
                            <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    </div>

                    {/* Dark/Light mode diagram toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDarkMode(prev => !prev)}
                        className={cn(
                            "p-1.5 sm:p-2 rounded-lg border transition-colors shadow-xs flex items-center gap-1 text-xs",
                            isDarkMode 
                                ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700" 
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                        title={isDarkMode ? "Passer le diagramme en fond clair" : "Passer le diagramme en fond sombre"}
                    >
                        {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                        <span className="hidden md:inline font-medium">{isDarkMode ? "Clair" : "Sombre"}</span>
                    </button>

                    {/* Export SVG */}
                    <button
                        type="button"
                        onClick={handleExportSVG}
                        className="px-2 sm:px-2.5 py-1.5 rounded-lg border bg-background/80 hover:bg-muted text-foreground transition-colors flex items-center gap-1.5 text-xs font-medium shadow-xs"
                        title="Exporter le diagramme en image SVG"
                    >
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">SVG</span>
                    </button>

                    {/* Download Raw BPMN */}
                    <a
                        href={url}
                        download={fileName}
                        className="p-1.5 sm:p-2 rounded-lg border bg-background/80 hover:bg-muted text-foreground transition-colors shadow-xs"
                        title="Télécharger le fichier original"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>

            {/* BPMN Canvas Container */}
            <div className={cn(
                "flex-1 relative w-full h-full overflow-hidden select-none transition-colors",
                isDarkMode ? "bg-slate-950 bpmn-dark-theme" : "bg-white bpmn-light-theme"
            )}>
                {/* Embedded dynamic CSS for BPMN Dark Theme */}
                {isDarkMode && (
                    <style>{`
                        .bpmn-dark-theme .djs-container {
                            background-color: #020617 !important;
                        }
                        .bpmn-dark-theme .djs-shape .djs-visual > :is(rect, circle, polygon, path:not([stroke])):not(.djs-outline) {
                            fill: #1e293b !important;
                            stroke: #94a3b8 !important;
                        }
                        .bpmn-dark-theme .djs-shape.djs-participant .djs-visual > rect {
                            fill: #0f172a !important;
                            stroke: #64748b !important;
                        }
                        .bpmn-dark-theme .djs-connection .djs-visual > path {
                            stroke: #94a3b8 !important;
                        }
                        .bpmn-dark-theme .djs-connection .djs-visual > marker path {
                            fill: #94a3b8 !important;
                            stroke: #94a3b8 !important;
                        }
                        .bpmn-dark-theme text,
                        .bpmn-dark-theme .djs-label {
                            fill: #f1f5f9 !important;
                            font-family: inherit !important;
                        }
                    `}</style>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-3">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        <p className="text-xs font-medium text-muted-foreground animate-pulse">
                            Chargement du processus métier (BPMN / BPM)...
                        </p>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-background/95 gap-3 text-center">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-destructive rounded-full">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <h3 className="font-semibold text-base text-foreground">Erreur de lecture du processus métier (BPMN / BPM)</h3>
                        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={() => setKey(prev => prev + 1)}
                                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 flex items-center gap-1.5 shadow-sm"
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                                <span>Réessayer</span>
                            </button>
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 border bg-card hover:bg-muted text-foreground text-xs font-medium rounded-lg flex items-center gap-1.5"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Ouvrir en brut</span>
                            </a>
                        </div>
                    </div>
                )}

                {/* The actual bpmn-js DOM host */}
                <div 
                    ref={containerRef} 
                    className="w-full h-full min-h-[500px]" 
                />
            </div>
        </div>
    )
}

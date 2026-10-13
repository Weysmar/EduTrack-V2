import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch'
import {
    Maximize2, Minimize2, ZoomIn, ZoomOut, ScanSearch, Download, Network, ListTree,
    PenLine, Type, Copy, AlertTriangle, ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { normalizeMindmapSource, parseMindmap } from '@/lib/mindmap/mindmapSource'
import { MINDMAP_BRANCH_COLORS } from '@/components/mindmap/MindMapThumbnail'
import { MindMapOutline, mindmapToText } from '@/components/mindmap/MindMapOutline'

interface MindMapViewerProps {
    content: string // Mermaid mindmap syntax
    className?: string
    /** Used for export file names */
    title?: string
}

type MapStyle = 'modern' | 'hand'
type ViewMode = 'map' | 'outline'

const STYLE_STORAGE_KEY = 'mindmap-style'

// Soft node fills per branch (same order as MINDMAP_BRANCH_COLORS), for light and dark themes
const SOFT_LIGHT = ['#fef3c7', '#d1fae5', '#dbeafe', '#fce7f3', '#ede9fe', '#ffedd5', '#cffafe', '#ecfccb']
const SOFT_DARK = ['#3b2a0a', '#0b3b2e', '#172554', '#4a1030', '#2e1065', '#431407', '#083344', '#1a2e05']
const ROOT_FILL = '#4f46e5'

function useIsDarkMode() {
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
    useEffect(() => {
        const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    }, [])
    return isDark
}

/**
 * Mermaid configuration for the current theme. Colors go through themeVariables + themeCSS so they are
 * embedded in the generated SVG (exports look exactly like the screen). Mermaid maps branch k to
 * cScale(k+1) and the root to git0.
 */
function buildMermaidConfig(isDark: boolean, style: MapStyle) {
    const text = isDark ? '#f1f5f9' : '#0f172a'
    const soft = isDark ? SOFT_DARK : SOFT_LIGHT
    const themeVariables: Record<string, string> = {
        background: 'transparent',
        fontFamily: style === 'hand' ? '"Caveat", cursive' : 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: style === 'hand' ? '22px' : '16px',
        git0: ROOT_FILL,
        gitBranchLabel0: '#ffffff',
        lineColor: isDark ? '#475569' : '#cbd5e1',
    }
    let themeCSS = `
        .edge-depth-0 { stroke-width: 4px; } .edge-depth-1 { stroke-width: 3px; }
        .edge-depth-2 { stroke-width: 2px; } .edge-depth-3, .edge-depth-4 { stroke-width: 1.5px; }
        .section-root text, .section-root span { font-weight: 700; }
    `
    MINDMAP_BRANCH_COLORS.forEach((strong, k) => {
        themeVariables[`cScale${k + 1}`] = soft[k]
        themeVariables[`cScaleLabel${k + 1}`] = text
        themeVariables[`cScaleInv${k + 1}`] = strong
        themeCSS += `
            .mindmap-node.section-${k} rect, .mindmap-node.section-${k} path, .mindmap-node.section-${k} circle, .mindmap-node.section-${k} polygon {
                fill: ${soft[k]}; stroke: ${strong}; stroke-width: 1.5px;
            }
            .section-edge-${k} { stroke: ${strong}; stroke-opacity: 0.7; }
        `
    })
    return {
        startOnLoad: false,
        securityLevel: 'strict' as const, // AI-generated content: no HTML/JS in labels
        theme: 'base' as const,
        themeVariables,
        themeCSS,
        mindmap: { useMaxWidth: false, padding: 18, maxNodeWidth: 220 },
    }
}

let renderCounter = 0

export function MindMapViewer({ content, className, title = 'carte-mentale' }: MindMapViewerProps) {
    const { t } = useLanguage()
    const isDark = useIsDarkMode()
    const containerRef = useRef<HTMLDivElement>(null)
    const mermaidRef = useRef<HTMLDivElement>(null)
    const transformRef = useRef<ReactZoomPanPinchRef>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewMode, setViewMode] = useState<ViewMode>('map')
    const [mapStyle, setMapStyle] = useState<MapStyle>(() => {
        try { return localStorage.getItem(STYLE_STORAGE_KEY) === 'hand' ? 'hand' : 'modern' } catch { return 'modern' }
    })
    const [renderError, setRenderError] = useState<string | null>(null)
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)

    // Repaired source (old maps with "(...)" in labels used to fail) and parsed tree for the outline
    const source = useMemo(() => normalizeMindmapSource(content), [content])
    const tree = useMemo(() => parseMindmap(source), [source])

    // Read through a ref: t() is a new function on each render and must not re-trigger Mermaid
    const emptyMessageRef = useRef(t('mindmap.viewer.empty'))
    emptyMessageRef.current = t('mindmap.viewer.empty')

    const getSvg = () => mermaidRef.current?.querySelector('svg') ?? null

    // Fit the whole map in the visible area (initial display, resize, "fit" button)
    const fitToView = useCallback((animationTime = 200) => {
        const svg = getSvg()
        const wrapper = containerRef.current
        if (!svg || !wrapper || !transformRef.current) return
        const width = Number(svg.getAttribute('width')) || svg.getBoundingClientRect().width
        const height = Number(svg.getAttribute('height')) || svg.getBoundingClientRect().height
        if (!width || !height) return
        const scale = Math.min(wrapper.clientWidth / width, (wrapper.clientHeight - 56) / height, 1.4) * 0.92
        transformRef.current.centerView(Math.max(scale, 0.15), animationTime)
    }, [])

    useEffect(() => {
        if (viewMode !== 'map') return
        let cancelled = false
        const render = async () => {
            if (!mermaidRef.current) return
            if (!tree) {
                setRenderError(emptyMessageRef.current)
                return
            }
            try {
                mermaid.initialize(buildMermaidConfig(isDark, mapStyle))
                const { svg } = await mermaid.render(`mindmap-${++renderCounter}`, source)
                if (cancelled || !mermaidRef.current) return
                mermaidRef.current.innerHTML = svg
                const svgElement = mermaidRef.current.querySelector('svg')
                if (svgElement) {
                    // Explicit pixel size (from the viewBox) so zoom/fit and exports use the real dimensions
                    const viewBox = svgElement.viewBox.baseVal
                    if (viewBox?.width && viewBox?.height) {
                        svgElement.setAttribute('width', String(Math.ceil(viewBox.width)))
                        svgElement.setAttribute('height', String(Math.ceil(viewBox.height)))
                    }
                    svgElement.style.maxWidth = 'none'
                }
                setRenderError(null)
                requestAnimationFrame(() => fitToView(0))
            } catch (error: any) {
                console.error('Mermaid render error:', error)
                if (!cancelled) setRenderError(String(error?.message || error))
            }
        }
        render()
        return () => { cancelled = true }
    }, [source, tree, isDark, mapStyle, viewMode, fitToView])

    // Re-fit when the container size changes (modal opening, fullscreen, window resize)
    useEffect(() => {
        if (!containerRef.current) return
        const observer = new ResizeObserver(() => fitToView(0))
        observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [fitToView])

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {})
        } else {
            containerRef.current?.requestFullscreen().catch(() => {
                // Fullscreen API unavailable (iOS Safari): fall back to a fixed overlay
                setIsFullscreen(prev => !prev)
            })
        }
    }

    const toggleStyle = () => {
        const next: MapStyle = mapStyle === 'modern' ? 'hand' : 'modern'
        setMapStyle(next)
        try { localStorage.setItem(STYLE_STORAGE_KEY, next) } catch { /* storage unavailable */ }
    }

    const fileBase = (title || 'carte-mentale').replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '') || 'carte-mentale'

    const download = (blob: Blob, extension: string) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fileBase}.${extension}`
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const exportSvg = () => {
        const svg = getSvg()
        if (!svg) return
        download(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }), 'svg')
        setIsExportMenuOpen(false)
    }

    const exportPng = async () => {
        const svg = getSvg()
        if (!svg) return
        setIsExportMenuOpen(false)
        try {
            const width = Number(svg.getAttribute('width')) || 1200
            const height = Number(svg.getAttribute('height')) || 800
            const data = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
            const image = new Image()
            await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve()
                image.onerror = () => reject(new Error('image load failed'))
                image.src = data
            })
            const scale = 2 // sharp result on high-DPI screens and in print
            const canvas = document.createElement('canvas')
            canvas.width = width * scale
            canvas.height = height * scale
            const context = canvas.getContext('2d')!
            context.fillStyle = isDark ? '#020617' : '#ffffff'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.drawImage(image, 0, 0, canvas.width, canvas.height)
            canvas.toBlob(blob => blob && download(blob, 'png'), 'image/png')
        } catch (error) {
            console.error('PNG export failed:', error)
            toast.error(t('mindmap.viewer.exportError'))
        }
    }

    const copyOutline = async () => {
        if (!tree) return
        try {
            await navigator.clipboard.writeText(mindmapToText(tree))
            toast.success(t('mindmap.viewer.copied'))
        } catch {
            toast.error(t('mindmap.viewer.copyError'))
        }
        setIsExportMenuOpen(false)
    }

    const toolButton = 'p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40'

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative w-full h-full min-h-[420px] flex flex-col overflow-hidden rounded-xl border',
                'bg-[#fafaf9] dark:bg-slate-950',
                isFullscreen && 'fixed inset-0 z-[100] rounded-none border-none h-dvh w-screen',
                className
            )}
        >
            {/* Dotted background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-30"
                style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '22px 22px', color: 'rgb(148 163 184 / 0.35)' }}
                aria-hidden="true"
            />

            {/* Toolbar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 p-2 sm:p-3">
                <div className="flex items-center gap-1 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur" role="tablist" aria-label={t('mindmap.viewer.view')}>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={viewMode === 'map'}
                        onClick={() => setViewMode('map')}
                        className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors', viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                    >
                        <Network className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('mindmap.viewer.map')}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={viewMode === 'outline'}
                        onClick={() => setViewMode('outline')}
                        className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors', viewMode === 'outline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                    >
                        <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('mindmap.viewer.outline')}
                    </button>
                </div>

                <div className="flex items-center gap-0.5 rounded-lg border bg-background/90 p-1 shadow-sm backdrop-blur">
                    {viewMode === 'map' && (
                        <>
                            <button type="button" onClick={() => transformRef.current?.zoomIn()} className={toolButton} title={t('mindmap.viewer.zoomIn')} aria-label={t('mindmap.viewer.zoomIn')}>
                                <ZoomIn className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => transformRef.current?.zoomOut()} className={toolButton} title={t('mindmap.viewer.zoomOut')} aria-label={t('mindmap.viewer.zoomOut')}>
                                <ZoomOut className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => fitToView()} className={toolButton} title={t('mindmap.viewer.fit')} aria-label={t('mindmap.viewer.fit')}>
                                <ScanSearch className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={toggleStyle} className={toolButton} title={mapStyle === 'modern' ? t('mindmap.viewer.styleHand') : t('mindmap.viewer.styleModern')} aria-label={mapStyle === 'modern' ? t('mindmap.viewer.styleHand') : t('mindmap.viewer.styleModern')}>
                                {mapStyle === 'modern' ? <PenLine className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                            </button>
                            <div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
                        </>
                    )}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsExportMenuOpen(open => !open)}
                            className={cn(toolButton, 'flex items-center gap-1')}
                            title={t('mindmap.viewer.export')}
                            aria-label={t('mindmap.viewer.export')}
                            aria-expanded={isExportMenuOpen}
                            disabled={!tree}
                        >
                            <Download className="h-4 w-4" />
                            <ChevronDown className="h-3 w-3" aria-hidden="true" />
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover p-1 text-sm shadow-lg" role="menu">
                                <button type="button" role="menuitem" onClick={exportPng} disabled={viewMode !== 'map' || !!renderError} className="w-full rounded-md px-3 py-2 text-left hover:bg-muted disabled:opacity-40">
                                    {t('mindmap.viewer.exportPng')}
                                </button>
                                <button type="button" role="menuitem" onClick={exportSvg} disabled={viewMode !== 'map' || !!renderError} className="w-full rounded-md px-3 py-2 text-left hover:bg-muted disabled:opacity-40">
                                    {t('mindmap.viewer.exportSvg')}
                                </button>
                                <button type="button" role="menuitem" onClick={copyOutline} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted">
                                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('mindmap.viewer.copyOutline')}
                                </button>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={toggleFullscreen} className={toolButton} title={isFullscreen ? t('mindmap.viewer.exitFullscreen') : t('mindmap.viewer.fullscreen')} aria-label={isFullscreen ? t('mindmap.viewer.exitFullscreen') : t('mindmap.viewer.fullscreen')}>
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="relative flex-1 min-h-0">
                {viewMode === 'outline' ? (
                    tree ? <MindMapOutline tree={tree} /> : null
                ) : (
                    <>
                        {renderError && (
                            <div className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center">
                                <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
                                <p className="font-semibold">{t('mindmap.viewer.renderError')}</p>
                                <p className="max-w-md text-sm text-muted-foreground">{t('mindmap.viewer.renderErrorHint')}</p>
                                {tree && (
                                    <button type="button" onClick={() => setViewMode('outline')} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                                        {t('mindmap.viewer.showOutline')}
                                    </button>
                                )}
                                <details className="max-w-full text-left text-xs text-muted-foreground">
                                    <summary className="cursor-pointer">{t('mindmap.viewer.details')}</summary>
                                    <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{renderError}</pre>
                                </details>
                            </div>
                        )}
                        <TransformWrapper
                            ref={transformRef}
                            initialScale={1}
                            minScale={0.1}
                            maxScale={4}
                            limitToBounds={false}
                            centerOnInit
                            wheel={{ step: 0.12 }}
                            doubleClick={{ mode: 'zoomIn' }}
                            pinch={{ step: 5 }}
                        >
                            <TransformComponent wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing" contentClass="select-none">
                                <div ref={mermaidRef} className="p-6" />
                            </TransformComponent>
                        </TransformWrapper>
                    </>
                )}
            </div>
        </div>
    )
}

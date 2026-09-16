import { ZoomIn, ZoomOut, RotateCw, Loader2, Pencil } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useLanguage } from './language-provider'
import heic2any from 'heic2any'
import { cn } from '@/lib/utils'
import { useAnnotations } from '@/hooks/useAnnotations'
import { AnnotationToolbar } from '@/components/annotations/AnnotationToolbar'
import { AnnotationOverlay } from '@/components/annotations/AnnotationOverlay'

interface ImageViewerProps {
    url: string
    itemId?: string
    initialAnnotations?: any
    alt?: string
    className?: string
}

export function ImageViewer({
    url,
    itemId,
    initialAnnotations,
    alt = "Image",
    className = ""
}: ImageViewerProps) {
    const { t } = useLanguage()
    const [scale, setScale] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [displayUrl, setDisplayUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // --- Annotations State & Hook ---
    const [isAnnotating, setIsAnnotating] = useState(false)
    const {
        annotations,
        activeTool,
        setActiveTool,
        activeColor,
        setActiveColor,
        strokeWidth,
        setStrokeWidth,
        isVisible: isAnnotationsVisible,
        toggleVisibility: toggleAnnotationsVisibility,
        isSaving: isAnnotationsSaving,
        lastSaved: annotationsLastSaved,
        addAnnotation,
        updateAnnotation,
        deleteAnnotation,
        clearPage: clearCurrentPage,
        clearAll: clearAllAnnotations,
        undo,
        redo,
        canUndo,
        canRedo
    } = useAnnotations({ itemId: itemId || '', initialAnnotations })

    const totalAnnotationsCount = useMemo(() => {
        if (!annotations?.pages) return 0;
        return Object.values(annotations.pages).reduce((acc, list) => acc + (list?.length || 0), 0);
    }, [annotations]);

    const zoomIn = () => setScale(s => Math.min(s + 0.25, 3))
    const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
    const rotate = () => setRotation(r => (r + 90) % 360)

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const processImage = async () => {
            try {
                // Mitigate DOM-XSS via dangerous URI schemes
                if (/^\s*(javascript|vbscript):/i.test(url)) {
                    throw new Error('Invalid URL protocol');
                }

                // Check if it's likely HEIC based on URL extension or if it's a blob url we can check type?
                // For now, simple extension check. Ideally we inspect the blob type if feasible.
                const isHeic = url.toLowerCase().includes('.heic') || url.toLowerCase().includes('.heif');

                if (isHeic) {
                    const response = await fetch(url);
                    if (!response.ok) throw new Error("Failed to fetch image");
                    const blob = await response.blob();

                    const convertedBlob = await heic2any({
                        blob,
                        toType: "image/jpeg",
                        quality: 0.8
                    });

                    if (isMounted) {
                        const newUrl = URL.createObjectURL(Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob);
                        setDisplayUrl(newUrl);
                    }
                } else {
                    // Regular image
                    setDisplayUrl(url);
                }
            } catch (err) {
                console.error("Image loading error:", err);
                if (isMounted) setError("Impossible de charger l'image.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        processImage();

        return () => {
            isMounted = false;
            // Cleanup object URL if we created one for HEIC
            if (displayUrl && displayUrl !== url) {
                URL.revokeObjectURL(displayUrl);
            }
        };
    }, [url]);

    if (loading) {
        return (
            <div className={`w-full bg-slate-900 rounded-lg border shadow-sm flex items-center justify-center min-h-[400px] ${className}`}>
                <div className="flex flex-col items-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm">Chargement de l'image...</p>
                </div>
            </div>
        )
    }

    if (error || !displayUrl) {
        return (
            <div className={`w-full bg-slate-900 rounded-lg border shadow-sm flex items-center justify-center min-h-[400px] ${className}`}>
                <p className="text-red-400">{error || "Image indisponible"}</p>
            </div>
        )
    }

    return (
        <div className={`w-full bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative flex flex-col ${className}`}>
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-2 bg-slate-800/90 sticky top-0 z-30 w-full backdrop-blur-sm border-b border-white/10">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsAnnotating(prev => !prev)}
                        className={cn(
                            "px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs",
                            isAnnotating
                                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                                : "bg-slate-700/80 hover:bg-slate-700 text-white border border-white/10"
                        )}
                        title={isAnnotating ? "Fermer les annotations" : "Annoter l'image (surligner, dessiner, notes)"}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>{isAnnotating ? "Annoter ✓" : "Annoter"}</span>
                        {totalAnnotationsCount > 0 && !isAnnotating && (
                            <span className="ml-0.5 px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">
                                {totalAnnotationsCount}
                            </span>
                        )}
                    </button>
                    <span className="text-xs text-slate-300 font-medium hidden sm:inline">Image</span>
                </div>

                <div className="flex bg-slate-900/80 rounded-lg p-1 gap-1 border border-white/10">
                    <button onClick={zoomOut} className="p-1.5 hover:bg-white/20 rounded text-white" title={t('action.zoomOut')}>
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button onClick={zoomIn} className="p-1.5 hover:bg-white/20 rounded text-white" title={t('action.zoomIn')}>
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="w-px bg-white/20 mx-1" />
                    <button onClick={rotate} className="p-1.5 hover:bg-white/20 rounded text-white" title={t('action.rotate')}>
                        <RotateCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Floating Annotation Toolbar */}
            {isAnnotating && (
                <div className="sticky top-12 z-40 flex justify-center px-2 py-1.5 pointer-events-none">
                    <AnnotationToolbar
                        activeTool={activeTool}
                        onSelectTool={setActiveTool}
                        activeColor={activeColor}
                        onSelectColor={setActiveColor}
                        strokeWidth={strokeWidth}
                        onSelectStrokeWidth={setStrokeWidth}
                        isVisible={isAnnotationsVisible}
                        onToggleVisibility={toggleAnnotationsVisibility}
                        canUndo={canUndo}
                        onUndo={undo}
                        canRedo={canRedo}
                        onRedo={redo}
                        onClearPage={() => clearCurrentPage("1")}
                        onClearAll={clearAllAnnotations}
                        isSaving={isAnnotationsSaving}
                        lastSaved={annotationsLastSaved}
                        onClose={() => setIsAnnotating(false)}
                        className="pointer-events-auto shadow-2xl max-w-full overflow-x-auto"
                    />
                </div>
            )}

            <div
                className="flex-1 overflow-auto flex items-center justify-center p-4 relative"
                style={{
                    backgroundImage: `
                        conic-gradient(#E5E7EB 90deg, #F3F4F6 90deg 180deg, #E5E7EB 180deg 270deg, #F3F4F6 270deg)
                    `,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 10px 10px'
                }}
            >
                <div
                    className="relative inline-block shadow-lg max-w-full max-h-full"
                    style={{
                        transform: `scale(${Number.isFinite(scale) ? scale : 1}) rotate(${Number.isFinite(rotation) ? rotation : 0}deg)`,
                        transition: 'transform 0.2s ease-out'
                    }}
                >
                    <img
                        src={
                            // DOM-XSS: Only allow blob:, https:, http:, and /api/ relative URLs
                            (displayUrl && /^(blob:|https?:|\/api\/)/.test(displayUrl))
                                ? displayUrl
                                : ''
                        }
                        alt={alt}
                        className="max-w-full max-h-full object-contain block select-none"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <AnnotationOverlay
                        pageNumber="1"
                        annotations={annotations.pages["1"] || []}
                        activeTool={isAnnotating ? activeTool : 'pointer'}
                        activeColor={activeColor}
                        strokeWidth={strokeWidth}
                        isVisible={isAnnotationsVisible}
                        onAddAnnotation={addAnnotation}
                        onUpdateAnnotation={updateAnnotation}
                        onDeleteAnnotation={deleteAnnotation}
                    />
                </div>
            </div>
        </div>
    )
}

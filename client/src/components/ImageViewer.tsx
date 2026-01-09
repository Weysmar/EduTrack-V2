import { ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useLanguage } from './language-provider'
import heic2any from 'heic2any'

interface ImageViewerProps {
    url: string
    alt?: string
    className?: string
}

export function ImageViewer({ url, alt = "Image", className = "" }: ImageViewerProps) {
    const { t } = useLanguage()
    const [scale, setScale] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [displayUrl, setDisplayUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const zoomIn = () => setScale(s => Math.min(s + 0.25, 3))
    const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
    const rotate = () => setRotation(r => (r + 90) % 360)

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);

        const processImage = async () => {
            try {
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
            {/* Toolbar */}
            <div className="flex items-center justify-end p-2 bg-slate-800/50 absolute top-0 right-0 z-10 w-full backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex bg-slate-900/80 rounded-lg p-1 gap-1">
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

            <div className="flex-1 overflow-auto flex items-center justify-center bg-[url('/checkerboard.png')] p-4">
                <img
                    src={displayUrl}
                    alt={alt}
                    style={{
                        transform: `scale(${Number.isFinite(scale) ? scale : 1}) rotate(${Number.isFinite(rotation) ? rotation : 0}deg)`,
                        transition: 'transform 0.2s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    )
}

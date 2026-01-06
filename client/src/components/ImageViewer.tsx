import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { useState } from 'react'

interface ImageViewerProps {
    url: string
    alt?: string
    className?: string
}

export function ImageViewer({ url, alt = "Image", className = "" }: ImageViewerProps) {
    const [scale, setScale] = useState(1)
    const [rotation, setRotation] = useState(0)

    const zoomIn = () => setScale(s => Math.min(s + 0.25, 3))
    const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5))
    const rotate = () => setRotation(r => (r + 90) % 360)

    return (
        <div className={`w-full bg-slate-900 rounded-lg overflow-hidden border shadow-sm relative flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-end p-2 bg-slate-800/50 absolute top-0 right-0 z-10 w-full backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
                <div className="flex bg-slate-900/80 rounded-lg p-1 gap-1">
                    <button onClick={zoomOut} className="p-1.5 hover:bg-white/20 rounded text-white" title="Dézoomer">
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <button onClick={zoomIn} className="p-1.5 hover:bg-white/20 rounded text-white" title="Zoomer">
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <div className="w-px bg-white/20 mx-1" />
                    <button onClick={rotate} className="p-1.5 hover:bg-white/20 rounded text-white" title="Pivoter">
                        <RotateCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center bg-[url('/checkerboard.png')] p-4">
                <img
                    src={url}
                    alt={alt}
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-out'
                    }}
                    className="max-w-full max-h-full object-contain shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    )
}


import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Maximize, Minimize, Download } from 'lucide-react';

interface MindMapViewerProps {
    content: string; // Mermaid syntax
    className?: string; // Additional classes
}

export function MindMapViewer({ content, className }: MindMapViewerProps) {
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark', // Adapt based on app theme if needed
            securityLevel: 'loose',
            mindmap: {
                padding: 20
            }
        });

        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = content;
            mermaid.contentLoaded();
        }
    }, [content]);

    // Re-render when content changes
    useEffect(() => {
        const renderDiagram = async () => {
            if (mermaidRef.current) {
                try {
                    const { svg } = await mermaid.render(`mermaid-${Math.random().toString(36).substr(2, 9)}`, content);
                    mermaidRef.current.innerHTML = svg;
                } catch (error) {
                    console.error('Mermaid render error:', error);
                    // Fallback or error message could go here
                }
            }
        };

        renderDiagram();
    }, [content]);

    return (
        <div className={`relative border rounded-xl bg-card overflow-hidden h-[600px] w-full ${className}`}>
            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit={true}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Controls */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <button onClick={() => zoomIn()} className="p-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted">
                                <Maximize className="h-4 w-4" />
                            </button>
                            <button onClick={() => zoomOut()} className="p-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted">
                                <Minimize className="h-4 w-4" />
                            </button>
                            <button onClick={() => resetTransform()} className="px-3 py-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted text-xs font-medium">
                                Reset
                            </button>
                        </div>

                        <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full flex items-center justify-center">
                            <div ref={mermaidRef} className="mermaid w-full h-full flex items-center justify-center p-10 select-none">
                                {/* SVG rendered here */}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
}

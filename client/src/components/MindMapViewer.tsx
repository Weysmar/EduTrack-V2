
import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Maximize, Minimize, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindMapViewerProps {
    content: string; // Mermaid syntax
    className?: string; // Additional classes
}

export function MindMapViewer({ content, className }: MindMapViewerProps) {
    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'dark', // Adapt based on app theme if needed
            securityLevel: 'loose',
            mindmap: {
                padding: 40,
                // @ts-ignore - useMaxWidth is valid in recent mermaid but typescript definition might lag
                useMaxWidth: false,
            },
            flowchart: {
                useMaxWidth: false,
                htmlLabels: true
            }
        });
    }, []);

    // Re-render when content changes
    useEffect(() => {
        const renderDiagram = async () => {
            if (mermaidRef.current && content) {
                try {
                    mermaidRef.current.innerHTML = ''; // Clear
                    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

                    // Render SVG
                    const { svg } = await mermaid.render(id, content);
                    mermaidRef.current.innerHTML = svg;

                    // Post-processing: remove explicitly set max-width if mermaid adds it despite config
                    const svgElement = mermaidRef.current.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.maxWidth = 'none';
                        svgElement.style.height = '100%';
                        // Do not force width to 100%, let it be natural or large
                    }

                } catch (error) {
                    console.error('Mermaid render error:', error);
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = '<div class="text-red-500 p-4 text-center">Failed to render diagram syntax.</div>';
                    }
                }
            }
        };

        renderDiagram();
    }, [content]);

    return (
        <div className={cn("relative border rounded-xl bg-card overflow-hidden w-full h-full min-h-[500px]", className)}>
            <TransformWrapper
                initialScale={1}
                minScale={0.2}
                maxScale={4}
                centerOnInit={true}
                limitToBounds={false}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Controls */}
                        <div className="absolute top-4 right-4 z-10 flex gap-2">
                            <button onClick={() => zoomIn()} className="p-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted" title="Zoom In">
                                <Maximize className="h-4 w-4" />
                            </button>
                            <button onClick={() => zoomOut()} className="p-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted" title="Zoom Out">
                                <Minimize className="h-4 w-4" />
                            </button>
                            <button onClick={() => resetTransform()} className="p-2 bg-background/80 backdrop-blur border rounded-md shadow-sm hover:bg-muted" title="Reset">
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        </div>

                        <TransformComponent
                            wrapperClass="w-full h-full cursor-grab active:cursor-grabbing"
                            contentClass="w-full h-full flex items-center justify-center"
                        >
                            <div ref={mermaidRef} className="mermaid w-full h-full flex items-center justify-center select-none p-10">
                                {/* SVG rendered here */}
                            </div>
                        </TransformComponent>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
}

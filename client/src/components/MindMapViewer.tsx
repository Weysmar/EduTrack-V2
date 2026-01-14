
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
            // Use 'base' theme to allow custom variables
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                // Modern Dark Theme Palette
                primaryColor: '#1e293b', // Dark Slate (Background of nodes)
                primaryTextColor: '#f8fafc', // Very bright text
                primaryBorderColor: '#6366f1', // Indigo Border (Pop color)
                lineColor: '#94a3b8', // Slate-400 for edges (visible on dark)
                secondaryColor: '#334155',
                tertiaryColor: '#0f172a',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '16px', // Readable text
            },
            mindmap: {
                // @ts-ignore
                useMaxWidth: false,
                padding: 40,
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

                    // Post-processing for size and visibility
                    const svgElement = mermaidRef.current.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.maxWidth = 'none';
                        svgElement.style.height = '100%';
                        // Ensure text is readable - sometimes mermaid overrides styles
                        svgElement.style.fontFamily = 'Inter, system-ui, sans-serif';
                    }

                } catch (error) {
                    console.error('Mermaid render error:', error);
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = `
                            <div class="flex flex-col items-center justify-center h-full text-red-400 p-4">
                                <p class="font-bold mb-2">Failed to render Mind Map</p>
                                <pre class="text-xs bg-black/20 p-2 rounded max-w-full overflow-auto">${error}</pre>
                            </div>
                        `;
                    }
                }
            }
        };

        renderDiagram();
    }, [content]);

    return (
        <div className={cn("relative border rounded-xl bg-slate-950/50 overflow-hidden w-full h-full min-h-[500px]", className)}>
            <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" /> {/* Subtle background grid */}

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
                        <div className="absolute top-4 right-4 z-10 flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10">
                            <button onClick={() => zoomIn()} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all" title="Zoom In">
                                <Maximize className="h-4 w-4" />
                            </button>
                            <button onClick={() => zoomOut()} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all" title="Zoom Out">
                                <Minimize className="h-4 w-4" />
                            </button>
                            <div className="w-px bg-white/10 mx-1 my-1" />
                            <button onClick={() => resetTransform()} className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-all" title="Reset">
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

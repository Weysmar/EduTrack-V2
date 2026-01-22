
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Maximize, Minimize, RotateCcw, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MindMapViewerProps {
    content: string; // Mermaid syntax
    className?: string; // Additional classes
}

export function MindMapViewer({ content, className }: MindMapViewerProps) {
    const mermaidRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Listen for fullscreen change to update state if exited via ESC
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            // Use 'base' theme to allow custom variables
            // @ts-ignore - 'look' is valid in v11 but types might be lagging
            look: 'hand',
            theme: 'base',
            securityLevel: 'loose',
            themeVariables: {
                // Hand-drawn Pastel Theme Palette
                background: '#fdfbf7', // Warm Paper White
                mainBkg: '#c7d2fe', // Pastel Indigo/Purple (Root) as requested
                primaryColor: '#c7d2fe',
                primaryTextColor: '#1e293b', // Slate-800 for better readability
                primaryBorderColor: '#1e293b',

                lineColor: '#334155', // Slate-700 edge lines

                // Secondary/Tertiary for other levels - Soft Pastels
                secondaryColor: '#fef3c7', // Pastel Amber
                tertiaryColor: '#dcfce7', // Pastel Green
                // tertiaryColor: '#ffedd5', // Pastel Orange (if needed)

                fontFamily: '"Caveat", "Kalam", cursive',
                fontSize: '28px', // Increased size for readability
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

                    // Inject Caveat font if not present
                    if (!document.getElementById('font-caveat')) {
                        const link = document.createElement('link');
                        link.id = 'font-caveat';
                        link.rel = 'stylesheet';
                        link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap';
                        document.head.appendChild(link);
                    }

                    // Render SVG
                    const { svg } = await mermaid.render(id, content);
                    mermaidRef.current.innerHTML = svg;

                    // Post-processing for size and visibility
                    const svgElement = mermaidRef.current.querySelector('svg');
                    if (svgElement) {
                        svgElement.style.maxWidth = 'none';
                        svgElement.style.height = '100%';
                        svgElement.style.fontFamily = '"Caveat", handwriting';
                        // Force background to be transparent or match container
                        svgElement.style.backgroundColor = 'transparent';
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
        <div ref={containerRef} className={cn("relative border rounded-xl bg-[#fdfbf7] overflow-hidden w-full h-full min-h-[500px] flex flex-col", className, isFullscreen && "fixed inset-0 z-[9999] rounded-none h-screen w-screen border-none")}>
            <div className="absolute inset-0 bg-grid-black/[0.02] pointer-events-none" /> {/* Subtle background grid */}

            {/* CSS Overrides for Pastel Colors */}
            <style>{`
                .mindmap-node rect, .mindmap-node polygon, .mindmap-node path {
                    fill: #fdfbf7 !important; /* Default background */
                    stroke: #94a3b8 !important; /* Soft Slate border */
                    stroke-width: 2px !important;
                }
                /* Level 0 - Root */
                [id*="mermaid"] .mindmap-node.section-root > rect {
                    fill: #e0e7ff !important; /* Very soft Indigo */
                    stroke: #818cf8 !important;
                }
                /* Level 1 */
                [id*="mermaid"] .mindmap-node.section-0 > rect {
                    fill: #fef3c7 !important; /* Soft Amber */
                    stroke: #fbbf24 !important;
                }
                /* Level 2 */
                [id*="mermaid"] .mindmap-node.section-1 > rect {
                     fill: #dcfce7 !important; /* Soft Green */
                     stroke: #4ade80 !important;
                }
                 /* Level 3 */
                [id*="mermaid"] .mindmap-node.section-2 > rect {
                     fill: #ffe4e6 !important; /* Soft Rose */
                     stroke: #fb7185 !important;
                }
                 /* Text Color */
                .mindmap-node text {
                    font-family: "Caveat", cursive !important;
                    font-size: 24px !important; 
                    fill: #334155 !important; /* Slate 700 */
                }
                .edgePath path {
                    stroke: #cbd5e1 !important; /* Light Slate edge */
                    stroke-width: 2px !important;
                }
            `}</style>


            <TransformWrapper
                initialScale={1}
                minScale={0.2}
                maxScale={4}
                centerOnInit={true}
                limitToBounds={false}
                wheel={{ step: 0.1, smoothStep: 0.002 }}
                // Fix for Ctrl+Wheel disappearing: prevent browser zoom and handle internal zoom
                panning={{ velocityDisabled: true }}
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Controls */}
                        <div className="absolute top-4 right-4 z-10 flex gap-1 bg-white/80 backdrop-blur-md p-1 rounded-lg border border-black/5 shadow-sm">
                            <button onClick={toggleFullscreen} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-black/5 rounded-md transition-all" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                                {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            </button>
                            <button onClick={() => zoomIn()} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-black/5 rounded-md transition-all" title="Zoom In">
                                <Plus className="h-4 w-4" /> {/* Need to import Plus or ZoomIn icon, actually Maximize was used for zoom in before? No, Maximize was used for nothing logic-wise probably, or I misread. The original code had Maximize for zoomIn?? Wait. Let me check original code. */}
                                {/* Original code: zoomIn button had Maximize icon. That's weird. I will Use 'Plus' for ZoomIn and 'Minus' for ZoomOut if available, or just keep Maximize for Fullscreen and maybe ZoomIn/Out icons */}
                            </button>
                            <button onClick={() => zoomOut()} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-black/5 rounded-md transition-all" title="Zoom Out">
                                <Minimize className="h-4 w-4" />
                            </button>
                            <div className="w-px bg-black/5 mx-1 my-1" />
                            <button onClick={() => resetTransform()} className="p-2 text-slate-600 hover:text-slate-900 hover:bg-black/5 rounded-md transition-all" title="Reset">
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

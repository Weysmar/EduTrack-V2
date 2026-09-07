import { useEffect, useRef, useState } from 'react';
import BpmnNavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseProcessModelData } from '@/lib/processModelParser';

interface BPMNThumbnailProps {
    url: string;
    fileName?: string;
    className?: string;
    onError?: () => void;
}

// Global caches to ensure diagrams are only fetched & parsed once per session
const bpmnSvgCache = new Map<string, string>();
const bpmnFetchCache = new Map<string, Promise<ArrayBuffer>>();

export function BPMNThumbnail({ url, fileName, className, onError }: BPMNThumbnailProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<BpmnNavigatedViewer | null>(null);

    const [svg, setSvg] = useState<string | null>(() => bpmnSvgCache.get(url) || null);
    const [imgSrc, setImgSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(!bpmnSvgCache.has(url));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!url) {
            setFailed(true);
            onError?.();
            return;
        }

        // If SVG is already cached, no need to spin up bpmn-js
        const cached = bpmnSvgCache.get(url);
        if (cached) {
            setSvg(cached);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        const renderDiagram = async () => {
            try {
                // Fetch and deduplicate buffer request
                let fetchPromise = bpmnFetchCache.get(url);
                if (!fetchPromise) {
                    fetchPromise = fetch(url).then(async (res) => {
                        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
                        return res.arrayBuffer();
                    });
                    bpmnFetchCache.set(url, fetchPromise);
                }

                const buffer = await fetchPromise;
                if (!isMounted) return;

                const parsed = await parseProcessModelData(buffer);
                if (!isMounted) return;

                if (parsed.type === 'image' && parsed.imageUrl) {
                    setImgSrc(parsed.imageUrl);
                    setLoading(false);
                    return;
                }

                if (parsed.type !== 'bpmn_xml' || !parsed.xml) {
                    throw new Error("Contenu non reconnu comme un schéma BPMN XML");
                }

                const xml = parsed.xml;

                if (!containerRef.current) return;

                // Wait for container to have dimensions if it was mounted hidden
                if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
                    await new Promise<void>((resolve) => {
                        if (!containerRef.current) return resolve();
                        const ro = new ResizeObserver((entries) => {
                            for (const entry of entries) {
                                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                                    ro.disconnect();
                                    resolve();
                                }
                            }
                        });
                        ro.observe(containerRef.current);
                        setTimeout(() => {
                            ro.disconnect();
                            resolve();
                        }, 500);
                    });
                }

                if (!isMounted || !containerRef.current) return;

                // Destroy any lingering viewer
                if (viewerRef.current) {
                    try {
                        viewerRef.current.destroy();
                    } catch (_) {}
                    viewerRef.current = null;
                }

                const viewer = new BpmnNavigatedViewer({
                    container: containerRef.current
                });
                viewerRef.current = viewer;

                await viewer.importXML(xml);
                if (!isMounted) {
                    viewer.destroy();
                    return;
                }

                const canvas = viewer.get('canvas');
                canvas.zoom('fit-viewport');

                // Export SVG for caching
                try {
                    const { svg: exportedSvg } = await viewer.saveSVG();
                    if (exportedSvg) {
                        let responsiveSvg = exportedSvg;
                        if (!responsiveSvg.includes('preserveAspectRatio')) {
                            responsiveSvg = responsiveSvg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ');
                        }
                        bpmnSvgCache.set(url, responsiveSvg);
                        if (isMounted) {
                            setSvg(responsiveSvg);
                        }
                    }
                } catch (err) {
                    console.warn("Could not export BPMN SVG for thumbnail cache:", err);
                }

                if (isMounted) {
                    setLoading(false);
                }
            } catch (err) {
                console.debug("BPMN Thumbnail fallback:", err);
                if (isMounted) {
                    setFailed(true);
                    setLoading(false);
                    onError?.();
                }
            }
        };

        renderDiagram();

        return () => {
            isMounted = false;
            if (viewerRef.current) {
                try {
                    viewerRef.current.destroy();
                } catch (_) {}
                viewerRef.current = null;
            }
        };
    }, [url, onError]);

    if (failed) {
        return null;
    }

    return (
        <div
            className={cn(
                "w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center select-none",
                className
            )}
            title={fileName}
        >
            {/* BPMN / BPM Badge */}
            <div className="absolute top-2 left-2 bg-cyan-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-sm z-20 tracking-wider">
                {fileName?.toLowerCase().endsWith('.bpm') ? 'BPM' : 'BPMN'}
            </div>

            {/* Loading Indicator */}
            {loading && !svg && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/40 z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
                </div>
            )}

            {/* Render Image, Cached SVG, or dynamic container */}
            {imgSrc ? (
                <div className="w-full h-full p-2 flex items-center justify-center pointer-events-none select-none">
                    <img src={imgSrc} alt={fileName} className="w-full h-full object-contain" />
                </div>
            ) : svg ? (
                <div
                    className="w-full h-full p-2.5 flex items-center justify-center pointer-events-none select-none bpmn-thumb-container [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:object-contain"
                    dangerouslySetInnerHTML={{ __html: svg }}
                />
            ) : (
                /* Dynamic mounting host during initial parse */
                <div
                    ref={containerRef}
                    className="w-full h-full p-1 pointer-events-none select-none bpmn-thumb-container [&_.bjs-powered-by]:hidden"
                />
            )}

            {/* Subtle Gradient Shade on bottom */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/5 via-transparent to-transparent dark:from-white/5" />

            {/* Scoped CSS for Dark Mode & Styling */}
            <style>{`
                .dark .bpmn-thumb-container .djs-shape .djs-visual > :is(rect, circle, polygon, path:not([stroke])):not(.djs-outline),
                .dark .bpmn-thumb-container rect:not([fill="none"]):not(.djs-outline),
                .dark .bpmn-thumb-container circle:not([fill="none"]),
                .dark .bpmn-thumb-container polygon:not([fill="none"]) {
                    fill: #1e293b !important;
                    stroke: #94a3b8 !important;
                }
                .dark .bpmn-thumb-container .djs-shape.djs-participant .djs-visual > rect {
                    fill: #0f172a !important;
                    stroke: #64748b !important;
                }
                .dark .bpmn-thumb-container .djs-connection .djs-visual > path,
                .dark .bpmn-thumb-container path[stroke] {
                    stroke: #94a3b8 !important;
                }
                .dark .bpmn-thumb-container .djs-connection .djs-visual > marker path {
                    fill: #94a3b8 !important;
                    stroke: #94a3b8 !important;
                }
                .dark .bpmn-thumb-container text,
                .dark .bpmn-thumb-container .djs-label {
                    fill: #f1f5f9 !important;
                    font-family: inherit !important;
                }
                .dark .bpmn-thumb-container .djs-container {
                    background-color: transparent !important;
                }
                .bpmn-thumb-container .bjs-powered-by {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}

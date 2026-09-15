import React, { useState, useRef, useCallback } from 'react';
import {
    AnnotationItem,
    AnnotationTool,
    NormalizedPoint,
    PenAnnotation,
    HighlighterAnnotation,
    RectAnnotation,
    ArrowAnnotation,
    TextAnnotation
} from '@/types/annotations';
import { StickyNote, Trash2, X, Check, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnotationOverlayProps {
    pageNumber: string | number;
    annotations: AnnotationItem[];
    activeTool: AnnotationTool;
    activeColor: string;
    strokeWidth: number;
    isVisible: boolean;
    onAddAnnotation: (pageNumber: string | number, item: AnnotationItem) => void;
    onUpdateAnnotation: (pageNumber: string | number, item: AnnotationItem) => void;
    onDeleteAnnotation: (pageNumber: string | number, id: string) => void;
    className?: string;
}

export function AnnotationOverlay({
    pageNumber,
    annotations = [],
    activeTool,
    activeColor,
    strokeWidth,
    isVisible,
    onAddAnnotation,
    onUpdateAnnotation,
    onDeleteAnnotation,
    className
}: AnnotationOverlayProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Current in-progress drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<NormalizedPoint[]>([]);
    const [dragStartPoint, setDragStartPoint] = useState<NormalizedPoint | null>(null);
    const [currentEndPoint, setCurrentEndPoint] = useState<NormalizedPoint | null>(null);

    // Active sticky note editing state
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [editingNoteText, setEditingNoteText] = useState<string>('');

    // Convert mouse/touch event to normalized (0 to 1) point
    const getNormalizedPoint = useCallback((e: React.PointerEvent): NormalizedPoint | null => {
        const el = containerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return null;

        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        return { x, y };
    }, []);

    // Pointer Down (Start drawing or placing note)
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isVisible || activeTool === 'pointer' || activeTool === 'eraser') return;

        // Prevent pointer capture issues
        e.preventDefault();
        e.stopPropagation();

        const pt = getNormalizedPoint(e);
        if (!pt) return;

        if (activeTool === 'text') {
            // Create a new text note immediately
            const newNote: TextAnnotation = {
                id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                type: 'text',
                x: pt.x,
                y: pt.y,
                text: '',
                color: activeColor,
                createdAt: new Date().toISOString()
            };
            onAddAnnotation(pageNumber, newNote);
            setSelectedNoteId(newNote.id);
            setEditingNoteText('');
            return;
        }

        setIsDrawing(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            setCurrentPoints([pt]);
        } else if (activeTool === 'rect' || activeTool === 'arrow') {
            setDragStartPoint(pt);
            setCurrentEndPoint(pt);
        }
    };

    // Pointer Move (Extend stroke or shape)
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();

        const pt = getNormalizedPoint(e);
        if (!pt) return;

        if (activeTool === 'pen' || activeTool === 'highlighter') {
            setCurrentPoints(prev => [...prev, pt]);
        } else if (activeTool === 'rect' || activeTool === 'arrow') {
            setCurrentEndPoint(pt);
        }
    };

    // Pointer Up (Commit stroke or shape)
    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        e.stopPropagation();

        setIsDrawing(false);
        try {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        } catch (_) {}

        const now = new Date().toISOString();
        const id = 'ann-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

        if (activeTool === 'pen' && currentPoints.length > 1) {
            const penItem: PenAnnotation = {
                id,
                type: 'pen',
                points: currentPoints,
                color: activeColor,
                strokeWidth: strokeWidth,
                createdAt: now
            };
            onAddAnnotation(pageNumber, penItem);
        } else if (activeTool === 'highlighter' && currentPoints.length > 1) {
            const highItem: HighlighterAnnotation = {
                id,
                type: 'highlighter',
                points: currentPoints,
                color: activeColor,
                strokeWidth: strokeWidth * 5, // Highlighters are broader
                createdAt: now
            };
            onAddAnnotation(pageNumber, highItem);
        } else if (activeTool === 'rect' && dragStartPoint && currentEndPoint) {
            const minX = Math.min(dragStartPoint.x, currentEndPoint.x);
            const minY = Math.min(dragStartPoint.y, currentEndPoint.y);
            const width = Math.abs(currentEndPoint.x - dragStartPoint.x);
            const height = Math.abs(currentEndPoint.y - dragStartPoint.y);

            // Avoid tiny accidental clicks
            if (width > 0.01 || height > 0.01) {
                const rectItem: RectAnnotation = {
                    id,
                    type: 'rect',
                    x: minX,
                    y: minY,
                    width,
                    height,
                    color: activeColor,
                    strokeWidth: strokeWidth,
                    createdAt: now
                };
                onAddAnnotation(pageNumber, rectItem);
            }
        } else if (activeTool === 'arrow' && dragStartPoint && currentEndPoint) {
            const dist = Math.hypot(currentEndPoint.x - dragStartPoint.x, currentEndPoint.y - dragStartPoint.y);
            if (dist > 0.01) {
                const arrowItem: ArrowAnnotation = {
                    id,
                    type: 'arrow',
                    startX: dragStartPoint.x,
                    startY: dragStartPoint.y,
                    endX: currentEndPoint.x,
                    endY: currentEndPoint.y,
                    color: activeColor,
                    strokeWidth: strokeWidth,
                    createdAt: now
                };
                onAddAnnotation(pageNumber, arrowItem);
            }
        }

        // Reset draft states
        setCurrentPoints([]);
        setDragStartPoint(null);
        setCurrentEndPoint(null);
    };

    // Helper to generate smooth SVG path string from normalized points (0..1000 scale)
    const pointsToSvgPath = (points: NormalizedPoint[]): string => {
        if (!points || points.length === 0) return '';
        if (points.length === 1) {
            const x = points[0].x * 1000;
            const y = points[0].y * 1000;
            return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
        }

        // Catmull-Rom or quadratic smoothing
        let d = `M ${points[0].x * 1000} ${points[0].y * 1000}`;
        for (let i = 1; i < points.length - 1; i++) {
            const xc = ((points[i].x + points[i + 1].x) / 2) * 1000;
            const yc = ((points[i].y + points[i + 1].y) / 2) * 1000;
            d += ` Q ${points[i].x * 1000} ${points[i].y * 1000}, ${xc} ${yc}`;
        }
        const last = points[points.length - 1];
        d += ` L ${last.x * 1000} ${last.y * 1000}`;
        return d;
    };

    if (!isVisible) return null;

    const isDrawingTool = ['pen', 'highlighter', 'rect', 'arrow', 'text'].includes(activeTool);

    return (
        <div
            ref={containerRef}
            className={cn(
                "absolute inset-0 z-20 select-none",
                isDrawingTool ? "cursor-crosshair pointer-events-auto touch-none" : "",
                activeTool === 'eraser' ? "cursor-pointer pointer-events-auto" : "",
                activeTool === 'pointer' ? "pointer-events-none" : "",
                className
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* SVG Vector Layer for Inks, Highlights and Shapes */}
            <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
            >
                <defs>
                    <marker
                        id={`arrow-head-${pageNumber}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                    >
                        <path d="M0,0 L0,6 L6,3 z" fill={activeColor} />
                    </marker>
                </defs>

                {/* 1. Saved Annotations */}
                {annotations.map(item => {
                    const isEraserTarget = activeTool === 'eraser';

                    if (item.type === 'pen') {
                        return (
                            <path
                                key={item.id}
                                d={pointsToSvgPath(item.points)}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={item.strokeWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    isEraserTarget && "pointer-events-auto hover:opacity-50 hover:stroke-destructive cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (isEraserTarget) {
                                        e.stopPropagation();
                                        onDeleteAnnotation(pageNumber, item.id);
                                    }
                                }}
                            />
                        );
                    }

                    if (item.type === 'highlighter') {
                        return (
                            <path
                                key={item.id}
                                d={pointsToSvgPath(item.points)}
                                fill="none"
                                stroke={item.color}
                                strokeWidth={item.strokeWidth}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={item.opacity || 0.4}
                                style={{ mixBlendMode: 'multiply' }}
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    isEraserTarget && "pointer-events-auto hover:opacity-80 hover:stroke-destructive cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (isEraserTarget) {
                                        e.stopPropagation();
                                        onDeleteAnnotation(pageNumber, item.id);
                                    }
                                }}
                            />
                        );
                    }

                    if (item.type === 'rect') {
                        return (
                            <rect
                                key={item.id}
                                x={item.x * 1000}
                                y={item.y * 1000}
                                width={item.width * 1000}
                                height={item.height * 1000}
                                fill={item.fillColor || "transparent"}
                                stroke={item.color}
                                strokeWidth={item.strokeWidth}
                                rx="4"
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    isEraserTarget && "pointer-events-auto hover:opacity-50 hover:stroke-destructive cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (isEraserTarget) {
                                        e.stopPropagation();
                                        onDeleteAnnotation(pageNumber, item.id);
                                    }
                                }}
                            />
                        );
                    }

                    if (item.type === 'arrow') {
                        return (
                            <line
                                key={item.id}
                                x1={item.startX * 1000}
                                y1={item.startY * 1000}
                                x2={item.endX * 1000}
                                y2={item.endY * 1000}
                                stroke={item.color}
                                strokeWidth={item.strokeWidth}
                                strokeLinecap="round"
                                markerEnd={`url(#arrow-head-${pageNumber})`}
                                vectorEffect="non-scaling-stroke"
                                className={cn(
                                    isEraserTarget && "pointer-events-auto hover:opacity-50 hover:stroke-destructive cursor-pointer"
                                )}
                                onClick={(e) => {
                                    if (isEraserTarget) {
                                        e.stopPropagation();
                                        onDeleteAnnotation(pageNumber, item.id);
                                    }
                                }}
                            />
                        );
                    }

                    return null;
                })}

                {/* 2. Draft In-Progress Drawing */}
                {isDrawing && currentPoints.length > 1 && (
                    <path
                        d={pointsToSvgPath(currentPoints)}
                        fill="none"
                        stroke={activeColor}
                        strokeWidth={activeTool === 'highlighter' ? strokeWidth * 5 : strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={activeTool === 'highlighter' ? 0.4 : 1}
                        style={activeTool === 'highlighter' ? { mixBlendMode: 'multiply' } : undefined}
                        vectorEffect="non-scaling-stroke"
                    />
                )}

                {/* Draft In-Progress Rectangle */}
                {isDrawing && activeTool === 'rect' && dragStartPoint && currentEndPoint && (
                    <rect
                        x={Math.min(dragStartPoint.x, currentEndPoint.x) * 1000}
                        y={Math.min(dragStartPoint.y, currentEndPoint.y) * 1000}
                        width={Math.abs(currentEndPoint.x - dragStartPoint.x) * 1000}
                        height={Math.abs(currentEndPoint.y - dragStartPoint.y) * 1000}
                        fill="rgba(59, 130, 246, 0.1)"
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray="4 4"
                        rx="4"
                        vectorEffect="non-scaling-stroke"
                    />
                )}

                {/* Draft In-Progress Arrow */}
                {isDrawing && activeTool === 'arrow' && dragStartPoint && currentEndPoint && (
                    <line
                        x1={dragStartPoint.x * 1000}
                        y1={dragStartPoint.y * 1000}
                        x2={currentEndPoint.x * 1000}
                        y2={currentEndPoint.y * 1000}
                        stroke={activeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                        markerEnd={`url(#arrow-head-${pageNumber})`}
                        vectorEffect="non-scaling-stroke"
                    />
                )}
            </svg>

            {/* Sticky Notes & Text Annotations (HTML Layer) */}
            {annotations
                .filter((a): a is TextAnnotation => a.type === 'text')
                .map(note => {
                    const isSelected = selectedNoteId === note.id;

                    return (
                        <div
                            key={note.id}
                            className="absolute z-30 pointer-events-auto"
                            style={{
                                left: `${note.x * 100}%`,
                                top: `${note.y * 100}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeTool === 'eraser') {
                                    onDeleteAnnotation(pageNumber, note.id);
                                    return;
                                }
                                setSelectedNoteId(isSelected ? null : note.id);
                                setEditingNoteText(note.text);
                            }}
                        >
                            {/* Pin Icon / Badge */}
                            <div
                                className={cn(
                                    "w-7 h-7 rounded-full shadow-lg border-2 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer",
                                    isSelected ? "ring-2 ring-primary ring-offset-2 scale-110" : ""
                                )}
                                style={{
                                    backgroundColor: note.color || '#eab308',
                                    borderColor: '#ffffff'
                                }}
                                title="Cliquer pour afficher / modifier la note"
                            >
                                <StickyNote className="h-4 w-4 text-white drop-shadow-xs" />
                            </div>

                            {/* Note Card Popover */}
                            {isSelected && (
                                <div
                                    className="absolute left-full ml-2 top-0 w-64 bg-card/95 backdrop-blur-md border rounded-xl shadow-2xl p-3 z-40 animate-in fade-in zoom-in-95 cursor-default text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between pb-2 border-b mb-2">
                                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                            <Edit2 className="h-3.5 w-3.5 text-primary" />
                                            <span>Note d'étude</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onDeleteAnnotation(pageNumber, note.id)}
                                                className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                                                title="Supprimer la note"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedNoteId(null)}
                                                className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors"
                                                title="Fermer"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <textarea
                                        autoFocus
                                        value={editingNoteText}
                                        onChange={(e) => setEditingNoteText(e.target.value)}
                                        placeholder="Écrivez votre commentaire ou remarque..."
                                        rows={3}
                                        className="w-full bg-muted/40 rounded-lg p-2 text-foreground border border-border/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none text-xs"
                                    />

                                    <div className="flex items-center justify-between mt-2 pt-1">
                                        <span className="text-[10px] text-muted-foreground">
                                            {note.createdAt ? new Date(note.createdAt).toLocaleDateString('fr-FR') : ''}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onUpdateAnnotation(pageNumber, {
                                                    ...note,
                                                    text: editingNoteText
                                                });
                                                setSelectedNoteId(null);
                                            }}
                                            className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1 text-xs shadow-xs"
                                        >
                                            <Check className="h-3 w-3" />
                                            <span>Enregistrer</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
}

export type AnnotationTool =
    | 'pointer'
    | 'pen'
    | 'highlighter'
    | 'text'
    | 'rect'
    | 'arrow'
    | 'eraser';

export interface NormalizedPoint {
    x: number; // 0 to 1 relative to page width
    y: number; // 0 to 1 relative to page height
}

export interface BaseAnnotation {
    id: string;
    createdAt: string;
}

export interface PenAnnotation extends BaseAnnotation {
    type: 'pen';
    points: NormalizedPoint[];
    color: string;
    strokeWidth: number; // visual stroke width in px at scale 1
}

export interface HighlighterAnnotation extends BaseAnnotation {
    type: 'highlighter';
    points: NormalizedPoint[];
    color: string;
    strokeWidth: number; // visual stroke width in px at scale 1 (typically 14-24px)
    opacity?: number;
}

export interface TextAnnotation extends BaseAnnotation {
    type: 'text';
    x: number; // 0 to 1
    y: number; // 0 to 1
    text: string;
    color: string;
    bgColor?: string;
    fontSize?: number; // default e.g. 14
}

export interface RectAnnotation extends BaseAnnotation {
    type: 'rect';
    x: number; // 0 to 1
    y: number; // 0 to 1
    width: number; // 0 to 1
    height: number; // 0 to 1
    color: string;
    strokeWidth: number;
    fillColor?: string;
}

export interface ArrowAnnotation extends BaseAnnotation {
    type: 'arrow';
    startX: number; // 0 to 1
    startY: number; // 0 to 1
    endX: number; // 0 to 1
    endY: number; // 0 to 1
    color: string;
    strokeWidth: number;
}

export type AnnotationItem =
    | PenAnnotation
    | HighlighterAnnotation
    | TextAnnotation
    | RectAnnotation
    | ArrowAnnotation;

export interface DocumentAnnotations {
    version: number;
    pages: { [pageNumber: string]: AnnotationItem[] };
    lastModified?: string;
}

export const ANNOTATION_COLORS = [
    { label: 'Jaune fluo', value: '#eab308', highlightValue: '#fef08a' },
    { label: 'Vert menthe', value: '#10b981', highlightValue: '#86efac' },
    { label: 'Bleu ciel', value: '#0ea5e9', highlightValue: '#7dd3fc' },
    { label: 'Rose / Magenta', value: '#ec4899', highlightValue: '#f472b6' },
    { label: 'Orange vif', value: '#f97316', highlightValue: '#fed7aa' },
    { label: 'Rouge alerte', value: '#ef4444', highlightValue: '#fca5a5' },
    { label: 'Violet', value: '#8b5cf6', highlightValue: '#c4b5fd' },
    { label: 'Noir / Sombre', value: '#0f172a', highlightValue: '#94a3b8' }
];

export const STROKE_WIDTHS = [
    { label: 'Fin', value: 2, highlighterValue: 12 },
    { label: 'Moyen', value: 4, highlighterValue: 20 },
    { label: 'Épais', value: 8, highlighterValue: 32 }
];

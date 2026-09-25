export type ToolType = 'select' | 'shape' | 'line' | 'text' | 'freehand' | 'image'

export type ShapeCategory = 'basic' | 'arrows' | 'callouts' | 'equations'

export type ShapeType =
    // Formes de base
    | 'rect'
    | 'round-rect'
    | 'circle'
    | 'triangle'
    | 'right-triangle'
    | 'diamond'
    | 'parallelogram'
    | 'trapezoid'
    | 'pentagon'
    | 'hexagon'
    | 'octagon'
    | 'star4'
    | 'star5'
    | 'heart'
    | 'sun'
    | 'cloud'
    | 'moon'
    | 'cross'
    | 'cube'
    | 'cylinder'
    | 'smiley'
    | 'lightning'
    | 'donut'
    // Flèches
    | 'arrow-right'
    | 'arrow-left'
    | 'arrow-up'
    | 'arrow-down'
    | 'arrow-double-h'
    | 'arrow-double-v'
    // Légendes / Bulles
    | 'callout-rect'
    | 'callout-round'
    | 'callout-oval'
    | 'callout-cloud'
    // Équations
    | 'eq-plus'
    | 'eq-minus'
    | 'eq-multiply'
    | 'eq-divide'
    | 'eq-equal'

export type LineType = 'line' | 'arrow' | 'double-arrow'

export interface Point {
    x: number
    y: number
}

export interface DrawingElement {
    id: string
    type: ToolType
    shapeType?: ShapeType
    lineType?: LineType
    x: number
    y: number
    width: number
    height: number
    rotation?: number // in degrees

    // Style
    fillColor: string // hex or 'transparent'
    strokeColor: string
    strokeWidth: number
    strokeStyle: 'solid' | 'dashed' | 'dotted'
    opacity?: number

    // Line & Arrow specific
    x2?: number
    y2?: number
    arrowStart?: boolean
    arrowEnd?: boolean

    // Freehand specific
    points?: Point[]

    // Text & Shape text
    text?: string
    fontSize?: number
    fontFamily?: string
    fontWeight?: 'normal' | 'bold'
    fontStyle?: 'normal' | 'italic'
    textDecoration?: 'none' | 'underline'
    textAlign?: 'left' | 'center' | 'right'
    textColor?: string

    // Image specific
    imageSrc?: string
}

export interface DrawingData {
    version: number
    width: number
    height: number
    elements: DrawingElement[]
}

export interface GuideLine {
    id: string
    type: 'vertical' | 'horizontal'
    coord: number
    label?: string
    isCenter?: boolean
}

export interface SpacingGuide {
    id: string
    orientation: 'horizontal' | 'vertical'
    start: number
    end: number
    crossCoord: number
    gap: number
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot'

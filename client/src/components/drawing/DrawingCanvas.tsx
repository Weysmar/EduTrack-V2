import React, { useRef, useState, useEffect, useCallback } from 'react'
import { DrawingElement, Point, ResizeHandle, ToolType, ShapeType, LineType, GuideLine, SpacingGuide } from './types'
import { getShapePathData } from './shapePaths'

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

interface DrawingCanvasProps {
    elements: DrawingElement[]
    onChange: (elements: DrawingElement[]) => void
    activeTool: ToolType
    selectedShapeType: ShapeType
    selectedLineType: LineType
    selectedElementIds: string[]
    onSelectElements: (ids: string[]) => void
    onToolChange?: (tool: ToolType) => void
    zoom: number
    canvasWidth?: number
    canvasHeight?: number
    defaultStyle: {
        fillColor: string
        strokeColor: string
        strokeWidth: number
        strokeStyle: 'solid' | 'dashed' | 'dotted'
        textColor: string
        fontSize: number
        fontFamily: string
    }
}

interface DragState {
    type: 'create' | 'move' | 'resize' | 'rotate' | 'line-point'
    startX: number
    startY: number
    currentX: number
    currentY: number
    handle?: ResizeHandle
    pointTarget?: 'start' | 'end'
    elementId?: string
    initialElements?: DrawingElement[]
    initialCenter?: Point
    initialAngle?: number
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    elements,
    onChange,
    activeTool,
    selectedShapeType,
    selectedLineType,
    selectedElementIds,
    onSelectElements,
    onToolChange,
    zoom,
    canvasWidth = 900,
    canvasHeight = 650,
    defaultStyle
}) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const [dragState, setDragState] = useState<DragState | null>(null)
    const [editingElementId, setEditingElementId] = useState<string | null>(null)
    const [editingText, setEditingText] = useState('')
    const [activeGuides, setActiveGuides] = useState<GuideLine[]>([])
    const [activeSpacingGuides, setActiveSpacingGuides] = useState<SpacingGuide[]>([])
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Focus textarea when editing
    useEffect(() => {
        if (editingElementId && textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.select()
        }
    }, [editingElementId])

    // Convert client pointer coordinates to Canvas SVG coordinates
    const getSvgCoordinates = useCallback((clientX: number, clientY: number): Point => {
        if (!svgRef.current) return { x: 0, y: 0 }
        const rect = svgRef.current.getBoundingClientRect()
        const x = (clientX - rect.left) / zoom
        const y = (clientY - rect.top) / zoom
        return {
            x: Math.round(x),
            y: Math.round(y)
        }
    }, [zoom])

    // Save inline text changes
    const finishEditingText = () => {
        if (!editingElementId) return
        const updated = elements.map(el => {
            if (el.id === editingElementId) {
                return { ...el, text: editingText }
            }
            return el
        })
        onChange(updated)
        setEditingElementId(null)
    }

    // Double-click to edit text inside a shape or text box
    const handleElementDoubleClick = (el: DrawingElement, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingElementId(el.id)
        setEditingText(el.text || '')
    }

    // Pointer Down on Canvas
    const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (editingElementId) {
            finishEditingText()
            return
        }

        // Only left button
        if (e.button !== 0) return

        const rawPos = getSvgCoordinates(e.clientX, e.clientY)
        const pos = {
            x: clamp(rawPos.x, 0, canvasWidth),
            y: clamp(rawPos.y, 0, canvasHeight)
        }

        // Creation Mode
        if (activeTool !== 'select') {
            const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)

            if (activeTool === 'freehand') {
                const newElem: DrawingElement = {
                    id: newId,
                    type: 'freehand',
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0,
                    fillColor: 'transparent',
                    strokeColor: defaultStyle.strokeColor,
                    strokeWidth: defaultStyle.strokeWidth,
                    strokeStyle: defaultStyle.strokeStyle,
                    points: [{ x: 0, y: 0 }]
                }
                onChange([...elements, newElem])
                setDragState({
                    type: 'create',
                    startX: pos.x,
                    startY: pos.y,
                    currentX: pos.x,
                    currentY: pos.y,
                    elementId: newId,
                    initialElements: [...elements, newElem]
                })
            } else if (activeTool === 'line') {
                const newElem: DrawingElement = {
                    id: newId,
                    type: 'line',
                    lineType: selectedLineType,
                    x: pos.x,
                    y: pos.y,
                    x2: pos.x,
                    y2: pos.y,
                    width: 0,
                    height: 0,
                    fillColor: 'transparent',
                    strokeColor: defaultStyle.strokeColor,
                    strokeWidth: defaultStyle.strokeWidth,
                    strokeStyle: defaultStyle.strokeStyle,
                    arrowStart: selectedLineType === 'double-arrow',
                    arrowEnd: selectedLineType === 'arrow' || selectedLineType === 'double-arrow'
                }
                onChange([...elements, newElem])
                setDragState({
                    type: 'create',
                    startX: pos.x,
                    startY: pos.y,
                    currentX: pos.x,
                    currentY: pos.y,
                    elementId: newId,
                    initialElements: [...elements, newElem]
                })
            } else if (activeTool === 'text') {
                const newElem: DrawingElement = {
                    id: newId,
                    type: 'text',
                    x: clamp(pos.x, 0, Math.max(0, canvasWidth - 160)),
                    y: clamp(pos.y, 0, Math.max(0, canvasHeight - 50)),
                    width: 160,
                    height: 50,
                    fillColor: 'transparent',
                    strokeColor: 'transparent',
                    strokeWidth: 1,
                    strokeStyle: 'solid',
                    text: 'Texte',
                    fontSize: defaultStyle.fontSize || 16,
                    fontFamily: defaultStyle.fontFamily || 'Inter, sans-serif',
                    textColor: defaultStyle.textColor || '#1e293b',
                    textAlign: 'left'
                }
                onChange([...elements, newElem])
                onSelectElements([newId])
                setEditingElementId(newId)
                setEditingText('Texte')
                if (onToolChange) onToolChange('select')
            } else if (activeTool === 'shape') {
                const newElem: DrawingElement = {
                    id: newId,
                    type: 'shape',
                    shapeType: selectedShapeType,
                    x: pos.x,
                    y: pos.y,
                    width: 0,
                    height: 0,
                    fillColor: defaultStyle.fillColor,
                    strokeColor: defaultStyle.strokeColor,
                    strokeWidth: defaultStyle.strokeWidth,
                    strokeStyle: defaultStyle.strokeStyle,
                    fontSize: defaultStyle.fontSize || 16,
                    fontFamily: defaultStyle.fontFamily || 'Inter, sans-serif',
                    textColor: defaultStyle.textColor || '#1e293b',
                    textAlign: 'center'
                }
                onChange([...elements, newElem])
                setDragState({
                    type: 'create',
                    startX: pos.x,
                    startY: pos.y,
                    currentX: pos.x,
                    currentY: pos.y,
                    elementId: newId,
                    initialElements: [...elements, newElem]
                })
            }
            return
        }

        // In select mode: clicking blank canvas clears selection
        onSelectElements([])
    }

    // Pointer Down on Element
    const handleElementPointerDown = (el: DrawingElement, e: React.PointerEvent) => {
        if (activeTool !== 'select') return
        e.stopPropagation()

        // Select element
        if (!selectedElementIds.includes(el.id)) {
            if (e.shiftKey) {
                onSelectElements([...selectedElementIds, el.id])
            } else {
                onSelectElements([el.id])
            }
        }

        const rawPos = getSvgCoordinates(e.clientX, e.clientY)
        const pos = {
            x: clamp(rawPos.x, 0, canvasWidth),
            y: clamp(rawPos.y, 0, canvasHeight)
        }

        setDragState({
            type: 'move',
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            elementId: el.id,
            initialElements: elements.map(item => ({ ...item }))
        })
    }

    // Pointer Down on Resize Handle
    const handleResizePointerDown = (handle: ResizeHandle, e: React.PointerEvent) => {
        e.stopPropagation()
        if (selectedElementIds.length !== 1) return

        const selectedEl = elements.find(el => el.id === selectedElementIds[0])
        if (!selectedEl) return

        const rawPos = getSvgCoordinates(e.clientX, e.clientY)
        const pos = {
            x: clamp(rawPos.x, 0, canvasWidth),
            y: clamp(rawPos.y, 0, canvasHeight)
        }
        const cx = selectedEl.x + selectedEl.width / 2
        const cy = selectedEl.y + selectedEl.height / 2

        if (handle === 'rot') {
            const initialAngle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI)
            setDragState({
                type: 'rotate',
                startX: pos.x,
                startY: pos.y,
                currentX: pos.x,
                currentY: pos.y,
                handle,
                elementId: selectedEl.id,
                initialCenter: { x: cx, y: cy },
                initialAngle: (selectedEl.rotation || 0) - initialAngle,
                initialElements: elements.map(item => ({ ...item }))
            })
        } else {
            setDragState({
                type: 'resize',
                startX: pos.x,
                startY: pos.y,
                currentX: pos.x,
                currentY: pos.y,
                handle,
                elementId: selectedEl.id,
                initialElements: elements.map(item => ({ ...item }))
            })
        }
    }

    // Pointer Down on Line Endpoint Handle
    const handleLinePointPointerDown = (target: 'start' | 'end', e: React.PointerEvent) => {
        e.stopPropagation()
        if (selectedElementIds.length !== 1) return
        const selectedEl = elements.find(el => el.id === selectedElementIds[0])
        if (!selectedEl || selectedEl.type !== 'line') return

        const rawPos = getSvgCoordinates(e.clientX, e.clientY)
        const pos = {
            x: clamp(rawPos.x, 0, canvasWidth),
            y: clamp(rawPos.y, 0, canvasHeight)
        }
        setDragState({
            type: 'line-point',
            startX: pos.x,
            startY: pos.y,
            currentX: pos.x,
            currentY: pos.y,
            pointTarget: target,
            elementId: selectedEl.id,
            initialElements: elements.map(item => ({ ...item }))
        })
    }

    // Pointer Move (global)
    const handlePointerMove = (e: React.PointerEvent) => {
        if (!dragState) return

        const rawPos = getSvgCoordinates(e.clientX, e.clientY)
        const pos = {
            x: clamp(rawPos.x, 0, canvasWidth),
            y: clamp(rawPos.y, 0, canvasHeight)
        }
        let dx = pos.x - dragState.startX
        let dy = pos.y - dragState.startY

        if (dragState.type === 'create') {
            const initialList = dragState.initialElements || elements
            const updated = initialList.map(el => {
                if (el.id !== dragState.elementId) return el

                if (el.type === 'freehand') {
                    const originX = el.x
                    const originY = el.y
                    const points = el.points ? [...el.points] : []
                    points.push({ x: pos.x - originX, y: pos.y - originY })
                    return { ...el, points }
                }

                if (el.type === 'line') {
                    return {
                        ...el,
                        x: clamp(el.x, 0, canvasWidth),
                        y: clamp(el.y, 0, canvasHeight),
                        x2: pos.x,
                        y2: pos.y
                    }
                }

                // Shape creation with drag rectangle clamped inside canvas
                const w = pos.x - dragState.startX
                const h = pos.y - dragState.startY
                const rawX = w < 0 ? pos.x : dragState.startX
                const rawY = h < 0 ? pos.y : dragState.startY
                const newX = clamp(rawX, 0, canvasWidth)
                const newY = clamp(rawY, 0, canvasHeight)
                const newW = clamp(Math.abs(w), 0, canvasWidth - newX)
                const newH = clamp(Math.abs(h), 0, canvasHeight - newY)
                return {
                    ...el,
                    x: newX,
                    y: newY,
                    width: newW,
                    height: newH
                }
            })
            onChange(updated)
        } else if (dragState.type === 'move') {
            const initialList = dragState.initialElements || elements
            const activeIds = selectedElementIds.length > 0 ? selectedElementIds : [dragState.elementId!]
            const movingInitialElements = initialList.filter(el => activeIds.includes(el.id))
            const primaryEl = movingInitialElements.find(el => el.id === dragState.elementId) || movingInitialElements[0]

            // 1. Calculate strictly allowable translation delta bounds so no element can cross canvas edge
            let minAllowedDx = -Infinity
            let maxAllowedDx = Infinity
            let minAllowedDy = -Infinity
            let maxAllowedDy = Infinity

            movingInitialElements.forEach(el => {
                if (el.type === 'line') {
                    const x1 = el.x
                    const y1 = el.y
                    const x2 = el.x2 ?? el.x + el.width
                    const y2 = el.y2 ?? el.y + el.height
                    minAllowedDx = Math.max(minAllowedDx, -Math.min(x1, x2))
                    maxAllowedDx = Math.min(maxAllowedDx, canvasWidth - Math.max(x1, x2))
                    minAllowedDy = Math.max(minAllowedDy, -Math.min(y1, y2))
                    maxAllowedDy = Math.min(maxAllowedDy, canvasHeight - Math.max(y1, y2))
                } else {
                    minAllowedDx = Math.max(minAllowedDx, -el.x)
                    maxAllowedDx = Math.min(maxAllowedDx, canvasWidth - (el.x + el.width))
                    minAllowedDy = Math.max(minAllowedDy, -el.y)
                    maxAllowedDy = Math.min(maxAllowedDy, canvasHeight - (el.y + el.height))
                }
            })

            // 2. Real-time Smart Alignment & Spacing Guides (Canva / Google Docs style)
            const SNAP_THRESHOLD = 6
            const newGuides: GuideLine[] = []
            const newSpacingGuides: SpacingGuide[] = []

            if (primaryEl && primaryEl.type !== 'line') {
                const curX = primaryEl.x + dx
                const curY = primaryEl.y + dy
                const curW = primaryEl.width
                const curH = primaryEl.height

                const nonMoving = elements.filter(el => !activeIds.includes(el.id))

                // --- Vertical alignment candidates (matching X) ---
                interface SnapCandidateX {
                    targetCoord: number
                    sourceCoord: number
                    diff: number
                    label?: string
                    isCenter?: boolean
                }
                const snapCandidatesX: SnapCandidateX[] = []

                // Canvas Center (X)
                const canvasCenterX = Math.round(canvasWidth / 2)
                snapCandidatesX.push({
                    targetCoord: canvasCenterX,
                    sourceCoord: curX + curW / 2,
                    diff: Math.abs(curX + curW / 2 - canvasCenterX),
                    label: 'Centre',
                    isCenter: true
                })

                // Canvas Edges (X)
                snapCandidatesX.push({ targetCoord: 0, sourceCoord: curX, diff: Math.abs(curX) })
                snapCandidatesX.push({ targetCoord: canvasWidth, sourceCoord: curX + curW, diff: Math.abs(curX + curW - canvasWidth) })

                // Non-moving elements (X)
                nonMoving.forEach(other => {
                    const oL = other.x
                    const oC = other.x + other.width / 2
                    const oR = other.x + other.width

                    // Left to Left
                    snapCandidatesX.push({ targetCoord: oL, sourceCoord: curX, diff: Math.abs(curX - oL) })
                    // Center to Center
                    snapCandidatesX.push({ targetCoord: oC, sourceCoord: curX + curW / 2, diff: Math.abs(curX + curW / 2 - oC) })
                    // Right to Right
                    snapCandidatesX.push({ targetCoord: oR, sourceCoord: curX + curW, diff: Math.abs(curX + curW - oR) })
                    // Left to Right
                    snapCandidatesX.push({ targetCoord: oR, sourceCoord: curX, diff: Math.abs(curX - oR) })
                    // Right to Left
                    snapCandidatesX.push({ targetCoord: oL, sourceCoord: curX + curW, diff: Math.abs(curX + curW - oL) })
                })

                const validSnapsX = snapCandidatesX.filter(s => s.diff <= SNAP_THRESHOLD)
                if (validSnapsX.length > 0) {
                    validSnapsX.sort((a, b) => a.diff - b.diff)
                    const bestX = validSnapsX[0]
                    dx += (bestX.targetCoord - bestX.sourceCoord)
                    newGuides.push({
                        id: `v-${bestX.targetCoord}`,
                        type: 'vertical',
                        coord: bestX.targetCoord,
                        label: bestX.label,
                        isCenter: bestX.isCenter
                    })
                }

                // --- Horizontal alignment candidates (matching Y) ---
                interface SnapCandidateY {
                    targetCoord: number
                    sourceCoord: number
                    diff: number
                    label?: string
                    isCenter?: boolean
                }
                const snapCandidatesY: SnapCandidateY[] = []

                // Canvas Middle (Y)
                const canvasCenterY = Math.round(canvasHeight / 2)
                snapCandidatesY.push({
                    targetCoord: canvasCenterY,
                    sourceCoord: curY + curH / 2,
                    diff: Math.abs(curY + curH / 2 - canvasCenterY),
                    label: 'Milieu',
                    isCenter: true
                })

                // Canvas Edges (Y)
                snapCandidatesY.push({ targetCoord: 0, sourceCoord: curY, diff: Math.abs(curY) })
                snapCandidatesY.push({ targetCoord: canvasHeight, sourceCoord: curY + curH, diff: Math.abs(curY + curH - canvasHeight) })

                // Non-moving elements (Y)
                nonMoving.forEach(other => {
                    const oT = other.y
                    const oM = other.y + other.height / 2
                    const oB = other.y + other.height

                    // Top to Top
                    snapCandidatesY.push({ targetCoord: oT, sourceCoord: curY, diff: Math.abs(curY - oT) })
                    // Middle to Middle
                    snapCandidatesY.push({ targetCoord: oM, sourceCoord: curY + curH / 2, diff: Math.abs(curY + curH / 2 - oM) })
                    // Bottom to Bottom
                    snapCandidatesY.push({ targetCoord: oB, sourceCoord: curY + curH, diff: Math.abs(curY + curH - oB) })
                    // Top to Bottom
                    snapCandidatesY.push({ targetCoord: oB, sourceCoord: curY, diff: Math.abs(curY - oB) })
                    // Bottom to Top
                    snapCandidatesY.push({ targetCoord: oT, sourceCoord: curY + curH, diff: Math.abs(curY + curH - oT) })
                })

                const validSnapsY = snapCandidatesY.filter(s => s.diff <= SNAP_THRESHOLD)
                if (validSnapsY.length > 0) {
                    validSnapsY.sort((a, b) => a.diff - b.diff)
                    const bestY = validSnapsY[0]
                    dy += (bestY.targetCoord - bestY.sourceCoord)
                    newGuides.push({
                        id: `h-${bestY.targetCoord}`,
                        type: 'horizontal',
                        coord: bestY.targetCoord,
                        label: bestY.label,
                        isCenter: bestY.isCenter
                    })
                }

                // --- Spacing Guides: Equal gap detection between neighboring shapes ---
                const testX = primaryEl.x + dx
                const testY = primaryEl.y + dy
                const centerTestY = testY + curH / 2

                // Horizontal equal spacing
                const horizNeighbors = nonMoving.filter(o => {
                    const oMidY = o.y + o.height / 2
                    return Math.abs(oMidY - centerTestY) < (curH + o.height) / 1.4
                })

                if (horizNeighbors.length >= 2) {
                    const leftOf = horizNeighbors.filter(o => o.x + o.width <= testX).sort((a, b) => (b.x + b.width) - (a.x + a.width))
                    const rightOf = horizNeighbors.filter(o => o.x >= testX + curW).sort((a, b) => a.x - b.x)

                    if (leftOf.length > 0 && rightOf.length > 0) {
                        const leftEl = leftOf[0]
                        const rightEl = rightOf[0]
                        const gapLeft = testX - (leftEl.x + leftEl.width)
                        const gapRight = rightEl.x - (testX + curW)

                        if (gapLeft > 5 && gapRight > 5 && Math.abs(gapLeft - gapRight) <= SNAP_THRESHOLD * 2) {
                            const totalSpace = rightEl.x - (leftEl.x + leftEl.width) - curW
                            const equalGap = totalSpace / 2
                            const targetX = leftEl.x + leftEl.width + equalGap
                            dx = targetX - primaryEl.x
                            const finalX = primaryEl.x + dx

                            newSpacingGuides.push({
                                id: 'sp-left',
                                orientation: 'horizontal',
                                start: leftEl.x + leftEl.width,
                                end: finalX,
                                crossCoord: centerTestY,
                                gap: equalGap
                            })
                            newSpacingGuides.push({
                                id: 'sp-right',
                                orientation: 'horizontal',
                                start: finalX + curW,
                                end: rightEl.x,
                                crossCoord: centerTestY,
                                gap: equalGap
                            })
                        }
                    }
                }

                // Vertical equal spacing
                const centerTestX = testX + curW / 2
                const vertNeighbors = nonMoving.filter(o => {
                    const oMidX = o.x + o.width / 2
                    return Math.abs(oMidX - centerTestX) < (curW + o.width) / 1.4
                })

                if (vertNeighbors.length >= 2) {
                    const aboveOf = vertNeighbors.filter(o => o.y + o.height <= testY).sort((a, b) => (b.y + b.height) - (a.y + a.height))
                    const belowOf = vertNeighbors.filter(o => o.y >= testY + curH).sort((a, b) => a.y - b.y)

                    if (aboveOf.length > 0 && belowOf.length > 0) {
                        const aboveEl = aboveOf[0]
                        const belowEl = belowOf[0]
                        const gapAbove = testY - (aboveEl.y + aboveEl.height)
                        const gapBelow = belowEl.y - (testY + curH)

                        if (gapAbove > 5 && gapBelow > 5 && Math.abs(gapAbove - gapBelow) <= SNAP_THRESHOLD * 2) {
                            const totalSpace = belowEl.y - (aboveEl.y + aboveEl.height) - curH
                            const equalGap = totalSpace / 2
                            const targetY = aboveEl.y + aboveEl.height + equalGap
                            dy = targetY - primaryEl.y
                            const finalY = primaryEl.y + dy

                            newSpacingGuides.push({
                                id: 'sp-above',
                                orientation: 'vertical',
                                start: aboveEl.y + aboveEl.height,
                                end: finalY,
                                crossCoord: centerTestX,
                                gap: equalGap
                            })
                            newSpacingGuides.push({
                                id: 'sp-below',
                                orientation: 'vertical',
                                start: finalY + curH,
                                end: belowEl.y,
                                crossCoord: centerTestX,
                                gap: equalGap
                            })
                        }
                    }
                }
            }

            // Strictly clamp translation delta so element CANNOT exit the drawing canvas
            const clampedDx = clamp(dx, minAllowedDx, maxAllowedDx)
            const clampedDy = clamp(dy, minAllowedDy, maxAllowedDy)

            setActiveGuides(newGuides)
            setActiveSpacingGuides(newSpacingGuides)

            const updated = initialList.map(el => {
                if (!activeIds.includes(el.id)) return el
                if (el.type === 'line') {
                    const x2 = (el.x2 ?? el.x + el.width) + clampedDx
                    const y2 = (el.y2 ?? el.y + el.height) + clampedDy
                    return {
                        ...el,
                        x: clamp(Math.round(el.x + clampedDx), 0, canvasWidth),
                        y: clamp(Math.round(el.y + clampedDy), 0, canvasHeight),
                        x2: clamp(Math.round(x2), 0, canvasWidth),
                        y2: clamp(Math.round(y2), 0, canvasHeight)
                    }
                }
                const finalX = clamp(Math.round(el.x + clampedDx), 0, Math.max(0, canvasWidth - el.width))
                const finalY = clamp(Math.round(el.y + clampedDy), 0, Math.max(0, canvasHeight - el.height))
                return {
                    ...el,
                    x: finalX,
                    y: finalY
                }
            })
            onChange(updated)
        } else if (dragState.type === 'resize' && dragState.elementId && dragState.handle) {
            const initialEl = dragState.initialElements?.find(item => item.id === dragState.elementId)
            if (!initialEl) return

            let { x, y, width, height } = initialEl
            const handle = dragState.handle

            // Strictly clamp resizing within canvas boundaries [0, canvasWidth] and [0, canvasHeight]
            if (handle.includes('e')) {
                width = clamp(initialEl.width + dx, 15, canvasWidth - initialEl.x)
            } else if (handle.includes('w')) {
                const rightEdge = initialEl.x + initialEl.width
                x = clamp(initialEl.x + dx, 0, rightEdge - 15)
                width = rightEdge - x
            }

            if (handle.includes('s')) {
                height = clamp(initialEl.height + dy, 15, canvasHeight - initialEl.y)
            } else if (handle.includes('n')) {
                const bottomEdge = initialEl.y + initialEl.height
                y = clamp(initialEl.y + dy, 0, bottomEdge - 15)
                height = bottomEdge - y
            }

            // Snapping to canvas center during resize
            const resizeGuides: GuideLine[] = []
            if (handle.includes('e') && Math.abs((x + width) - canvasWidth / 2) <= 5) {
                width = canvasWidth / 2 - x
                resizeGuides.push({ id: 'res-v-c', type: 'vertical', coord: canvasWidth / 2, label: 'Centre', isCenter: true })
            } else if (handle.includes('w') && Math.abs(x - canvasWidth / 2) <= 5) {
                const rightEdge = initialEl.x + initialEl.width
                x = canvasWidth / 2
                width = rightEdge - x
                resizeGuides.push({ id: 'res-v-c', type: 'vertical', coord: canvasWidth / 2, label: 'Centre', isCenter: true })
            }

            if (handle.includes('s') && Math.abs((y + height) - canvasHeight / 2) <= 5) {
                height = canvasHeight / 2 - y
                resizeGuides.push({ id: 'res-h-c', type: 'horizontal', coord: canvasHeight / 2, label: 'Milieu', isCenter: true })
            } else if (handle.includes('n') && Math.abs(y - canvasHeight / 2) <= 5) {
                const bottomEdge = initialEl.y + initialEl.height
                y = canvasHeight / 2
                height = bottomEdge - y
                resizeGuides.push({ id: 'res-h-c', type: 'horizontal', coord: canvasHeight / 2, label: 'Milieu', isCenter: true })
            }
            setActiveGuides(resizeGuides)

            const updated = elements.map(el => {
                if (el.id === dragState.elementId) {
                    return { ...el, x, y, width, height }
                }
                return el
            })
            onChange(updated)
        } else if (dragState.type === 'rotate' && dragState.elementId && dragState.initialCenter) {
            const cx = dragState.initialCenter.x
            const cy = dragState.initialCenter.y
            const currentAngle = Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI)
            let newRotation = Math.round((currentAngle + (dragState.initialAngle || 0)) % 360)

            if (e.shiftKey) {
                newRotation = Math.round(newRotation / 15) * 15
            }

            const updated = elements.map(el => {
                if (el.id === dragState.elementId) {
                    return { ...el, rotation: newRotation }
                }
                return el
            })
            onChange(updated)
        } else if (dragState.type === 'line-point' && dragState.elementId) {
            const clampedX = clamp(pos.x, 0, canvasWidth)
            const clampedY = clamp(pos.y, 0, canvasHeight)

            const updated = elements.map(el => {
                if (el.id === dragState.elementId && el.type === 'line') {
                    if (dragState.pointTarget === 'start') {
                        return { ...el, x: clampedX, y: clampedY }
                    } else {
                        return { ...el, x2: clampedX, y2: clampedY }
                    }
                }
                return el
            })
            onChange(updated)
        }
    }

    // Pointer Up
    const handlePointerUp = () => {
        setActiveGuides([])
        setActiveSpacingGuides([])
        if (!dragState) return

        if (dragState.type === 'create') {
            const created = elements.find(el => el.id === dragState.elementId)
            if (created) {
                // If shape was clicked without dragging, give it a nice default size
                if (created.type === 'shape' && (created.width < 10 || created.height < 10)) {
                    const updated = elements.map(el => {
                        if (el.id === created.id) {
                            const defW = 120
                            const defH = 80
                            return {
                                ...el,
                                x: clamp(el.x, 0, Math.max(0, canvasWidth - defW)),
                                y: clamp(el.y, 0, Math.max(0, canvasHeight - defH)),
                                width: defW,
                                height: defH
                            }
                        }
                        return el
                    })
                    onChange(updated)
                } else if (created.type === 'line') {
                    const x2 = created.x2 ?? created.x
                    const y2 = created.y2 ?? created.y
                    if (Math.hypot(x2 - created.x, y2 - created.y) < 10) {
                        const updated = elements.map(el => {
                            if (el.id === created.id) {
                                return {
                                    ...el,
                                    x: clamp(el.x, 0, canvasWidth),
                                    y: clamp(el.y, 0, canvasHeight),
                                    x2: clamp(el.x + 120, 0, canvasWidth),
                                    y2: clamp(el.y, 0, canvasHeight)
                                }
                            }
                            return el
                        })
                        onChange(updated)
                    }
                }
                onSelectElements([created.id])
            }
            if (onToolChange) onToolChange('select')
        }

        setDragState(null)
    }

    // Compute active selection bounding box
    const activeSelectedEl = selectedElementIds.length === 1
        ? elements.find(el => el.id === selectedElementIds[0])
        : null

    // Determine cursor
    const getCanvasCursor = () => {
        if (activeTool === 'select') return 'default'
        if (activeTool === 'freehand') return 'crosshair'
        if (activeTool === 'text') return 'text'
        return 'crosshair'
    }

    // Helper for rendering ruler ticks
    const renderHorizontalRuler = () => {
        const ticks = []
        const totalCm = Math.ceil(canvasWidth / 37.8) // ~37.8 px per cm at 96 dpi
        for (let i = 0; i <= totalCm; i++) {
            const px = i * 37.8
            ticks.push(
                <g key={`h-tick-${i}`} transform={`translate(${px}, 0)`}>
                    <line x1="0" y1="12" x2="0" y2="20" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                    {i > 0 && (
                        <text x="3" y="10" fontSize="9" fill="currentColor" opacity="0.7" fontFamily="sans-serif">
                            {i}
                        </text>
                    )}
                    {/* Sub ticks (half cm) */}
                    <line x1={37.8 / 2} y1="15" x2={37.8 / 2} y2="20" stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
                </g>
            )
        }
        return ticks
    }

    const renderVerticalRuler = () => {
        const ticks = []
        const totalCm = Math.ceil(canvasHeight / 37.8)
        for (let i = 0; i <= totalCm; i++) {
            const py = i * 37.8
            ticks.push(
                <g key={`v-tick-${i}`} transform={`translate(0, ${py})`}>
                    <line x1="12" y1="0" x2="20" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.6" />
                    {i > 0 && (
                        <text x="3" y="10" fontSize="9" fill="currentColor" opacity="0.7" fontFamily="sans-serif">
                            {i}
                        </text>
                    )}
                    {/* Sub ticks (half cm) */}
                    <line x1="15" y1={37.8 / 2} x2="20" y2={37.8 / 2} stroke="currentColor" strokeWidth="0.7" opacity="0.35" />
                </g>
            )
        }
        return ticks
    }

    return (
        <div
            ref={containerRef}
            className="relative flex-1 w-full h-full overflow-auto bg-slate-100 dark:bg-slate-900 select-none flex flex-col"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            tabIndex={0}
        >
            {/* Top Bar with Ruler Corner */}
            <div className="flex shrink-0 h-6 border-b border-slate-300 dark:border-slate-800 bg-slate-200/90 dark:bg-slate-950/90 z-10 sticky top-0">
                <div className="w-6 h-6 border-r border-slate-300 dark:border-slate-800 shrink-0 bg-slate-300/60 dark:bg-slate-800/60" />
                <div className="flex-1 overflow-hidden relative">
                    <svg
                        className="h-6 w-full text-slate-600 dark:text-slate-400"
                        style={{ width: canvasWidth * zoom }}
                    >
                        <g transform={`scale(${zoom})`}>
                            {renderHorizontalRuler()}
                        </g>
                    </svg>
                </div>
            </div>

            {/* Main Area: Left Ruler + SVG Canvas */}
            <div className="flex flex-1 relative">
                {/* Left Ruler */}
                <div className="w-6 shrink-0 border-r border-slate-300 dark:border-slate-800 bg-slate-200/90 dark:bg-slate-950/90 z-10 sticky left-0 overflow-hidden">
                    <svg
                        className="w-6 text-slate-600 dark:text-slate-400"
                        style={{ height: canvasHeight * zoom }}
                    >
                        <g transform={`scale(${zoom})`}>
                            {renderVerticalRuler()}
                        </g>
                    </svg>
                </div>

                {/* Canvas Scroll / Center Container */}
                <div className="flex-1 p-8 min-w-max min-h-max flex items-center justify-center">
                    <div
                        className="relative shadow-xl border border-slate-300 dark:border-slate-700 bg-white"
                        style={{
                            width: canvasWidth * zoom,
                            height: canvasHeight * zoom
                        }}
                    >
                        {/* Interactive SVG Canvas */}
                        <svg
                            ref={svgRef}
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
                            className="absolute inset-0"
                            style={{ cursor: getCanvasCursor() }}
                            onPointerDown={handlePointerDown}
                        >
                            <defs>
                                {/* Checkerboard transparency pattern */}
                                <pattern id="checkerboard" width="16" height="16" patternUnits="userSpaceOnUse">
                                    <rect width="8" height="8" fill="#f8fafc" />
                                    <rect x="8" width="8" height="8" fill="#e2e8f0" />
                                    <rect y="8" width="8" height="8" fill="#e2e8f0" />
                                    <rect x="8" y="8" width="8" height="8" fill="#f8fafc" />
                                </pattern>

                                {/* Arrow Markers */}
                                <marker
                                    id="canvas-arrow-end"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="8"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="context-stroke" />
                                </marker>
                                <marker
                                    id="canvas-arrow-start"
                                    markerWidth="10"
                                    markerHeight="10"
                                    refX="2"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="10 0, 0 3.5, 10 7" fill="context-stroke" />
                                </marker>

                                {/* Strict Canvas Clipping Path */}
                                <clipPath id="drawing-canvas-clip">
                                    <rect x="0" y="0" width={canvasWidth} height={canvasHeight} />
                                </clipPath>
                            </defs>

                            {/* Canvas Background */}
                            <rect width={canvasWidth} height={canvasHeight} fill="url(#checkerboard)" />

                            {/* Render Elements inside strict clip path */}
                            <g clipPath="url(#drawing-canvas-clip)">
                                {elements.map((el) => {
                                const isSelected = selectedElementIds.includes(el.id)
                                const strokeDash = el.strokeStyle === 'dashed' ? '8,4' : el.strokeStyle === 'dotted' ? '3,3' : 'none'

                                if (el.type === 'line') {
                                    const x1 = el.x
                                    const y1 = el.y
                                    const x2 = el.x2 ?? el.x + el.width
                                    const y2 = el.y2 ?? el.y + el.height
                                    return (
                                        <g
                                            key={el.id}
                                            onPointerDown={(e) => handleElementPointerDown(el, e)}
                                            className="cursor-move"
                                        >
                                            {/* Hit target line */}
                                            <line
                                                x1={x1}
                                                y1={y1}
                                                x2={x2}
                                                y2={y2}
                                                stroke="transparent"
                                                strokeWidth={Math.max(el.strokeWidth + 12, 16)}
                                            />
                                            {/* Visible Line */}
                                            <line
                                                x1={x1}
                                                y1={y1}
                                                x2={x2}
                                                y2={y2}
                                                stroke={el.strokeColor}
                                                strokeWidth={el.strokeWidth}
                                                strokeDasharray={strokeDash}
                                                strokeLinecap="round"
                                                markerEnd={el.arrowEnd ? 'url(#canvas-arrow-end)' : undefined}
                                                markerStart={el.arrowStart ? 'url(#canvas-arrow-start)' : undefined}
                                            />
                                        </g>
                                    )
                                }

                                if (el.type === 'freehand') {
                                    const pts = el.points || []
                                    const pathD = pts.length > 0
                                        ? `M ${el.x + pts[0].x} ${el.y + pts[0].y} ` + pts.slice(1).map(p => `L ${el.x + p.x} ${el.y + p.y}`).join(' ')
                                        : ''
                                    return (
                                        <g
                                            key={el.id}
                                            onPointerDown={(e) => handleElementPointerDown(el, e)}
                                            className="cursor-move"
                                        >
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke="transparent"
                                                strokeWidth={Math.max(el.strokeWidth + 12, 16)}
                                            />
                                            <path
                                                d={pathD}
                                                fill="none"
                                                stroke={el.strokeColor}
                                                strokeWidth={el.strokeWidth}
                                                strokeDasharray={strokeDash}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </g>
                                    )
                                }

                                if (el.type === 'image' && el.imageSrc) {
                                    const rot = el.rotation || 0
                                    const transform = rot !== 0
                                        ? `translate(${el.x}, ${el.y}) rotate(${rot}, ${el.width / 2}, ${el.height / 2})`
                                        : `translate(${el.x}, ${el.y})`

                                    return (
                                        <g
                                            key={el.id}
                                            transform={transform}
                                            onPointerDown={(e) => handleElementPointerDown(el, e)}
                                            className="cursor-move"
                                        >
                                            <image
                                                href={el.imageSrc}
                                                width={el.width}
                                                height={el.height}
                                                preserveAspectRatio="none"
                                            />
                                        </g>
                                    )
                                }

                                // Shapes and Text Boxes
                                const rot = el.rotation || 0
                                const transform = rot !== 0
                                    ? `translate(${el.x}, ${el.y}) rotate(${rot}, ${el.width / 2}, ${el.height / 2})`
                                    : `translate(${el.x}, ${el.y})`

                                const pathData = el.shapeType ? getShapePathData(el.shapeType, el.width, el.height) : ''

                                return (
                                    <g
                                        key={el.id}
                                        transform={transform}
                                        onPointerDown={(e) => handleElementPointerDown(el, e)}
                                        onDoubleClick={(e) => handleElementDoubleClick(el, e)}
                                        className="cursor-move"
                                    >
                                        {/* Shape geometry */}
                                        {el.type === 'shape' && (
                                            <path
                                                d={pathData}
                                                fill={el.fillColor}
                                                stroke={el.strokeColor}
                                                strokeWidth={el.strokeWidth}
                                                strokeDasharray={strokeDash}
                                                strokeLinejoin="round"
                                            />
                                        )}

                                        {/* Text element bounding box if pure text */}
                                        {el.type === 'text' && (
                                            <rect
                                                width={el.width}
                                                height={el.height}
                                                fill={el.fillColor}
                                                stroke={isSelected ? '#3b82f6' : (el.strokeColor === 'transparent' ? 'none' : el.strokeColor)}
                                                strokeWidth={isSelected ? 1 : el.strokeWidth}
                                                strokeDasharray={isSelected ? '3,3' : strokeDash}
                                            />
                                        )}

                                        {/* Text inside shape or text box (hidden while actively typing in overlay) */}
                                        {el.text && editingElementId !== el.id && (() => {
                                            const align = el.textAlign || 'center'
                                            const posX = align === 'left' ? 12 : align === 'right' ? el.width - 12 : el.width / 2
                                            const anchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle'
                                            const lines = el.text.split('\n')
                                            const fontSize = el.fontSize || 16
                                            const lineHeight = fontSize * 1.25
                                            const totalH = lines.length * lineHeight
                                            const startY = (el.height - totalH) / 2 + fontSize * 0.85

                                            return (
                                                <text
                                                    x={posX}
                                                    y={startY}
                                                    textAnchor={anchor}
                                                    fill={el.textColor || '#1e293b'}
                                                    fontSize={fontSize}
                                                    fontFamily={el.fontFamily || 'Inter, sans-serif'}
                                                    fontWeight={el.fontWeight || 'normal'}
                                                    fontStyle={el.fontStyle || 'normal'}
                                                    textDecoration={el.textDecoration || 'none'}
                                                    pointerEvents="none"
                                                >
                                                    {lines.map((line, idx) => (
                                                        <tspan
                                                            key={idx}
                                                            x={posX}
                                                            dy={idx === 0 ? 0 : lineHeight}
                                                        >
                                                            {line}
                                                        </tspan>
                                                    ))}
                                                </text>
                                            )
                                        })()}
                                    </g>
                                )
                            })}
                            </g>

                            {/* Real-time Smart Alignment Guides (Canva / Google Docs style) */}
                            {activeGuides.map(guide => {
                                if (guide.type === 'vertical') {
                                    return (
                                        <g key={guide.id} pointerEvents="none">
                                            <line
                                                x1={guide.coord}
                                                y1={0}
                                                x2={guide.coord}
                                                y2={canvasHeight}
                                                stroke={guide.isCenter ? '#3b82f6' : '#ec4899'}
                                                strokeWidth="1.2"
                                                strokeDasharray="4,3"
                                            />
                                            {guide.label && (
                                                <g transform={`translate(${guide.coord}, 14)`}>
                                                    <rect
                                                        x="-24"
                                                        y="-10"
                                                        width="48"
                                                        height="18"
                                                        rx="4"
                                                        fill={guide.isCenter ? '#2563eb' : '#db2777'}
                                                        opacity="0.9"
                                                    />
                                                    <text
                                                        x="0"
                                                        y="2"
                                                        textAnchor="middle"
                                                        fill="#ffffff"
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="sans-serif"
                                                    >
                                                        {guide.label}
                                                    </text>
                                                </g>
                                            )}
                                        </g>
                                    )
                                }
                                return (
                                    <g key={guide.id} pointerEvents="none">
                                        <line
                                            x1={0}
                                            y1={guide.coord}
                                            x2={canvasWidth}
                                            y2={guide.coord}
                                            stroke={guide.isCenter ? '#3b82f6' : '#ec4899'}
                                            strokeWidth="1.2"
                                            strokeDasharray="4,3"
                                        />
                                        {guide.label && (
                                            <g transform={`translate(28, ${guide.coord})`}>
                                                <rect
                                                    x="-24"
                                                    y="-9"
                                                    width="48"
                                                    height="18"
                                                    rx="4"
                                                    fill={guide.isCenter ? '#2563eb' : '#db2777'}
                                                    opacity="0.9"
                                                />
                                                <text
                                                    x="0"
                                                    y="3"
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                    fontFamily="sans-serif"
                                                >
                                                    {guide.label}
                                                </text>
                                            </g>
                                        )}
                                    </g>
                                )
                            })}

                            {/* Real-time Spacing Guides (Equal Gaps / Canva style) */}
                            {activeSpacingGuides.map(sg => {
                                if (sg.orientation === 'horizontal') {
                                    const midX = (sg.start + sg.end) / 2
                                    return (
                                        <g key={sg.id} pointerEvents="none">
                                            <line x1={sg.start} y1={sg.crossCoord} x2={sg.end} y2={sg.crossCoord} stroke="#ec4899" strokeWidth="1.2" />
                                            <line x1={sg.start} y1={sg.crossCoord - 4} x2={sg.start} y2={sg.crossCoord + 4} stroke="#ec4899" strokeWidth="1.5" />
                                            <line x1={sg.end} y1={sg.crossCoord - 4} x2={sg.end} y2={sg.crossCoord + 4} stroke="#ec4899" strokeWidth="1.5" />
                                            <rect
                                                x={midX - 18}
                                                y={sg.crossCoord - 8}
                                                width="36"
                                                height="16"
                                                rx="4"
                                                fill="#ec4899"
                                            />
                                            <text
                                                x={midX}
                                                y={sg.crossCoord + 3}
                                                textAnchor="middle"
                                                fill="#ffffff"
                                                fontSize="9"
                                                fontWeight="bold"
                                                fontFamily="sans-serif"
                                            >
                                                {Math.round(sg.gap)} px
                                            </text>
                                        </g>
                                    )
                                }
                                const midY = (sg.start + sg.end) / 2
                                return (
                                    <g key={sg.id} pointerEvents="none">
                                        <line x1={sg.crossCoord} y1={sg.start} x2={sg.crossCoord} y2={sg.end} stroke="#ec4899" strokeWidth="1.2" />
                                        <line x1={sg.crossCoord - 4} y1={sg.start} x2={sg.crossCoord + 4} stroke="#ec4899" strokeWidth="1.5" />
                                        <line x1={sg.crossCoord - 4} y1={sg.end} x2={sg.crossCoord + 4} stroke="#ec4899" strokeWidth="1.5" />
                                        <rect
                                            x={sg.crossCoord - 18}
                                            y={midY - 8}
                                            width="36"
                                            height="16"
                                            rx="4"
                                            fill="#ec4899"
                                        />
                                        <text
                                            x={sg.crossCoord}
                                            y={midY + 3}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="9"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            {Math.round(sg.gap)} px
                                        </text>
                                    </g>
                                )
                            })}

                            {/* Active Selection Outline and Handles */}
                            {activeSelectedEl && activeSelectedEl.type === 'line' && (
                                <g>
                                    {/* Line Endpoint 1 Handle */}
                                    <circle
                                        cx={activeSelectedEl.x}
                                        cy={activeSelectedEl.y}
                                        r="5"
                                        fill="#3b82f6"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        className="cursor-crosshair"
                                        onPointerDown={(e) => handleLinePointPointerDown('start', e)}
                                    />
                                    {/* Line Endpoint 2 Handle */}
                                    <circle
                                        cx={activeSelectedEl.x2 ?? activeSelectedEl.x + activeSelectedEl.width}
                                        cy={activeSelectedEl.y2 ?? activeSelectedEl.y + activeSelectedEl.height}
                                        r="5"
                                        fill="#3b82f6"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                        className="cursor-crosshair"
                                        onPointerDown={(e) => handleLinePointPointerDown('end', e)}
                                    />
                                </g>
                            )}

                            {activeSelectedEl && activeSelectedEl.type !== 'line' && (
                                <g
                                    transform={activeSelectedEl.rotation ? `translate(${activeSelectedEl.x}, ${activeSelectedEl.y}) rotate(${activeSelectedEl.rotation}, ${activeSelectedEl.width / 2}, ${activeSelectedEl.height / 2})` : `translate(${activeSelectedEl.x}, ${activeSelectedEl.y})`}
                                    pointerEvents="auto"
                                >
                                    {/* Bounding box blue outline */}
                                    <rect
                                        x="0"
                                        y="0"
                                        width={activeSelectedEl.width}
                                        height={activeSelectedEl.height}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="1.5"
                                        strokeDasharray="4,4"
                                        pointerEvents="none"
                                    />

                                    {/* 8 Resize Handles */}
                                    {[
                                        { id: 'nw' as ResizeHandle, cx: 0, cy: 0, cursor: 'nwse-resize' },
                                        { id: 'n' as ResizeHandle, cx: activeSelectedEl.width / 2, cy: 0, cursor: 'ns-resize' },
                                        { id: 'ne' as ResizeHandle, cx: activeSelectedEl.width, cy: 0, cursor: 'nesw-resize' },
                                        { id: 'e' as ResizeHandle, cx: activeSelectedEl.width, cy: activeSelectedEl.height / 2, cursor: 'ew-resize' },
                                        { id: 'se' as ResizeHandle, cx: activeSelectedEl.width, cy: activeSelectedEl.height, cursor: 'nwse-resize' },
                                        { id: 's' as ResizeHandle, cx: activeSelectedEl.width / 2, cy: activeSelectedEl.height, cursor: 'ns-resize' },
                                        { id: 'sw' as ResizeHandle, cx: 0, cy: activeSelectedEl.height, cursor: 'nesw-resize' },
                                        { id: 'w' as ResizeHandle, cx: 0, cy: activeSelectedEl.height / 2, cursor: 'ew-resize' },
                                    ].map(h => (
                                        <rect
                                            key={h.id}
                                            x={h.cx - 4.5}
                                            y={h.cy - 4.5}
                                            width="9"
                                            height="9"
                                            fill="#ffffff"
                                            stroke="#3b82f6"
                                            strokeWidth="1.5"
                                            style={{ cursor: h.cursor }}
                                            onPointerDown={(e) => handleResizePointerDown(h.id, e)}
                                        />
                                    ))}

                                    {/* Rotation Stem and Handle */}
                                    <line
                                        x1={activeSelectedEl.width / 2}
                                        y1="0"
                                        x2={activeSelectedEl.width / 2}
                                        y2="-22"
                                        stroke="#3b82f6"
                                        strokeWidth="1.5"
                                    />
                                    <circle
                                        cx={activeSelectedEl.width / 2}
                                        cy="-22"
                                        r="5"
                                        fill="#ffffff"
                                        stroke="#3b82f6"
                                        strokeWidth="1.5"
                                        style={{ cursor: 'grab' }}
                                        onPointerDown={(e) => handleResizePointerDown('rot', e)}
                                    />
                                </g>
                            )}
                        </svg>

                        {/* Inline Textarea overlay for direct typing into shape / text */}
                        {editingElementId && (() => {
                            const el = elements.find(item => item.id === editingElementId)
                            if (!el) return null
                            return (
                                <div
                                    className="absolute z-20 flex items-center justify-center pointer-events-auto p-1"
                                    style={{
                                        left: el.x * zoom,
                                        top: el.y * zoom,
                                        width: el.width * zoom,
                                        height: el.height * zoom,
                                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined
                                    }}
                                >
                                    <textarea
                                        ref={textareaRef}
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onBlur={finishEditingText}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') finishEditingText()
                                        }}
                                        className="w-full max-h-full bg-transparent resize-none outline-none border border-blue-400 text-center"
                                        style={{
                                            fontSize: `${(el.fontSize || 16) * zoom}px`,
                                            fontFamily: el.fontFamily || 'Inter, sans-serif',
                                            color: el.textColor || '#1e293b',
                                            fontWeight: el.fontWeight || 'normal',
                                            textAlign: el.textAlign || 'center',
                                            lineHeight: 1.25
                                        }}
                                        rows={Math.max(1, editingText.split('\n').length)}
                                    />
                                </div>
                            )
                        })()}
                    </div>
                </div>
            </div>
        </div>
    )
}

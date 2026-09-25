import React, { useRef, useState, useEffect, useCallback } from 'react'
import { DrawingElement, Point, ResizeHandle, ToolType, ShapeType, LineType } from './types'
import { getShapePathData } from './shapePaths'

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

        const pos = getSvgCoordinates(e.clientX, e.clientY)

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
                    x: pos.x,
                    y: pos.y,
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

        const pos = getSvgCoordinates(e.clientX, e.clientY)

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

        const pos = getSvgCoordinates(e.clientX, e.clientY)
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

        const pos = getSvgCoordinates(e.clientX, e.clientY)
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

        const pos = getSvgCoordinates(e.clientX, e.clientY)
        const dx = pos.x - dragState.startX
        const dy = pos.y - dragState.startY

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
                        x2: pos.x,
                        y2: pos.y
                    }
                }

                // Shape creation with drag rectangle
                const w = pos.x - dragState.startX
                const h = pos.y - dragState.startY
                const newX = w < 0 ? pos.x : dragState.startX
                const newY = h < 0 ? pos.y : dragState.startY
                return {
                    ...el,
                    x: newX,
                    y: newY,
                    width: Math.abs(w),
                    height: Math.abs(h)
                }
            })
            onChange(updated)
        } else if (dragState.type === 'move') {
            const initialList = dragState.initialElements || elements
            const activeIds = selectedElementIds.length > 0 ? selectedElementIds : [dragState.elementId!]

            const updated = initialList.map(el => {
                if (!activeIds.includes(el.id)) return el
                if (el.type === 'line') {
                    const x2 = (el.x2 ?? el.x + el.width) + dx
                    const y2 = (el.y2 ?? el.y + el.height) + dy
                    return {
                        ...el,
                        x: el.x + dx,
                        y: el.y + dy,
                        x2,
                        y2
                    }
                }
                return {
                    ...el,
                    x: Math.round(el.x + dx),
                    y: Math.round(el.y + dy)
                }
            })
            onChange(updated)
        } else if (dragState.type === 'resize' && dragState.elementId && dragState.handle) {
            const initialEl = dragState.initialElements?.find(item => item.id === dragState.elementId)
            if (!initialEl) return

            let { x, y, width, height } = initialEl
            const handle = dragState.handle

            // Handle horizontal resizing
            if (handle.includes('e')) {
                width = Math.max(15, initialEl.width + dx)
            } else if (handle.includes('w')) {
                const newWidth = Math.max(15, initialEl.width - dx)
                x = initialEl.x + (initialEl.width - newWidth)
                width = newWidth
            }

            // Handle vertical resizing
            if (handle.includes('s')) {
                height = Math.max(15, initialEl.height + dy)
            } else if (handle.includes('n')) {
                const newHeight = Math.max(15, initialEl.height - dy)
                y = initialEl.y + (initialEl.height - newHeight)
                height = newHeight
            }

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

            // Snap to 15 degrees if shift key is pressed
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
            const updated = elements.map(el => {
                if (el.id === dragState.elementId && el.type === 'line') {
                    if (dragState.pointTarget === 'start') {
                        return { ...el, x: pos.x, y: pos.y }
                    } else {
                        return { ...el, x2: pos.x, y2: pos.y }
                    }
                }
                return el
            })
            onChange(updated)
        }
    }

    // Pointer Up
    const handlePointerUp = () => {
        if (!dragState) return

        if (dragState.type === 'create') {
            const created = elements.find(el => el.id === dragState.elementId)
            if (created) {
                // If shape was clicked without dragging, give it a nice default size
                if (created.type === 'shape' && (created.width < 10 || created.height < 10)) {
                    const updated = elements.map(el => {
                        if (el.id === created.id) {
                            return { ...el, width: 120, height: 80 }
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
                                return { ...el, x2: el.x + 120, y2: el.y }
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
                            </defs>

                            {/* Canvas Background */}
                            <rect width={canvasWidth} height={canvasHeight} fill="url(#checkerboard)" />

                            {/* Render Elements */}
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
                                        {el.text && editingElementId !== el.id && (
                                            <text
                                                x={el.textAlign === 'center' ? el.width / 2 : el.textAlign === 'right' ? el.width - 10 : 10}
                                                y={el.height / 2}
                                                dominantBaseline="middle"
                                                textAnchor={el.textAlign === 'center' ? 'middle' : el.textAlign === 'right' ? 'end' : 'start'}
                                                fill={el.textColor || '#1e293b'}
                                                fontSize={el.fontSize || 16}
                                                fontFamily={el.fontFamily || 'Inter, sans-serif'}
                                                fontWeight={el.fontWeight || 'normal'}
                                                fontStyle={el.fontStyle || 'normal'}
                                                textDecoration={el.textDecoration || 'none'}
                                                pointerEvents="none"
                                            >
                                                {el.text.split('\n').map((line, idx, arr) => (
                                                    <tspan
                                                        key={idx}
                                                        x={el.textAlign === 'center' ? el.width / 2 : el.textAlign === 'right' ? el.width - 10 : 10}
                                                        dy={idx === 0 ? (arr.length > 1 ? `-${(arr.length - 1) * 0.6}em` : '0') : '1.2em'}
                                                    >
                                                        {line}
                                                    </tspan>
                                                ))}
                                            </text>
                                        )}
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
                                    className="absolute z-20 flex items-center justify-center pointer-events-auto"
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
                                        className="w-full h-full bg-transparent resize-none outline-none border border-blue-400 p-2 text-center"
                                        style={{
                                            fontSize: `${(el.fontSize || 16) * zoom}px`,
                                            fontFamily: el.fontFamily || 'Inter, sans-serif',
                                            color: el.textColor || '#1e293b',
                                            fontWeight: el.fontWeight || 'normal',
                                            textAlign: el.textAlign || 'center'
                                        }}
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

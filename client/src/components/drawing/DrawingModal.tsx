import React, { useState, useEffect, useCallback } from 'react'
import { ToolType, ShapeType, LineType, DrawingElement, DrawingData } from './types'
import { DrawingCanvas } from './DrawingCanvas'
import { DrawingToolbar } from './DrawingToolbar'
import { generateSvgCode, svgToDataUrl, renderSvgToPng } from './exportSvg'
import { toast } from 'sonner'
import { X } from 'lucide-react'

interface DrawingModalProps {
    open: boolean
    onClose: () => void
    initialData?: DrawingData | null
    onSave: (result: { svg: string; dataUrl: string; drawingData: DrawingData }) => void
}

export const DrawingModal: React.FC<DrawingModalProps> = ({
    open,
    onClose,
    initialData,
    onSave,
}) => {
    const [elements, setElements] = useState<DrawingElement[]>([])
    const [history, setHistory] = useState<DrawingElement[][]>([[]])
    const [historyIndex, setHistoryIndex] = useState(0)

    const [activeTool, setActiveTool] = useState<ToolType>('select')
    const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>('rect')
    const [selectedLineType, setSelectedLineType] = useState<LineType>('line')
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([])
    const [zoom, setZoom] = useState(1.0)

    const [defaultStyle, setDefaultStyle] = useState({
        fillColor: '#60a5fa', // Soft blue
        strokeColor: '#2563eb', // Vibrant blue
        strokeWidth: 2,
        strokeStyle: 'solid' as const,
        textColor: '#1e293b',
        fontSize: 16,
        fontFamily: 'Inter, sans-serif'
    })

    // Initialize elements when modal opens or initialData changes
    useEffect(() => {
        if (open) {
            const initialElements = initialData?.elements ? JSON.parse(JSON.stringify(initialData.elements)) : []
            setElements(initialElements)
            setHistory([initialElements])
            setHistoryIndex(0)
            setSelectedElementIds([])
            setActiveTool('select')
            setZoom(1.0)
        }
    }, [open, initialData])

    // Push state to history
    const updateElementsWithHistory = useCallback((newElements: DrawingElement[]) => {
        setElements(newElements)
        setHistory(prev => {
            const trimmed = prev.slice(0, historyIndex + 1)
            return [...trimmed, newElements]
        })
        setHistoryIndex(prev => prev + 1)
    }, [historyIndex])

    // Undo / Redo
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const nextIndex = historyIndex - 1
            setHistoryIndex(nextIndex)
            setElements(history[nextIndex])
            setSelectedElementIds([])
        }
    }, [history, historyIndex])

    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1
            setHistoryIndex(nextIndex)
            setElements(history[nextIndex])
            setSelectedElementIds([])
        }
    }, [history, historyIndex])

    // Update selected elements properties
    const handleUpdateSelected = (patch: Partial<DrawingElement>) => {
        if (selectedElementIds.length === 0) return
        const updated = elements.map(el => {
            if (selectedElementIds.includes(el.id)) {
                return { ...el, ...patch }
            }
            return el
        })
        updateElementsWithHistory(updated)
    }

    // Duplicate selected
    const handleDuplicateSelected = useCallback(() => {
        if (selectedElementIds.length === 0) return
        const toDuplicate = elements.filter(el => selectedElementIds.includes(el.id))
        const newElements = [...elements]
        const newIds: string[] = []

        toDuplicate.forEach(item => {
            const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
            newIds.push(newId)
            newElements.push({
                ...JSON.parse(JSON.stringify(item)),
                id: newId,
                x: item.x + 20,
                y: item.y + 20,
                x2: item.x2 !== undefined ? item.x2 + 20 : undefined,
                y2: item.y2 !== undefined ? item.y2 + 20 : undefined,
            })
        })

        updateElementsWithHistory(newElements)
        setSelectedElementIds(newIds)
    }, [elements, selectedElementIds, updateElementsWithHistory])

    // Delete selected
    const handleDeleteSelected = useCallback(() => {
        if (selectedElementIds.length === 0) return
        const filtered = elements.filter(el => !selectedElementIds.includes(el.id))
        updateElementsWithHistory(filtered)
        setSelectedElementIds([])
    }, [elements, selectedElementIds, updateElementsWithHistory])

    // Bring forward
    const handleBringForward = () => {
        if (selectedElementIds.length !== 1) return
        const id = selectedElementIds[0]
        const idx = elements.findIndex(el => el.id === id)
        if (idx === -1 || idx === elements.length - 1) return

        const newElements = [...elements]
        const [removed] = newElements.splice(idx, 1)
        newElements.splice(idx + 1, 0, removed)
        updateElementsWithHistory(newElements)
    }

    // Send backward
    const handleSendBackward = () => {
        if (selectedElementIds.length !== 1) return
        const id = selectedElementIds[0]
        const idx = elements.findIndex(el => el.id === id)
        if (idx <= 0) return

        const newElements = [...elements]
        const [removed] = newElements.splice(idx, 1)
        newElements.splice(idx - 1, 0, removed)
        updateElementsWithHistory(newElements)
    }

    // Select all
    const handleSelectAll = useCallback(() => {
        setSelectedElementIds(elements.map(el => el.id))
    }, [elements])

    // Insert Image from file
    const handleInsertImage = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string
            if (!dataUrl) return

            const img = new Image()
            img.onload = () => {
                let w = img.naturalWidth || 300
                let h = img.naturalHeight || 200
                const maxDim = 350
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w)
                        w = maxDim
                    } else {
                        w = Math.round((w * maxDim) / h)
                        h = maxDim
                    }
                }

                const newId = 'elem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)
                const newElem: DrawingElement = {
                    id: newId,
                    type: 'image',
                    imageSrc: dataUrl,
                    x: 200,
                    y: 150,
                    width: w,
                    height: h,
                    fillColor: 'transparent',
                    strokeColor: 'transparent',
                    strokeWidth: 0,
                    strokeStyle: 'solid',
                }

                updateElementsWithHistory([...elements, newElem])
                setSelectedElementIds([newId])
                setActiveTool('select')
                toast.success('Image insérée dans le dessin !')
            }
            img.src = dataUrl
        }
        reader.readAsDataURL(file)
    }

    // Export SVG & PNG directly from Actions menu
    const handleExportSvg = () => {
        if (elements.length === 0) {
            toast.error('Le dessin est vide.')
            return
        }
        const svgCode = generateSvgCode(elements, { embedJson: true })
        const blob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dessin_${Date.now()}.svg`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Fichier SVG téléchargé !')
    }

    const handleExportPng = async () => {
        if (elements.length === 0) {
            toast.error('Le dessin est vide.')
            return
        }
        try {
            const svgCode = generateSvgCode(elements, { embedJson: true })
            const pngDataUrl = await renderSvgToPng(svgCode, 2)
            const a = document.createElement('a')
            a.href = pngDataUrl
            a.download = `dessin_${Date.now()}.png`
            a.click()
            toast.success('Fichier PNG téléchargé !')
        } catch {
            toast.error("Erreur lors de l'export PNG")
        }
    }

    // Save and Insert into document
    const handleSaveAndClose = () => {
        if (elements.length === 0) {
            toast.error('Veuillez ajouter des éléments avant d\'enregistrer.')
            return
        }

        const svgCode = generateSvgCode(elements, { embedJson: true })
        const dataUrl = svgToDataUrl(svgCode)

        const drawingData: DrawingData = {
            version: 1,
            width: 900,
            height: 650,
            elements
        }

        onSave({
            svg: svgCode,
            dataUrl,
            drawingData
        })
        onClose()
    }

    // Global Keyboard Shortcuts
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if active inside an input or textarea
            const target = e.target as HTMLElement
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault()
                if (e.shiftKey) {
                    handleRedo()
                } else {
                    handleUndo()
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault()
                handleRedo()
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault()
                handleDuplicateSelected()
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault()
                handleSelectAll()
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedElementIds.length > 0) {
                    e.preventDefault()
                    handleDeleteSelected()
                }
            } else if (e.key === 'Escape') {
                if (selectedElementIds.length > 0) {
                    setSelectedElementIds([])
                } else {
                    onClose()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [
        open,
        selectedElementIds,
        handleUndo,
        handleRedo,
        handleDuplicateSelected,
        handleSelectAll,
        handleDeleteSelected,
        onClose
    ])

    const selectedElements = elements.filter(el => selectedElementIds.includes(el.id))

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
            <div className="max-w-[96vw] w-[1140px] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden bg-background rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-800 animate-in zoom-in-95 duration-150">
                {/* Header (Google Docs style) */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 select-none">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>Dessin</span>
                    </h2>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleSaveAndClose}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-colors cursor-pointer"
                        >
                            Enregistrer et fermer
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Fermer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Subheader Toolbar */}
                <DrawingToolbar
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    selectedShapeType={selectedShapeType}
                    onSelectShapeType={setSelectedShapeType}
                    selectedLineType={selectedLineType}
                    onSelectLineType={setSelectedLineType}
                    selectedElements={selectedElements}
                    onUpdateSelectedElements={handleUpdateSelected}
                    onDuplicateSelected={handleDuplicateSelected}
                    onDeleteSelected={handleDeleteSelected}
                    onBringForward={handleBringForward}
                    onSendBackward={handleSendBackward}
                    onSelectAll={handleSelectAll}
                    canUndo={historyIndex > 0}
                    canRedo={historyIndex < history.length - 1}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    onInsertImage={handleInsertImage}
                    onExportPng={handleExportPng}
                    onExportSvg={handleExportSvg}
                    defaultStyle={defaultStyle}
                    onChangeDefaultStyle={(patch) => setDefaultStyle(prev => ({ ...prev, ...patch }))}
                />

                {/* Canvas Area with Rulers & Checkerboard */}
                <DrawingCanvas
                    elements={elements}
                    onChange={updateElementsWithHistory}
                    activeTool={activeTool}
                    selectedShapeType={selectedShapeType}
                    selectedLineType={selectedLineType}
                    selectedElementIds={selectedElementIds}
                    onSelectElements={setSelectedElementIds}
                    onToolChange={setActiveTool}
                    zoom={zoom}
                    canvasWidth={920}
                    canvasHeight={640}
                    defaultStyle={defaultStyle}
                />
            </div>
        </div>
    )
}

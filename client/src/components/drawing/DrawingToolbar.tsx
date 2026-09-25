import React, { useState, useRef, useEffect } from 'react'
import {
    MousePointer, Undo2, Redo2, Type, Image as ImageIcon, ChevronDown,
    Trash2, Copy, BringToFront, SendToBack,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Minus, ArrowUpRight, Spline, Check, Palette, Sparkles, Download
} from 'lucide-react'
import { ToolType, ShapeType, LineType, DrawingElement } from './types'
import { SHAPE_DEFINITIONS, ShapeDefinition } from './shapePaths'
import { cn } from '@/lib/utils'

interface DrawingToolbarProps {
    activeTool: ToolType
    onSelectTool: (tool: ToolType) => void
    selectedShapeType: ShapeType
    onSelectShapeType: (shape: ShapeType) => void
    selectedLineType: LineType
    onSelectLineType: (line: LineType) => void
    selectedElements: DrawingElement[]
    onUpdateSelectedElements: (patch: Partial<DrawingElement>) => void
    onDuplicateSelected: () => void
    onDeleteSelected: () => void
    onBringForward: () => void
    onSendBackward: () => void
    onSelectAll: () => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
    zoom: number
    onZoomChange: (newZoom: number) => void
    onInsertImage: (file: File) => void
    onExportPng: () => void
    onExportSvg: () => void
    defaultStyle: {
        fillColor: string
        strokeColor: string
        strokeWidth: number
        strokeStyle: 'solid' | 'dashed' | 'dotted'
        textColor: string
        fontSize: number
        fontFamily: string
    }
    onChangeDefaultStyle: (patch: Partial<DrawingToolbarProps['defaultStyle']>) => void
}

const PALETTE_COLORS = [
    'transparent', '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#94a3b8', '#64748b', '#334155', '#1e293b', '#000000',
    '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
    '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412',
    '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e',
    '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534',
    '#ccfbf1', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59',
    '#e0f2fe', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
    '#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6',
    '#fae8ff', '#f5d0fe', '#f0abfc', '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f',
]

const FONT_OPTIONS = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Roboto', value: 'Roboto, sans-serif' },
    { label: 'Times New Roman', value: '"Times New Roman", serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Courier New', value: '"Courier New", monospace' },
    { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
]

export const DrawingToolbar: React.FC<DrawingToolbarProps> = ({
    activeTool,
    onSelectTool,
    selectedShapeType,
    onSelectShapeType,
    selectedLineType,
    onSelectLineType,
    selectedElements,
    onUpdateSelectedElements,
    onDuplicateSelected,
    onDeleteSelected,
    onBringForward,
    onSendBackward,
    onSelectAll,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    zoom,
    onZoomChange,
    onInsertImage,
    onExportPng,
    onExportSvg,
    defaultStyle,
    onChangeDefaultStyle
}) => {
    const [showActionsMenu, setShowActionsMenu] = useState(false)
    const [showShapeMenu, setShowShapeMenu] = useState(false)
    const [activeShapeCategory, setActiveShapeCategory] = useState<'basic' | 'arrows' | 'callouts' | 'equations'>('basic')
    const [showLineMenu, setShowLineMenu] = useState(false)
    const [showZoomMenu, setShowZoomMenu] = useState(false)
    const [showFillPicker, setShowFillPicker] = useState(false)
    const [showStrokePicker, setShowStrokePicker] = useState(false)
    const [showTextPicker, setShowTextPicker] = useState(false)
    const [showStrokeWidthMenu, setShowStrokeWidthMenu] = useState(false)
    const [showStrokeDashMenu, setShowStrokeDashMenu] = useState(false)
    const [showFontMenu, setShowFontMenu] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const toolbarRef = useRef<HTMLDivElement>(null)

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
                setShowActionsMenu(false)
                setShowShapeMenu(false)
                setShowLineMenu(false)
                setShowZoomMenu(false)
                setShowFillPicker(false)
                setShowStrokePicker(false)
                setShowTextPicker(false)
                setShowStrokeWidthMenu(false)
                setShowStrokeDashMenu(false)
                setShowFontMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const hasSelection = selectedElements.length > 0
    const primarySelected = selectedElements[0] || null

    const currentFill = primarySelected ? primarySelected.fillColor : defaultStyle.fillColor
    const currentStroke = primarySelected ? primarySelected.strokeColor : defaultStyle.strokeColor
    const currentStrokeWidth = primarySelected ? primarySelected.strokeWidth : defaultStyle.strokeWidth
    const currentStrokeStyle = primarySelected ? primarySelected.strokeStyle : defaultStyle.strokeStyle
    const currentFont = primarySelected?.fontFamily || defaultStyle.fontFamily
    const currentFontSize = primarySelected?.fontSize || defaultStyle.fontSize
    const currentTextColor = primarySelected?.textColor || defaultStyle.textColor
    const isBold = primarySelected?.fontWeight === 'bold'
    const isItalic = primarySelected?.fontStyle === 'italic'
    const isUnderline = primarySelected?.textDecoration === 'underline'

    const handleApplyFill = (color: string) => {
        if (hasSelection) {
            onUpdateSelectedElements({ fillColor: color })
        } else {
            onChangeDefaultStyle({ fillColor: color })
        }
        setShowFillPicker(false)
    }

    const handleApplyStroke = (color: string) => {
        if (hasSelection) {
            onUpdateSelectedElements({ strokeColor: color })
        } else {
            onChangeDefaultStyle({ strokeColor: color })
        }
        setShowStrokePicker(false)
    }

    const handleApplyStrokeWidth = (w: number) => {
        if (hasSelection) {
            onUpdateSelectedElements({ strokeWidth: w })
        } else {
            onChangeDefaultStyle({ strokeWidth: w })
        }
        setShowStrokeWidthMenu(false)
    }

    const handleApplyStrokeDash = (dash: 'solid' | 'dashed' | 'dotted') => {
        if (hasSelection) {
            onUpdateSelectedElements({ strokeStyle: dash })
        } else {
            onChangeDefaultStyle({ strokeStyle: dash })
        }
        setShowStrokeDashMenu(false)
    }

    const handleApplyFont = (font: string) => {
        if (hasSelection) {
            onUpdateSelectedElements({ fontFamily: font })
        } else {
            onChangeDefaultStyle({ fontFamily: font })
        }
        setShowFontMenu(false)
    }

    const handleApplyTextColor = (color: string) => {
        if (hasSelection) {
            onUpdateSelectedElements({ textColor: color })
        } else {
            onChangeDefaultStyle({ textColor: color })
        }
        setShowTextPicker(false)
    }

    const handleApplyFontSize = (delta: number) => {
        const next = Math.max(8, Math.min(96, currentFontSize + delta))
        if (hasSelection) {
            onUpdateSelectedElements({ fontSize: next })
        } else {
            onChangeDefaultStyle({ fontSize: next })
        }
    }

    const handleToggleBold = () => {
        const next = isBold ? 'normal' : 'bold'
        onUpdateSelectedElements({ fontWeight: next })
    }

    const handleToggleItalic = () => {
        const next = isItalic ? 'normal' : 'italic'
        onUpdateSelectedElements({ fontStyle: next })
    }

    const handleToggleUnderline = () => {
        const next = isUnderline ? 'none' : 'underline'
        onUpdateSelectedElements({ textDecoration: next })
    }

    const handleApplyTextAlign = (align: 'left' | 'center' | 'right') => {
        onUpdateSelectedElements({ textAlign: align })
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onInsertImage(file)
        }
        e.target.value = ''
    }

    return (
        <div
            ref={toolbarRef}
            className="flex flex-wrap items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs select-none shadow-xs shrink-0 z-20"
        >
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Actions Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors font-medium"
                    title="Menu Actions"
                >
                    <span>Actions</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>

                {showActionsMenu && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1.5 z-40 animate-in fade-in zoom-in-95">
                        <button
                            type="button"
                            onClick={() => { onExportPng(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <Download className="h-4 w-4 text-primary" />
                            <span>Télécharger au format PNG</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportSvg(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <Download className="h-4 w-4 text-emerald-600" />
                            <span>Télécharger au format SVG</span>
                        </button>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                        <button
                            type="button"
                            onClick={() => { onSelectAll(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between"
                        >
                            <span>Tout sélectionner</span>
                            <span className="text-[10px] text-muted-foreground">Ctrl+A</span>
                        </button>
                        {hasSelection && (
                            <button
                                type="button"
                                onClick={() => { onDeleteSelected(); setShowActionsMenu(false) }}
                                className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center justify-between"
                            >
                                <span>Supprimer</span>
                                <span className="text-[10px]">Suppr</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Undo / Redo */}
            <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                    "p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors",
                    canUndo && "cursor-pointer"
                )}
                title="Annuler (Ctrl+Z)"
            >
                <Undo2 className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className={cn(
                    "p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 disabled:opacity-35 disabled:hover:bg-transparent transition-colors",
                    canRedo && "cursor-pointer"
                )}
                title="Rétablir (Ctrl+Y)"
            >
                <Redo2 className="h-4 w-4" />
            </button>

            {/* Zoom Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowZoomMenu(!showZoomMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors font-medium text-xs"
                    title="Niveau de zoom"
                >
                    <span>{Math.round(zoom * 100)}%</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
                {showZoomMenu && (
                    <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 animate-in fade-in">
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(z => (
                            <button
                                key={z}
                                type="button"
                                onClick={() => { onZoomChange(z); setShowZoomMenu(false) }}
                                className={cn(
                                    "w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs",
                                    zoom === z && "font-bold text-primary"
                                )}
                            >
                                <span>{Math.round(z * 100)}%</span>
                                {zoom === z && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Selection Pointer */}
            <button
                type="button"
                onClick={() => onSelectTool('select')}
                className={cn(
                    "p-1.5 rounded transition-colors",
                    activeTool === 'select'
                        ? "bg-primary/20 text-primary font-bold shadow-2xs"
                        : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                )}
                title="Sélectionner (Flèche)"
            >
                <MousePointer className="h-4 w-4" />
            </button>

            {/* Shapes Flyout / Dropdown (Google Docs style) */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowShapeMenu(!showShapeMenu)}
                    className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded transition-colors",
                        activeTool === 'shape'
                            ? "bg-primary/20 text-primary font-bold shadow-2xs"
                            : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                    )}
                    title="Formes"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="9" r="6" />
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                    </svg>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {showShapeMenu && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl p-0 z-50 flex animate-in fade-in zoom-in-95 overflow-hidden">
                        {/* Categories List */}
                        <div className="w-40 shrink-0 py-1.5 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 select-none">
                            {[
                                {
                                    id: 'basic' as const,
                                    label: 'Formes',
                                    icon: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="3" y="5" width="18" height="14" rx="1" />
                                        </svg>
                                    )
                                },
                                {
                                    id: 'arrows' as const,
                                    label: 'Flèches',
                                    icon: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <polygon points="2 9, 13 9, 13 5, 21 12, 13 19, 13 15, 2 15" />
                                        </svg>
                                    )
                                },
                                {
                                    id: 'callouts' as const,
                                    label: 'Légendes',
                                    icon: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <polygon points="2 3, 22 3, 22 16, 10 16, 5 21, 5 16, 2 16" />
                                        </svg>
                                    )
                                },
                                {
                                    id: 'equations' as const,
                                    label: 'Équation',
                                    icon: (
                                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <polygon points="10 3, 14 3, 14 9, 20 9, 20 13, 14 13, 14 19, 10 19, 10 13, 4 13, 4 9, 10 9" />
                                        </svg>
                                    )
                                }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onMouseEnter={() => setActiveShapeCategory(cat.id)}
                                    onClick={() => setActiveShapeCategory(cat.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer",
                                        activeShapeCategory === cat.id
                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {cat.icon}
                                        <span>{cat.label}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">▶</span>
                                </button>
                            ))}
                        </div>

                        {/* Shape Icons Panel (Google Docs Style with Sections) */}
                        <div className="w-[410px] shrink-0 p-2.5 bg-white dark:bg-slate-900 select-none">
                            {(() => {
                                const categoryShapes = SHAPE_DEFINITIONS.filter(s => s.category === activeShapeCategory)
                                const sections = Array.from(new Set(categoryShapes.map(s => s.section || 1))).sort((a, b) => a - b)

                                return (
                                    <div className="flex flex-col gap-1">
                                        {sections.map((sec, secIdx) => {
                                            const sectionItems = categoryShapes.filter(s => (s.section || 1) === sec)
                                            return (
                                                <React.Fragment key={sec}>
                                                    {secIdx > 0 && (
                                                        <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                                                    )}
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        {sectionItems.map((shape) => (
                                                            <button
                                                                key={shape.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    onSelectShapeType(shape.id)
                                                                    onSelectTool('shape')
                                                                    setShowShapeMenu(false)
                                                                }}
                                                                className={cn(
                                                                    "w-7 h-7 shrink-0 flex items-center justify-center rounded transition-all cursor-pointer",
                                                                    selectedShapeType === shape.id && activeTool === 'shape'
                                                                        ? "bg-blue-100 dark:bg-blue-900/60 ring-1 ring-blue-500 text-blue-600 dark:text-blue-300"
                                                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:ring-1 hover:ring-slate-300 dark:hover:ring-slate-600 text-slate-800 dark:text-slate-200"
                                                                )}
                                                                title={shape.name}
                                                            >
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    className="w-5 h-5 shrink-0"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.5"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                >
                                                                    {shape.renderIcon()}
                                                                </svg>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </React.Fragment>
                                            )
                                        })}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Lines / Connectors Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowLineMenu(!showLineMenu)}
                    className={cn(
                        "flex items-center gap-1 px-1.5 py-1 rounded transition-colors",
                        (activeTool === 'line' || activeTool === 'freehand')
                            ? "bg-primary/20 text-primary font-bold shadow-2xs"
                            : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                    )}
                    title="Lignes et connecteurs"
                >
                    <ArrowUpRight className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {showLineMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 animate-in fade-in zoom-in-95">
                        <button
                            type="button"
                            onClick={() => {
                                onSelectLineType('line')
                                onSelectTool('line')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <Minus className="h-4 w-4" />
                            <span>Ligne</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onSelectLineType('arrow')
                                onSelectTool('line')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            <span>Flèche</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onSelectLineType('double-arrow')
                                onSelectTool('line')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 6L1 12l6 6v-4h10v4l6-6-6-6v4H7V6z" fill="currentColor" />
                            </svg>
                            <span>Flèche double</span>
                        </button>
                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                        <button
                            type="button"
                            onClick={() => {
                                onSelectTool('freehand')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                        >
                            <Spline className="h-4 w-4 text-primary" />
                            <span>Gribouillage</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Text Box Button */}
            <button
                type="button"
                onClick={() => onSelectTool('text')}
                className={cn(
                    "p-1.5 rounded transition-colors font-serif font-bold text-sm leading-none flex items-center justify-center w-7 h-7",
                    activeTool === 'text'
                        ? "bg-primary/20 text-primary shadow-2xs"
                        : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                )}
                title="Zone de texte (Tt)"
            >
                Tt
            </button>

            {/* Insert Image Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                title="Insérer une image"
            >
                <ImageIcon className="h-4 w-4" />
            </button>

            {/* Separator before styling controls */}
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Fill Color Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowFillPicker(!showFillPicker)}
                    className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                    title="Couleur de remplissage"
                >
                    <div className="relative">
                        <Palette className="h-4 w-4" />
                        <div
                            className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm border border-black/20"
                            style={{ backgroundColor: currentFill === 'transparent' ? '#ffffff' : currentFill }}
                        />
                    </div>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>

                {showFillPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 z-40 w-60 animate-in fade-in">
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center justify-between">
                            <span>Remplissage</span>
                            <button
                                type="button"
                                onClick={() => handleApplyFill('transparent')}
                                className="text-[10px] text-primary hover:underline font-medium"
                            >
                                Transparent
                            </button>
                        </div>
                        <div className="grid grid-cols-8 gap-1">
                            {PALETTE_COLORS.map((col, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyFill(col)}
                                    className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 relative hover:scale-110 transition-transform"
                                    style={{
                                        backgroundColor: col === 'transparent' ? '#ffffff' : col,
                                        backgroundImage: col === 'transparent' ? 'linear-gradient(45deg, #ef4444 48%, #ef4444 52%, transparent 52%)' : undefined
                                    }}
                                    title={col}
                                >
                                    {currentFill === col && <Check className="h-3 w-3 text-slate-900 dark:text-white m-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Stroke / Border Color Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowStrokePicker(!showStrokePicker)}
                    className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                    title="Couleur du contour"
                >
                    <div className="relative">
                        <Sparkles className="h-4 w-4" />
                        <div
                            className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm border border-black/20"
                            style={{ backgroundColor: currentStroke }}
                        />
                    </div>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>

                {showStrokePicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 z-40 w-60 animate-in fade-in">
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Couleur du contour</div>
                        <div className="grid grid-cols-8 gap-1">
                            {PALETTE_COLORS.filter(c => c !== 'transparent').map((col, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyStroke(col)}
                                    className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 relative hover:scale-110 transition-transform"
                                    style={{ backgroundColor: col }}
                                    title={col}
                                >
                                    {currentStroke === col && <Check className="h-3 w-3 text-slate-900 dark:text-white m-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Stroke Width Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowStrokeWidthMenu(!showStrokeWidthMenu)}
                    className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                    title="Épaisseur du contour"
                >
                    <span className="font-semibold text-xs">{currentStrokeWidth}px</span>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>
                {showStrokeWidthMenu && (
                    <div className="absolute top-full left-0 mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 animate-in fade-in">
                        {[1, 2, 3, 4, 6, 8, 12].map(w => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => handleApplyStrokeWidth(w)}
                                className={cn(
                                    "w-full text-left px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs",
                                    currentStrokeWidth === w && "font-bold text-primary"
                                )}
                            >
                                <span>{w} px</span>
                                {currentStrokeWidth === w && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Stroke Dash Style */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowStrokeDashMenu(!showStrokeDashMenu)}
                    className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                    title="Style du contour (Plein, Tirets, Points)"
                >
                    <div className="w-5 h-2.5 flex items-center justify-center">
                        {currentStrokeStyle === 'solid' && <div className="w-4 h-0.5 bg-current" />}
                        {currentStrokeStyle === 'dashed' && <div className="w-4 border-t-2 border-dashed border-current" />}
                        {currentStrokeStyle === 'dotted' && <div className="w-4 border-t-2 border-dotted border-current" />}
                    </div>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>
                {showStrokeDashMenu && (
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 animate-in fade-in">
                        {[
                            { id: 'solid' as const, label: 'Trait plein' },
                            { id: 'dashed' as const, label: 'Tirets' },
                            { id: 'dotted' as const, label: 'Pointillés' }
                        ].map(st => (
                            <button
                                key={st.id}
                                type="button"
                                onClick={() => handleApplyStrokeDash(st.id)}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-xs",
                                    currentStrokeStyle === st.id && "font-bold text-primary"
                                )}
                            >
                                <span>{st.label}</span>
                                {currentStrokeStyle === st.id && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Separator before text formatting */}
            <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

            {/* Font Family */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowFontMenu(!showFontMenu)}
                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors text-xs max-w-[100px] truncate"
                    title="Police"
                >
                    <span className="truncate" style={{ fontFamily: currentFont }}>
                        {FONT_OPTIONS.find(f => f.value === currentFont)?.label || 'Inter'}
                    </span>
                    <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                </button>
                {showFontMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-40 animate-in fade-in">
                        {FONT_OPTIONS.map(f => (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => handleApplyFont(f.value)}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center justify-between",
                                    currentFont === f.value && "font-bold text-primary"
                                )}
                                style={{ fontFamily: f.value }}
                            >
                                <span>{f.label}</span>
                                {currentFont === f.value && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => handleApplyFontSize(-2)}
                    className="p-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800"
                    title="Diminuer la taille"
                >
                    <Minus className="h-3 w-3" />
                </button>
                <span className="px-1 font-semibold text-xs min-w-[20px] text-center">{currentFontSize}</span>
                <button
                    type="button"
                    onClick={() => handleApplyFontSize(2)}
                    className="p-1 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800"
                    title="Augmenter la taille"
                >
                    +
                </button>
            </div>

            {/* Bold, Italic, Underline */}
            <button
                type="button"
                onClick={handleToggleBold}
                className={cn(
                    "p-1.5 rounded transition-colors",
                    isBold ? "bg-primary/20 text-primary font-bold" : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                )}
                title="Gras"
            >
                <Bold className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={handleToggleItalic}
                className={cn(
                    "p-1.5 rounded transition-colors",
                    isItalic ? "bg-primary/20 text-primary" : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                )}
                title="Italique"
            >
                <Italic className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={handleToggleUnderline}
                className={cn(
                    "p-1.5 rounded transition-colors",
                    isUnderline ? "bg-primary/20 text-primary" : "hover:bg-slate-200/80 dark:hover:bg-slate-800"
                )}
                title="Souligné"
            >
                <Underline className="h-3.5 w-3.5" />
            </button>

            {/* Text Color */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowTextPicker(!showTextPicker)}
                    className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors"
                    title="Couleur du texte"
                >
                    <div className="relative">
                        <Type className="h-4 w-4" />
                        <div
                            className="absolute -bottom-0.5 left-0 right-0 h-1 rounded-sm"
                            style={{ backgroundColor: currentTextColor }}
                        />
                    </div>
                    <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>

                {showTextPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2.5 z-40 w-60 animate-in fade-in">
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">Couleur du texte</div>
                        <div className="grid grid-cols-8 gap-1">
                            {PALETTE_COLORS.filter(c => c !== 'transparent').map((col, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleApplyTextColor(col)}
                                    className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 relative hover:scale-110 transition-transform"
                                    style={{ backgroundColor: col }}
                                    title={col}
                                >
                                    {currentTextColor === col && <Check className="h-3 w-3 text-slate-900 dark:text-white m-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Text Alignment */}
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => handleApplyTextAlign('left')}
                    className={cn(
                        "p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors",
                        primarySelected?.textAlign === 'left' && "bg-primary/20 text-primary"
                    )}
                    title="Aligner à gauche"
                >
                    <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => handleApplyTextAlign('center')}
                    className={cn(
                        "p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors",
                        (primarySelected?.textAlign === 'center' || (!primarySelected?.textAlign && primarySelected?.type === 'shape')) && "bg-primary/20 text-primary"
                    )}
                    title="Centrer"
                >
                    <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => handleApplyTextAlign('right')}
                    className={cn(
                        "p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors",
                        primarySelected?.textAlign === 'right' && "bg-primary/20 text-primary"
                    )}
                    title="Aligner à droite"
                >
                    <AlignRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Separator before object ordering and actions */}
            {hasSelection && (
                <>
                    <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1" />

                    {/* Bring to front / Send to back */}
                    <button
                        type="button"
                        onClick={onBringForward}
                        className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                        title="Mettre au premier plan"
                    >
                        <BringToFront className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onSendBackward}
                        className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                        title="Mettre à l'arrière-plan"
                    >
                        <SendToBack className="h-4 w-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                        type="button"
                        onClick={onDuplicateSelected}
                        className="p-1.5 rounded hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors"
                        title="Dupliquer (Ctrl+D)"
                    >
                        <Copy className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={onDeleteSelected}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Supprimer (Suppr)"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    )
}

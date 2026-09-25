import React, { useState, useRef, useEffect } from 'react'
import {
    MousePointer, Undo2, Redo2, Type, Image as ImageIcon, ChevronDown,
    Trash2, Copy, BringToFront, SendToBack,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    Minus, ArrowUpRight, Spline, Check, Palette, Sparkles, Download
} from 'lucide-react'
import { ToolType, ShapeType, LineType, DrawingElement } from './types'
import { SHAPE_DEFINITIONS } from './shapePaths'
import { AVAILABLE_FONTS } from '@/components/editor/FontFamilyExtension'
import { useLanguage } from '@/components/language-provider'
import { useTheme } from '@/components/theme-provider'
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

const COLOR_PALETTE = [
    { color: '#FFFFFF', labelFr: 'Blanc', labelEn: 'White' },
    { color: '#000000', labelFr: 'Noir', labelEn: 'Black' },
    { color: '#64748B', labelFr: 'Gris ardoise', labelEn: 'Slate gray' },
    { color: '#EF4444', labelFr: 'Rouge', labelEn: 'Red' },
    { color: '#F97316', labelFr: 'Orange', labelEn: 'Orange' },
    { color: '#F59E0B', labelFr: 'Jaune ambre', labelEn: 'Amber yellow' },
    { color: '#10B981', labelFr: 'Vert émeraude', labelEn: 'Emerald green' },
    { color: '#06B6D4', labelFr: 'Cyan', labelEn: 'Cyan' },
    { color: '#3B82F6', labelFr: 'Bleu', labelEn: 'Blue' },
    { color: '#8B5CF6', labelFr: 'Violet', labelEn: 'Purple' },
    { color: '#EC4899', labelFr: 'Rose', labelEn: 'Pink' },
    { color: '#A855F7', labelFr: 'Pourpre', labelEn: 'Purple shade' },
    // Soft & Pastel colors matching notes highlights
    { color: '#F8FAFC', labelFr: 'Blanc cassé', labelEn: 'Off-white' },
    { color: '#E2E8F0', labelFr: 'Gris clair', labelEn: 'Light gray' },
    { color: '#FED7AA', labelFr: 'Pêche', labelEn: 'Peach' },
    { color: '#FEF08A', labelFr: 'Jaune doux', labelEn: 'Soft yellow' },
    { color: '#BBF7D0', labelFr: 'Menthe', labelEn: 'Mint' },
    { color: '#BAE6FD', labelFr: 'Bleu ciel', labelEn: 'Sky blue' },
    { color: '#DDD6FE', labelFr: 'Lavande', labelEn: 'Lavender' },
    { color: '#FECDD3', labelFr: 'Rose doux', labelEn: 'Soft pink' },
    { color: '#93C5FD', labelFr: 'Bleu pastel', labelEn: 'Pastel blue' },
    { color: '#86EFAC', labelFr: 'Vert pastel', labelEn: 'Pastel green' },
    { color: '#FCA5A5', labelFr: 'Rouge pastel', labelEn: 'Pastel red' },
    { color: '#CBD5E1', labelFr: 'Ardoise clair', labelEn: 'Light slate' },
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
    const { minecraftTheme: isMinecraft } = useTheme()
    const { language } = useLanguage()

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

    // Button style matching Editor.tsx
    const mcBtn = isMinecraft
        ? "rounded-none text-[#4a3520] dark:text-stone-300 hover:bg-[#dfd0b5] hover:text-[#2c1d11] dark:hover:bg-stone-700 dark:hover:text-stone-100"
        : "text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"

    const mcActive = (isActive: boolean) => {
        if (!isActive) return ""
        if (isMinecraft) return "bg-[#c8b393] text-[#1e140a] dark:bg-stone-700 dark:text-stone-100 font-bold"
        return "bg-primary/20 text-primary font-bold ring-1 ring-primary/40"
    }

    const activeFont = AVAILABLE_FONTS.find(f =>
        currentFont && (
            f.fontFamily.toLowerCase().includes(currentFont.toLowerCase()) ||
            currentFont.toLowerCase().includes(f.name.toLowerCase()) ||
            currentFont.toLowerCase().includes(f.id.toLowerCase())
        )
    ) || AVAILABLE_FONTS[0]

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

    const handleApplyFont = (fontFamily: string) => {
        if (hasSelection) {
            onUpdateSelectedElements({ fontFamily })
        } else {
            onChangeDefaultStyle({ fontFamily })
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
            className={cn(
                "sticky top-0 z-20 border-b p-1.5 flex flex-wrap items-center gap-1 shadow-xs transition-colors shrink-0 select-none",
                "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 backdrop-blur-md",
                isMinecraft && "bg-[#eee3ce]/95 border-b-2 border-[#c8b393] text-[#4a3520] dark:bg-stone-800/95 dark:border-stone-600 dark:text-stone-300"
            )}
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
                    className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded transition-colors font-medium text-xs",
                        mcBtn,
                        showActionsMenu && "bg-slate-200 dark:bg-slate-700"
                    )}
                    title="Menu Actions"
                >
                    <span>Actions</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {showActionsMenu && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-popover text-popover-foreground border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button"
                            onClick={() => { onExportPng(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <Download className="h-4 w-4 text-primary" />
                            <span>Télécharger au format PNG</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onExportSvg(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center gap-2 cursor-pointer transition-colors"
                        >
                            <Download className="h-4 w-4 text-emerald-600" />
                            <span>Télécharger au format SVG</span>
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                            type="button"
                            onClick={() => { onSelectAll(); setShowActionsMenu(false) }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted text-xs flex items-center justify-between cursor-pointer transition-colors"
                        >
                            <span>Tout sélectionner</span>
                            <span className="text-[10px] text-muted-foreground">Ctrl+A</span>
                        </button>
                        {hasSelection && (
                            <button
                                type="button"
                                onClick={() => { onDeleteSelected(); setShowActionsMenu(false) }}
                                className="w-full text-left px-3 py-1.5 hover:bg-destructive/10 text-destructive text-xs flex items-center justify-between cursor-pointer transition-colors"
                            >
                                <span>Supprimer</span>
                                <span className="text-[10px]">Suppr</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

            {/* Undo / Redo */}
            <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className={cn(
                    "p-2 rounded transition-colors",
                    mcBtn,
                    !canUndo && "opacity-35 cursor-not-allowed hover:bg-transparent"
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
                    "p-2 rounded transition-colors",
                    mcBtn,
                    !canRedo && "opacity-35 cursor-not-allowed hover:bg-transparent"
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
                    className={cn(
                        "flex items-center gap-1 px-2 py-1.5 rounded transition-colors font-medium text-xs",
                        mcBtn
                    )}
                    title="Niveau de zoom"
                >
                    <span>{Math.round(zoom * 100)}%</span>
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>
                {showZoomMenu && (
                    <div className="absolute top-full left-0 mt-1 w-28 bg-popover text-popover-foreground border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(z => (
                            <button
                                key={z}
                                type="button"
                                onClick={() => { onZoomChange(z); setShowZoomMenu(false) }}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs cursor-pointer transition-colors",
                                    zoom === z && "font-bold text-primary bg-primary/10"
                                )}
                            >
                                <span>{Math.round(z * 100)}%</span>
                                {zoom === z && <Check className="h-3 w-3 text-primary" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

            {/* Selection Pointer */}
            <button
                type="button"
                onClick={() => onSelectTool('select')}
                className={cn(
                    "p-2 rounded transition-colors",
                    mcBtn,
                    mcActive(activeTool === 'select')
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
                        "flex items-center gap-1 p-2 rounded transition-colors",
                        mcBtn,
                        mcActive(activeTool === 'shape')
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
                    <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-2xl p-0 z-50 flex animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        {/* Categories List */}
                        <div className="w-40 shrink-0 py-1.5 border-r border-border bg-popover select-none">
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
                                            ? "bg-primary/10 text-primary font-medium"
                                            : "hover:bg-muted text-foreground"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {cat.icon}
                                        <span>{cat.label}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">▶</span>
                                </button>
                            ))}
                        </div>

                        {/* Shape Icons Panel (Google Docs Style with Sections) */}
                        <div className="w-[410px] shrink-0 p-2.5 bg-popover select-none">
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
                                                        <div className="border-t border-border my-1" />
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
                                                                        ? "bg-primary/20 ring-1 ring-primary text-primary"
                                                                        : "hover:bg-muted hover:ring-1 hover:ring-border text-foreground"
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
                        "flex items-center gap-1 p-2 rounded transition-colors",
                        mcBtn,
                        mcActive(activeTool === 'line' || activeTool === 'freehand')
                    )}
                    title="Lignes et connecteurs"
                >
                    <ArrowUpRight className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 opacity-70" />
                </button>

                {showLineMenu && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-popover text-popover-foreground border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            type="button"
                            onClick={() => {
                                onSelectLineType('line')
                                onSelectTool('line')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-xs cursor-pointer transition-colors"
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
                            className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-xs cursor-pointer transition-colors"
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
                            className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-xs cursor-pointer transition-colors"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M7 6L1 12l6 6v-4h10v4l6-6-6-6v4H7V6z" fill="currentColor" />
                            </svg>
                            <span>Flèche double</span>
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                            type="button"
                            onClick={() => {
                                onSelectTool('freehand')
                                setShowLineMenu(false)
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-muted flex items-center gap-2 text-xs cursor-pointer transition-colors"
                        >
                            <Spline className="h-4 w-4 text-primary" />
                            <span>Gribouillage libre</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Text Box Button */}
            <button
                type="button"
                onClick={() => onSelectTool('text')}
                className={cn(
                    "p-2 rounded transition-colors font-serif font-bold text-sm leading-none flex items-center justify-center w-8 h-8",
                    mcBtn,
                    mcActive(activeTool === 'text')
                )}
                title="Zone de texte (Tt)"
            >
                Tt
            </button>

            {/* Insert Image Button */}
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    "p-2 rounded transition-colors",
                    mcBtn
                )}
                title="Insérer une image"
            >
                <ImageIcon className="h-4 w-4" />
            </button>

            {/* Separator before styling controls */}
            <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

            {/* Fill Color Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowFillPicker(!showFillPicker)}
                    className={cn(
                        "p-2 rounded flex items-center gap-1 transition-colors relative",
                        mcBtn,
                        showFillPicker && "bg-slate-200 dark:bg-slate-700"
                    )}
                    title="Couleur de remplissage"
                >
                    <div className="relative">
                        <Palette className="h-4 w-4" />
                        <div
                            className="absolute -bottom-1 left-0 right-0 h-1 rounded-sm border border-black/20"
                            style={{ backgroundColor: currentFill === 'transparent' ? '#ffffff' : currentFill }}
                        />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {showFillPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-50 min-w-[240px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b pb-1.5 px-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {language === 'fr' ? 'Remplissage' : 'Fill Color'}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleApplyFill('transparent')}
                                className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                            >
                                {language === 'fr' ? 'Transparent' : 'Transparent'}
                            </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {COLOR_PALETTE.map(item => (
                                <button
                                    key={item.color}
                                    type="button"
                                    onClick={() => handleApplyFill(item.color)}
                                    className="h-6 w-6 rounded-md border border-border/60 hover:scale-110 transition-transform relative flex items-center justify-center cursor-pointer shadow-2xs"
                                    style={{ backgroundColor: item.color }}
                                    title={language === 'fr' ? item.labelFr : item.labelEn}
                                >
                                    {currentFill === item.color && (
                                        <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {/* Custom color input */}
                        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                            <span>{language === 'fr' ? 'Personnalisée' : 'Custom'}</span>
                            <input
                                type="color"
                                value={currentFill.startsWith('#') ? currentFill : '#3b82f6'}
                                onChange={(e) => handleApplyFill(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border border-border/60 bg-transparent p-0"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Stroke / Border Color Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowStrokePicker(!showStrokePicker)}
                    className={cn(
                        "p-2 rounded flex items-center gap-1 transition-colors relative",
                        mcBtn,
                        showStrokePicker && "bg-slate-200 dark:bg-slate-700"
                    )}
                    title="Couleur du contour"
                >
                    <div className="relative">
                        <Sparkles className="h-4 w-4" />
                        <div
                            className="absolute -bottom-1 left-0 right-0 h-1 rounded-sm border border-black/20"
                            style={{ backgroundColor: currentStroke }}
                        />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {showStrokePicker && (
                    <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-50 min-w-[240px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b pb-1.5 px-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {language === 'fr' ? 'Couleur du contour' : 'Border Color'}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleApplyStroke('#2563eb')}
                                className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                            >
                                {language === 'fr' ? 'Par défaut' : 'Default'}
                            </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {COLOR_PALETTE.map(item => (
                                <button
                                    key={item.color}
                                    type="button"
                                    onClick={() => handleApplyStroke(item.color)}
                                    className="h-6 w-6 rounded-md border border-border/60 hover:scale-110 transition-transform relative flex items-center justify-center cursor-pointer shadow-2xs"
                                    style={{ backgroundColor: item.color }}
                                    title={language === 'fr' ? item.labelFr : item.labelEn}
                                >
                                    {currentStroke === item.color && (
                                        <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                            <span>{language === 'fr' ? 'Personnalisée' : 'Custom'}</span>
                            <input
                                type="color"
                                value={currentStroke.startsWith('#') ? currentStroke : '#2563eb'}
                                onChange={(e) => handleApplyStroke(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border border-border/60 bg-transparent p-0"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Stroke Width Menu */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowStrokeWidthMenu(!showStrokeWidthMenu)}
                    className={cn(
                        "p-2 rounded flex items-center gap-1 transition-colors",
                        mcBtn
                    )}
                    title="Épaisseur du contour"
                >
                    <span className="font-semibold text-xs">{currentStrokeWidth}px</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {showStrokeWidthMenu && (
                    <div className="absolute top-full left-0 mt-1 w-28 bg-popover text-popover-foreground border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                        {[1, 2, 3, 4, 6, 8, 12].map(w => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => handleApplyStrokeWidth(w)}
                                className={cn(
                                    "w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs cursor-pointer transition-colors",
                                    currentStrokeWidth === w && "font-bold text-primary bg-primary/10"
                                )}
                            >
                                <span>{w} px</span>
                                {currentStrokeWidth === w && <Check className="h-3 w-3 text-primary" />}
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
                    className={cn(
                        "p-2 rounded flex items-center gap-1 transition-colors",
                        mcBtn
                    )}
                    title="Style du contour"
                >
                    <div className="w-5 h-2.5 flex items-center justify-center">
                        {currentStrokeStyle === 'solid' && <div className="w-4 h-0.5 bg-current" />}
                        {currentStrokeStyle === 'dashed' && <div className="w-4 border-t-2 border-dashed border-current" />}
                        {currentStrokeStyle === 'dotted' && <div className="w-4 border-t-2 border-dotted border-current" />}
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
                {showStrokeDashMenu && (
                    <div className="absolute top-full left-0 mt-1 w-36 bg-popover text-popover-foreground border rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                                    "w-full text-left px-3 py-1.5 hover:bg-muted flex items-center justify-between text-xs cursor-pointer transition-colors",
                                    currentStrokeStyle === st.id && "font-bold text-primary bg-primary/10"
                                )}
                            >
                                <span>{st.label}</span>
                                {currentStrokeStyle === st.id && <Check className="h-3 w-3 text-primary" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Separator before text formatting */}
            <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

            {/* Font Family Dropdown - 1:1 Matching Editor.tsx */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowFontMenu(!showFontMenu)}
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border/70 hover:bg-muted/80 text-xs font-medium transition-all shadow-2xs max-w-[140px]",
                        showFontMenu && "bg-muted border-primary/50 ring-1 ring-primary/20",
                        mcBtn
                    )}
                    title={language === 'fr' ? "Changer la police d'écriture" : "Change font family"}
                >
                    <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-left" style={{ fontFamily: activeFont.fontFamily }}>
                        {activeFont.name}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
                </button>

                {showFontMenu && (
                    <div className="absolute top-full left-0 mt-1.5 w-64 max-h-80 overflow-y-auto bg-popover text-popover-foreground border rounded-xl shadow-xl p-1.5 z-50 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b mb-1 flex items-center justify-between">
                            <span>{language === 'fr' ? 'Polices locales' : 'Local fonts'}</span>
                            <span className="text-[9px] font-normal lowercase opacity-70">100% hors-ligne</span>
                        </div>
                        {AVAILABLE_FONTS.map(font => {
                            const isSelected = activeFont.id === font.id
                            return (
                                <button
                                    key={font.id}
                                    type="button"
                                    onClick={() => handleApplyFont(font.fontFamily)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors group cursor-pointer",
                                        isSelected
                                            ? "bg-primary/10 text-primary font-semibold"
                                            : "hover:bg-muted text-foreground"
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div
                                            className="text-[13px] truncate leading-tight font-medium"
                                            style={{ fontFamily: font.fontFamily }}
                                        >
                                            {font.name}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="px-1 py-0.2 rounded bg-muted/80 text-[9px] font-medium shrink-0">
                                                {language === 'fr' ? font.categoryLabelFr : font.categoryLabelEn}
                                            </span>
                                            {font.descriptionFr && (
                                                <span className="truncate opacity-80">
                                                    {language === 'fr' ? font.descriptionFr : font.descriptionEn}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1.5" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Font Size +/- */}
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={() => handleApplyFontSize(-2)}
                    className={cn("p-1.5 rounded transition-colors", mcBtn)}
                    title="Diminuer la taille"
                >
                    <Minus className="h-3 w-3" />
                </button>
                <span className="px-1.5 font-semibold text-xs min-w-[22px] text-center">{currentFontSize}</span>
                <button
                    type="button"
                    onClick={() => handleApplyFontSize(2)}
                    className={cn("p-1.5 rounded transition-colors", mcBtn)}
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
                    "p-2 rounded transition-colors",
                    mcBtn,
                    mcActive(isBold)
                )}
                title="Gras"
            >
                <Bold className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={handleToggleItalic}
                className={cn(
                    "p-2 rounded transition-colors",
                    mcBtn,
                    mcActive(isItalic)
                )}
                title="Italique"
            >
                <Italic className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={handleToggleUnderline}
                className={cn(
                    "p-2 rounded transition-colors",
                    mcBtn,
                    mcActive(isUnderline)
                )}
                title="Souligné"
            >
                <Underline className="h-4 w-4" />
            </button>

            {/* Text Color Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowTextPicker(!showTextPicker)}
                    className={cn(
                        "p-2 rounded flex items-center gap-1 transition-colors relative",
                        mcBtn,
                        showTextPicker && "bg-slate-200 dark:bg-slate-700"
                    )}
                    title="Couleur du texte"
                >
                    <div className="relative">
                        <Type className="h-4 w-4" />
                        <div
                            className="absolute -bottom-1 left-0 right-0 h-1 rounded-sm"
                            style={{ backgroundColor: currentTextColor }}
                        />
                    </div>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </button>

                {showTextPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl p-2.5 z-50 min-w-[240px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b pb-1.5 px-0.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                {language === 'fr' ? 'Couleur du texte' : 'Text Color'}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleApplyTextColor('#1e293b')}
                                className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                            >
                                {language === 'fr' ? 'Automatique' : 'Automatic'}
                            </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {COLOR_PALETTE.map(item => (
                                <button
                                    key={item.color}
                                    type="button"
                                    onClick={() => handleApplyTextColor(item.color)}
                                    className="h-6 w-6 rounded-md border border-border/60 hover:scale-110 transition-transform relative flex items-center justify-center cursor-pointer shadow-2xs"
                                    style={{ backgroundColor: item.color }}
                                    title={language === 'fr' ? item.labelFr : item.labelEn}
                                >
                                    {currentTextColor === item.color && (
                                        <Check className="h-3.5 w-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                            <span>{language === 'fr' ? 'Personnalisée' : 'Custom'}</span>
                            <input
                                type="color"
                                value={currentTextColor.startsWith('#') ? currentTextColor : '#1e293b'}
                                onChange={(e) => handleApplyTextColor(e.target.value)}
                                className="w-5 h-5 rounded cursor-pointer border border-border/60 bg-transparent p-0"
                            />
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
                        "p-2 rounded transition-colors",
                        mcBtn,
                        mcActive(primarySelected?.textAlign === 'left')
                    )}
                    title="Aligner à gauche"
                >
                    <AlignLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => handleApplyTextAlign('center')}
                    className={cn(
                        "p-2 rounded transition-colors",
                        mcBtn,
                        mcActive(primarySelected?.textAlign === 'center' || (!primarySelected?.textAlign && primarySelected?.type === 'shape'))
                    )}
                    title="Centrer"
                >
                    <AlignCenter className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => handleApplyTextAlign('right')}
                    className={cn(
                        "p-2 rounded transition-colors",
                        mcBtn,
                        mcActive(primarySelected?.textAlign === 'right')
                    )}
                    title="Aligner à droite"
                >
                    <AlignRight className="h-4 w-4" />
                </button>
            </div>

            {/* Separator before object ordering and actions */}
            {hasSelection && (
                <>
                    <div className={cn("w-px h-6 my-auto mx-1", isMinecraft ? "bg-[#c8b393] dark:bg-stone-600" : "bg-border")} />

                    {/* Bring to front / Send to back */}
                    <button
                        type="button"
                        onClick={onBringForward}
                        className={cn("p-2 rounded transition-colors", mcBtn)}
                        title="Mettre au premier plan"
                    >
                        <BringToFront className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onSendBackward}
                        className={cn("p-2 rounded transition-colors", mcBtn)}
                        title="Mettre à l'arrière-plan"
                    >
                        <SendToBack className="h-4 w-4" />
                    </button>

                    {/* Duplicate */}
                    <button
                        type="button"
                        onClick={onDuplicateSelected}
                        className={cn("p-2 rounded transition-colors", mcBtn)}
                        title="Dupliquer (Ctrl+D)"
                    >
                        <Copy className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={onDeleteSelected}
                        className="p-2 rounded hover:bg-destructive/15 text-destructive transition-colors cursor-pointer"
                        title="Supprimer (Suppr)"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </>
            )}
        </div>
    )
}

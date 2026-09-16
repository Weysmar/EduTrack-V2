import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    MousePointer,
    Pen,
    Highlighter,
    StickyNote,
    Square,
    ArrowUpRight,
    Eraser,
    Undo2,
    Redo2,
    Eye,
    EyeOff,
    Trash2,
    Check,
    Loader2,
    ChevronDown,
    X,
    FileText
} from 'lucide-react';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';
import {
    AnnotationTool,
    ANNOTATION_COLORS,
    STROKE_WIDTHS
} from '@/types/annotations';

interface AnnotationToolbarProps {
    activeTool: AnnotationTool;
    onSelectTool: (tool: AnnotationTool) => void;
    activeColor: string;
    onSelectColor: (color: string) => void;
    strokeWidth: number;
    onSelectStrokeWidth: (width: number) => void;
    isVisible: boolean;
    onToggleVisibility: () => void;
    canUndo: boolean;
    onUndo: () => void;
    canRedo: boolean;
    onRedo: () => void;
    onClearPage?: () => void;
    onClearAll?: () => void;
    isSaving: boolean;
    lastSaved: Date | null;
    onClose?: () => void;
    currentPage?: number;
    totalPages?: number;
    className?: string;
}

export function AnnotationToolbar({
    activeTool,
    onSelectTool,
    activeColor,
    onSelectColor,
    strokeWidth,
    onSelectStrokeWidth,
    isVisible,
    onToggleVisibility,
    canUndo,
    onUndo,
    canRedo,
    onRedo,
    onClearPage,
    onClearAll,
    isSaving,
    lastSaved,
    onClose,
    currentPage,
    totalPages,
    className
}: AnnotationToolbarProps) {
    const { language } = useLanguage();
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [isWidthPickerOpen, setIsWidthPickerOpen] = useState(false);
    const [isClearMenuOpen, setIsClearMenuOpen] = useState(false);

    const tools: Array<{ id: AnnotationTool; label: string; icon: any }> = [
        { id: 'pointer', label: 'Curseur / Navigation (défiler, zoomer)', icon: MousePointer },
        { id: 'highlighter', label: 'Surligneur fluo', icon: Highlighter },
        { id: 'pen', label: 'Stylo à dessin libre', icon: Pen },
        { id: 'text', label: 'Note texte / Post-it', icon: StickyNote },
        { id: 'rect', label: 'Rectangle / Cadre', icon: Square },
        { id: 'arrow', label: 'Flèche indicatrice', icon: ArrowUpRight },
        { id: 'eraser', label: 'Gomme (cliquer pour effacer)', icon: Eraser }
    ];

    return (
        <div
            className={cn(
                "flex flex-wrap items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl z-30 transition-all",
                className
            )}
        >
            {/* 1. Main Tools */}
            <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-xl border border-border/40">
                {tools.map(tool => {
                    const Icon = tool.icon;
                    const isActive = activeTool === tool.id;
                    return (
                        <button
                            key={tool.id}
                            type="button"
                            onClick={() => onSelectTool(tool.id)}
                            className={cn(
                                "p-1.5 sm:p-2 rounded-lg transition-all relative group flex items-center justify-center",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-xs scale-105"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/80"
                            )}
                            title={tool.label}
                        >
                            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {/* Color dot for active drawing tools */}
                            {isActive && ['pen', 'highlighter', 'text', 'rect', 'arrow'].includes(tool.id) && (
                                <span
                                    className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full ring-1 ring-background"
                                    style={{ backgroundColor: activeColor }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />

            {/* 2. Color Picker Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setIsColorPickerOpen(prev => !prev);
                        setIsWidthPickerOpen(false);
                    }}
                    className="flex items-center gap-1 p-1.5 sm:p-2 rounded-xl border bg-card hover:bg-muted text-foreground transition-all shadow-xs"
                    title="Choisir la couleur"
                >
                    <span
                        className="w-4 h-4 rounded-full border border-black/20 dark:border-white/30 shadow-xs"
                        style={{ backgroundColor: activeColor }}
                    />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {isColorPickerOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsColorPickerOpen(false)}
                        />
                        <div className="absolute top-full mt-2 left-0 z-50 p-2 bg-popover/95 backdrop-blur-md border rounded-xl shadow-2xl grid grid-cols-4 gap-1.5 min-w-[140px] animate-in fade-in zoom-in-95">
                            {ANNOTATION_COLORS.map(c => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => {
                                        onSelectColor(c.value);
                                        setIsColorPickerOpen(false);
                                    }}
                                    className={cn(
                                        "w-6 h-6 rounded-full border transition-transform hover:scale-110 flex items-center justify-center",
                                        activeColor === c.value ? "ring-2 ring-primary ring-offset-2 scale-105" : "border-border"
                                    )}
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                >
                                    {activeColor === c.value && (
                                        <Check className="h-3 w-3 text-white drop-shadow-sm" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* 3. Stroke Width Picker */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setIsWidthPickerOpen(prev => !prev);
                        setIsColorPickerOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2 py-1.5 sm:py-2 rounded-xl border bg-card hover:bg-muted text-foreground text-xs font-semibold transition-all shadow-xs"
                    title="Épaisseur du trait"
                >
                    <div className="flex items-center gap-1">
                        <span
                            className="rounded-full bg-foreground"
                            style={{
                                width: Math.max(strokeWidth * 1.5, 4),
                                height: Math.max(strokeWidth * 1.5, 4)
                            }}
                        />
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {isWidthPickerOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsWidthPickerOpen(false)}
                        />
                        <div className="absolute top-full mt-2 left-0 z-50 p-1.5 bg-popover/95 backdrop-blur-md border rounded-xl shadow-2xl flex flex-col gap-1 min-w-[100px] animate-in fade-in zoom-in-95">
                            {STROKE_WIDTHS.map(w => (
                                <button
                                    key={w.value}
                                    type="button"
                                    onClick={() => {
                                        onSelectStrokeWidth(w.value);
                                        setIsWidthPickerOpen(false);
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-accent transition-colors",
                                        strokeWidth === w.value ? "bg-accent font-bold text-accent-foreground" : "text-foreground"
                                    )}
                                >
                                    <span
                                        className="rounded-full bg-foreground"
                                        style={{ width: w.value * 2, height: w.value * 2 }}
                                    />
                                    <span>{w.label}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <div className="h-4 w-px bg-border/60 mx-0.5 hidden sm:block" />

            {/* 4. History Controls (Undo / Redo) */}
            <div className="flex items-center gap-0.5">
                <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-1.5 sm:p-2 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Annuler (Ctrl+Z)"
                >
                    <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                    type="button"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-1.5 sm:p-2 rounded-lg text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Rétablir (Ctrl+Y)"
                >
                    <Redo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
            </div>

            {/* 5. Visibility Toggle */}
            <button
                type="button"
                onClick={onToggleVisibility}
                className={cn(
                    "p-1.5 sm:p-2 rounded-lg transition-colors",
                    isVisible ? "text-foreground hover:bg-muted" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
                title={isVisible ? "Masquer les annotations" : "Afficher les annotations"}
            >
                {isVisible ? <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            </button>

            {/* 6. Clear Page & Clear All */}
            {(onClearPage || onClearAll) && (
                <button
                    type="button"
                    onClick={() => setIsClearModalOpen(true)}
                    className="p-1.5 sm:p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title={language === 'fr' ? "Effacer les annotations..." : "Clear annotations..."}
                >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
            )}

            {/* 7. Save Status & Page info */}
            <div className="flex items-center gap-1.5 ml-auto pl-1 sm:pl-2 text-[11px] text-muted-foreground">
                {isSaving ? (
                    <span className="flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="hidden md:inline">Enregistrement...</span>
                    </span>
                ) : lastSaved ? (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Check className="h-3 w-3" />
                        <span className="hidden lg:inline">Enregistré</span>
                    </span>
                ) : null}

                {currentPage !== undefined && totalPages !== undefined && (
                    <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">
                        p.{currentPage}/{totalPages}
                    </span>
                )}

                {/* Close Annotations Button */}
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors ml-1 cursor-pointer"
                        title="Fermer la barre d'annotations"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Clear Annotations Modal via Portal (displays completely over the document) */}
            {isClearModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
                        onClick={() => setIsClearModalOpen(false)}
                    />

                    {/* Modal Dialog */}
                    <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 p-5 sm:p-6 space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-foreground">
                                        {language === 'fr' ? "Effacer les annotations" : "Clear annotations"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {totalPages && totalPages > 1
                                            ? (language === 'fr'
                                                ? "Sélectionnez les annotations à effacer :"
                                                : "Select which annotations to clear:")
                                            : (language === 'fr'
                                                ? "Cette action supprimera tous vos tracés et notes sur ce document."
                                                : "This will remove all drawings and notes on this document.")}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsClearModalOpen(false)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Multi-page options */}
                        {totalPages && totalPages > 1 ? (
                            <div className="space-y-2.5 pt-1">
                                {onClearPage && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClearPage();
                                            setIsClearModalOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/60 hover:border-border/80 transition-all text-left cursor-pointer group"
                                    >
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-foreground">
                                                {language === 'fr' ? "Cette page uniquement" : "This page only"}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {language === 'fr'
                                                    ? `Effacer uniquement les annotations de la page ${currentPage || 1}`
                                                    : `Clear annotations on page ${currentPage || 1} only`}
                                            </div>
                                        </div>
                                    </button>
                                )}

                                {onClearAll && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClearAll();
                                            setIsClearModalOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 hover:border-destructive/30 transition-all text-left cursor-pointer group"
                                    >
                                        <div className="h-9 w-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                            <Trash2 className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-destructive">
                                                {language === 'fr' ? "Tout le document (Toutes les pages)" : "Entire document (All pages)"}
                                            </div>
                                            <div className="text-xs text-destructive/80">
                                                {language === 'fr'
                                                    ? `Effacer les annotations sur l'ensemble des ${totalPages} pages`
                                                    : `Clear annotations on all ${totalPages} pages`}
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        ) : null}

                        {/* Actions / Footer */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setIsClearModalOpen(false)}
                                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                {language === 'fr' ? "Annuler" : "Cancel"}
                            </button>
                            {(!totalPages || totalPages <= 1) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onClearAll) onClearAll();
                                        else if (onClearPage) onClearPage();
                                        setIsClearModalOpen(false);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors shadow-xs cursor-pointer"
                                >
                                    {language === 'fr' ? "Effacer toutes les annotations" : "Clear all annotations"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

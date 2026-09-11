import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Check,
    Pencil,
    Edit,
    Loader2,
    Sparkles,
    Trash2,
    Layers,
    CheckSquare,
    FileText,
    Sliders,
    FileDown,
    MoreHorizontal,
    X,
    RotateCcw
} from 'lucide-react';

interface ItemMobileToolbarProps {
    itemType: string;
    isEditMode: boolean;
    setIsEditMode: (val: boolean) => void;
    setIsEditModalOpen: (val: boolean) => void;
    isExtracting: boolean;
    isAIMenuOpen: boolean;
    setIsAIMenuOpen: (val: boolean) => void;
    handleDelete: () => void;
    handleOpenExercise: (mode: 'flashcards' | 'quiz') => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
    handleExportNotePdf?: () => void;
    isExportingNotePdf?: boolean;
    t: any;
}

export function ItemMobileToolbar({
    itemType,
    isEditMode,
    setIsEditMode,
    setIsEditModalOpen,
    isExtracting,
    isAIMenuOpen,
    setIsAIMenuOpen,
    handleDelete,
    handleOpenExercise,
    hasSummary,
    setShowSummary,
    setIsSummaryOptionsOpen,
    handleExportNotePdf,
    isExportingNotePdf,
    t
}: ItemMobileToolbarProps) {
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

    return (
        <>
            {/* FIXED MOBILE BOTTOM BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe">
                <div className="flex items-center justify-around p-2 h-16">
                    {/* 1. Edit / Tools */}
                    {itemType === 'note' ? (
                        <button
                            onClick={() => isEditMode ? setIsEditMode(false) : setIsEditMode(true)}
                            className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:text-foreground touch-manipulation"
                        >
                            {isEditMode ? <Check className="h-6 w-6 text-emerald-500" /> : <Pencil className="h-6 w-6" />}
                            <span className="text-[10px] font-medium">{isEditMode ? (t('common.done') || 'Terminer') : (t('item.edit') || 'Éditer')}</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:text-foreground touch-manipulation"
                        >
                            <Edit className="h-6 w-6" />
                            <span className="text-[10px] font-medium">Éditer</span>
                        </button>
                    )}

                    {/* 2. HD PDF Export (for notes) */}
                    {itemType === 'note' && handleExportNotePdf && (
                        <button
                            onClick={handleExportNotePdf}
                            disabled={isExportingNotePdf}
                            className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:text-foreground touch-manipulation disabled:opacity-50"
                            title="Exporter en PDF Haute Définition"
                        >
                            {isExportingNotePdf ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            ) : (
                                <FileDown className="h-6 w-6 text-primary" />
                            )}
                            <span className="text-[10px] font-medium">PDF HD</span>
                        </button>
                    )}

                    {/* 3. MAIN ACTION: AI (Center, Prominent) */}
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => setIsAIMenuOpen(true)}
                            disabled={isExtracting}
                            className="flex flex-col items-center gap-1 p-2 text-violet-500 active:text-violet-700 touch-manipulation"
                        >
                            {isExtracting ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <Sparkles className="h-6 w-6" />
                            )}
                            <span className="text-[10px] font-medium">IA</span>
                        </button>
                    </div>

                    {/* 4. SAFE MORE OPTIONS (Replaces raw destructive delete) */}
                    <button
                        onClick={() => setIsActionsMenuOpen(true)}
                        className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:text-foreground touch-manipulation"
                        title="Options supplémentaires"
                    >
                        <MoreHorizontal className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Options</span>
                    </button>
                </div>
            </div>

            {/* MOBILE AI BOTTOM SHEET (Controlled by isAIMenuOpen) */}
            {isAIMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setIsAIMenuOpen(false)}
                    />

                    {/* Bottom Sheet Content */}
                    <div className="relative w-full bg-card rounded-t-2xl shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom duration-300 pb-safe space-y-4">
                        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2 opacity-50" />
                        <h3 className="text-lg font-bold text-center mb-4">Que voulez-vous générer ?</h3>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('flashcards');
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Flashcards</div>
                                    <div className="text-xs text-muted-foreground">Pour mémoriser les concepts clés</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('quiz');
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">QCM</div>
                                    <div className="text-xs text-muted-foreground">Testez vos connaissances</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    if (hasSummary) setShowSummary(true);
                                    else setIsSummaryOptionsOpen(true);
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Résumé</div>
                                    <div className="text-xs text-muted-foreground">{hasSummary ? "Voir le résumé existant" : "Synthèse du document"}</div>
                                </div>
                            </button>

                            {hasSummary && (
                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false);
                                        setIsSummaryOptionsOpen(true);
                                    }}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                                >
                                    <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                        <Sliders className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold">Changer de modèle</div>
                                        <div className="text-xs text-muted-foreground">Régénérer avec d'autres options</div>
                                    </div>
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setIsAIMenuOpen(false)}
                            className="w-full py-3 mt-4 text-center font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}

            {/* MOBILE SAFE ACTIONS BOTTOM SHEET */}
            {isActionsMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setIsActionsMenuOpen(false)}
                    />
                    <div className="relative w-full bg-card rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom duration-300 pb-safe space-y-4">
                        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2 opacity-50" />
                        <h3 className="text-base font-bold text-center">Options du document</h3>

                        <div className="space-y-2 pt-2">
                            <button
                                onClick={() => {
                                    setIsActionsMenuOpen(false);
                                    setIsEditModalOpen(true);
                                }}
                                className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-muted/40 hover:bg-muted active:scale-98 transition-all text-sm font-medium"
                            >
                                <Edit className="h-5 w-5 text-muted-foreground" />
                                <span>Modifier les informations</span>
                            </button>

                            {/* Safe Trash Action */}
                            <button
                                onClick={() => {
                                    setIsActionsMenuOpen(false);
                                    setIsConfirmDeleteOpen(true);
                                }}
                                className="flex items-center justify-between w-full p-3.5 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-98 transition-all text-sm font-medium border border-destructive/20"
                            >
                                <div className="flex items-center gap-3">
                                    <Trash2 className="h-5 w-5" />
                                    <div className="text-left">
                                        <div>Mettre à la corbeille</div>
                                        <div className="text-[11px] text-muted-foreground font-normal">Restauration possible à tout moment</div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsActionsMenuOpen(false)}
                            className="w-full py-3 mt-2 text-center font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* SAFE CONFIRMATION MODAL FOR MOVING TO TRASH */}
            {isConfirmDeleteOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setIsConfirmDeleteOpen(false)}
                    />
                    <div className="relative w-full max-w-sm bg-card rounded-2xl p-6 shadow-2xl border animate-in zoom-in-95 duration-200 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                            <RotateCcw className="h-6 w-6" />
                        </div>
                        <div className="text-center space-y-1">
                            <h4 className="text-lg font-bold">Déplacer vers la corbeille ?</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Ce document sera retiré de la liste du cours. Le fichier reste conservé sur le serveur et pourra être restauré en 1 clic depuis la corbeille.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => setIsConfirmDeleteOpen(false)}
                                className="px-4 py-2.5 rounded-xl border bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-all"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => {
                                    setIsConfirmDeleteOpen(false);
                                    handleDelete();
                                }}
                                className="px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium transition-all shadow-sm"
                            >
                                Mettre à la corbeille
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

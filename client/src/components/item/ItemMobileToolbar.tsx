import { useState } from 'react';
import { useLanguage } from '@/components/language-provider';
import { RevisionGenerationMode } from '@/components/GenerateExerciseModal';
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
    Columns,
    BookOpen,
    FileEdit,
    Scale,
    Network
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
    handleOpenExercise: (mode: RevisionGenerationMode) => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
    handleExportNotePdf?: () => void;
    isExportingNotePdf?: boolean;
    onOpenSideBySide?: () => void;
    isSideBySide?: boolean;
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
    onOpenSideBySide,
    isSideBySide,
    t
}: ItemMobileToolbarProps) {
    const { language } = useLanguage();
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
                    <div className="relative w-full max-h-[90vh] overflow-y-auto bg-card rounded-t-2xl shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom duration-300 pb-safe space-y-4">
                        <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-2 opacity-50" />
                        <h3 className="text-lg font-bold text-center mb-4">Que voulez-vous générer ?</h3>

                        <div className="grid grid-cols-1 gap-2.5">
                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('flashcards');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 flex-shrink-0">
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
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                                    <CheckSquare className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">QCM interactif</div>
                                    <div className="text-xs text-muted-foreground">Testez vos connaissances en choix multiple</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('true_false');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 flex-shrink-0">
                                    <Scale className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Questions Vrai / Faux</div>
                                    <div className="text-xs text-muted-foreground">Démêlez le vrai du faux sur le cours</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('cloze');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 flex-shrink-0">
                                    <FileEdit className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Exercice à trous</div>
                                    <div className="text-xs text-muted-foreground">Complétez le texte avec la banque de mots</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('sheet');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Fiche de révision</div>
                                    <div className="text-xs text-muted-foreground">Synthèse structurée, formules, pièges & checklist</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('mindmap');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400 flex-shrink-0">
                                    <Network className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Mind Map IA</div>
                                    <div className="text-xs text-muted-foreground">Visualisez la carte mentale interactive</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false);
                                    handleOpenExercise('summary');
                                }}
                                className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Résumé de cours</div>
                                    <div className="text-xs text-muted-foreground">Synthèse du document</div>
                                </div>
                            </button>

                            {hasSummary && (
                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false);
                                        setShowSummary(true);
                                    }}
                                    className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/30 hover:bg-muted active:scale-98 transition-all border border-dashed"
                                >
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-muted-foreground">Voir le résumé existant</div>
                                        <div className="text-xs text-muted-foreground">Consulter la synthèse déjà générée</div>
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
                            {onOpenSideBySide && (
                                <button
                                    onClick={() => {
                                        setIsActionsMenuOpen(false);
                                        onOpenSideBySide();
                                    }}
                                    className="flex items-center gap-3 w-full p-3.5 rounded-xl bg-muted/40 hover:bg-muted active:scale-98 transition-all text-sm font-medium"
                                >
                                    <Columns className="h-5 w-5 text-primary" />
                                    <div className="text-left">
                                        <div>
                                            {isSideBySide 
                                                ? (language === 'fr' ? "Quitter le mode côte à côte" : "Exit split view") 
                                                : (language === 'fr' ? "Afficher côte à côte" : "Display side-by-side")}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground font-normal">
                                            {isSideBySide 
                                                ? (language === 'fr' ? "Fermer le deuxième document" : "Close the second document") 
                                                : (language === 'fr' ? "Comparer avec un autre document" : "Compare with another document")}
                                        </div>
                                    </div>
                                </button>
                            )}

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
                        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                            <Trash2 className="h-6 w-6" />
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

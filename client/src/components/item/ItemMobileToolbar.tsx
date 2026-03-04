import { cn } from '@/lib/utils';
import { Check, Pencil, Edit, Loader2, Sparkles, Trash2, Layers, CheckSquare, BrainCircuit, FileText } from 'lucide-react';

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
    setIsMindMapModalOpen: (val: boolean) => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
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
    setIsMindMapModalOpen,
    hasSummary,
    setShowSummary,
    setIsSummaryOptionsOpen,
    t
}: ItemMobileToolbarProps) {
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
                            {isEditMode ? <Check className="h-6 w-6" /> : <Pencil className="h-6 w-6" />}
                            <span className="text-[10px] font-medium">{isEditMode ? 'Sauver' : 'Éditer'}</span>
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

                    {/* 2. MAIN ACTION: AI (Center, Prominent) */}
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

                    {/* 3. More Actions (Sheet) */}
                    <button
                        onClick={() => {
                            if (confirm(t('item.delete.confirm'))) handleDelete()
                        }}
                        className="flex flex-col items-center gap-1 p-2 text-muted-foreground active:text-destructive touch-manipulation"
                    >
                        <Trash2 className="h-6 w-6" />
                        <span className="text-[10px] font-medium">Supprimer</span>
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
                                    setIsAIMenuOpen(false)
                                    handleOpenExercise('flashcards')
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
                                    setIsAIMenuOpen(false)
                                    handleOpenExercise('quiz')
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
                                    setIsAIMenuOpen(false)
                                    setIsMindMapModalOpen(true)
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                    <BrainCircuit className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Mind Map</div>
                                    <div className="text-xs text-muted-foreground">Visualisez les relations</div>
                                </div>
                            </button>

                            <button
                                onClick={() => {
                                    setIsAIMenuOpen(false)
                                    if (hasSummary) setShowSummary(true)
                                    else setIsSummaryOptionsOpen(true)
                                }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted active:scale-98 transition-all border"
                            >
                                <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-semibold">Résumé</div>
                                    <div className="text-xs text-muted-foreground">Synthèse du document</div>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setIsAIMenuOpen(false)}
                            className="w-full py-3 mt-4 text-center font-medium text-muted-foreground hover:text-foreground"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

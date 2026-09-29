import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { RevisionGenerationMode } from '@/components/GenerateExerciseModal';
import { TTSControls } from '@/components/TTSControls';
import { ExternalLink, Download, Maximize, Check, Pencil, Edit, Loader2, Sparkles, BrainCircuit, CheckSquare, FileText, Trash2, RefreshCw, Sliders, FileDown, Columns, BookOpen, FileEdit, Scale, Layers, Network, MoreHorizontal, Volume2 } from 'lucide-react';

interface ItemDesktopToolbarProps {
    item: any;
    course: any;
    isText: boolean;
    isMarkdown: boolean;
    isOffice: boolean;
    isPdf?: boolean;
    isBpmn?: boolean;
    API_URL: string;
    officeEngine: 'google' | 'microsoft' | 'local';
    pdfUrl: string | null;
    handleDownload?: () => void;
    handleSyncDrive?: () => void;
    isSyncingDrive?: boolean;
    handleExportNotePdf?: () => void;
    isExportingNotePdf?: boolean;
    setMobileTab: (tab: 'pdf' | 'summary') => void;
    setIsFocusMode: (val: boolean) => void;
    isEditMode: boolean;
    editedContent: string;
    setIsEditMode: (val: boolean) => void;
    setEditedContent: (val: string) => void;
    updateMutation: any;
    setIsEditModalOpen: (val: boolean) => void;
    isExtracting: boolean;
    isAIMenuOpen: boolean;
    setIsAIMenuOpen: (val: boolean) => void;
    handleOpenExercise: (mode: RevisionGenerationMode) => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
    handleDelete: () => void;
    onOpenSideBySide?: () => void;
    isSideBySide?: boolean;
    t: any;
}

export function ItemDesktopToolbar({
    item, course, isText, isMarkdown, isOffice, isPdf, isBpmn, API_URL, officeEngine, pdfUrl, handleDownload,
    handleSyncDrive, isSyncingDrive, handleExportNotePdf, isExportingNotePdf,
    setMobileTab, setIsFocusMode, isEditMode, editedContent, setIsEditMode, setEditedContent, updateMutation,
    setIsEditModalOpen, isExtracting, isAIMenuOpen, setIsAIMenuOpen, handleOpenExercise,
    hasSummary, setShowSummary, setIsSummaryOptionsOpen, handleDelete,
    onOpenSideBySide, isSideBySide, t
}: ItemDesktopToolbarProps) {
    const { language } = useLanguage();
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

    const hasTTS = item.type === 'note' || (item.type === 'resource' && (isText || isMarkdown));
    const hasExportNotePdf = hasTTS && !!handleExportNotePdf;

    // Construct the "open externally" target URL (same logic as before)
    let targetUrl = pdfUrl || '';
    if (item.type === 'link' && item.fileUrl) {
        targetUrl = item.fileUrl;
    } else if (item.storageKey) {
        const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
        const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
        const cleanKey = item.storageKey.startsWith('/') ? item.storageKey : `/${item.storageKey}`;
        const publicRawUrl = `${cleanApiBase}/storage/public${cleanKey}`;

        const isOdt = item.fileName?.toLowerCase().endsWith('.odt') || item.fileData?.toLowerCase().endsWith('.odt');
        if (isOffice) {
            if (officeEngine === 'microsoft' && !isOdt) {
                targetUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicRawUrl)}`;
            } else {
                targetUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicRawUrl)}&embedded=false`;
            }
        } else {
            targetUrl = publicRawUrl;
        }
    }
    const hasUniversalFileActions = !!(item.fileData || item.type === 'resource' || (item.type === 'link' && item.storageKey) || pdfUrl);

    // Fullscreen: hide from this menu when the active viewer already has its own complete
    // enter/exit toggle (PDF, BPMN). Office only has an EXIT button internally, so it still
    // needs this entry point; Image/Text/Generic have no internal toggle at all.
    const showFullscreenAction = !!pdfUrl && !isPdf && !isBpmn;
    // Side-by-side: only PDFViewer renders its own side-by-side control today.
    const showSideBySideAction = !!pdfUrl && !!onOpenSideBySide && !isPdf;

    const hasAnySecondaryAction = hasTTS || hasExportNotePdf || !!handleSyncDrive || hasUniversalFileActions || showFullscreenAction || showSideBySideAction;

    return (
        <div className="hidden md:flex items-center gap-1.5 justify-end flex-shrink-0">
            {/* Edit Button Logic */}
            {item.type === 'note' ? (
                isEditMode ? (
                    <button
                        onClick={() => {
                            if (editedContent !== item.content && !updateMutation.isPending) {
                                updateMutation.mutate(editedContent)
                            }
                            setIsEditMode(false)
                        }}
                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 shadow-xs"
                        title="Terminer l'édition (les modifications sont enregistrées en temps réel)"
                    >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t('common.done') || "Terminer"}</span>
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setIsEditMode(true)
                            setEditedContent(item.content || '')
                        }}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                        title={t('item.edit')}
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                )
            ) : isOffice ? (
                isEditMode ? (
                    <button
                        onClick={() => setIsEditMode(false)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 shadow-xs"
                        title="Fermer l'éditeur Word"
                    >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t('common.done') || "Terminer"}</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setIsEditMode(true)}
                        className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold flex-shrink-0 shadow-xs"
                        title="Modifier le document Word dans EduTrack"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Modifier</span>
                    </button>
                )
            ) : (
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                    title={t('item.edit')}
                >
                    <Edit className="h-4 w-4" />
                </button>
            )}

            {/* AI Generation Menu - Desktop Dropdown */}
            <div className="relative flex-shrink-0">
                <button
                    disabled={isExtracting}
                    onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 active:from-violet-800 active:to-indigo-800 transition-all text-xs font-medium shadow-xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Extraction...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Génération IA</span>
                        </>
                    )}
                </button>

                {/* Desktop Dropdown Menu */}
                {isAIMenuOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsAIMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-56 origin-top-right rounded-lg bg-card shadow-lg ring-1 ring-black/10 border z-50 animate-in fade-in zoom-in-95">
                            <div className="p-1 space-y-0.5">
                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('flashcards')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <Layers className="h-3.5 w-3.5 text-orange-500" />
                                    Flashcards
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('quiz')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                                    QCM interactif
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('true_false')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <Scale className="h-3.5 w-3.5 text-indigo-500" />
                                    Questions Vrai / Faux
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('cloze')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <FileEdit className="h-3.5 w-3.5 text-teal-500" />
                                    Exercice à trous
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('sheet')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                                    Fiche de révision
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('mindmap')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <Network className="h-3.5 w-3.5 text-pink-500" />
                                    Mind Map IA
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('summary')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <FileText className="h-3.5 w-3.5 text-cyan-500" />
                                    Résumé de cours
                                </button>

                                {hasSummary && (
                                    <button
                                        onClick={() => {
                                            setIsAIMenuOpen(false)
                                            setShowSummary(true)
                                        }}
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors border-t mt-1 pt-1.5"
                                    >
                                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                        Voir le résumé existant
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Secondary actions - consolidated into a single "More" menu to keep the toolbar
                to 3 visible controls (Éditer / Génération IA / •••), mirroring the mobile
                bottom-sheet pattern instead of a long row of icon-only buttons. */}
            {hasAnySecondaryAction && (
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 border border-transparent hover:border-border"
                        title={language === 'fr' ? "Plus d'options" : "More options"}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {isMoreMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMoreMenuOpen(false)} />
                            <div className="absolute right-0 top-full mt-1.5 w-64 origin-top-right rounded-lg bg-card shadow-lg ring-1 ring-black/10 border z-50 animate-in fade-in zoom-in-95">
                                <div className="p-1 space-y-0.5">
                                    {hasTTS && (
                                        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-foreground">
                                            <span className="flex items-center gap-2">
                                                <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                {language === 'fr' ? "Lecture audio" : "Read aloud"}
                                            </span>
                                            <TTSControls
                                                text={item.content || item.extractedContent || ''}
                                                lang={item.language || (course?.language === 'en' ? 'en-US' : (course?.language === 'fr' ? 'fr-FR' : 'fr-FR'))}
                                            />
                                        </div>
                                    )}

                                    {hasExportNotePdf && (
                                        <button
                                            onClick={() => { setIsMoreMenuOpen(false); handleExportNotePdf?.() }}
                                            disabled={isExportingNotePdf}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors disabled:opacity-50"
                                        >
                                            {isExportingNotePdf ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <FileDown className="h-3.5 w-3.5 text-primary" />}
                                            Export PDF (HD)
                                        </button>
                                    )}

                                    {handleSyncDrive && (
                                        <button
                                            onClick={() => { setIsMoreMenuOpen(false); handleSyncDrive() }}
                                            disabled={isSyncingDrive}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={cn("h-3.5 w-3.5 text-emerald-500", isSyncingDrive && "animate-spin")} />
                                            {language === 'fr' ? "Synchroniser Drive" : "Sync Drive"}
                                        </button>
                                    )}

                                    {hasUniversalFileActions && targetUrl && (
                                        <a
                                            href={targetUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => setIsMoreMenuOpen(false)}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                            {t('action.openNewTab') || "Ouvrir dans un nouvel onglet"}
                                        </a>
                                    )}

                                    {hasUniversalFileActions && handleDownload && (
                                        <button
                                            onClick={() => { setIsMoreMenuOpen(false); handleDownload() }}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                        >
                                            <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                            {t('file.download') || "Télécharger"}
                                        </button>
                                    )}

                                    {showFullscreenAction && (
                                        <button
                                            onClick={() => {
                                                setIsMoreMenuOpen(false)
                                                setMobileTab('pdf')
                                                setIsFocusMode(true)
                                            }}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                        >
                                            <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
                                            {t('action.fullscreen') || "Plein écran"}
                                        </button>
                                    )}

                                    {showSideBySideAction && (
                                        <button
                                            onClick={() => { setIsMoreMenuOpen(false); onOpenSideBySide?.() }}
                                            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                        >
                                            <Columns className="h-3.5 w-3.5 text-muted-foreground" />
                                            {isSideBySide
                                                ? (language === 'fr' ? "Quitter le mode côte à côte" : "Exit split view")
                                                : (language === 'fr' ? "Afficher côte à côte" : "Display side-by-side")}
                                        </button>
                                    )}

                                    <div className="h-px bg-border my-1 mx-1" />

                                    <button
                                        onClick={() => { setIsMoreMenuOpen(false); handleDelete() }}
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-destructive/10 text-destructive transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {t('action.moveToTrash') || "Mettre à la corbeille"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {!hasAnySecondaryAction && (
                <button
                    onClick={handleDelete}
                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                    title={t('action.moveToTrash') || "Mettre à la corbeille"}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

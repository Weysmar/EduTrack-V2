import { cn } from '@/lib/utils';
import { TTSControls } from '@/components/TTSControls';
import { ExternalLink, Download, Maximize, Check, Pencil, Edit, Loader2, Sparkles, BrainCircuit, CheckSquare, FileText, Trash2, RefreshCw, Sliders } from 'lucide-react';

interface ItemDesktopToolbarProps {
    item: any;
    course: any;
    isText: boolean;
    isMarkdown: boolean;
    isOffice: boolean;
    API_URL: string;
    officeEngine: 'google' | 'microsoft' | 'local';
    pdfUrl: string | null;
    handleDownload?: () => void;
    handleSyncDrive?: () => void;
    isSyncingDrive?: boolean;
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
    handleOpenExercise: (mode: 'flashcards' | 'quiz') => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
    handleDelete: () => void;
    t: any;
}

export function ItemDesktopToolbar({
    item, course, isText, isMarkdown, isOffice, API_URL, officeEngine, pdfUrl, handleDownload,
    handleSyncDrive, isSyncingDrive,
    setMobileTab, setIsFocusMode, isEditMode, editedContent, setIsEditMode, setEditedContent, updateMutation,
    setIsEditModalOpen, isExtracting, isAIMenuOpen, setIsAIMenuOpen, handleOpenExercise,
    hasSummary, setShowSummary, setIsSummaryOptionsOpen, handleDelete, t
}: ItemDesktopToolbarProps) {
    return (
        <div className="hidden md:flex items-center gap-1.5 justify-end flex-shrink-0">
            {/* TTS Controls */}
            {(item.type === 'note' || (item.type === 'resource' && (isText || isMarkdown))) && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <TTSControls
                        text={item.content || item.extractedContent || ''}
                        lang={item.language || (course?.language === 'fr' ? 'fr-FR' : 'en-US')}
                    />
                    <div className="h-4 w-px bg-border mx-0.5" />
                </div>
            )}

            {/* Universal View / Open in New Tab & Download Buttons */}
            {(item.fileData || item.type === 'resource' || pdfUrl) && (
                (() => {
                    // Construct Public URL
                    let targetUrl = pdfUrl || '';
                    if (item.storageKey) {
                        const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
                        const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
                        const cleanKey = item.storageKey.startsWith('/') ? item.storageKey : `/${item.storageKey}`;
                        const publicRawUrl = `${cleanApiBase}/storage/public${cleanKey}`;

                        if (isOffice) {
                            if (officeEngine === 'microsoft') {
                                targetUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicRawUrl)}`;
                            } else {
                                targetUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicRawUrl)}&embedded=false`;
                            }
                        } else {
                            targetUrl = publicRawUrl;
                        }
                    }

                    return (
                        <div className="flex items-center gap-1">
                            {handleSyncDrive && (
                                <button
                                    onClick={handleSyncDrive}
                                    disabled={isSyncingDrive}
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
                                    title="Resynchroniser depuis Google Drive"
                                >
                                    <RefreshCw className={cn("h-4 w-4 text-emerald-500", isSyncingDrive && "animate-spin")} />
                                    <span className="hidden xl:inline">Drive Sync</span>
                                </button>
                            )}
                            {targetUrl && (
                                <a
                                    href={targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
                                    title={t('action.openNewTab') || "Ouvrir dans un nouvel onglet"}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="hidden lg:inline">{t('action.openNewTab') || "Ouvrir"}</span>
                                </a>
                            )}
                            {handleDownload && (
                                <button
                                    onClick={handleDownload}
                                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0 flex items-center gap-1.5 text-xs font-medium"
                                    title={t('file.download') || "Télécharger"}
                                >
                                    <Download className="h-4 w-4" />
                                    <span className="hidden lg:inline">{t('file.download') || "Télécharger"}</span>
                                </button>
                            )}
                            <div className="h-4 w-px bg-border mx-0.5" />
                        </div>
                    );
                })()
            )}

            {/* Universal Fullscreen Button - Available for all items with files */}
            {pdfUrl && (
                <button
                    onClick={() => {
                        setMobileTab('pdf')
                        setIsFocusMode(true)
                    }}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                    title={t('action.fullscreen') || "Plein écran"}
                >
                    <Maximize className="h-4 w-4" aria-hidden="true" />
                </button>
            )}

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
                        <div className="absolute right-0 top-full mt-1.5 w-52 origin-top-right rounded-lg bg-card shadow-lg ring-1 ring-black/10 border z-50 divide-y divide-border animate-in fade-in zoom-in-95">
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('flashcards')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <BrainCircuit className="h-3.5 w-3.5 text-purple-500" />
                                    Générer Flashcards
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('quiz')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <CheckSquare className="h-3.5 w-3.5 text-green-500" />
                                    Générer QCM
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        if (hasSummary) setShowSummary(true)
                                        else setIsSummaryOptionsOpen(true)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                    {hasSummary ? "Voir le résumé" : "Générer un résumé"}
                                </button>

                                {hasSummary && (
                                    <button
                                        onClick={() => {
                                            setIsAIMenuOpen(false)
                                            setIsSummaryOptionsOpen(true)
                                        }}
                                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                                    >
                                        <Sliders className="h-3.5 w-3.5 text-purple-500" />
                                        Changer de modèle / Régénérer
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={handleDelete}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                title={t('action.delete')}
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}

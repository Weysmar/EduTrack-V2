import { cn } from '@/lib/utils';
import { TTSControls } from '@/components/TTSControls';
import { ExternalLink, Maximize, Check, Pencil, Edit, Loader2, Sparkles, BrainCircuit, CheckSquare, FileText, Trash2 } from 'lucide-react';

interface ItemDesktopToolbarProps {
    item: any;
    course: any;
    isText: boolean;
    isMarkdown: boolean;
    isOffice: boolean;
    API_URL: string;
    officeEngine: 'google' | 'microsoft' | 'local';
    pdfUrl: string | null;
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
    setIsMindMapModalOpen: (val: boolean) => void;
    hasSummary: boolean;
    setShowSummary: (val: boolean) => void;
    setIsSummaryOptionsOpen: (val: boolean) => void;
    handleDelete: () => void;
    t: any;
}

export function ItemDesktopToolbar({
    item, course, isText, isMarkdown, isOffice, API_URL, officeEngine, pdfUrl,
    setMobileTab, setIsFocusMode, isEditMode, editedContent, setIsEditMode, setEditedContent, updateMutation,
    setIsEditModalOpen, isExtracting, isAIMenuOpen, setIsAIMenuOpen, handleOpenExercise,
    setIsMindMapModalOpen, hasSummary, setShowSummary, setIsSummaryOptionsOpen, handleDelete, t
}: ItemDesktopToolbarProps) {
    return (
        <div className="hidden md:flex items-center gap-2 justify-end">
            {/* TTS Controls */}
            {(item.type === 'note' || (item.type === 'resource' && (isText || isMarkdown))) && (
                <div className="flex items-center gap-2 flex-shrink-0">
                    <TTSControls
                        text={item.content || item.extractedContent || ''}
                        lang={item.language || (course?.language === 'fr' ? 'fr-FR' : 'en-US')}
                    />
                    <div className="h-6 w-px bg-border mx-1" />
                </div>
            )}

            {/* Universal View/Download Button */}
            {item.type === 'resource' && item.storageKey && (
                (() => {
                    // Construct Public URL
                    const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
                    const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
                    const cleanKey = item.storageKey.startsWith('/') ? item.storageKey : `/${item.storageKey}`;
                    const publicRawUrl = `${cleanApiBase}/storage/public${cleanKey}`;

                    // Determine Target URL for "View in New Tab"
                    let targetUrl = publicRawUrl;
                    if (isOffice) {
                        if (officeEngine === 'microsoft') {
                            targetUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(publicRawUrl)}`;
                        } else {
                            targetUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicRawUrl)}&embedded=false`;
                        }
                    }

                    return (
                        <>
                            <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                                title={t('action.openNewTab') || "Ouvrir dans un nouvel onglet"}
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                            <div className="h-6 w-px bg-border mx-1" />
                        </>
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
                    className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                    title={t('action.fullscreen') || "Plein écran"}
                >
                    <Maximize className="h-5 w-5" aria-hidden="true" />
                </button>
            )}

            {/* Edit Button Logic */}
            {item.type === 'note' ? (
                isEditMode ? (
                    <>
                        <button
                            onClick={() => {
                                setIsEditMode(false)
                                setEditedContent(item.content || '')
                            }}
                            className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground border border-transparent flex-shrink-0"
                            title="Annuler"
                        >
                            {/* lucide-react doesn't export Cancel, it's actually X. But checking imports in parent... */}
                            {/* Need to ensure lucide-react exports it, or fallback to X */}
                            {/* Will fix Cancel to X later if needed, assuming X is imported as Cancel in parent */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <button
                            onClick={() => updateMutation.mutate(editedContent)}
                            disabled={updateMutation.isPending}
                            className="px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-colors flex items-center gap-2 font-medium flex-shrink-0"
                            title="Sauver"
                        >
                            <Check className="h-4 w-4" />
                            <span className="hidden sm:inline">{updateMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}</span>
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => {
                            setIsEditMode(true)
                            setEditedContent(item.content || '')
                        }}
                        className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                        title={t('item.edit')}
                    >
                        <Pencil className="h-5 w-5" />
                    </button>
                )
            ) : (
                <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                    title={t('item.edit')}
                >
                    <Edit className="h-5 w-5" />
                </button>
            )}

            {/* AI Generation Menu - Desktop Dropdown */}
            <div className="relative flex-shrink-0">
                <button
                    disabled={isExtracting}
                    onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-md hover:from-violet-700 hover:to-indigo-700 active:from-violet-800 active:to-indigo-800 transition-all text-sm font-medium shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExtracting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Extraction...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
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
                        <div className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 z-50 divide-y divide-border animate-in fade-in zoom-in-95">
                            <div className="p-1">
                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('flashcards')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <BrainCircuit className="h-4 w-4 text-purple-500" />
                                    Générer Flashcards
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        handleOpenExercise('quiz')
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <CheckSquare className="h-4 w-4 text-green-500" />
                                    Générer QCM
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        setIsMindMapModalOpen(true)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <BrainCircuit className="h-4 w-4 text-blue-500" />
                                    Générer Mind Map
                                </button>

                                <button
                                    onClick={() => {
                                        setIsAIMenuOpen(false)
                                        if (hasSummary) setShowSummary(true)
                                        else setIsSummaryOptionsOpen(true)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    {hasSummary ? "Voir le résumé" : "Générer un résumé"}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={handleDelete}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors flex-shrink-0"
                title={t('action.delete')}
            >
                <Trash2 className="h-5 w-5" />
            </button>
        </div>
    );
}

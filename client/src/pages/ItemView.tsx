
import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { API_URL } from '@/config'
import { useSummary } from '@/hooks/useSummary'
import { SummaryOptionsModal } from '@/components/SummaryOptionsModal'
import { SummaryResultModal } from '@/components/SummaryResultModal'
import { extractText } from '@/lib/extractText'
import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { Dumbbell, FileText, FolderOpen, MonitorPlay, Trash2, Download, ArrowLeft, Maximize, Minimize, Library, Sparkles, BrainCircuit, ExternalLink, Loader2, Edit, Image as ImageIcon, Layers } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSummaryExport } from '@/hooks/useSummaryExport'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { PDFViewer } from '@/components/PDFViewer'
import { OfficeViewer } from '@/components/OfficeViewer'
import { ImageViewer } from '@/components/ImageViewer'
import { GenericFileViewer } from '@/components/GenericFileViewer'
import { TextViewer } from '@/components/TextViewer'
import { EditItemModal } from '@/components/EditItemModal'
import { TTSControls } from '@/components/TTSControls'
import { GenerateMindMapModal } from '@/components/GenerateMindMapModal'

import { itemQueries, courseQueries } from '@/lib/api/queries'
import { Editor } from '@/components/Editor'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Check, X as Cancel } from 'lucide-react'
import { toast } from 'sonner'

export function ItemView() {
    const { courseId, itemId } = useParams()
    const navigate = useNavigate()
    const { t } = useLanguage()

    // Support String IDs (UUIDs)
    const id = itemId || ''

    const { data: item, isLoading: isItemLoading } = useQuery({
        queryKey: ['items', id],
        queryFn: () => itemQueries.getOne(id),
        enabled: !!id
    })

    const { data: course } = useQuery({
        queryKey: ['courses', courseId],
        queryFn: () => courseQueries.getOne(courseId!),
        enabled: !!courseId
    })

    // Derived States
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
    const [exerciseMode, setExerciseMode] = useState<'flashcards' | 'quiz'>('flashcards')
    const [isDeleting, setIsDeleting] = useState(false) // Re-added correctly
    const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false)
    const [showSummary, setShowSummary] = useState(false) // Default to content view
    const [isExtracting, setIsExtracting] = useState(false)
    const [officeEngine, setOfficeEngine] = useState<'google' | 'microsoft' | 'local'>('microsoft') // Lifted state
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isImageFullscreen, setIsImageFullscreen] = useState(false)
    const [isAIMenuOpen, setIsAIMenuOpen] = useState(false) // Manual control for mobile compatibility
    const [mobileTab, setMobileTab] = useState<'pdf' | 'summary'>('pdf')


    // Inline Edit Mode
    const [isEditMode, setIsEditMode] = useState(false)
    const [editedContent, setEditedContent] = useState('')
    const queryClient = useQueryClient()

    // Sync content when item loads
    useEffect(() => {
        if (item?.content) {
            setEditedContent(item.content)
        }
    }, [item])

    const updateMutation = useMutation({
        mutationFn: (content: string) => {
            if (!item?.id) throw new Error('No item ID')
            const formData = new FormData()
            formData.append('content', content)
            return itemQueries.update(String(item.id), formData)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items', id] })
            setIsEditMode(false)
            toast.success('Note updated successfully')
        },
        onError: () => {
            toast.error('Failed to update note')
        }
    })

    // PDF Blob URL Management - Support Local Blob OR Remote URL (Proxy/S3)
    const pdfUrl = useMemo(() => {
        // Warning: item.fileData might need to be fetched separately or converted from Base64 if API sends it specifically?
        // Usually API sends URLs. If item has fileUrl, use it.
        // Assuming item structure from API matches mostly.

        // Use Backend Proxy if storageKey is available (Bypasses CORS/IP blocking)
        if (item?.storageKey) {
            const token = useAuthStore.getState().token; // Assuming authStore has token accessible
            return `${API_URL}/storage/proxy/${item.storageKey}?token=${token}`;
        }

        // Legacy: Direct blob if available (unlikely in API unless specialized)
        // Check if fileUrl is valid
        if (item?.fileUrl) {
            return item.fileUrl;
        }

        return null
    }, [item?.fileUrl, item?.storageKey])


    // Handle Escape key to exit focus mode and image fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isImageFullscreen) {
                    setIsImageFullscreen(false)
                } else {
                    setIsFocusMode(false)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isImageFullscreen])

    // Summary Hook
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating, error: summaryError } = useSummary(id, item?.type || 'note', undefined, courseId)

    // Export Hook
    const { isExporting, handleExportPDF, handleExportDOCX, contentRef } = useSummaryExport(summary, item?.title || "Document")

    // Auto-open summary when loaded
    useEffect(() => {
        if (summary && !showSummary && !isExtracting) {
            setShowSummary(true);
        }
    }, [summary]);

    // Handle Summary Errors
    useEffect(() => {
        if (summaryError) {
            toast.error("Erreur de génération", { description: summaryError });
        }
    }, [summaryError]);

    // File Type Detection (Lifted to Component Scope)
    const filename = item?.fileName || '';
    const ext = filename.split('.').pop()?.toLowerCase() ||
        (item?.fileType ? item.fileType.split('/')[1] : '') ||
        (item?.fileData ? item.fileData.split('.').pop()?.toLowerCase() : '') || '';

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif'].includes(ext);
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext);
    const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
    const isText = ext === 'txt';
    const isMarkdown = ext === 'md';

    if (isItemLoading) return <div className="p-8">Loading...</div>
    // If deleting, show loading to prevent "File not found" glitches
    if (isDeleting) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Suppression en cours...</span>
            </div>
        )
    }

    if (!item) return <div className="p-8">Item not found...</div>

    // ... Handlers ...
    const handleDownload = async () => {
        if (pdfUrl) {
            try {
                const response = await fetch(pdfUrl);
                if (!response.ok) throw new Error("Download failed");
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                triggerDownload(url, item.fileName || 'downloaded-file.pdf');
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (e) {
                console.error("Download error:", e);
                alert("Erreur lors du téléchargement. Vérifiez votre connexion.");
            }
        }
    }

    const triggerDownload = (url: string, name: string) => {
        const a = document.createElement('a')
        a.href = url
        a.download = name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }



    const handleDelete = async () => {
        if (confirm(t('item.delete.confirm'))) {
            setIsDeleting(true)
            if (item && item.id) {
                try {
                    await itemQueries.delete(item.id)
                    // Prefetch/Wait slightly to ensure backend consistency if needed, but navigate should handle it
                    navigate(`/course/${courseId}`)
                } catch (error) {
                    console.error("Deletion failed", error)
                    setIsDeleting(false)
                    alert("Erreur lors de la suppression")
                }
            }
        }
    }

    const handleGenerateSummary = async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) => {
        try {
            let textContent = item.content || ''
            if (item.type === 'resource') {
                if (item.extractedContent) {
                    textContent = item.extractedContent
                } else {
                    // We might not have fileData locally if it's purely remote.
                    // If backend handles extraction, use that.
                    // Or if we can fetch the file content to extract.
                    // Currently extractText runs in browser using pdfjs-dist.
                    // Needs a Blob/File.

                    if (pdfUrl) {
                        setIsExtracting(true)
                        setShowSummary(true)
                        try {
                            const res = await fetch(pdfUrl);
                            const blob = await res.blob();
                            const file = new File([blob], item.fileName || 'file', { type: item.fileType || 'application/pdf' })
                            const extractionResult = await extractText(file)
                            textContent = extractionResult.text
                            if (item.id) await itemQueries.update(item.id, { extractedContent: textContent })
                        } catch (extractionErr: any) {
                            console.error("Extraction error:", extractionErr)
                            setIsExtracting(false)
                            return
                        }
                        setIsExtracting(false)
                    } else {
                        // Fallback?
                    }
                }
            }
            setShowSummary(true)
            await generateSummary(options, textContent)
        } catch (e: any) {
            setIsExtracting(false)
            console.error("Summary Generation Error:", e)
        }
    }

    const handleOpenExercise = async (mode: 'flashcards' | 'quiz') => {
        // Ensure text is extracted if it's a file
        let effectiveContent = item.content || item.extractedContent || '';

        if (item.type === 'resource' && !effectiveContent && pdfUrl) {
            setIsExtracting(true)
            try {
                // Auto-extracting content for exercise generation
                const res = await fetch(pdfUrl);
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

                const blob = await res.blob();
                // Ensure we pass a filename with extension for type detection fallback
                const safeName = item.fileName || (item.fileType?.includes('pdf') ? 'doc.pdf' : 'doc.docx');
                const file = new File([blob], safeName, { type: blob.type || item.fileType || 'application/pdf' })

                const extractionResult = await extractText(file)
                const textContent = extractionResult.text

                if (!textContent || textContent.trim().length < 50) {
                    toast.warning("Le texte extrait est très court. La génération peut échouer.", {
                        description: `Longueur: ${textContent?.trim().length || 0} caractères`
                    });
                }

                try {
                    if (item.id) await itemQueries.update(item.id, { extractedContent: textContent });
                } catch (saveError) {
                    console.warn("Could not save extracted content (non-fatal):", saveError);
                }

                effectiveContent = textContent;

            } catch (e: any) {
                console.error("Auto-extraction failed:", e);
                toast.error("Erreur d'extraction du document", {
                    description: e.message || "Impossible d'extraire le texte du fichier."
                });
                setIsExtracting(false);
                return; // Stop here, don't open modal if extraction failed completely
            } finally {
                setIsExtracting(false)
            }
        }

        // Stricter validation: check trim() and minimum length
        const trimmedContent = effectiveContent.trim();
        if (!trimmedContent || trimmedContent.length < 50) {
            console.warn("Content too short:", trimmedContent.length, "characters");
            if (trimmedContent.length === 0) {
                toast.error("Aucun contenu disponible", {
                    description: "Ajoutez du texte à votre note ou document avant de générer du contenu IA."
                });
            } else {
                toast.error("Contenu trop court pour la génération", {
                    description: `${trimmedContent.length} caractères détectés. Minimum requis: 50 caractères.`
                });
            }
            return;
        }

        console.log("Opening exercise modal with content length:", trimmedContent.length);
        setExerciseMode(mode)
        setIsExerciseModalOpen(true)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-5 duration-300">
            {/* HOISTED Fullscreen Modal REMOVED - Unified with Focus Mode */}

            <SummaryResultModal
                summary={summary}
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
            />
            <SummaryOptionsModal
                isOpen={isSummaryOptionsOpen}
                onClose={() => setIsSummaryOptionsOpen(false)}
                onGenerate={handleGenerateSummary}
                initialOptions={summary?.options}
            />
            {/* Removed redundant item check and fragment */}
            <GenerateExerciseModal
                isOpen={isExerciseModalOpen}
                onClose={() => setIsExerciseModalOpen(false)}
                sourceContent={item.content || item.extractedContent || ''}
                sourceTitle={item.title}
                courseId={String(course?.id || '')}
                itemId={String(item.id || '')}
                initialMode={exerciseMode}
            />

            {/* Header */}
            <div className="min-h-[3rem] h-auto border-b flex flex-col gap-2 px-3 md:px-6 py-2 bg-card sticky top-0 z-40 transition-all">
                <div className="flex items-start md:items-center gap-3 md:gap-4 flex-1 min-w-0 w-full">
                    <button
                        onClick={() => navigate(`/course/${courseId}`)}
                        className="p-2 mt-1 md:mt-0 hover:bg-muted rounded-full transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium hidden sm:inline">{t('course.return')}</span>
                    </button>
                    <div className="h-8 md:h-6 w-px bg-border text-muted-foreground hidden sm:block" />
                    <div className={cn("p-2 rounded-md flex-shrink-0 mt-1 md:mt-0",
                        item.type === 'exercise' && "bg-green-100 text-green-600 dark:bg-green-900/20",
                        item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20",
                        item.type === 'resource' && (isImage ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" : "bg-green-100 text-green-600 dark:bg-green-900/20"),

                    )}>
                        {item.type === 'exercise' && <Dumbbell className="h-5 w-5" />}
                        {item.type === 'note' && <FileText className="h-5 w-5" />}
                        {item.type === 'resource' && (isImage ? <ImageIcon className="h-5 w-5" /> : <FolderOpen className="h-5 w-5" />)}

                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base md:text-xl font-bold truncate leading-snug">{item.title}</h1>
                        <div className="flex flex-col gap-0.5">
                            {course && <p className="text-xs text-muted-foreground truncate leading-relaxed">{course.title}</p>}
                            {item.type === 'resource' && (
                                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                    {(() => {
                                        const ext = (item.fileName?.split('.').pop() || item.fileType?.split('/')[1] || 'PDF').toUpperCase();
                                        const isWord = ['DOC', 'DOCX'].includes(ext);
                                        const isPPT = ['PPT', 'PPTX'].includes(ext);
                                        const isPDF = ['PDF'].includes(ext);
                                        const isExcel = ['XLS', 'XLSX', 'CSV'].includes(ext);

                                        let badgeClass = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                                        let Icon = FileText;

                                        if (isWord) {
                                            badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                                            Icon = FileText;
                                        } else if (isPPT) {
                                            badgeClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
                                            Icon = MonitorPlay;
                                        } else if (isPDF) {
                                            badgeClass = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
                                            Icon = FileText;
                                        } else if (isExcel) {
                                            badgeClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                                            Icon = FileText;
                                        } else if (isImage) {
                                            badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
                                            Icon = ImageIcon;
                                        }

                                        return (
                                            <span className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-transparent", badgeClass)}>
                                                <Icon className="h-3 w-3" />
                                                {ext}
                                            </span>
                                        );
                                    })()}
                                    {item.fileName && (
                                        <span className="opacity-75">{item.fileName}</span>
                                    )}
                                    {item.createdAt && (
                                        <>
                                            <span className="opacity-50 hidden sm:inline">•</span>
                                            <span className="opacity-75 hidden sm:inline">
                                                {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions Toolbar - Desktop Only */}
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
                            // Construct Public URL (Option 3)
                            const apiBase = API_URL.startsWith('http') ? API_URL : `${window.location.origin}${API_URL}`;
                            const cleanApiBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
                            const cleanKey = item.storageKey.startsWith('/') ? item.storageKey : `/${item.storageKey}`;
                            const publicRawUrl = `${cleanApiBase}/storage/public${cleanKey}`;

                            // Determine Target URL for "View in New Tab"
                            let targetUrl = publicRawUrl;
                            if (isOffice) {
                                // Dynamic Engine Link
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
                                        title={t('action.openNewTab')}
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
                            aria-label={t('action.fullscreen')}
                            className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                            title={t('action.fullscreen')}
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
                                    title="Cancel"
                                >
                                    <Cancel className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => updateMutation.mutate(editedContent)}
                                    disabled={updateMutation.isPending}
                                    className="px-3 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-colors flex items-center gap-2 font-medium flex-shrink-0"
                                    title="Save"
                                >
                                    <Check className="h-4 w-4" />
                                    <span className="hidden sm:inline">{updateMutation.isPending ? 'Saving...' : 'Save'}</span>
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
                                                if (summary) setShowSummary(true)
                                                else setIsSummaryOptionsOpen(true)
                                            }}
                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground text-foreground transition-colors"
                                        >
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            {summary ? "Voir le résumé" : "Générer un résumé"}
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
            </div>

            {/* FIXED MOBILE BOTTOM BAR */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe">
                <div className="flex items-center justify-around p-2 h-16">
                    {/* 1. Edit / Tools */}
                    {item.type === 'note' ? (
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
                            // Simple toggle for a "More" sheet potentially, or just use delete for now as placeholder
                            // For now, let's put TTS/Fullscreen here or just Delete?
                            // Let's make "Delete" accessible.
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
                                    if (summary) setShowSummary(true)
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
            {/* Main Content Area */}
            <div className="flex-1 overflow-auto bg-muted/5 flex flex-col p-0 md:p-10 pb-24 md:pb-10">
                <div className={cn("w-full space-y-0 md:space-y-6", showSummary ? "" : (isExcel ? "max-w-none" : "max-w-5xl mx-auto"))}>

                    {/* Metadata Badges - Hidden on mobile if focus mode, or just padded differently? */}
                    {item.type === 'exercise' && item.status && item.difficulty && (
                        <div className="flex gap-2 p-4 md:p-0">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                item.difficulty === 'easy' ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                                    item.difficulty === 'medium' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30" :
                                        "bg-red-100 text-red-700 dark:bg-red-900/30"
                            )}>
                                {t(`diff.${item.difficulty}`)}
                            </span>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                item.status === 'completed' ? "bg-green-100 text-green-700 dark:bg-green-900/30" :
                                    item.status === 'in-progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30" :
                                        "bg-muted text-muted-foreground"
                            )}>
                                {t(`status.${item.status}`)}
                            </span>
                        </div>
                    )}

                    {/* Content Logic: Summary VS Original Content */}
                    <div className={cn(
                        "w-full transition-all",
                        isFocusMode ? "fixed inset-0 z-50 bg-background flex flex-col h-screen" : "space-y-0 md:space-y-6 max-w-5xl mx-auto"
                    )}>

                        {/* Mobile Focus Tab Header */}
                        {isFocusMode && (
                            <div className="md:hidden flex items-center border-b bg-card shrink-0 pt-safe-top">
                                <button
                                    onClick={() => setMobileTab('pdf')}
                                    className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", mobileTab === 'pdf' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
                                >
                                    Document
                                </button>
                                <button
                                    onClick={() => setMobileTab('summary')}
                                    className={cn("flex-1 py-3 text-sm font-medium border-b-2 transition-colors", mobileTab === 'summary' ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
                                >
                                    Résumé
                                </button>
                                <button
                                    onClick={() => { setIsFocusMode(false); setMobileTab('pdf'); }}
                                    className="px-4 border-l bg-muted/50 text-muted-foreground hover:bg-muted"
                                >
                                    <Minimize className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        <div className={cn("flex-1 min-h-0 relative", isFocusMode ? "h-full overflow-hidden" : "block")}>

                            {/* ===== ORIGINAL CONTENT VIEW ===== */}
                            <div className={cn(
                                "w-full transition-all",
                                // Logic: Show if (Standard Mode AND !ShowSummary) OR (FocusMode AND Tab == 'pdf')
                                ((!showSummary && !isFocusMode) || (isFocusMode && mobileTab === 'pdf')) ? "block" : "hidden",
                                isFocusMode ? "h-full overflow-y-auto border-r bg-muted/5 p-0 md:p-4" : "bg-card border-0 md:border md:rounded-xl p-0 min-h-[50vh] shadow-none md:shadow-sm overflow-hidden"
                            )}>

                                {/* PDF VIEWER Integration */}
                                {pdfUrl ? (
                                    <div className={cn(
                                        "border-0 rounded-none overflow-hidden bg-card shadow-none relative w-full",
                                        isFocusMode ? "h-full shadow-sm md:rounded-lg border" : "md:border md:rounded-lg md:shadow-sm"
                                    )}>

                                        {/* ===== DISPLAY LOGIC BASED ON FILE EXTENSION ===== */}
                                        {(() => {
                                            // Variables are now defined at component scope (lines ~100)
                                            // console.log("Detected file type:", { ext, isImage, isOffice, filename }); 

                                            if (isImage) {
                                                return <ImageViewer url={pdfUrl} alt={item.title} className={isFocusMode ? "h-full" : "h-[80vh]"} />;
                                            }

                                            if (isOffice) {
                                                return (
                                                    <OfficeViewer
                                                        url={pdfUrl}
                                                        storageKey={item.storageKey}
                                                        className={isFocusMode ? "h-full" : "h-[60vh] md:h-[80vh]"}
                                                        engine={officeEngine}
                                                        onEngineChange={setOfficeEngine}
                                                    />
                                                );
                                            }
                                            // Office logic ends here, continue to next check

                                            // Text/Markdown files
                                            if (isText || isMarkdown) {
                                                return (
                                                    <TextViewer
                                                        url={pdfUrl}
                                                        fileName={item.fileName}
                                                        isMarkdown={isMarkdown}
                                                        className="min-h-full"
                                                    />
                                                );
                                            }

                                            // Explicitly check for PDF
                                            const isPdf = ext === 'pdf';

                                            if (isPdf) {
                                                return (
                                                    <>
                                                        {/* Desktop: Native Iframe for best performance */}
                                                        <div className={cn("hidden lg:block", isFocusMode ? "h-full" : "h-[80vh]")}>
                                                            <iframe
                                                                src={`${pdfUrl}#view=FitH`}
                                                                title="PDF Document"
                                                                className="w-full h-full border-0 rounded-lg bg-slate-100 dark:bg-slate-900"
                                                                allowFullScreen
                                                            />
                                                        </div>

                                                        {/* Mobile & Tablet: React-PDF Viewer (No more fallback card) */}
                                                        <div className="block lg:hidden">
                                                            <PDFViewer url={pdfUrl} className={isFocusMode ? "h-full" : "h-[60vh] md:h-[80vh]"} />
                                                        </div>
                                                    </>
                                                );
                                            }

                                            // Fallback for Unknown Types
                                            return <GenericFileViewer url={pdfUrl} filename={item.fileName} className={isFocusMode ? "h-full" : "h-[80vh]"} />;
                                        })()}
                                    </div>

                                ) : (item.content || isEditMode) ? (
                                    <div className="w-full h-full">
                                        {item.type === 'note' && isEditMode ? (
                                            <Editor
                                                content={editedContent}
                                                onChange={setEditedContent}
                                                editable={true}
                                                className={isFocusMode ? "h-full" : "min-h-[50vh]"}
                                            />
                                        ) : item.type === 'note' ? (
                                            <div className="w-full max-w-4xl bg-card p-8 rounded-lg">
                                                <ReactMarkdown
                                                    className="prose dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-lg prose-p:leading-relaxed prose-li:text-lg"
                                                    components={{
                                                        h1: ({ children }) => <h1 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mb-6 border-b pb-4 mt-2">{children}</h1>,
                                                        h2: ({ children }) => <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-300 mt-10 mb-4">{children}</h2>,
                                                        h3: ({ children }) => <h3 className="text-xl font-semibold text-blue-400 dark:text-blue-200 mt-8 mb-3">{children}</h3>,
                                                        ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                                                        li: ({ children }) => <li className="marker:text-primary">{children}</li>,
                                                    }}
                                                >
                                                    {item.content || ''}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="w-full max-w-4xl bg-card p-8 rounded-lg">
                                                <ReactMarkdown className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                                                    {item.content || ''}
                                                </ReactMarkdown>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <div className="text-center text-muted-foreground italic">
                                            {t('item.noContent')}
                                        </div>
                                        {item.type === 'note' && (
                                            <button
                                                onClick={() => {
                                                    setIsEditMode(true)
                                                    setEditedContent('')
                                                }}
                                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                <span>{t('item.startWriting')}</span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* File Attachment - Always show for content view, even if PDF is shown (for download) */}
                                {(!isFocusMode && (item.fileData || item.type === 'resource')) && (
                                    <div className="mt-8 border-t pt-6">
                                        <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-between group hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-background rounded-md border">
                                                    <FolderOpen className="h-8 w-8 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-base">{item.fileName || t('file.attached')}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {item.fileSize ? `${(item.fileSize / 1024).toFixed(1)} KB` : t('file.unknownSize')}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleDownload}
                                                className="px-4 py-2 hover:bg-background rounded-md border border-transparent hover:border-border transition-all flex items-center gap-2"
                                            >
                                                <Download className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                                                <span>{t('file.download')}</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ===== SUMMARY VIEW ===== */}
                            {showSummary && (
                                <div className={cn(
                                    // Logic: Show if (Standard Mode) OR (FocusMode AND Tab == 'summary')
                                    (isFocusMode && mobileTab !== 'summary') ? "hidden" : "block w-full",
                                    isFocusMode ? "h-full overflow-y-auto" : ""
                                )}>
                                    <div className={cn(
                                        "bg-card overflow-hidden animate-in fade-in duration-300 flex flex-col",
                                        isFocusMode ? "h-full rounded-none border-l" : "border rounded-xl shadow-sm min-h-[50vh]"
                                    )}>
                                        {isSummaryGenerating && (
                                            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-200">
                                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                                <p className="text-lg font-medium animate-pulse">{t('summary.generating') || "Génération du résumé..."}</p>
                                                <p className="text-sm text-muted-foreground mt-2">Cela peut prendre quelques secondes</p>
                                            </div>
                                        )}
                                        {/* Summary Header / Toolbar inside the card */}
                                        <div className="border-b bg-muted/30 p-4 flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-10 supports-[backdrop-filter]:bg-card/60">
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-2 text-primary font-semibold">
                                                    <FileText className="h-5 w-5" />
                                                    <span>{t('summary.generated')}</span>
                                                </div>
                                                {summary && (
                                                    <div className="flex gap-2 text-xs">
                                                        {summary.options?.compression && (
                                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                                                {Math.round(summary.options.compression * 100)}%
                                                            </span>
                                                        )}
                                                        {summary.stats?.summaryWordCount && (
                                                            <span className="text-muted-foreground">
                                                                {summary.stats.summaryWordCount} {t('summary.stats.words')}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setMobileTab('summary')
                                                        setIsFocusMode(!isFocusMode)
                                                    }}
                                                    className={cn(
                                                        "text-xs border px-3 py-1.5 rounded-md transition-all flex items-center gap-2",
                                                        isFocusMode
                                                            ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                                            : "hover:bg-background border-transparent hover:border-border text-muted-foreground"
                                                    )}
                                                    title={isFocusMode ? t('focus.exit.tooltip') : t('focus.enter.tooltip')}
                                                >
                                                    {isFocusMode ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                                    <span className="hidden sm:inline">{isFocusMode ? t('focus.exit') : t('focus.enter')}</span>
                                                </button>
                                                <div className="w-px h-6 bg-border mx-1" />
                                                <button
                                                    onClick={handleExportPDF}
                                                    disabled={isExporting}
                                                    className="text-xs hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-transparent px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-muted-foreground"
                                                    title={t('export.pdf')}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    <span className="hidden sm:inline">PDF</span>
                                                </button>
                                                <button
                                                    onClick={handleExportDOCX}
                                                    disabled={isExporting}
                                                    className="text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-muted-foreground"
                                                    title={t('export.word')}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    <span className="hidden sm:inline">DOCX</span>
                                                </button>
                                                <div className="w-px h-6 bg-border mx-1" />
                                                <button
                                                    onClick={() => setIsSummaryOptionsOpen(true)}
                                                    className="text-xs hover:bg-background border border-transparent hover:border-border px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-muted-foreground"
                                                >
                                                    <MonitorPlay className="h-4 w-4" />
                                                    <span>{t('summary.regenerate')}</span>
                                                </button>
                                                <div className="w-px h-6 bg-border mx-1" />
                                                <button
                                                    onClick={() => setShowSummary(false)}
                                                    className="text-xs hover:bg-background border border-transparent hover:border-border px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-muted-foreground"
                                                    title={t('summary.viewOriginal')}
                                                >
                                                    <FileText className="h-4 w-4" />
                                                    <span>Voir le contenu</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Summary Body */}
                                        <div className="flex-1 overflow-y-auto w-full">
                                            <div className={cn(
                                                "flex justify-center bg-white dark:bg-zinc-950 transition-all",
                                                isFocusMode ? "p-8 md:p-16 min-h-full" : "p-8 md:p-16"
                                            )}>
                                                {isSummaryGenerating || isExtracting ? (
                                                    <div className="space-y-6 animate-pulse w-full max-w-4xl">
                                                        <div className="h-10 bg-muted rounded w-3/4 mb-10"></div>
                                                        <div className="space-y-4">
                                                            <div className="h-4 bg-muted rounded w-full"></div>
                                                            <div className="h-4 bg-muted rounded w-full"></div>
                                                            <div className="h-4 bg-muted rounded w-5/6"></div>
                                                        </div>
                                                        <div className="space-y-4 mt-10">
                                                            <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                                                            <div className="h-4 bg-muted rounded w-full"></div>
                                                            <div className="h-4 bg-muted rounded w-full"></div>
                                                            <div className="h-4 bg-muted rounded w-4/5"></div>
                                                        </div>
                                                        <p className="mt-12 text-sm text-center text-muted-foreground animate-pulse">
                                                            {isExtracting ? "Lecture du document en cours..." : t('summary.generating')}
                                                        </p>
                                                    </div>
                                                ) : (summary && summary.content) ? (
                                                    <div ref={contentRef} className="w-full max-w-4xl bg-white dark:bg-zinc-950 p-8 rounded-lg">
                                                        <ReactMarkdown
                                                            components={{
                                                                h1: ({ children }) => <h1 className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 mb-6 border-b pb-4 mt-2">{children}</h1>,
                                                                h2: ({ children }) => <h2 className="text-2xl font-bold text-blue-500 dark:text-blue-300 mt-10 mb-4">{children}</h2>,
                                                                h3: ({ children }) => <h3 className="text-xl font-semibold text-blue-400 dark:text-blue-200 mt-8 mb-3">{children}</h3>,
                                                                p: ({ children }) => <p className="text-lg leading-8 text-slate-700 dark:text-slate-300 mb-4">{children}</p>,
                                                                ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                                                                li: ({ children }) => <li className="text-lg text-slate-700 dark:text-slate-300">{children}</li>,
                                                                strong: ({ children }) => <strong className="font-bold text-slate-900 dark:text-slate-100">{children}</strong>,
                                                                input: (props) => {
                                                                    // Ensure safe boolean for checked
                                                                    const isChecked = !!props.checked;
                                                                    return (
                                                                        <div className="flex items-center gap-2 my-1">
                                                                            <input type="checkbox" checked={isChecked} readOnly className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                                                            <span className="text-lg text-slate-700 dark:text-slate-300">
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                }
                                                            }}
                                                        >
                                                            {typeof summary.content === 'string'
                                                                ? summary.content.replace(/•\s?/g, '\n- ')
                                                                : ''}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
                                                        {summaryError ? (
                                                            <>
                                                                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full">
                                                                    <AlertCircle className="h-6 w-6" />
                                                                </div>
                                                                <div className="text-center max-w-md">
                                                                    <p className="font-semibold text-foreground mb-1">Erreur de génération</p>
                                                                    <p className="text-sm">{summaryError}</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <p>{t('summary.error.display')}</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                </div >
            </div >

            <EditItemModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                item={item}
                courseId={courseId || ""}
            />

            <GenerateMindMapModal
                isOpen={isMindMapModalOpen}
                onClose={() => setIsMindMapModalOpen(false)}
                courseId={courseId}
                initialSelectedNotes={item.type === 'note' ? [item] : []}
                initialSelectedFile={item.type === 'resource' ? item : undefined}
            />
        </div >
    )
}


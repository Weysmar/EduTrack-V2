
import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { API_URL } from '@/config'
import { useSummary } from '@/hooks/useSummary'
import { SummaryOptionsModal } from '@/components/SummaryOptionsModal'
import { SummaryResultModal } from '@/components/SummaryResultModal'
import { extractText } from '@/lib/extractText'
import { downloadDriveFileById } from '@/lib/drive/googleDriveService'
import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { Dumbbell, FileText, FolderOpen, MonitorPlay, Trash2, Download, ArrowLeft, Maximize, Minimize, Library, Sparkles, BrainCircuit, ExternalLink, Loader2, Edit, Image as ImageIcon, Layers } from 'lucide-react'
import { ItemDesktopToolbar } from '@/components/item/ItemDesktopToolbar'
import { ItemMobileToolbar } from '@/components/item/ItemMobileToolbar'
import { ItemMarkdownDisplay } from '@/components/item/ItemMarkdownDisplay'
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

import { itemQueries, courseQueries } from '@/lib/api/queries'
import { Editor } from '@/components/Editor'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Check, X as Cancel } from 'lucide-react'
import { toast } from 'sonner'

export function ItemView() {
    const { courseId, itemId } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { t, language } = useLanguage()

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
    const [exerciseContent, setExerciseContent] = useState('')
    const [isDeleting, setIsDeleting] = useState(false) // Re-added correctly
    const [showSummary, setShowSummary] = useState(false) // Default to content view
    const [isExtracting, setIsExtracting] = useState(false)
    const [officeEngine, setOfficeEngine] = useState<'google' | 'microsoft' | 'local'>('microsoft') // Lifted state
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isImageFullscreen, setIsImageFullscreen] = useState(false)
    const [isAIMenuOpen, setIsAIMenuOpen] = useState(false) // Manual control for mobile compatibility
    const [mobileTab, setMobileTab] = useState<'pdf' | 'summary'>('pdf')


    // Inline Edit Mode
    const [isEditMode, setIsEditMode] = useState(searchParams.get('edit') === 'true')
    const [editedContent, setEditedContent] = useState('')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [isSyncingDrive, setIsSyncingDrive] = useState(false)
    const queryClient = useQueryClient()

    // Extract driveFileId from tags if item came from Google Drive
    const driveTag = item?.tags?.find((t: string) => t.startsWith('gdrive:'));
    const driveFileId = driveTag ? driveTag.replace('gdrive:', '') : null;

    // Sync content when item loads or if opened in edit mode
    useEffect(() => {
        if (item) {
            if (!isEditMode) {
                setEditedContent(item.content || '')
            } else if (searchParams.get('edit') === 'true') {
                setEditedContent(item.content || '')
            }
            if (item.extractedContent) {
                setExerciseContent(item.extractedContent)
            }
        }
    }, [item, isEditMode, searchParams])

    const pendingContentRef = useRef<string>(editedContent)
    pendingContentRef.current = editedContent

    const updateMutation = useMutation({
        mutationFn: (content: string) => {
            if (!item?.id) throw new Error('No item ID')
            const formData = new FormData()
            formData.append('content', content)
            return itemQueries.update(String(item.id), formData)
        },
        onMutate: () => {
            setSaveStatus('saving')
        },
        onSuccess: (_data, savedContent) => {
            // Update React Query cache directly so UI stays smooth without jarring full-page refetches
            queryClient.setQueryData(['items', id], (old: any) => old ? { ...old, content: savedContent } : old)
            setSaveStatus('saved')
        },
        onError: () => {
            setSaveStatus('error')
            toast.error(t('common.error') || 'Erreur de synchronisation')
        }
    })

    // Real-time dynamic auto-save (Google Docs style, 800ms debounce)
    useEffect(() => {
        if (!isEditMode) return
        if (editedContent === item?.content) return

        // Immediately signal saving as soon as typing happens
        setSaveStatus('saving')

        const timer = setTimeout(() => {
            updateMutation.mutate(editedContent)
        }, 800) // 800ms debounce

        return () => clearTimeout(timer)
    }, [editedContent, isEditMode, item?.content])

    // Immediate flush on page leave
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isEditMode && pendingContentRef.current && pendingContentRef.current !== item?.content) {
                const formData = new FormData()
                formData.append('content', pendingContentRef.current)
                itemQueries.update(String(item.id), formData)
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isEditMode, item?.content, item?.id])

    // Handle Google Drive Re-sync
    const handleSyncDrive = async () => {
        if (!driveFileId || !item?.id) return;
        setIsSyncingDrive(true);
        const toastId = toast.loading(
            language === 'fr' 
                ? "Synchronisation depuis Google Drive..." 
                : "Syncing from Google Drive..."
        );

        try {
            const freshFile = await downloadDriveFileById(driveFileId, item.fileName);
            const formData = new FormData();
            formData.append('file', freshFile);
            formData.append('fileName', freshFile.name);
            formData.append('fileType', freshFile.type);
            formData.append('fileSize', freshFile.size.toString());
            // Reset extractedContent so fresh content will be re-extracted
            formData.append('extractedContent', '');

            await itemQueries.update(String(item.id), formData);
            await queryClient.invalidateQueries({ queryKey: ['items', id] });

            toast.success(
                language === 'fr'
                    ? "Document mis à jour depuis Google Drive !"
                    : "Document updated from Google Drive!",
                { id: toastId }
            );
        } catch (syncErr: any) {
            console.error("Drive sync error:", syncErr);
            toast.error(
                language === 'fr'
                    ? "Échec de la synchronisation Drive"
                    : "Drive sync failed",
                {
                    id: toastId,
                    description: syncErr.message || "Vérifiez vos autorisations Google Drive."
                }
            );
        } finally {
            setIsSyncingDrive(false);
        }
    };

    const token = useAuthStore(state => state.token);

    // PDF Blob URL Management - Support Local Blob OR Remote URL (Proxy/S3)
    const pdfUrl = useMemo(() => {
        // Use Backend Proxy if storageKey is available (Bypasses CORS/IP blocking)
        if (item?.storageKey) {
            return `${API_URL}/storage/proxy/${item.storageKey}?token=${token}`;
        }

        // Check if fileUrl is valid
        if (item?.fileUrl) {
            return item.fileUrl;
        }

        return null
    }, [item?.fileUrl, item?.storageKey, token])


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
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating, error: summaryError, remove } = useSummary(id, item?.type || 'note', undefined, courseId)

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
        if (!url) return;

        // Strict URI validation and parsing to break the taint chain
        let safeUrl: string;
        try {
            const parsed = new URL(url, window.location.origin);
            // Protocol Allowlist
            const allowedProtocols = ['https:', 'http:', 'blob:', 'data:'];
            if (!allowedProtocols.includes(parsed.protocol)) {
                console.error("Blocked unsafe download protocol:", parsed.protocol);
                return;
            }
            // Prevent JavaScript protocol (double check)
            if (parsed.protocol === 'javascript:') return;
            
            safeUrl = parsed.toString();
        } catch (e) {
            console.error("Invalid download URL format");
            return;
        }

        const a = document.createElement('a');
        // Explicitly set attributes to avoid direct property assignment that might be flagged
        a.setAttribute('href', safeUrl);
        a.setAttribute('download', (name || 'download').replace(/[<>:"/\\|?*]/g, '_'));
        a.setAttribute('rel', 'noopener noreferrer');
        a.style.display = 'none';
        
        // Append, click, and remove in a single stable cycle
        document.body.appendChild(a);
        try {
            a.click();
        } finally {
            document.body.removeChild(a);
        }
    }



    const handleDelete = async () => {
        if (confirm(t('item.delete.confirm'))) {
            setIsDeleting(true)
            if (item && item.id) {
                try {
                    await itemQueries.delete(item.id)
                    // Prefetch/Wait slightly to ensure backend consistency if needed, but navigate should handle it
                    navigate(`/edu/course/${courseId}`)
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
            let textContent = exerciseContent || item.extractedContent || item.content || ''
            if (item.type === 'resource') {
                if (!textContent) {
                    if (pdfUrl) {
                        setIsExtracting(true)
                        setShowSummary(true)
                        try {
                            const res = await fetch(pdfUrl);
                            const blob = await res.blob();
                            const safeName = item.fileName || (item.fileType?.includes('pdf') ? 'doc.pdf' : 'doc.docx');
                            const file = new File([blob], safeName, { type: blob.type || item.fileType || 'application/pdf' })
                            const extractionResult = await extractText(file)
                            textContent = extractionResult.text
                            setExerciseContent(textContent)
                            if (item.id) {
                                await itemQueries.update(item.id, { extractedContent: textContent })
                                queryClient.setQueryData(['items', id], (old: any) => old ? { ...old, extractedContent: textContent } : old)
                            }
                        } catch (extractionErr: any) {
                            console.error("Extraction error:", extractionErr)
                            setIsExtracting(false)
                            return
                        }
                        setIsExtracting(false)
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
        let effectiveContent = exerciseContent || item.extractedContent || item.content || '';

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

                effectiveContent = textContent;
                setExerciseContent(textContent);

                try {
                    if (item.id) {
                        await itemQueries.update(item.id, { extractedContent: textContent });
                        queryClient.setQueryData(['items', id], (old: any) => old ? { ...old, extractedContent: textContent } : old);
                    }
                } catch (saveError) {
                    console.warn("Could not save extracted content (non-fatal):", saveError);
                }

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
        const trimmedContent = (effectiveContent || exerciseContent).trim();
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
        setExerciseContent(trimmedContent);
        setExerciseMode(mode);
        setIsExerciseModalOpen(true);
    }

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-5 duration-300">
            {/* HOISTED Fullscreen Modal REMOVED - Unified with Focus Mode */}

            <SummaryResultModal
                summary={summary}
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
                onDelete={() => {
                    remove()
                    setShowSummaryModal(false)
                }}
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
                sourceContent={exerciseContent || item.extractedContent || item.content || ''}
                sourceTitle={item.title}
                courseId={String(course?.id || '')}
                itemId={String(item.id || '')}
                initialMode={exerciseMode}
            />

            {/* Header */}
            <div className="border-b flex flex-col md:flex-row md:items-center justify-between gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-card sticky top-0 z-40 transition-all shadow-xs">
                <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => navigate(`/edu/course/${courseId}`)}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0 text-xs font-medium"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline">{t('course.return')}</span>
                    </button>
                    <div className="h-5 w-px bg-border hidden sm:block flex-shrink-0" />
                    <div className={cn("p-1.5 rounded-lg flex-shrink-0",
                        item.type === 'exercise' && "bg-green-100 text-green-600 dark:bg-green-900/20",
                        item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20",
                        item.type === 'resource' && (isImage ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" : "bg-green-100 text-green-600 dark:bg-green-900/20"),
                    )}>
                        {item.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                        {item.type === 'note' && <FileText className="h-4 w-4" />}
                        {item.type === 'resource' && (isImage ? <ImageIcon className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm md:text-base font-bold truncate leading-tight">{item.title}</h1>
                            {isEditMode && (
                                <div className={cn(
                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all shadow-xs border animate-in fade-in",
                                    saveStatus === 'saving' && "bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                                    saveStatus === 'saved' && "bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
                                    saveStatus === 'error' && "bg-red-50/80 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
                                    saveStatus === 'idle' && "bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                )}>
                                    {saveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />}
                                    {(saveStatus === 'saved' || saveStatus === 'idle') && <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
                                    {saveStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />}
                                    <span>
                                        {saveStatus === 'saving' ? (t('common.saving') || "Enregistrement...") :
                                         saveStatus === 'error' ? (t('common.error') || "Erreur de synchronisation") :
                                         (t('common.saved') || "Enregistré")}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                            {course && <span className="truncate">{course.title}</span>}
                            {item.type === 'resource' && (
                                <>
                                    {course && <span>•</span>}
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
                                            <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider", badgeClass)}>
                                                <Icon className="h-2.5 w-2.5" />
                                                {ext}
                                            </span>
                                        );
                                    })()}
                                    {item.fileName && (
                                        <span className="opacity-75 truncate max-w-[200px]">{item.fileName}</span>
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
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile quick Open in new tab button */}
                    {item.type === 'resource' && pdfUrl && (
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                            title={t('action.openNewTab') || "Ouvrir dans un nouvel onglet"}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                </div>

                <ItemDesktopToolbar
                    item={item}
                    course={course}
                    isText={isText}
                    isMarkdown={isMarkdown}
                    isOffice={!!isOffice}
                    API_URL={API_URL}
                    officeEngine={officeEngine}
                    pdfUrl={pdfUrl}
                    handleDownload={handleDownload}
                    handleSyncDrive={driveFileId ? handleSyncDrive : undefined}
                    isSyncingDrive={isSyncingDrive}
                    setMobileTab={setMobileTab}
                    setIsFocusMode={setIsFocusMode}
                    isEditMode={!!isEditMode}
                    editedContent={editedContent}
                    setIsEditMode={setIsEditMode}
                    setEditedContent={setEditedContent}
                    updateMutation={updateMutation}
                    setIsEditModalOpen={setIsEditModalOpen}
                    isExtracting={isExtracting}
                    isAIMenuOpen={isAIMenuOpen}
                    setIsAIMenuOpen={setIsAIMenuOpen}
                    handleOpenExercise={handleOpenExercise}
                    hasSummary={!!summary}
                    setShowSummary={setShowSummary}
                    setIsSummaryOptionsOpen={setIsSummaryOptionsOpen}
                    handleDelete={handleDelete}
                    t={t}
                />
            </div>

            <ItemMobileToolbar
                itemType={item.type || 'note'}
                isEditMode={isEditMode}
                setIsEditMode={setIsEditMode}
                setIsEditModalOpen={setIsEditModalOpen}
                isExtracting={isExtracting}
                isAIMenuOpen={isAIMenuOpen}
                setIsAIMenuOpen={setIsAIMenuOpen}
                handleDelete={handleDelete}
                handleOpenExercise={handleOpenExercise}
                hasSummary={!!summary}
                setShowSummary={setShowSummary}
                setIsSummaryOptionsOpen={setIsSummaryOptionsOpen}
                t={t}
            />
            {/* Main Content Area */}
            <div className={cn(
                "flex-1 overflow-auto bg-muted/5 flex flex-col",
                item.type === 'resource' 
                    ? "p-0 md:p-3 pb-20 md:pb-3" 
                    : "px-0 md:px-8 pt-0 pb-24 md:pb-8"
            )}>
                <div className={cn(
                    "w-full h-full",
                    showSummary ? "" : (item.type === 'resource' ? "max-w-none" : "max-w-5xl mx-auto")
                )}>

                    {/* Metadata Badges - Hidden on mobile if focus mode, or just padded differently? */}
                    {item.type === 'exercise' && item.status && item.difficulty && (
                        <div className="flex gap-2 p-4 md:p-0 mb-4">
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
                        isFocusMode ? "fixed inset-0 z-50 bg-background flex flex-col h-screen" : "max-w-5xl mx-auto"
                    )}>
                        <div className={cn("flex-1 min-h-0 relative", isFocusMode ? "h-full overflow-hidden" : "block")}>

                            {/* ===== ORIGINAL CONTENT VIEW ===== */}
                            <div className={cn(
                                "w-full transition-all",
                                // Logic: Show if (Standard Mode AND !ShowSummary) OR (FocusMode AND Tab == 'pdf')
                                ((!showSummary && !isFocusMode) || (isFocusMode && mobileTab === 'pdf')) ? "block" : "hidden",
                                isFocusMode 
                                    ? "h-full overflow-y-auto border-r bg-muted/5 p-0 md:p-4" 
                                    : (item.type === 'note'
                                        ? "p-0 min-h-[50vh]"
                                        : "bg-card border-0 md:border md:rounded-xl p-0 min-h-[50vh] shadow-none md:shadow-sm")
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
                                                if (/^\s*(javascript|vbscript):/i.test(pdfUrl)) return null;
                                                return <ImageViewer url={pdfUrl} alt={item.title} className={isFocusMode ? "h-full" : "h-[80vh]"} />;
                                            }

                                            if (isOffice) {
                                                if (/^\s*(javascript|vbscript):/i.test(pdfUrl)) return null;
                                                return (
                                                    <OfficeViewer
                                                        url={pdfUrl}
                                                        storageKey={item.storageKey}
                                                        className={isFocusMode ? "h-full" : "h-[60vh] md:h-[80vh]"}
                                                        engine={officeEngine}
                                                        onEngineChange={setOfficeEngine}
                                                        onExitFocusMode={isFocusMode ? () => setIsFocusMode(false) : undefined}
                                                    />
                                                );
                                            }
                                            // Office logic ends here, continue to next check

                                            // Text/Markdown files
                                            if (isText || isMarkdown) {
                                                if (/^\s*(javascript|vbscript):/i.test(pdfUrl)) return null;
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
                                                        {/* Unified PDF Viewer with Native Iframe and Focus Mode */}
                                                        {/^\s*(javascript|vbscript):/i.test(pdfUrl) ? null : (
                                                            <PDFViewer
                                                                url={pdfUrl}
                                                                className={isFocusMode ? "h-full" : "h-[75vh] md:h-[80vh]"}
                                                                isFocusMode={isFocusMode}
                                                                onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                                                                onExitFocusMode={() => setIsFocusMode(false)}
                                                            />
                                                        )}
                                                    </>
                                                );
                                            }

                                            // Fallback for Unknown Types
                                            if (/^\s*(javascript|vbscript):/i.test(pdfUrl)) return null;
                                            return <GenericFileViewer url={pdfUrl} filename={item.fileName} className={isFocusMode ? "h-full" : "h-[80vh]"} />;
                                        })()}
                                    </div>

                                ) : (item.content || isEditMode) ? (
                                    <div className="w-full h-full">
                                        {item.type === 'note' ? (
                                            <Editor
                                                content={isEditMode ? editedContent : (item.content || '')}
                                                onChange={isEditMode ? setEditedContent : undefined}
                                                editable={isEditMode}
                                                className={isFocusMode ? "h-full" : "min-h-[50vh]"}
                                            />
                                        ) : (
                                            <ItemMarkdownDisplay content={item.content || ''} isSummary={false} className="whitespace-pre-wrap" />
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
                                                    <div ref={contentRef} className="w-full max-w-4xl bg-white dark:bg-zinc-950 p-8 rounded-lg flex justify-start">
                                                        <ItemMarkdownDisplay content={summary.content || ''} isSummary={true} className="!p-0 !bg-transparent w-full" />
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
        </div>
    )
}



import { Fragment, useState, useEffect, useMemo } from 'react'
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
import { Dumbbell, FileText, FolderOpen, MonitorPlay, Trash2, Download, ArrowLeft, Maximize, Minimize, Library, Sparkles, BrainCircuit, ExternalLink, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSummaryExport } from '@/hooks/useSummaryExport'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { Menu, Transition } from '@headlessui/react'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { PDFViewer } from '@/components/PDFViewer'
import { OfficeViewer } from '@/components/OfficeViewer'
import { ImageViewer } from '@/components/ImageViewer'
import { GenericFileViewer } from '@/components/GenericFileViewer'
import { itemQueries, courseQueries } from '@/lib/api/queries'

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
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
    const [exerciseMode, setExerciseMode] = useState<'flashcards' | 'quiz'>('flashcards')
    const [isDeleting, setIsDeleting] = useState(false) // Re-added correctly
    const [showSummary, setShowSummary] = useState(false) // Default to content view
    const [isExtracting, setIsExtracting] = useState(false)
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isImageFullscreen, setIsImageFullscreen] = useState(false)
    const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)

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
                } else if (isPdfFullscreen) {
                    setIsPdfFullscreen(false)
                } else {
                    setIsFocusMode(false)
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isImageFullscreen, isPdfFullscreen])

    // Summary Hook
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating, error: summaryError } = useSummary(id, item?.type || 'note')

    // Export Hook
    const { isExporting, handleExportPDF, handleExportDOCX, contentRef } = useSummaryExport(summary, item?.title || "Document")

    // Auto-open summary when loaded (Moved here to avoid Hooks Rule violation)
    useEffect(() => {
        if (summary && !showSummary && !isExtracting) {
            setShowSummary(true);
        }
    }, [summary]);

    // File Type Detection (Lifted to Component Scope)
    const filename = item?.fileName || '';
    const ext = filename.split('.').pop()?.toLowerCase() ||
        (item?.fileType ? item.fileType.split('/')[1] : '') ||
        (item?.fileData ? item.fileData.split('.').pop()?.toLowerCase() : '') || '';

    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext);

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
                console.log("Auto-extracting content for exercise generation...");
                const res = await fetch(pdfUrl);
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

                const blob = await res.blob();
                // Ensure we pass a filename with extension for type detection fallback
                const safeName = item.fileName || (item.fileType?.includes('pdf') ? 'doc.pdf' : 'doc.docx');
                const file = new File([blob], safeName, { type: blob.type || item.fileType || 'application/pdf' })

                const extractionResult = await extractText(file)
                const textContent = extractionResult.text

                if (!textContent || textContent.length < 50) {
                    alert("Attention : Le texte extrait semble vide ou très court. La génération peut échouer.");
                }

                try {
                    if (item.id) await itemQueries.update(item.id, { extractedContent: textContent });
                } catch (saveError) {
                    console.warn("Could not save extracted content (non-fatal):", saveError);
                }

                effectiveContent = textContent;

            } catch (e: any) {
                console.error("Auto-extraction failed:", e);
                alert(`Erreur d'analyse du document : ${e.message || "Impossible d'extraire le texte"}.`);
                setIsExtracting(false);
                return; // Stop here, don't open modal if extraction failed completely
            } finally {
                setIsExtracting(false)
            }
        }

        if (!effectiveContent) {
            alert("Aucun contenu n'est disponible pour la génération. Veuillez vérifier que le document contient du texte sélectionnable.");
            return;
        }

        setExerciseMode(mode)
        setIsExerciseModalOpen(true)
    }

    return (
        <div className="flex flex-col h-full overflow-hidden animate-in slide-in-from-right-5 duration-300">
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
            {item && (
                <GenerateExerciseModal
                    isOpen={isExerciseModalOpen}
                    onClose={() => setIsExerciseModalOpen(false)}
                    sourceContent={item.content || item.extractedContent || ''}
                    sourceTitle={item.title}
                    courseId={String(course?.id || '')}
                    itemId={String(item.id || '')}
                    initialMode={exerciseMode}
                />
            )}

            {/* Header */}
            <div className="h-16 border-b flex items-center justify-between px-3 md:px-6 bg-card sticky top-0 z-40">
                <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <button
                        onClick={() => navigate(`/course/${courseId}`)}
                        className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-medium hidden sm:inline">{t('course.return')}</span>
                    </button>
                    <div className="h-6 w-px bg-border text-muted-foreground hidden sm:block" />
                    <div className={cn("p-2 rounded-md flex-shrink-0",
                        item.type === 'exercise' && "bg-blue-100 text-blue-600 dark:bg-blue-900/20",
                        item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20",
                        item.type === 'resource' && "bg-green-100 text-green-600 dark:bg-green-900/20",

                    )}>
                        {item.type === 'exercise' && <Dumbbell className="h-5 w-5" />}
                        {item.type === 'note' && <FileText className="h-5 w-5" />}
                        {item.type === 'resource' && <FolderOpen className="h-5 w-5" />}

                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-base md:text-xl font-bold truncate">{item.title}</h1>
                        <div className="flex flex-col">
                            {course && <p className="text-xs text-muted-foreground truncate">{course.title}</p>}
                            {item.type === 'resource' && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-primary uppercase">
                                        {item.fileName?.split('.').pop() || item.fileType?.split('/')[1] || 'PDF'}
                                    </span>
                                    {item.fileName && (
                                        <>
                                            <span className="opacity-50">•</span>
                                            <span className="opacity-75">{item.fileName}</span>
                                        </>
                                    )}
                                    {item.createdAt && (
                                        <>
                                            <span className="opacity-50">•</span>
                                            <span className="opacity-75">
                                                {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* PDF Controls - Moved here */}
                    {pdfUrl && !showSummary && item.type === 'resource' && (
                        <>
                            <a
                                href={pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={isOffice ? true : undefined}
                                className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                title={isOffice ? "Télécharger l'original" : "Ouvrir dans un nouvel onglet"}
                            >
                                {isOffice ? <Download className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                            </a>
                            <button
                                onClick={() => setIsPdfFullscreen(true)}
                                className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                title="Plein écran"
                            >
                                <Maximize className="h-5 w-5" />
                            </button>
                            <div className="h-6 w-px bg-border mx-1" />
                        </>
                    )}

                    {/* Unified Generation Menu */}
                    <Menu as="div" className="relative">
                        <Menu.Button className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-md hover:from-violet-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-sm">
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden md:inline">Génération</span>
                        </Menu.Button>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-card shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 divide-y divide-border">
                                <div className="p-1">
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleOpenExercise('flashcards')}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                                                    active ? "bg-accent text-accent-foreground" : "text-foreground"
                                                )}
                                            >
                                                <BrainCircuit className="h-4 w-4 text-purple-500" />
                                                Générer Flashcards
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => handleOpenExercise('quiz')}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                                                    active ? "bg-accent text-accent-foreground" : "text-foreground"
                                                )}
                                            >
                                                <CheckSquare className="h-4 w-4 text-green-500" />
                                                Générer QCM
                                            </button>
                                        )}
                                    </Menu.Item>
                                    <Menu.Item>
                                        {({ active }) => (
                                            <button
                                                onClick={() => {
                                                    if (summary) setShowSummary(true)
                                                    else setIsSummaryOptionsOpen(true)
                                                }}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                                                    active ? "bg-accent text-accent-foreground" : "text-foreground"
                                                )}
                                            >
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                {summary ? "Voir le résumé" : "Générer un résumé"}
                                            </button>
                                        )}
                                    </Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>



                    <button
                        onClick={handleDelete}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title={t('action.delete')}
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto bg-muted/5 flex flex-col p-6 md:p-10">
                <div className={cn("w-full space-y-6", showSummary ? "" : "max-w-5xl mx-auto")}>

                    {/* Metadata Badges */}
                    {item.type === 'exercise' && item.status && item.difficulty && (
                        <div className="flex gap-2">
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
                                {t(`status.${item.status.replace('-', '')}`)}
                            </span>
                        </div>
                    )}

                    {/* Content Logic: Summary VS Original Content */}
                    {showSummary ? (
                        <div className={cn(
                            "bg-card border rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-300 flex flex-col",
                            isFocusMode ? "fixed inset-0 z-50 rounded-none border-0 h-screen w-screen m-0" : "min-h-[50vh]"
                        )}>
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
                                        onClick={() => setIsFocusMode(!isFocusMode)}
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
                                        title="Export PDF"
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span className="hidden sm:inline">PDF</span>
                                    </button>
                                    <button
                                        onClick={handleExportDOCX}
                                        disabled={isExporting}
                                        className="text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-transparent px-3 py-1.5 rounded-md transition-all flex items-center gap-2 text-muted-foreground"
                                        title="Export Word"
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
                                    isFocusMode ? "p-16 md:p-32 min-h-full" : "p-8 md:p-16"
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
                                                                    {/* Render children safely if exists? */}
                                                                    {/* props.children is usually null for checkbox inputs in MD, text follows? 
                                                                        Actually in GFM usually [x] text -> text is a sibling node or part of li. 
                                                                        ReactMarkdown might pass text as children to input? UNLIKELY. 
                                                                        Usually input is void. list item contains input then text.
                                                                        Let's just return the input. */ }
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
                    ) : (
                        // ORIGINAL CONTENT VIEW
                        <div className="bg-card border rounded-xl p-8 min-h-[50vh] shadow-sm">
                            {/* PDF VIEWER Integration */}
                            {pdfUrl ? (
                                <div className="border rounded-lg overflow-hidden bg-card shadow-sm relative">

                                    {/* ===== DISPLAY LOGIC BASED ON FILE EXTENSION ===== */}
                                    {(() => {
                                        // Variables are now defined at component scope (lines ~100)
                                        // console.log("Detected file type:", { ext, isImage, isOffice, filename }); 

                                        if (isImage) {
                                            return <ImageViewer url={pdfUrl} alt={item.title} className="h-[80vh]" />;
                                        }

                                        if (isOffice) {
                                            return (
                                                <>
                                                    <div className="hidden sm:block">
                                                        <OfficeViewer url={pdfUrl} className="h-[80vh]" />
                                                    </div>

                                                    {/* Mobile Fallback (Shared Logic Below) */}
                                                    {/* We return null here for mobile to fall through? No, we need to return something or restructure. */}
                                                    {/* Better approach: Return the Desktop/Tablet OfficeViewer here, but for MOBILE, render the shared card. */}
                                                    {/* Actually, let's just render the OfficeViewer for sm+ and use the shared mobile view below for everyone? */}
                                                    {/* No, this is an IIFE. We must return the content. */}

                                                    {/* Mobile View for Office */}
                                                    <div className="sm:hidden flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                                            <FileText className="h-10 w-10 text-blue-500" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-lg mb-2">{item.fileName || 'Document Office'}</h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                Pour un meilleur confort, téléchargez ce document.
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            download
                                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
                                                        >
                                                            <Download className="h-5 w-5" />
                                                            Télécharger l'original
                                                        </a>
                                                    </div>
                                                </>
                                            );
                                        }

                                        // Explicitly check for PDF
                                        const isPdf = ext === 'pdf';

                                        if (isPdf) {
                                            // Default to PDF Viewer Logic (Original Hybrid Approach)
                                            return (
                                                <>
                                                    {/* Desktop View: Native Iframe (lg+) */}
                                                    <div className="hidden lg:block">
                                                        <iframe
                                                            src={`${pdfUrl}#view=FitH`}
                                                            title="PDF Document"
                                                            className="w-full h-[80vh] border-0 rounded-lg bg-slate-100 dark:bg-slate-900"
                                                            allowFullScreen
                                                        />
                                                    </div>

                                                    {/* Tablet View: React-PDF Viewer (sm to lg) */}
                                                    <div className="hidden sm:block lg:hidden">
                                                        <PDFViewer url={pdfUrl} className="h-[80vh]" />
                                                    </div>

                                                    {/* Smartphone View: Card Actions */}
                                                    <div className="sm:hidden flex flex-col items-center justify-center p-8 text-center space-y-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                                            <FileText className="h-10 w-10 text-red-500" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h3 className="font-semibold text-lg max-w-[250px] mx-auto truncate">
                                                                {item.fileName || 'Document PDF'}
                                                            </h3>
                                                            <p className="text-sm text-muted-foreground">
                                                                Pour un meilleur confort de lecture sur mobile, ouvrez le fichier directement.
                                                            </p>
                                                        </div>

                                                        <a
                                                            href={pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm active:scale-95 transition-transform"
                                                        >
                                                            <ExternalLink className="h-5 w-5" />
                                                            Ouvrir le PDF
                                                        </a>
                                                    </div>

                                                    {/* PDF Fullscreen Modal */}
                                                    {isPdfFullscreen && (
                                                        // ... (Existing modal logic)
                                                        <div className="fixed inset-0 z-[999] bg-slate-900 flex flex-col animate-in fade-in duration-200 hidden sm:flex">
                                                            <div className="absolute top-4 right-6 z-10 flex gap-2">
                                                                <button
                                                                    onClick={() => setIsPdfFullscreen(false)}
                                                                    className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-sm transition-colors"
                                                                >
                                                                    <Minimize className="h-4 w-4" />
                                                                    <span className="text-sm font-medium hidden sm:inline">Fermer</span>
                                                                </button>
                                                            </div>
                                                            <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center p-4">
                                                                {/* Fullscreen Modal Content */}
                                                                {isOffice ? (
                                                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-900 p-4 md:p-8 overflow-hidden">
                                                                        <OfficeViewer url={pdfUrl} className="h-full w-full shadow-2xl" />
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <iframe
                                                                            src={`${pdfUrl}#view=FitH`}
                                                                            title="PDF Document Fullscreen"
                                                                            className="w-full h-full border-0 rounded-lg bg-white hidden lg:block"
                                                                            allowFullScreen
                                                                        />
                                                                        <div className="w-full h-full hidden sm:block lg:hidden">
                                                                            <PDFViewer url={pdfUrl} className="h-full rounded-none border-0" />
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        }

                                        // Fallback for Unknown Types
                                        return <GenericFileViewer url={pdfUrl} filename={item.fileName} className="h-[80vh]" />;
                                    })()}
                                </div>

                            ) : item.content ? (
                                <div className="prose dark:prose-invert max-w-none prose-lg">
                                    {item.type === 'note' ? (
                                        <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                    ) : (
                                        <p className="whitespace-pre-wrap">{item.content}</p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-20 text-muted-foreground italic">
                                    {t('item.noContent')}
                                </div>
                            )}

                            {/* File Attachment - Always show for content view, even if PDF is shown (for download) */}
                            {(item.fileData || item.type === 'resource') && (
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
                    )}
                </div >
            </div >
        </div>
    )
}

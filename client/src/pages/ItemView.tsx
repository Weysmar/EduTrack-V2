
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
import { Dumbbell, FileText, FolderOpen, MonitorPlay, Trash2, Download, ArrowLeft, Maximize, Minimize, Library, Sparkles, BrainCircuit, ExternalLink, Loader2, Edit, Image as ImageIcon, Layers, Workflow, Calendar, ArrowLeftRight, RefreshCw, X as CloseIcon, Globe } from 'lucide-react'
import { ItemDesktopToolbar } from '@/components/item/ItemDesktopToolbar'
import { ItemMobileToolbar } from '@/components/item/ItemMobileToolbar'
import { SideBySidePickerModal } from '@/components/item/SideBySidePickerModal'
import { ItemMarkdownDisplay } from '@/components/item/ItemMarkdownDisplay'
import { useSummaryExport } from '@/hooks/useSummaryExport'
import { exportNoteToPdf } from '@/lib/exportNotePdf'
import { getOfflineItem, getOfflineCourse } from '@/lib/offlineManager'
import { GenerateExerciseModal, RevisionGenerationMode } from '@/components/GenerateExerciseModal'
import { RevisionSheetViewer } from '@/components/revision/RevisionSheetViewer'
import { ClozeExerciseViewer } from '@/components/revision/ClozeExerciseViewer'
import { MindMapViewer } from '@/components/MindMapViewer'
import { CheckSquare, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { PDFViewer } from '@/components/PDFViewer'
import { OfficeViewer } from '@/components/OfficeViewer'
import { OfficeEditor } from '@/components/office/OfficeEditor'
import { ImageViewer } from '@/components/ImageViewer'
import { GenericFileViewer } from '@/components/GenericFileViewer'
import { TextViewer } from '@/components/TextViewer'
import { BPMNViewer } from '@/components/BPMNViewer'
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
        queryFn: async () => {
            try {
                return await itemQueries.getOne(id);
            } catch (err) {
                const offline = await getOfflineItem(id);
                if (offline) return offline;
                throw err;
            }
        },
        enabled: !!id
    })

    const { data: course } = useQuery({
        queryKey: ['courses', courseId],
        queryFn: async () => {
            try {
                return await courseQueries.getOne(courseId!);
            } catch (err) {
                if (courseId) {
                    const offline = await getOfflineCourse(courseId);
                    if (offline?.course) return offline.course;
                }
                throw err;
            }
        },
        enabled: !!courseId
    })

    // Safety redirect: If itemId accidentally equals courseId, redirect to course
    useEffect(() => {
        if (courseId && itemId && courseId === itemId) {
            navigate(`/edu/course/${courseId}`, { replace: true });
        }
    }, [courseId, itemId, navigate]);

    // Derived States
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
    const [exerciseMode, setExerciseMode] = useState<RevisionGenerationMode>('flashcards')
    const [exerciseContent, setExerciseContent] = useState('')
    const [isDeleting, setIsDeleting] = useState(false) // Re-added correctly
    const [showSummary, setShowSummary] = useState(false) // Default to content view
    const [isExtracting, setIsExtracting] = useState(false)
    const [officeEngine, setOfficeEngine] = useState<'google' | 'microsoft' | 'local'>('microsoft') // Lifted state
    const [isRefreshingSnapshot, setIsRefreshingSnapshot] = useState(false)
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)

    const toggleFocusMode = () => {
        if (!isFocusMode) {
            setIsFocusMode(true)
            try {
                if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {})
                }
            } catch {}
        } else {
            setIsFocusMode(false)
            try {
                if (document.exitFullscreen && document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {})
                }
            } catch {}
        }
    }

    useEffect(() => {
        const onFullscreenChange = () => {
            if (!document.fullscreenElement && isFocusMode) {
                setIsFocusMode(false)
            }
        }
        document.addEventListener('fullscreenchange', onFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
    }, [isFocusMode])

    useEffect(() => {
        if (!isFocusMode && typeof document !== 'undefined' && document.fullscreenElement) {
            try {
                document.exitFullscreen().catch(() => {})
            } catch {}
        }
    }, [isFocusMode])
    const [isImageFullscreen, setIsImageFullscreen] = useState(false)
    const [isAIMenuOpen, setIsAIMenuOpen] = useState(false) // Manual control for mobile compatibility
    const [mobileTab, setMobileTab] = useState<'pdf' | 'summary'>('pdf')

    // Side-by-Side (Split View) Mode
    const [sideBySideItem, setSideBySideItem] = useState<any | null>(null)
    const [isSideBySidePickerOpen, setIsSideBySidePickerOpen] = useState(false)
    const [isSwapped, setIsSwapped] = useState(false)

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
        if (!isEditMode || item?.type !== 'note') return
        if (editedContent === item?.content) return

        // Immediately signal saving as soon as typing happens
        setSaveStatus('saving')

        const timer = setTimeout(() => {
            updateMutation.mutate(editedContent)
        }, 800) // 800ms debounce

        return () => clearTimeout(timer)
    }, [editedContent, isEditMode, item?.content, item?.type])

    // Immediate flush on page leave
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isEditMode && item?.type === 'note' && pendingContentRef.current && pendingContentRef.current !== item?.content) {
                const formData = new FormData()
                formData.append('content', pendingContentRef.current)
                itemQueries.update(String(item.id), formData)
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isEditMode, item?.content, item?.id, item?.type])

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
        if (item?.type === 'link') return null;
        // Use Backend Proxy if storageKey is available (Bypasses CORS/IP blocking)
        if (item?.storageKey) {
            return `${API_URL}/storage/proxy/${item.storageKey}?token=${token}`;
        }

        // Check if fileUrl is valid
        if (item?.fileUrl) {
            return item.fileUrl;
        }

        return null
    }, [item?.fileUrl, item?.storageKey, item?.type, token])

    // Side-by-Side Secondary PDF URL
    const sideBySidePdfUrl = useMemo(() => {
        if (!sideBySideItem) return null
        if (sideBySideItem.storageKey) {
            return `${API_URL}/storage/proxy/${sideBySideItem.storageKey}?token=${token}`
        }
        if (sideBySideItem.fileUrl) {
            return sideBySideItem.fileUrl
        }
        return null
    }, [sideBySideItem, token])


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
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating, error: summaryError, remove, setSummary, refetch: refetchSummary } = useSummary(id, item?.type || 'note', undefined, courseId)

    // Export Hook
    const { isExporting, handleExportPDF, handleExportDOCX, contentRef } = useSummaryExport(summary, item?.title || "Document")

    // Note HD PDF Export
    const [isExportingNotePdf, setIsExportingNotePdf] = useState(false)
    const handleExportNotePdf = async () => {
        if (!item) return
        setIsExportingNotePdf(true)
        const toastId = toast.loading(
            language === 'fr'
                ? "Génération du PDF Haute Définition..."
                : "Generating High-Definition PDF..."
        )
        try {
            const noteContent = isEditMode ? editedContent : (item.content || item.extractedContent || '')
            await exportNoteToPdf({
                title: item.title || (language === 'fr' ? 'Note de cours' : 'Course note'),
                content: noteContent,
                courseTitle: course?.title,
                courseCode: course?.code,
                updatedAt: item.updatedAt,
                language: item.language || language || 'fr'
            })
            toast.success(
                language === 'fr'
                    ? "PDF téléchargé avec succès !"
                    : "PDF downloaded successfully!",
                { id: toastId }
            )
        } catch (err: any) {
            console.error("Failed to export PDF:", err)
            toast.error(
                language === 'fr'
                    ? "Échec de l'exportation du PDF"
                    : "PDF export failed",
                { id: toastId, description: err?.message }
            )
        } finally {
            setIsExportingNotePdf(false)
        }
    }

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
    const isOffice = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'odt'].includes(ext);
    const isExcel = ['xls', 'xlsx', 'csv'].includes(ext);
    const isText = ext === 'txt';
    const isMarkdown = ext === 'md';
    const isBpmn = ['bpmn', 'bpmn2', 'bpm'].includes(ext);

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

    if (!item) return (
        <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
            <div className="text-5xl">🔍</div>
            <h2 className="text-xl font-semibold">Document introuvable</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
                Ce document n'existe pas ou a été supprimé. Vous allez être redirigé vers le cours.
            </p>
            <button
                onClick={() => navigate(`/edu/course/${courseId}`)}
                className="mt-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all"
            >
                Retour au cours
            </button>
        </div>
    )

    // ... Handlers ...
    const handleDownload = async () => {
        const downloadUrl = (item?.type === 'link' && item?.storageKey)
            ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}`
            : pdfUrl;

        if (downloadUrl) {
            try {
                const response = await fetch(downloadUrl);
                if (!response.ok) throw new Error("Download failed");
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const rawName = item?.type === 'link'
                    ? `${(item.title || item.fileName || 'page_internet').replace(/[<>:"/\\|?*]/g, '_')}.html`
                    : (item.fileName || 'downloaded-file.pdf');
                triggerDownload(url, rawName);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (e) {
                console.error("Download error:", e);
                alert("Erreur lors du téléchargement. Vérifiez votre connexion.");
            }
        }
    }

    const handleRefreshSnapshot = async () => {
        if (!item?.id) return;
        setIsRefreshingSnapshot(true);
        try {
            await itemQueries.downloadSnapshot(String(item.id));
            queryClient.invalidateQueries({ queryKey: ['items', item.id] });
            queryClient.invalidateQueries({ queryKey: ['items'] });
            toast.success(language === 'fr' ? "Page HTML enregistrée avec succès" : "HTML page snapshot saved successfully");
        } catch (err) {
            console.error("Snapshot download error:", err);
            toast.error(language === 'fr' ? "Impossible de télécharger la page HTML" : "Failed to download HTML page");
        } finally {
            setIsRefreshingSnapshot(false);
        }
    };

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



    const handleDeleteSummary = async () => {
        if (confirm("Voulez-vous vraiment supprimer ce résumé ?\n(Le document original sera conservé intact)")) {
            await remove();
            setShowSummary(false);
        }
    };

    const handleDelete = async () => {
        // If user is currently viewing the summary, ask if they want to delete only the summary
        if (showSummary) {
            const confirmChoice = confirm(
                "Vous consultez actuellement le résumé du document.\n\n" +
                "• Cliquez sur [OK] pour supprimer UNIQUEMENT le résumé (le document original sera conservé).\n" +
                "• Cliquez sur [Annuler] pour fermer sans supprimer le document."
            );
            if (confirmChoice) {
                await handleDeleteSummary();
            }
            return;
        }

        if (confirm(t('item.delete.confirm') || "Voulez-vous déplacer cet élément dans la corbeille ?")) {
            setIsDeleting(true);
            if (item && item.id) {
                const deletedItemId = item.id;
                try {
                    await itemQueries.delete(deletedItemId);
                    toast.success("Élément déplacé dans la corbeille", {
                        description: "Le fichier n'est pas perdu et peut être restauré.",
                        action: {
                            label: "Annuler / Restaurer",
                            onClick: async () => {
                                try {
                                    await itemQueries.restore(deletedItemId);
                                    toast.success("Élément restauré avec succès !");
                                } catch (err) {
                                    toast.error("Échec de la restauration");
                                }
                            }
                        },
                        duration: 8000
                    });
                    navigate(`/edu/course/${courseId}`);
                } catch (error) {
                    console.error("Deletion failed", error);
                    setIsDeleting(false);
                    toast.error("Erreur lors de la suppression");
                }
            }
        }
    };

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
                            let safeName = item.fileName || '';
                            if (!safeName && item.storageKey) {
                                safeName = item.storageKey.split('-').slice(1).join('-');
                            }
                            if (!safeName) {
                                if (item.fileType?.includes('presentation') || item.fileType?.includes('powerpoint')) {
                                    safeName = 'presentation.pptx';
                                } else if (item.fileType?.includes('word') || item.fileType?.includes('officedocument')) {
                                    safeName = 'document.docx';
                                } else if (item.fileType?.includes('pdf')) {
                                    safeName = 'document.pdf';
                                } else {
                                    safeName = 'file.bin';
                                }
                            }
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
                            toast.error("Impossible d'extraire le texte du document", {
                                description: extractionErr.message || "Vérifiez que le fichier contient du texte exploitable."
                            });
                            return
                        }
                        setIsExtracting(false)
                    }
                }
            }
            if (!textContent || textContent.trim().length === 0) {
                toast.error("Aucun texte à résumer", {
                    description: "Le document ne contient pas de texte exploitable."
                });
                return;
            }
            setShowSummary(true)
            await generateSummary(options, textContent)
        } catch (e: any) {
            setIsExtracting(false)
            console.error("Summary Generation Error:", e)
        }
    }

    const handleOpenExercise = async (mode: RevisionGenerationMode) => {
        // Ensure text is extracted if it's a file
        let effectiveContent = exerciseContent || item.extractedContent || item.content || '';

        if (item.type === 'resource' && !effectiveContent && pdfUrl) {
            setIsExtracting(true)
            try {
                // Auto-extracting content for exercise generation
                const res = await fetch(pdfUrl);
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

                const blob = await res.blob();
                let safeName = item.fileName || '';
                if (!safeName && item.storageKey) {
                    safeName = item.storageKey.split('-').slice(1).join('-');
                }
                if (!safeName) {
                    if (item.fileType?.includes('presentation') || item.fileType?.includes('powerpoint')) {
                        safeName = 'presentation.pptx';
                    } else if (item.fileType?.includes('word') || item.fileType?.includes('officedocument')) {
                        safeName = 'document.docx';
                    } else if (item.fileType?.includes('pdf')) {
                        safeName = 'document.pdf';
                    } else {
                        safeName = 'file.bin';
                    }
                }
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

    const itemFileCategory = (
        item.fileType?.startsWith('image/') ||
        /\.(jpg|jpeg|png|webp|avif|heic|heif)$/i.test(item.fileName || item.storageKey || '')
    ) ? 'image' as const : 'text' as const;
    const itemContentLength = (exerciseContent || item.extractedContent || item.content || '').length;

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
                fileCategory={itemFileCategory}
                contentLength={itemContentLength}
            />
            {/* Removed redundant item check and fragment */}
            <GenerateExerciseModal
                isOpen={isExerciseModalOpen}
                onClose={() => setIsExerciseModalOpen(false)}
                sourceContent={exerciseContent || item.extractedContent || item.content || ''}
                sourceTitle={item?.title || item?.fileName || 'Document'}
                courseId={String(course?.id || courseId || '')}
                itemId={String(item?.id || '')}
                initialMode={exerciseMode}
                fileCategory={itemFileCategory}
                onSuccess={(mode, payload) => {
                    if (mode === 'summary') {
                        if (payload) {
                            setSummary(payload);
                        }
                        refetchSummary();
                        setShowSummary(true);
                        setMobileTab('summary');
                    }
                }}
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
                        item.type === 'resource' && (isBpmn ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20" : isImage ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20" : "bg-green-100 text-green-600 dark:bg-green-900/20"),
                        item.type === 'link' && "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/20",
                    )}>
                        {item.type === 'exercise' && <Dumbbell className="h-4 w-4" />}
                        {item.type === 'note' && <FileText className="h-4 w-4" />}
                        {item.type === 'resource' && (isBpmn ? <Workflow className="h-4 w-4" /> : isImage ? <ImageIcon className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />)}
                        {item.type === 'link' && <Globe className="h-4 w-4" />}
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
                            {item.type === 'link' && (
                                <>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                        <Globe className="h-2.5 w-2.5" />
                                        Internet
                                    </span>
                                    {item.fileName && (
                                        <span className="opacity-75 truncate max-w-[200px] font-mono">{item.fileName}</span>
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
                            {item.type === 'resource' && (
                                <>
                                    {course && <span>•</span>}
                                    {(() => {
                                        const ext = (item.fileName?.split('.').pop() || item.fileType?.split('/')[1] || 'PDF').toUpperCase();
                                        const isWord = ['DOC', 'DOCX', 'ODT'].includes(ext);
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
                                        } else if (['BPMN', 'BPMN2', 'BPM'].includes(ext)) {
                                            badgeClass = "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
                                            Icon = Workflow;
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
                            {item.type === 'exercise' && (
                                <>
                                    {course && <span>•</span>}
                                    <span className="capitalize">{t(`status.${item.status || 'todo'}`)}</span>
                                    <span>•</span>
                                    <span className="capitalize">{t(`diff.${item.difficulty || 'medium'}`)}</span>
                                    {item.dueDate && (
                                        <>
                                            <span>•</span>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                <Calendar className="h-3 w-3" />
                                                <span>{t('item.dueDate')}: {new Date(item.dueDate).toLocaleDateString()}</span>
                                            </span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Mobile TTS Controls for notes & text resources */}
                    {(item.type === 'note' || (item.type === 'resource' && (isText || isMarkdown))) && (
                        <div className="md:hidden flex items-center flex-shrink-0 ml-1">
                            <TTSControls
                                text={item.content || item.extractedContent || ''}
                                lang={item.language || (course?.language === 'en' ? 'en-US' : (course?.language === 'fr' ? 'fr-FR' : (language === 'en' ? 'en-US' : 'fr-FR')))}
                            />
                        </div>
                    )}

                    {item.type === 'link' && item.fileUrl && (
                        <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity flex-shrink-0 mr-1"
                        >
                            <span>Ouvrir le site</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
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
                    handleExportNotePdf={handleExportNotePdf}
                    isExportingNotePdf={isExportingNotePdf}
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
                    onOpenSideBySide={() => {
                        if (sideBySideItem) {
                            setSideBySideItem(null)
                            setIsSwapped(false)
                        } else {
                            setIsSideBySidePickerOpen(true)
                        }
                    }}
                    isSideBySide={!!sideBySideItem}
                    t={t}
                />
            </div>

            <ItemMobileToolbar
                itemType={item.type || 'note'}
                isOffice={!!isOffice}
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
                handleExportNotePdf={handleExportNotePdf}
                isExportingNotePdf={isExportingNotePdf}
                onOpenSideBySide={() => {
                    if (sideBySideItem) {
                        setSideBySideItem(null)
                        setIsSwapped(false)
                    } else {
                        setIsSideBySidePickerOpen(true)
                    }
                }}
                isSideBySide={!!sideBySideItem}
                t={t}
            />
            {/* Main Content Area */}
            <div className={cn(
                "flex-1 overflow-auto bg-muted/5 flex flex-col",
                (item.type === 'resource' || item.type === 'link')
                    ? "p-0 md:p-3 pb-20 md:pb-3" 
                    : "px-0 md:px-8 pt-0 pb-24 md:pb-8"
            )}>
                <div className={cn(
                    "w-full h-full",
                    showSummary ? "" : ((item.type === 'resource' || (item.type === 'link' && item.storageKey)) ? "max-w-none" : "max-w-5xl mx-auto")
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
                        isFocusMode 
                            ? "fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen p-1.5 sm:p-2.5 pb-1 sm:pb-2" 
                            : (sideBySideItem 
                                ? "w-full max-w-[98vw] mx-auto" 
                                : ((item.type === 'resource' || (item.type === 'link' && item.storageKey)) ? "w-full max-w-none" : "max-w-5xl mx-auto"))
                    )}>
                        <div className={cn("flex-1 min-h-0 relative", isFocusMode ? "h-full overflow-hidden flex flex-col" : "block")}>

                            {/* ===== ORIGINAL CONTENT VIEW ===== */}
                            <div className={cn(
                                "w-full transition-all",
                                // Logic: Show if (Standard Mode AND !ShowSummary) OR (FocusMode AND Tab == 'pdf')
                                ((!showSummary && !isFocusMode) || (isFocusMode && mobileTab === 'pdf')) ? "block" : "hidden",
                                isFocusMode 
                                    ? "h-full overflow-hidden border-0 bg-background p-0 flex flex-col flex-1 min-h-0" 
                                    : (sideBySideItem
                                        ? "p-0 min-h-[50vh]"
                                        : (item.type === 'note'
                                            ? "p-0 min-h-[50vh]"
                                            : "bg-card border-0 md:border md:rounded-xl p-0 min-h-[50vh] shadow-none md:shadow-sm"))
                            )}>

                                {pdfUrl ? (
                                    (() => {
                                        const renderDocumentViewer = (targetItem: any, targetPdfUrl: string | null, isSecondary = false) => {
                                        if (!targetItem || !targetPdfUrl) return null;
                                        if (/^\s*(javascript|vbscript):/i.test(targetPdfUrl)) return null;

                                        const targetFilename = targetItem.fileName || targetItem.fileUrl || '';
                                        const targetExt = targetFilename.split('.').pop()?.toLowerCase();
                                        const targetIsImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'heic'].includes(targetExt || '') || Boolean(targetItem.fileType?.startsWith('image/'));
                                        const targetIsPdf = targetExt === 'pdf' || targetItem.fileType === 'application/pdf';
                                        const targetIsOffice = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt'].includes(targetExt || '');
                                        const targetIsText = ['txt', 'csv', 'json', 'log', 'rtf'].includes(targetExt || '');
                                        const targetIsMarkdown = ['md', 'markdown'].includes(targetExt || '');
                                        const targetIsBpmn = targetExt === 'bpmn' || (targetItem.tags && targetItem.tags.includes('bpmn'));

                                        const viewerHeight = isFocusMode ? "h-full" : (sideBySideItem ? "h-[75vh] md:h-[82vh]" : "h-[75vh] md:h-[80vh]");

                                        if (targetIsImage) {
                                            return (
                                                <ImageViewer
                                                    url={targetPdfUrl}
                                                    itemId={targetItem.id}
                                                    initialAnnotations={targetItem.annotations}
                                                    alt={targetItem.title}
                                                    className={viewerHeight}
                                                />
                                            );
                                        }

                                        if (targetIsOffice) {
                                            if (isEditMode) {
                                                return (
                                                    <OfficeEditor
                                                        item={targetItem}
                                                        fileUrl={targetPdfUrl}
                                                        onClose={() => setIsEditMode(false)}
                                                        className={viewerHeight}
                                                    />
                                                );
                                            }
                                            return (
                                                <OfficeViewer
                                                    url={targetPdfUrl}
                                                    storageKey={targetItem.storageKey}
                                                    className={viewerHeight}
                                                    engine={officeEngine}
                                                    onEngineChange={setOfficeEngine}
                                                    onExitFocusMode={isFocusMode ? () => setIsFocusMode(false) : undefined}
                                                    onEdit={() => setIsEditMode(true)}
                                                />
                                            );
                                        }

                                        if (targetIsText || targetIsMarkdown) {
                                            return (
                                                <TextViewer
                                                    url={targetPdfUrl}
                                                    fileName={targetItem.fileName}
                                                    isMarkdown={targetIsMarkdown}
                                                    className="min-h-full"
                                                />
                                            );
                                        }

                                        if (targetIsPdf) {
                                            return (
                                                <PDFViewer
                                                    url={targetPdfUrl}
                                                    itemId={targetItem.id}
                                                    initialAnnotations={targetItem.annotations}
                                                    className={viewerHeight}
                                                    isFocusMode={isFocusMode}
                                                    onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                                                    onExitFocusMode={() => setIsFocusMode(false)}
                                                    onOpenSideBySide={isSecondary ? undefined : () => {
                                                        if (sideBySideItem) {
                                                            setSideBySideItem(null)
                                                            setIsSwapped(false)
                                                        } else {
                                                            setIsSideBySidePickerOpen(true)
                                                        }
                                                    }}
                                                    isSideBySide={!!sideBySideItem}
                                                />
                                            );
                                        }

                                        if (targetIsBpmn) {
                                            return (
                                                <BPMNViewer
                                                    url={targetPdfUrl}
                                                    fileName={targetItem.fileName || targetItem.title || "process.bpmn"}
                                                    className={viewerHeight}
                                                    isFocusMode={isFocusMode}
                                                    onToggleFocusMode={() => setIsFocusMode(prev => !prev)}
                                                    onExitFocusMode={() => setIsFocusMode(false)}
                                                />
                                            );
                                        }

                                        return <GenericFileViewer url={targetPdfUrl} filename={targetItem.fileName} className={viewerHeight} />;
                                    };

                                    if (pdfUrl) {
                                        if (sideBySideItem) {
                                            return (
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full h-full">
                                                    {/* Left Pane */}
                                                    <div className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm h-full">
                                                        <div className="px-3.5 py-2 border-b bg-muted/30 flex items-center justify-between gap-2 shrink-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                                                                    {isSwapped ? (language === 'fr' ? 'Secondaire' : 'Secondary') : (language === 'fr' ? 'Principal' : 'Primary')}
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                                                                    {(isSwapped ? sideBySideItem : item)?.title || (isSwapped ? sideBySideItem : item)?.fileName}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setIsSwapped(prev => !prev)}
                                                                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1 cursor-pointer shrink-0"
                                                                title={language === 'fr' ? "Inverser les deux documents (Gauche ⇄ Droite)" : "Swap left and right documents"}
                                                            >
                                                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                                                <span className="hidden sm:inline">{language === 'fr' ? 'Inverser' : 'Swap'}</span>
                                                            </button>
                                                        </div>
                                                        <div className="flex-1 min-h-0 relative">
                                                            {renderDocumentViewer(
                                                                isSwapped ? sideBySideItem : item,
                                                                isSwapped ? sideBySidePdfUrl : pdfUrl,
                                                                isSwapped
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right Pane */}
                                                    <div className="flex flex-col border rounded-xl overflow-hidden bg-card shadow-sm h-full">
                                                        <div className="px-3.5 py-2 border-b bg-muted/30 flex items-center justify-between gap-2 shrink-0">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                                                                    {isSwapped ? (language === 'fr' ? 'Principal' : 'Primary') : (language === 'fr' ? 'Comparé' : 'Compared')}
                                                                </span>
                                                                <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                                                                    {(isSwapped ? item : sideBySideItem)?.title || (isSwapped ? item : sideBySideItem)?.fileName}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsSideBySidePickerOpen(true)}
                                                                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors text-xs flex items-center gap-1 cursor-pointer"
                                                                    title={language === 'fr' ? "Changer de document comparé" : "Change compared document"}
                                                                >
                                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">{language === 'fr' ? 'Changer' : 'Change'}</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSideBySideItem(null)
                                                                        setIsSwapped(false)
                                                                    }}
                                                                    className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
                                                                    title={language === 'fr' ? "Fermer le mode côte à côte" : "Close split view"}
                                                                >
                                                                    <CloseIcon className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 min-h-0 relative">
                                                            {renderDocumentViewer(
                                                                isSwapped ? item : sideBySideItem,
                                                                isSwapped ? pdfUrl : sideBySidePdfUrl,
                                                                !isSwapped
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className={cn(
                                                "border-0 rounded-none overflow-hidden bg-card shadow-none relative w-full",
                                                isFocusMode ? "h-full shadow-sm md:rounded-lg border" : "md:border md:rounded-lg md:shadow-sm"
                                            )}>
                                                {renderDocumentViewer(item, pdfUrl, false)}
                                            </div>
                                        );
                                    }

                                    return null;
                                })()
                            ) : (item.type === 'sheet') ? (
                                <div className="w-full h-full">
                                    <RevisionSheetViewer item={item} />
                                </div>
                            ) : (item.type === 'cloze') ? (
                                <div className="w-full h-full">
                                    <ClozeExerciseViewer item={item} />
                                </div>
                            ) : (item.type === 'mindmap') ? (
                                <div className="w-full h-[75vh] min-h-[600px] border rounded-xl overflow-hidden bg-card">
                                    <MindMapViewer content={item.content || ''} />
                                </div>
                            ) : (item.type === 'link') ? (
                                item.storageKey ? (
                                    <div className={cn(
                                        "w-full flex flex-col space-y-2 animate-in fade-in duration-200",
                                        isFocusMode ? "h-full flex-1 min-h-0" : ""
                                    )}>
                                        {/* Lecteur Intégré : Barre d'actions */}
                                        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-card border rounded-xl shadow-xs flex-shrink-0">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                                                    {item.thumbnailUrl ? (
                                                        <img
                                                            src={item.thumbnailUrl.startsWith('http') ? item.thumbnailUrl : `${API_URL}/storage/proxy/${item.thumbnailUrl.split('/').pop()}?token=${token}`}
                                                            alt={item.title}
                                                            className="w-5 h-5 object-cover rounded-sm"
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Globe className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                                            {language === 'fr' ? "Lecture intégrée EduTrack" : "EduTrack Embedded Reader"}
                                                        </span>
                                                        {item.fileName && (
                                                            <span className="text-xs text-muted-foreground font-mono truncate hidden sm:inline">
                                                                {item.fileName}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h3 className="text-sm font-semibold text-foreground truncate max-w-md" title={item.title}>
                                                        {item.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                {/* Bouton Télécharger HTML pour lecture hors ligne */}
                                                <button
                                                    onClick={handleDownload}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
                                                    title={language === 'fr' ? "Télécharger le fichier HTML complet pour lecture hors ligne sur votre ordinateur" : "Download complete HTML file for offline reading"}
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                    <span>{language === 'fr' ? "Télécharger HTML (Hors ligne)" : "Download HTML (Offline)"}</span>
                                                </button>

                                                {/* Bouton Site original */}
                                                {item.fileUrl && (
                                                    <a
                                                        href={item.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold border transition-colors"
                                                        title={language === 'fr' ? "Ouvrir le site original" : "Open original website"}
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:inline">{language === 'fr' ? "Site original" : "Original site"}</span>
                                                    </a>
                                                )}

                                                {/* Bouton Re-télécharger / Actualiser */}
                                                <button
                                                    onClick={handleRefreshSnapshot}
                                                    disabled={isRefreshingSnapshot}
                                                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground border transition-colors disabled:opacity-50"
                                                    title={language === 'fr' ? "Re-télécharger la page HTML depuis le web" : "Re-download HTML page snapshot"}
                                                >
                                                    <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingSnapshot && "animate-spin text-primary")} />
                                                </button>

                                                {/* Bouton Plein écran */}
                                                <button
                                                    onClick={toggleFocusMode}
                                                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground border transition-colors hidden sm:inline-flex"
                                                    title={isFocusMode ? (language === 'fr' ? "Quitter le plein écran" : "Exit focus") : (language === 'fr' ? "Plein écran" : "Focus mode")}
                                                >
                                                    {isFocusMode ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Document HTML intégré */}
                                        <div className={cn(
                                            "w-full bg-card rounded-xl border overflow-hidden shadow-sm relative",
                                            isFocusMode ? "flex-1 min-h-0 h-full" : "h-[75vh] md:h-[82vh]"
                                        )}>
                                            <iframe
                                                src={item.storageKey ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}` : undefined}
                                                srcDoc={(item as any).htmlSnapshot || undefined}
                                                title={item.title}
                                                className="w-full h-full border-0 bg-white"
                                                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center p-6 md:p-12 space-y-6 animate-in fade-in-50 duration-200">
                                        <div className="w-full max-w-2xl bg-card border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner">
                                                    {item.thumbnailUrl ? (
                                                        <img 
                                                            src={item.thumbnailUrl.startsWith('http') ? item.thumbnailUrl : `${API_URL}/storage/proxy/${item.thumbnailUrl.split('/').pop()}?token=${token}`} 
                                                            alt={item.title}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <Globe className="h-8 w-8 text-cyan-500" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                                        <Globe className="h-3 w-3" />
                                                        <span>Site Internet</span>
                                                    </div>
                                                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                                                        {item.title}
                                                    </h2>
                                                    {item.fileName && (
                                                        <p className="text-sm text-muted-foreground font-mono">
                                                            {item.fileName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-4 rounded-xl bg-muted/40 border border-dashed text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-foreground">
                                                        {language === 'fr' ? "Lecture intégrée disponible après téléchargement" : "Integrated reading available after download"}
                                                    </p>
                                                    <p className="text-xs">
                                                        {language === 'fr' 
                                                            ? "Téléchargez la page HTML pour pouvoir la lire directement dans EduTrack et la consulter hors ligne." 
                                                            : "Download the HTML page to read it directly within EduTrack and keep it offline."}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleRefreshSnapshot}
                                                    disabled={isRefreshingSnapshot}
                                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-50 transition-colors"
                                                >
                                                    {isRefreshingSnapshot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                                    <span>{language === 'fr' ? "Télécharger la page HTML" : "Download HTML Page"}</span>
                                                </button>
                                            </div>

                                            {item.content && (
                                                <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-xl border">
                                                    {item.content}
                                                </p>
                                            )}

                                            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t pt-4">
                                                <a
                                                    href={item.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition-all text-sm group"
                                                >
                                                    <span>{language === 'fr' ? "Accéder au site internet" : "Open Website"}</span>
                                                    <ExternalLink className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                                </a>
                                                <span className="text-xs text-muted-foreground font-mono truncate max-w-xs" title={item.fileUrl}>
                                                    {item.fileUrl}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
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
                                                <div className="w-px h-6 bg-border mx-1" />
                                                <button
                                                    onClick={handleDeleteSummary}
                                                    className="text-xs hover:bg-destructive/10 text-destructive border border-transparent hover:border-destructive/20 px-3 py-1.5 rounded-md transition-all flex items-center gap-2"
                                                    title="Supprimer uniquement ce résumé (le document reste intact)"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Supprimer le résumé</span>
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
                                                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                                                <div className="p-3 bg-muted text-muted-foreground rounded-full">
                                                                    <FileText className="h-6 w-6" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-foreground">Aucun résumé disponible</p>
                                                                    <p className="text-sm text-muted-foreground mt-1">Générez une fiche de synthèse pour ce document en un clic.</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setIsSummaryOptionsOpen(true)}
                                                                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                                                                >
                                                                    <Sparkles className="h-4 w-4" />
                                                                    <span>Générer un résumé</span>
                                                                </button>
                                                            </div>
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

            <SideBySidePickerModal
                isOpen={isSideBySidePickerOpen}
                onClose={() => setIsSideBySidePickerOpen(false)}
                currentCourseId={courseId}
                currentItemId={item.id}
                onSelectItem={(selected) => {
                    setSideBySideItem(selected)
                    setIsSwapped(false)
                }}
            />

        </div>
    )
}


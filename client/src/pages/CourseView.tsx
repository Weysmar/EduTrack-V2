import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CreateItemModal } from '@/components/CreateItemModal'
import { EditCourseModal } from '@/components/EditCourseModal'
import { BulkActionBar } from '@/components/BulkActionBar'
import { CourseSettingsModal } from '@/components/CourseSettingsModal'
import { ExportConfigModal } from '@/components/ExportConfigModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { usePdfExport } from '@/hooks/usePdfExport'
import { useLanguage } from '@/components/language-provider'
import { Trash2, Settings, FileText, Dumbbell, FolderOpen, Plus, FileDown, MonitorPlay, Brain, Play, ChevronDown, Layers, CheckSquare, Calendar, Pencil } from 'lucide-react'
import { StudyPlanView } from '@/components/StudyPlanView'
import { GeneratePlanModal } from '@/components/GeneratePlanModal'
import { SummaryPanel } from '@/components/SummaryPanel'
import { FilePreview } from '@/components/FilePreview'
import { API_URL } from '@/config'
import { useAuthStore } from '@/store/authStore'
import { SummaryOptionsModal } from '@/components/SummaryOptionsModal'
import { useSummary } from '@/hooks/useSummary'
import { DEFAULT_SUMMARY_OPTIONS, SummaryOptions } from '@/lib/summary/types'
import { courseQueries, itemQueries } from '@/lib/api/queries'

export function CourseView() {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const id = courseId || ''
    const queryClient = useQueryClient()
    const { t } = useLanguage()

    // --- Data Fetching with React Query ---
    const { data: course, isLoading: isCourseLoading } = useQuery({
        queryKey: ['courses', id],
        queryFn: () => courseQueries.getOne(id),
        enabled: !!id
    })

    const { data: items } = useQuery({
        queryKey: ['items', id],
        queryFn: () => itemQueries.getByCourse(id),
        enabled: !!id
    })

    // Placeholders for now until Flashcard/Quiz endpoints are real
    const flashcardSets = []
    const quizzes = []

    // Auth for Proxy URLs
    const token = useAuthStore(state => state.token)

    const toggleSelection = (itemId: string) => {
        const newSelection = new Set(selectedItems)
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId)
        } else {
            newSelection.add(itemId)
        }
        setSelectedItems(newSelection)
    }

    const clearSelection = () => {
        setSelectedItems(new Set())
    }

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return

        if (!confirm(t('bulk.delete_confirm') || 'Confirmer la suppression ?')) return

        setIsBulkDeleting(true)
        try {
            const { itemQueries } = await import('@/lib/api/queries')
            await itemQueries.bulkDelete(Array.from(selectedItems))
            await queryClient.invalidateQueries({ queryKey: ['items', id] })
            clearSelection()
        } catch (error) {
            console.error('Failed to bulk delete:', error)
        } finally {
            setIsBulkDeleting(false)
        }
    }

    // --- State ---
    const [activeTab, setActiveTab] = useState<'all' | 'exercise' | 'note' | 'resource' | 'flashcards' | 'plan'>('all')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [showSummary, setShowSummary] = useState(false)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // Generation State
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [generationMode, setGenerationMode] = useState<'flashcards' | 'quiz'>('flashcards')
    const [isGenerationMenuOpen, setIsGenerationMenuOpen] = useState(false)
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
    const [aggregatedContent, setAggregatedContent] = useState('')
    const generationMenuRef = useRef<HTMLDivElement>(null)

    const [dragActive, setDragActive] = useState(false)
    const [droppedFile, setDroppedFile] = useState<File | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const { exportCourse } = usePdfExport()

    // Summary Hook (Adjusted if needed for API, assuming hook logic is compatible or needs refactor too)
    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating } = useSummary(id, 'course')

    // --- Handlers ---

    const deleteCourseMutation = useMutation({
        mutationFn: courseQueries.delete,
        onSuccess: () => {
            navigate('/')
            queryClient.invalidateQueries({ queryKey: ['courses'] })
        }
    })

    const handleDelete = async () => {
        if (confirm(t('course.delete.confirm'))) {
            deleteCourseMutation.mutate(id)
        }
    }

    // Click outside handler logic...
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (generationMenuRef.current && !generationMenuRef.current.contains(event.target as Node)) {
                setIsGenerationMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Aggregated Content Logic
    const getAggregatedContent = async () => {
        if (!items) return ''
        const itemsToProcess: string[] = []
        for (const i of items) {
            // simplified extraction logic for now
            let itemText = i.content || i.extractedContent || ''
            itemsToProcess.push(`\n\n### ${i.title}\n(${i.type})\n${itemText}`)
        }
        return itemsToProcess.join(' ')
    }

    const handleOpenGeneration = async (mode: 'flashcards' | 'quiz') => {
        setIsGenerationMenuOpen(false)
        const content = await getAggregatedContent() // Async aggregation
        setAggregatedContent(content)
        setGenerationMode(mode)
        setIsGenerateModalOpen(true)
    }

    const handleGenerateSummary = async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) => {
        // Hook internal logic for API generation
        // Ensure useSummary Hook is API ready (Phase 4 task?)
        // For now keep UI
        const content = await getAggregatedContent()
        setShowSummary(true)
        generateSummary(options, content)
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    }
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setDroppedFile(e.dataTransfer.files[0]);
            setIsAddModalOpen(true);
        }
    }

    if (isCourseLoading) return <div className="p-10 text-center">Loading...</div>
    if (!course) return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>{t('course.notFound')}</p>
        </div>
    )

    // Filtering Logic
    const filteredItems = items?.filter((item: any) => {
        const matchesTab = activeTab === 'all' || item.type === activeTab
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesTab && matchesSearch
    })

    const allExercises = [
        ...(flashcardSets || []).map((s: any) => ({ ...s, type: 'flashcard' as const })),
        ...(quizzes || []).map((q: any) => ({ ...q, type: 'quiz' as const, count: q.questionCount, mastered: 0 }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as any[]

    const filteredExercises = allExercises.filter(ex =>
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Render (Simplified for brevity, assuming components accept props)
    // IMPORTANT: Child components like CreateItemModal also need refactoring to usage API instead of DB.
    // I will assume they are next on the list.

    return (
        <div
            className="h-full flex flex-col space-y-6 relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            {dragActive && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-primary border-dashed rounded-lg z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm">
                    <div className="bg-background p-4 rounded-lg shadow-lg">
                        <p className="text-lg font-bold text-primary flex items-center gap-2">
                            <FolderOpen className="h-6 w-6" /> {t('drop.title')}
                        </p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        {course.icon ? (
                            <span className="text-3xl">{course.icon}</span>
                        ) : (
                            <span className="w-4 h-4 rounded-full" style={{ backgroundColor: course.color || '#3b82f6' }} />
                        )}
                        {course.title}
                    </h1>
                    <p className="text-muted-foreground mt-1">{course.description}</p>
                </div>
                <div className="flex gap-2">
                    {/* Buttons... */}
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
                        <Plus className="h-4 w-4" /> {t('course.addContent')}
                    </button>
                    <button onClick={() => setIsEditModalOpen(true)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors" title={t('course.edit')}>
                        <Pencil className="h-5 w-5" />
                    </button>
                    <button onClick={handleDelete} className="p-2 text-destructive hover:bg-destructive/10 rounded-md" title={t('common.delete')}>
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b items-center justify-between">
                <div className="flex gap-2">
                    {['all', 'exercise', 'note', 'resource'].map((tab) => {
                        const tabKey = {
                            all: 'course.tabs.all',
                            exercise: 'course.tabs.exercises',
                            note: 'course.tabs.notes',
                            resource: 'course.tabs.resources'
                        }[tab] || `course.tabs.${tab}`;

                        return (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("px-4 py-2 text-sm font-medium border-b-2 capitalize", activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground")}>
                                {t(tabKey)}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {filteredItems?.map((item: any) => {
                        const typeKey = {
                            note: 'item.create.type.note',
                            exercise: 'item.create.type.exercise',
                            resource: 'item.create.type.resource'
                        }[item.type] || item.type;

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "group flex flex-col p-0 bg-card border rounded-xl hover:shadow-lg transition-all cursor-pointer relative overflow-hidden",
                                    selectedItems.has(item.id) ? "ring-2 ring-primary border-transparent z-10" : "border-border"
                                )
                                }
                                onClick={(e) => {
                                    // Navigate unless selecting
                                    navigate(`/course/${id}/item/${item.id}`)
                                }}
                            >
                                {/* Selection Checkbox (Visible on hover or if selected) */}
                                <div
                                    className={cn(
                                        "absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity",
                                        selectedItems.has(item.id) && "opacity-100"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => toggleSelection(item.id)}
                                        className={cn(
                                            "w-6 h-6 rounded-md border shadow-sm flex items-center justify-center transition-colors backdrop-blur-sm",
                                            selectedItems.has(item.id)
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "bg-background/80 border-muted-foreground/30 hover:border-primary"
                                        )}
                                    >
                                        {selectedItems.has(item.id) && <CheckSquare className="h-4 w-4" />}
                                    </button>
                                </div>

                                {/* TOP: File Preview / Header Area */}
                                <div className="w-full aspect-video bg-muted border-b relative group-hover:opacity-95 transition-opacity">
                                    {item.type === 'resource' ? (
                                        <FilePreview
                                            url={item.storageKey ? `${API_URL}/storage/proxy/${item.storageKey}?token=${token}` : item.fileUrl}
                                            fileName={item.fileName}
                                            fileType={item.fileType}
                                        />
                                    ) : (
                                        <div className={cn(
                                            "w-full h-full flex items-center justify-center",
                                            item.type === 'note' && "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-500",
                                            item.type === 'exercise' && "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-500"
                                        )}>
                                            {item.type === 'note' && <FileText className="h-12 w-12 opacity-50" />}
                                            {item.type === 'exercise' && <Dumbbell className="h-12 w-12 opacity-50" />}
                                        </div>
                                    )}

                                    {/* Type Badge Overlay */}
                                    <div className="absolute bottom-2 left-2 z-10">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md border border-white/10",
                                            item.type === 'resource' && "bg-blue-500/90 text-white",
                                            item.type === 'note' && "bg-yellow-500/90 text-white",
                                            item.type === 'exercise' && "bg-green-500/90 text-white"
                                        )}>
                                            {t(typeKey)}
                                        </span>
                                    </div>
                                </div>

                                {/* CONTENT: Text Info */}
                                <div className="p-3 flex flex-col gap-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors" title={item.title}>
                                            {item.title}
                                        </h3>
                                    </div>

                                    <div className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short'
                                        })}

                                        {item.fileName && (
                                            <>
                                                <span className="mx-1">•</span>
                                                <span className="truncate max-w-[80px]" title={item.fileName}>
                                                    {item.fileName}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Modals */}
            <CreateItemModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                courseId={id}
                initialFile={droppedFile}
            />
            <EditCourseModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                course={course}
            />

            <BulkActionBar
                selectedCount={selectedItems.size}
                onClearSelection={clearSelection}
                onDelete={handleBulkDelete}
                isDeleting={isBulkDeleting}
            />
            {/* Other modals... */}
        </div>
    )
}

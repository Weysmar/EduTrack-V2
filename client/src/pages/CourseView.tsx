import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CreateItemModal } from '@/components/CreateItemModal'
import { EditCourseModal } from '@/components/EditCourseModal'
import { BulkActionBar } from '@/components/BulkActionBar'
import { CourseSettingsModal } from '@/components/CourseSettingsModal'
import { ExportConfigModal } from '@/components/ExportConfigModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { usePdfExport } from '@/hooks/usePdfExport'
import { useLanguage } from '@/components/language-provider'
import { Trash2, Settings, FileText, Dumbbell, FolderOpen, Plus, FileDown, MonitorPlay, Brain, Play, ChevronDown, Layers, CheckSquare, Calendar, Pencil, LayoutGrid, List, ArrowUpDown } from 'lucide-react'
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

    // View Options State
    const [sortOption, setSortOption] = useState<'alpha' | 'date' | 'last_opened'>('date')
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [gridColumns, setGridColumns] = useState<4 | 5 | 6 | 10>(4)

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

    // Filtering & Sorting Logic
    const filteredItems = useMemo(() => {
        let result = items?.filter((item: any) => {
            const matchesTab = activeTab === 'all' || item.type === activeTab
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesTab && matchesSearch
        }) || []

        // Sort logic
        result.sort((a: any, b: any) => {
            if (sortOption === 'alpha') {
                return a.title.localeCompare(b.title)
            } else if (sortOption === 'last_opened') {
                // Fallback to updatedAt if lastOpened doesn't exist yet
                const dateA = new Date(a.updatedAt || a.createdAt).getTime();
                const dateB = new Date(b.updatedAt || b.createdAt).getTime();
                return dateB - dateA;
            } else {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            }
        })

        return result
    }, [items, activeTab, searchQuery, sortOption])

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

    const handleSelectAll = (filteredItemsList: any[]) => {
        if (selectedItems.size === filteredItemsList.length && filteredItemsList.length > 0) {
            clearSelection()
        } else {
            const newSelection = new Set(filteredItemsList.map(item => item.id))
            setSelectedItems(newSelection)
        }
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

    // Rendering Helper for List View
    const renderListViewItem = (item: any, isSelected: boolean) => {
        const typeKey = {
            note: 'item.create.type.note',
            exercise: 'item.create.type.exercise',
            resource: 'item.create.type.resource'
        }[item.type] || item.type;

        return (
            <div
                key={item.id}
                onClick={() => navigate(`/course/${id}/item/${item.id}`)}
                className={cn(
                    "group flex items-center justify-between p-3 bg-card border rounded-lg hover:shadow-md transition-all cursor-pointer",
                    isSelected ? "ring-1 ring-primary border-primary bg-primary/5" : "border-border"
                )}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        onClick={(e) => { e.stopPropagation(); toggleSelection(item.id) }}
                        className={cn("w-5 h-5 rounded border flex items-center justify-center cursor-pointer flex-shrink-0 transition-colors",
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground hover:border-primary"
                        )}
                    >
                        {isSelected && <CheckSquare className="h-3 w-3" />}
                    </div>

                    <div className={cn("w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0",
                        item.type === 'note' && "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400",
                        item.type === 'exercise' && "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400",
                        item.type === 'resource' && "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                    )}>
                        {item.type === 'note' && <FileText className="h-5 w-5" />}
                        {item.type === 'exercise' && <Dumbbell className="h-5 w-5" />}
                        {item.type === 'resource' && <FolderOpen className="h-5 w-5" />}
                    </div>

                    <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{item.title}</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{t(typeKey)}</span>
                            <span>•</span>
                            <span className="truncate">{new Date(item.createdAt).toLocaleDateString()}</span>
                            {item.fileName && (
                                <>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px]">{item.fileName}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Grid Columns Class
    const gridColsClass = {
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        6: 'grid-cols-1 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-6',
        10: 'grid-cols-2 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10',
    }[gridColumns]


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
            <div className="flex flex-col gap-4 border-b pb-4">
                <div className="flex items-center justify-between">
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

                {/* Toolbar: Sort & View Options */}
                <div className="flex items-center justify-between bg-muted/30 p-2 rounded-lg gap-4 overflow-x-auto">

                    {/* Left: Sort & Select All */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('sort.by')}:</span>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as 'alpha' | 'date' | 'last_opened')}
                                className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer text-foreground [&>option]:bg-background [&>option]:text-foreground"
                            >
                                <option value="date">{t('sort.date')}</option>
                                <option value="alpha">{t('sort.alpha')}</option>
                                <option value="last_opened">{t('sort.last_opened')}</option>
                            </select>
                        </div>
                        <div className="h-4 w-px bg-border hidden sm:block"></div>
                        <button
                            onClick={() => handleSelectAll(filteredItems)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <div className={cn("w-4 h-4 border rounded flex items-center justify-center transition-colors",
                                selectedItems.size > 0 && selectedItems.size === filteredItems.length ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                            )}>
                                {selectedItems.size > 0 && selectedItems.size === filteredItems.length && <CheckSquare className="h-3 w-3" />}
                            </div>
                            {t('action.selectAll')}
                        </button>
                    </div>

                    {/* Right: View Toggles */}
                    <div className="flex items-center gap-2">
                        {viewMode === 'grid' && (
                            <div className="flex items-center gap-2 mr-2">
                                <span className="text-xs text-muted-foreground">{t('grid.columns')}:</span>
                                <select
                                    value={gridColumns}
                                    onChange={(e) => setGridColumns(Number(e.target.value) as any)}
                                    className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer text-foreground p-0 [&>option]:bg-background [&>option]:text-foreground"
                                >
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                    <option value={6}>6</option>
                                    <option value={10}>10</option>
                                </select>
                            </div>
                        )}
                        <div className="flex items-center bg-background border rounded-md p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn("p-1.5 rounded transition-all", viewMode === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                                title={t('view.grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={cn("p-1.5 rounded transition-all", viewMode === 'list' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                                title={t('view.list')}
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto">
                <div className={cn(
                    "gap-4 pb-20",
                    viewMode === 'grid' ? `grid ${gridColsClass}` : "flex flex-col space-y-2"
                )}>
                    {filteredItems?.map((item: any) => {
                        const isSelected = selectedItems.has(item.id)

                        // --- LIST VIEW ITEM ---
                        if (viewMode === 'list') {
                            return renderListViewItem(item, isSelected)
                        }

                        // --- GRID VIEW ITEM ---
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
                                    isSelected ? "ring-2 ring-primary ring-inset border-transparent z-10" : "border-border"
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
                                        isSelected && "opacity-100"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => toggleSelection(item.id)}
                                        className={cn(
                                            "w-6 h-6 rounded-md border shadow-sm flex items-center justify-center transition-colors backdrop-blur-sm",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "bg-background/80 border-muted-foreground/30 hover:border-primary"
                                        )}
                                    >
                                        {isSelected && <CheckSquare className="h-4 w-4" />}
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
                                <div className="p-4 flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2" title={item.title}>
                                            {item.title}
                                        </h3>
                                    </div>

                                    <div className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-2 overflow-hidden">
                                        <Calendar className="h-3 w-3 flex-shrink-0" />
                                        <span className="flex-shrink-0">
                                            {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </span>

                                        {item.fileName && (
                                            <>
                                                <span className="opacity-50 flex-shrink-0">•</span>
                                                <span className="truncate" title={item.fileName}>
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

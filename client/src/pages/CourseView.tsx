import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { CourseGridItem } from '@/components/CourseGridItem'
import { CourseListItem } from '@/components/CourseListItem'
import { cn } from '@/lib/utils'
import { CreateItemModal } from '@/components/CreateItemModal'
import { EditCourseModal } from '@/components/EditCourseModal'
import { BulkActionBar } from '@/components/BulkActionBar'
import { CourseSettingsModal } from '@/components/CourseSettingsModal'
import { ExportConfigModal } from '@/components/ExportConfigModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { usePdfExport } from '@/hooks/usePdfExport'
import { useLanguage } from '@/components/language-provider'
import { Trash2, Settings, FileText, Dumbbell, FolderOpen, Plus, FileDown, MonitorPlay, Brain, Play, ChevronDown, Layers, CheckSquare, Calendar, Pencil, LayoutGrid, List, ArrowUpDown, Image as ImageIcon } from 'lucide-react'
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
    const [showThumbnails, setShowThumbnails] = useState(() => {
        const saved = localStorage.getItem('showThumbnails');
        return saved !== null ? JSON.parse(saved) : true;
    })
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

    const handleDelete = useCallback(async () => {
        if (confirm(t('course.delete.confirm'))) {
            deleteCourseMutation.mutate(id)
        }
    }, [t, deleteCourseMutation, id])

    const toggleSelection = useCallback((itemId: string) => {
        setSelectedItems(prev => {
            const newSelection = new Set(prev)
            if (newSelection.has(itemId)) {
                newSelection.delete(itemId)
            } else {
                newSelection.add(itemId)
            }
            return newSelection
        })
    }, [])

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set())
    }, [])

    const handleSelectAll = useCallback((filteredItemsList: any[]) => {
        setSelectedItems(prev => {
            if (prev.size === filteredItemsList.length && filteredItemsList.length > 0) {
                return new Set()
            } else {
                return new Set(filteredItemsList.map(item => item.id))
            }
        })
    }, [])

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
    const getAggregatedContent = async (itemIds?: string[]) => {
        if (!items) return ''
        const itemsToProcess = itemIds
            ? items.filter(i => itemIds.includes(i.id))
            : items

        const content: string[] = []
        for (const i of itemsToProcess) {
            // simplified extraction logic for now
            let itemText = i.content || i.extractedContent || ''
            content.push(`\n\n### ${i.title}\n(${i.type})\n${itemText}`)
        }
        return content.join(' ')
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

    // Bulk Generation Handler
    const handleBulkGeneration = async (mode: 'flashcards' | 'quiz' | 'summary') => {
        if (selectedItems.size === 0) return

        const selectedItemIds = Array.from(selectedItems)
        const content = await getAggregatedContent(selectedItemIds)
        setAggregatedContent(content)

        if (mode === 'summary') {
            setShowSummary(true)
            generateSummary(DEFAULT_SUMMARY_OPTIONS, content)
        } else {
            setGenerationMode(mode)
            setIsGenerateModalOpen(true)
        }
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
            <div className="flex flex-col gap-4 border-b pb-4 mt-2 sm:mt-0 px-2 sm:px-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3 truncate">
                            {course.icon ? (
                                <span className="text-2xl sm:text-3xl shrink-0">{course.icon}</span>
                            ) : (
                                <span className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shrink-0" style={{ backgroundColor: course.color || '#3b82f6' }} />
                            )}
                            <span className="truncate">{course.title}</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">{course.description}</p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs sm:text-sm font-medium hover:bg-primary/90 transition-all active:scale-95 shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="whitespace-nowrap">{t('course.addContent')}</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setIsEditModalOpen(true)} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors" title={t('course.edit')}>
                                <Pencil className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                            <button onClick={handleDelete} className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title={t('common.delete')}>
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar: Sort & View Options */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 sm:p-4 bg-muted/20 border rounded-xl">
                    {/* Left: Sorting & Global Selection */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground whitespace-nowrap">
                                {t('sort.label')}:
                            </span>
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value as any)}
                                className="bg-transparent text-xs sm:text-sm font-medium border-none focus:ring-0 cursor-pointer text-foreground p-0 [&>option]:bg-background [&>option]:text-foreground"
                            >
                                <option value="date">{t('sort.dateAdded')}</option>
                                <option value="alpha">{t('sort.alphabetical')}</option>
                                <option value="last_opened">{t('sort.lastOpened')}</option>
                            </select>
                        </div>
                        <div className="h-4 w-px bg-border hidden sm:block"></div>
                        <button
                            onClick={() => handleSelectAll(filteredItems)}
                            className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                                <button
                                    onClick={() => {
                                        const newValue = !showThumbnails;
                                        setShowThumbnails(newValue);
                                        localStorage.setItem('showThumbnails', JSON.stringify(newValue));
                                    }}
                                    className={cn("p-1.5 rounded transition-all mr-2", showThumbnails ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400" : "text-muted-foreground hover:bg-muted")}
                                    title={showThumbnails ? t('view.thumbnails_on') || "Masquer aperçus" : t('view.thumbnails_off') || "Afficher aperçus"}
                                >
                                    <ImageIcon className="h-4 w-4" />
                                </button>
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

                        if (viewMode === 'list') {
                            return (
                                <CourseListItem
                                    key={item.id}
                                    item={item}
                                    isSelected={isSelected}
                                    onToggleSelection={toggleSelection}
                                />
                            )
                        }

                        return (
                            <CourseGridItem
                                key={item.id}
                                item={item}
                                isSelected={isSelected}
                                showThumbnails={showThumbnails}
                                onToggleSelection={toggleSelection}
                            />
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
                onGenerate={handleBulkGeneration}
                isDeleting={isBulkDeleting}
            />

            <GenerateExerciseModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                sourceContent={aggregatedContent}
                sourceTitle={`${selectedItems.size} ${selectedItems.size > 1 ? t('bulk.selected_plural') : t('bulk.selected_singular')}`}
                courseId={id}
                initialMode={generationMode}
            />

            {showSummary && (
                <SummaryPanel
                    summary={summary}
                    onClose={() => setShowSummary(false)}
                    isLoading={isSummaryGenerating}
                    onConfigure={() => setIsSummaryOptionsOpen(true)}
                    onRegenerate={() => handleGenerateSummary()}
                />
            )}

            <SummaryOptionsModal
                isOpen={isSummaryOptionsOpen}
                onClose={() => setIsSummaryOptionsOpen(false)}
                onGenerate={handleGenerateSummary}
            />
        </div>
    )
}

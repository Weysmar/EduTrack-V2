import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useRef, useEffect, useCallback } from 'react'
import { CreateItemModal } from '@/components/CreateItemModal'
import { EditCourseModal } from '@/components/EditCourseModal'
import { BulkActionBar } from '@/components/BulkActionBar'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { useLanguage } from '@/components/language-provider'
import { Trash2, FolderOpen, Plus, Pencil } from 'lucide-react'
import { SummaryPanel } from '@/components/SummaryPanel'
import { useAuthStore } from '@/store/authStore'
import { SummaryOptionsModal } from '@/components/SummaryOptionsModal'
import { useSummary } from '@/hooks/useSummary'
import { DEFAULT_SUMMARY_OPTIONS, SummaryOptions } from '@/lib/summary/types'
import { courseQueries } from '@/lib/api/queries'

// New Hooks & Components
import { useCourseContent } from '@/hooks/useCourseContent'
import { useCourseFilters } from '@/hooks/useCourseFilters'
import { CourseFilters } from '@/components/course/CourseFilters'
import { CourseToolbar } from '@/components/course/CourseToolbar'
import { CourseContent } from '@/components/course/CourseContent'

export function CourseView() {
    const { courseId } = useParams()
    const navigate = useNavigate()
    const id = courseId || ''
    const queryClient = useQueryClient()
    const { t } = useLanguage()

    // --- Pagination State ---
    const [itemPage, setItemPage] = useState(1)
    const [allVisibleItems, setAllVisibleItems] = useState<any[]>([])

    // --- Hooks ---
    const { 
        course, 
        isLoading: isCourseLoading, 
        allItems, 
        itemPages,
        refetch: refetchContent 
    } = useCourseContent(id, itemPage)

    // Accumulate items when pages change
    useEffect(() => {
        if (allItems) {
            setAllVisibleItems(prev => {
                const existingIds = new Set(prev.map(i => i.id))
                const filtered = allItems.filter(i => !existingIds.has(i.id))
                return [...prev, ...filtered]
            })
        }
    }, [allItems])

    // Reset when course changes
    useEffect(() => {
        setAllVisibleItems([])
        setItemPage(1)
    }, [id])

    const {
        activeFilters, toggleFilter,
        filteredItems,
        sortOption, setSortOption,
        selectedItems, toggleSelection, clearSelection, handleSelectAll
    } = useCourseFilters(allVisibleItems)

    // --- State ---
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [showSummary, setShowSummary] = useState(false)

    // View Options preserved in local state/storage 
    const [showThumbnails, setShowThumbnails] = useState(() => {
        const saved = localStorage.getItem('showThumbnails');
        return saved !== null ? JSON.parse(saved) : true;
    })
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [gridColumns, setGridColumns] = useState<4 | 5 | 6 | 10>(4)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // Generation State
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [generationMode, setGenerationMode] = useState<'flashcards' | 'quiz'>('flashcards')
    const [isGenerationMenuOpen, setIsGenerationMenuOpen] = useState(false)
    const [aggregatedContent, setAggregatedContent] = useState('')
    const generationMenuRef = useRef<HTMLDivElement>(null)

    const [dragActive, setDragActive] = useState(false)
    const [droppedFile, setDroppedFile] = useState<File | null>(null)

    const { summary, generate: generateSummary, isGenerating: isSummaryGenerating } = useSummary(id, 'course', undefined, id)

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

    const handleBulkDelete = async () => {
        if (selectedItems.size === 0) return
        if (!confirm(t('bulk.delete_confirm') || 'Confirmer la suppression ?')) return

        setIsBulkDeleting(true)
        try {
            const { itemQueries, summaryQueries, flashcardQueries, quizQueries, mindmapQueries } = await import('@/lib/api/queries')
            const itemsToDelete = allVisibleItems.filter(i => selectedItems.has(i.id))

            const regularItems = itemsToDelete.filter(i => !['summary', 'flashcards', 'quiz', 'mindmap'].includes(i.type))
            const summaries = itemsToDelete.filter(i => i.type === 'summary')
            const flashcards = itemsToDelete.filter(i => i.type === 'flashcards')
            const quizzes = itemsToDelete.filter(i => i.type === 'quiz')
            const mindmaps = itemsToDelete.filter(i => i.type === 'mindmap')

            const promises = []
            if (regularItems.length > 0) promises.push(itemQueries.bulkDelete(regularItems.map(i => i.id)))
            summaries.forEach(s => promises.push(summaryQueries.delete(s.id)))
            flashcards.forEach(f => promises.push(flashcardQueries.delete(f.id)))
            quizzes.forEach(q => promises.push(quizQueries.delete(q.id)))
            mindmaps.forEach(m => promises.push(mindmapQueries.delete(m.id)))

            await Promise.allSettled(promises)
            toast.success(t('bulk.delete_success') || "Éléments supprimés")
            
            // Clean up local state
            setAllVisibleItems(prev => prev.filter(i => !selectedItems.has(i.id)))
            clearSelection()
        } catch (error: any) {
            toast.error(t('bulk.delete_error') || "Erreur lors de la suppression")
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const getAggregatedContent = async (itemIds?: string[]) => {
        if (!allVisibleItems) return ''
        const itemsToProcess = itemIds ? allVisibleItems.filter(i => itemIds.includes(i.id)) : allVisibleItems
        const content: string[] = []
        for (const i of itemsToProcess) {
            let itemText = i.content || i.extractedContent || ''
            const relatedSummary = allVisibleItems.find(s => s.type === 'summary' && s.itemId === i.id)
            if (!itemText && relatedSummary?.content) itemText = relatedSummary.content
            if (itemText) content.push(`\n\n### ${i.title}\n(${i.type})\n${itemText}`)
        }
        return content.join(' ')
    }

    const handleGenerateSummary = async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) => {
        const content = await getAggregatedContent()
        setShowSummary(true)
        generateSummary(options, content)
    }

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

    const toggleThumbnails = () => {
        const newValue = !showThumbnails;
        setShowThumbnails(newValue);
        localStorage.setItem('showThumbnails', JSON.stringify(newValue));
    }

    if (isCourseLoading) return <div className="p-10 text-center">Loading...</div>
    if (!course) return <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><p>{t('course.notFound')}</p></div>

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

                <CourseFilters activeFilters={activeFilters} onToggle={toggleFilter} />

                <CourseToolbar
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    showThumbnails={showThumbnails}
                    onToggleThumbnails={toggleThumbnails}
                    gridColumns={gridColumns}
                    onGridColumnsChange={(cols) => setGridColumns(cols as 4 | 5 | 6 | 10)}
                    currentCount={filteredItems.length}
                    selectedCount={selectedItems.size}
                    onSelectAll={handleSelectAll}
                />
            </div>

            <div className="flex-1 space-y-8">
                <CourseContent
                    items={filteredItems}
                    viewMode={viewMode}
                    gridColumns={gridColumns}
                    selectedItems={selectedItems}
                    onToggleSelection={toggleSelection}
                    showThumbnails={showThumbnails}
                />

                {itemPage < itemPages && (
                    <div className="flex justify-center pb-10">
                        <button
                            onClick={() => setItemPage(prev => prev + 1)}
                            className="px-8 py-3 rounded-full border border-primary/20 hover:bg-primary/5 text-primary font-medium flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Plus className="h-4 w-4" />
                            {t('common.loadMore') || "Charger plus d'éléments"}
                        </button>
                    </div>
                )}
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

import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { folderQueries, courseQueries, itemQueries } from '@/lib/api/queries'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { Plus, FolderPlus, ArrowLeft, Folder as FolderIcon, Trash2, Brain, Loader2, Pencil, Menu, Sparkles, FileText } from 'lucide-react'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { EditFolderModal } from '@/components/EditFolderModal'
import { SummaryOptionsModal } from '@/components/SummaryOptionsModal'
import { SummaryResultModal } from '@/components/SummaryResultModal'
import { useSummary } from '@/hooks/useSummary'
import { SummaryOptions, DEFAULT_SUMMARY_OPTIONS } from '@/lib/summary/types'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'

export function FolderView() {
    const { folderId } = useParams()
    const navigate = useNavigate()
    const { toggleSidebar } = useUIStore()
    const { activeProfile } = useProfileStore()
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const { data: folder, isLoading } = useQuery({
        queryKey: ['folders', folderId],
        queryFn: () => folderQueries.getOne(folderId!),
        enabled: !!folderId
    })

    // Subfolders and courses in this folder
    const { data: allFolders } = useQuery({
        queryKey: ['folders'],
        queryFn: folderQueries.getAll,
        enabled: !!activeProfile
    })

    const { data: coursesData } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseQueries.getAll(1, 1000), // Get all to filter locally
        enabled: !!activeProfile
    })

    const subFolders = allFolders?.filter((f: any) => f.parentId === folderId) || []
    const courses = coursesData?.courses?.filter((c: any) => c.folderId === folderId) || []

    const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)
    const [isEditFolderOpen, setIsEditFolderOpen] = useState(false)
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [isSummaryOptionsOpen, setIsSummaryOptionsOpen] = useState(false)
    const [showSummaryModal, setShowSummaryModal] = useState(false)
    const [isAggregating, setIsAggregating] = useState(false)
    const [aggregatedContent, setAggregatedContent] = useState('')

    // Summary hook for this folder
    const {
        summary,
        generate: generateSummary,
        isGenerating: isSummaryGenerating,
        remove: removeSummary
    } = useSummary(folderId || '', 'folder')

    const createFolderMutation = useMutation({
        mutationFn: folderQueries.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success(t('folder.create.success') || "Folder created")
        },
        onError: () => {
            toast.error(t('folder.create.error') || "Failed to create folder")
        }
    })

    const deleteFolderMutation = useMutation({
        mutationFn: folderQueries.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['folders'] })
            toast.success(t('folder.delete.success') || "Folder deleted")
            navigate(-1)
        },
        onError: () => {
            toast.error(t('folder.delete.error') || "Failed to delete folder")
        }
    })

    const handleCreateFolder = async () => {
        const name = prompt(t('folder.create.prompt') || "Folder Name:")
        if (name) {
            createFolderMutation.mutate({
                name,
                parentId: folderId,
                profileId: activeProfile?.id
            })
        }
    }

    const getFolderAggregatedContent = async () => {
        if (!courses || courses.length === 0) {
            toast.error(t('folder.summary.noCourses') || "Aucun cours dans ce dossier pour générer du contenu.")
            return null
        }

        setIsAggregating(true)
        try {
            const itemsRes = await itemQueries.getAll(1, 1000)
            const items = itemsRes.items || []
            const courseIds = courses.map((c: any) => c.id)
            const filteredItems = items.filter((i: any) => courseIds.includes(i.courseId));

            const itemsToProcess: string[] = []

            for (const i of filteredItems) {
                let itemText = i.extractedContent || i.content || ''
                if (itemText.trim().length > 0) {
                    itemsToProcess.push(`\n\n### ${i.title}\n(${i.type})\n${itemText}`)
                }
            }

            const content = itemsToProcess.join(' ')
            if (!content.trim()) {
                toast.warning(t('folder.summary.noContent') || "Aucun contenu textuel disponible dans les cours de ce dossier.")
                return null
            }
            return content
        } catch (e) {
            console.error(e)
            toast.error("Erreur lors de la récupération des contenus.")
            return null
        } finally {
            setIsAggregating(false)
        }
    }

    const handleOpenGeneration = async () => {
        const content = await getFolderAggregatedContent()
        if (content) {
            setAggregatedContent(content)
            setIsGenerateModalOpen(true)
        }
    }

    const handleOpenSummaryGeneration = async () => {
        const content = await getFolderAggregatedContent()
        if (content) {
            setAggregatedContent(content)
            setIsSummaryOptionsOpen(true)
        }
    }

    const handleGenerateSummary = async (options: SummaryOptions = DEFAULT_SUMMARY_OPTIONS) => {
        setIsSummaryOptionsOpen(false)
        toast.info(t('summary.generating') || "Génération du résumé du dossier en cours...")
        try {
            await generateSummary(options, aggregatedContent)
            setShowSummaryModal(true)
        } catch (e) {
            console.error("Summary generation error:", e)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">{t('status.loading')}</div>
    }

    if (!folder) return <div>Folder not found</div>

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-background/50">
            {/* Header */}
            <div className="p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card">
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={() => {
                            if (folder?.parentId) {
                                navigate(`/edu/folder/${folder.parentId}`)
                            } else {
                                navigate('/edu/dashboard')
                            }
                        }}
                        className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-1.5"
                        title={folder?.parentId ? "Dossier parent" : "Tableau de bord / Menu"}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground lg:hidden"
                        title="Afficher la sidebar"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    <div className="p-2.5 md:p-3 bg-primary/10 rounded-lg shrink-0">
                        <FolderIcon className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl md:text-2xl font-bold truncate">{folder.name}</h1>
                            <button
                                onClick={() => setIsEditFolderOpen(true)}
                                className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                title={t('folder.edit') || "Renommer le dossier"}
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-muted-foreground text-xs md:text-sm truncate">
                            {subFolders?.length || 0} dossiers • {courses?.length || 0} cours
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setIsCreateCourseOpen(true)}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground py-2 px-3 sm:px-4 rounded-md hover:opacity-90 transition-opacity text-xs sm:text-sm font-medium shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('nav.newCourse')}</span>
                    </button>

                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center gap-1.5 bg-muted text-muted-foreground py-2 px-3 sm:px-4 rounded-md hover:bg-muted/80 transition-colors text-xs sm:text-sm font-medium"
                    >
                        <FolderPlus className="h-4 w-4" />
                        <span>{t('folder.create.sub')}</span>
                    </button>

                    {/* Generate Exercises Button */}
                    <button
                        onClick={handleOpenGeneration}
                        disabled={isAggregating || isSummaryGenerating}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-indigo-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 shadow-sm"
                    >
                        {isAggregating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                        <span className="hidden sm:inline">Générer Exercices IA</span>
                        <span className="sm:hidden">Exercices IA</span>
                    </button>

                    {/* Generate Folder Summary Button */}
                    <button
                        onClick={handleOpenSummaryGeneration}
                        disabled={isAggregating || isSummaryGenerating}
                        className="flex items-center gap-1.5 bg-violet-600 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-violet-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 shadow-sm"
                        title="Générer une fiche de synthèse pour l'ensemble des cours du dossier"
                    >
                        {isSummaryGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        <span className="hidden sm:inline">{summary ? 'Régénérer Résumé IA' : 'Générer Résumé IA'}</span>
                        <span className="sm:hidden">Résumé IA</span>
                    </button>

                    {/* View existing summary button */}
                    {summary && (
                        <button
                            onClick={() => setShowSummaryModal(true)}
                            className="flex items-center gap-1.5 bg-card border border-violet-500/30 text-violet-600 dark:text-violet-400 py-2 px-3 sm:px-4 rounded-md hover:bg-violet-500/10 transition-colors text-xs sm:text-sm font-medium shadow-sm"
                            title="Afficher le résumé de ce dossier"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Voir le résumé</span>
                            <span className="sm:hidden">Résumé</span>
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (confirm(t('folder.delete.confirm'))) {
                                deleteFolderMutation.mutate(folderId!)
                            }
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors ml-auto"
                        title={t('action.delete')}
                    >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

                {/* Folder Summary Banner Card if available */}
                {summary && (
                    <div className="bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3.5 min-w-0">
                            <div className="p-2.5 bg-violet-600/10 text-violet-600 dark:text-violet-400 rounded-lg shrink-0 mt-0.5">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                                        Résumé du dossier : {folder.name}
                                    </h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 font-medium">
                                        IA
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                                    {typeof summary.content === 'string' ? summary.content.replace(/[#*`_]/g, '').slice(0, 200) : ''}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                    {summary.stats?.summaryWordCount && (
                                        <span>{summary.stats.summaryWordCount} mots</span>
                                    )}
                                    {summary.stats?.originalWordCount && (
                                        <>
                                            <span>•</span>
                                            <span>Source : {summary.stats.originalWordCount} mots</span>
                                        </>
                                    )}
                                    <span>•</span>
                                    <span>{new Date(summary.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                                onClick={() => setShowSummaryModal(true)}
                                className="px-3.5 py-2 bg-violet-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Lire le résumé</span>
                            </button>
                            <button
                                onClick={handleOpenSummaryGeneration}
                                disabled={isAggregating || isSummaryGenerating}
                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                title="Régénérer avec de nouvelles options"
                            >
                                <Sparkles className="h-4 w-4" />
                            </button>
                            <button
                                onClick={async () => {
                                    if (confirm("Supprimer ce résumé ?")) {
                                        await removeSummary()
                                    }
                                }}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                title="Supprimer le résumé"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                    {/* Render Sub-Folders */}
                    {subFolders?.map((sub: any) => (
                        <Link
                            key={`sub-${sub.id}`}
                            to={`/edu/folder/${sub.id}`}
                            className="bg-card border rounded-lg p-4 hover:shadow-md transition-all flex items-center gap-3 group"
                        >
                            <FolderIcon className="h-8 w-8 text-muted-foreground group-hover:text-foreground fill-muted/10 group-hover:fill-muted/30 transition-colors" />
                            <div className="overflow-hidden">
                                <h3 className="font-semibold truncate">{sub.name}</h3>
                                <p className="text-xs text-muted-foreground">{t('common.folder')}</p>
                            </div>
                        </Link>
                    ))}

                    {/* Render Courses */}
                    {courses?.map((course: any) => (
                        <Link
                            key={`course-${course.id}`}
                            to={`/edu/course/${course.id}`}
                            className="bg-card border rounded-lg p-4 hover:shadow-md transition-all flex items-center gap-3 group"
                        >
                            {course.icon ? (
                                <span className="w-8 h-8 flex items-center justify-center text-2xl leading-none bg-primary/5 rounded-full">{course.icon}</span>
                            ) : (
                                <span
                                    className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
                                    style={{ backgroundColor: course.color }}
                                />
                            )}
                            <div className="overflow-hidden">
                                <h3 className="font-semibold truncate">{course.title}</h3>
                                <p className="text-xs text-muted-foreground truncate">{course.description || t('common.noDesc')}</p>
                            </div>
                        </Link>
                    ))}

                    {/* Empty State */}
                    {subFolders?.length === 0 && courses?.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <FolderIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>{t('folder.empty')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <CreateCourseModal
                isOpen={isCreateCourseOpen}
                onClose={() => setIsCreateCourseOpen(false)}
                initialFolderId={folderId}
            />

            <GenerateExerciseModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                sourceContent={aggregatedContent}
                sourceTitle={folder.name}
            />

            <SummaryOptionsModal
                isOpen={isSummaryOptionsOpen}
                onClose={() => setIsSummaryOptionsOpen(false)}
                onGenerate={handleGenerateSummary}
                initialOptions={summary?.options}
            />

            <SummaryResultModal
                summary={summary}
                isOpen={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
                onDelete={removeSummary ? async () => {
                    await removeSummary()
                    setShowSummaryModal(false)
                } : undefined}
            />

            <EditFolderModal
                isOpen={isEditFolderOpen}
                onClose={() => setIsEditFolderOpen(false)}
                folder={folder}
            />
        </div>
    )
}

import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from "sonner"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { folderQueries, courseQueries, itemQueries } from '@/lib/api/queries'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { Plus, FolderPlus, ArrowLeft, Folder as FolderIcon, Trash2, Brain, Loader2 } from 'lucide-react'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { GenerateExerciseModal } from '@/components/GenerateExerciseModal'
import { useProfileStore } from '@/store/profileStore'

export function FolderView() {
    const { folderId } = useParams()
    const navigate = useNavigate()
    const { activeProfile } = useProfileStore()
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const { data: folder, isLoading } = useQuery({
        queryKey: ['folders', folderId],
        queryFn: () => folderQueries.getOne(folderId!),
        enabled: !!folderId
    })

    // Helper to get subfolders and courses. 
    // Ideally backend 'getOne' folder includes children, or we fetch separate.
    // Assuming separated for now or we filter 'getAll'.
    // Let's assume we use 'getAll' and filter for now as it's easier given API limit info.
    const { data: allFolders } = useQuery({
        queryKey: ['folders'],
        queryFn: folderQueries.getAll,
        enabled: !!activeProfile
    })

    const { data: allCourses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    })

    const subFolders = allFolders?.filter((f: any) => f.parentId === folderId) || []
    const courses = allCourses?.filter((c: any) => c.folderId === folderId) || []

    const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false)
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
    const [isAggregating, setIsAggregating] = useState(false)
    const [aggregatedContent, setAggregatedContent] = useState('')

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

    const handleOpenGeneration = async () => {
        if (!courses || courses.length === 0) {
            toast.error("No courses in this folder to generate from.")
            return
        }

        setIsAggregating(true)
        try {
            // Need to fetch items for ALL courses in this folder.
            // Using itemQueries.getAll() and filtering active courseIds? 
            // Better: itemQueries could accept a list or we loop?
            // For now, let's fetch all items (which might be cached) and filter.
            const itemsRes = await itemQueries.getAll()
            const courseIds = courses.map((c: any) => c.id)
            const items = itemsRes.filter((i: any) => courseIds.includes(i.courseId));

            const itemsToProcess: string[] = []

            for (const i of items) {
                let itemText = i.extractedContent || i.content || ''
                if (itemText.trim().length > 0) {
                    itemsToProcess.push(`\n\n### ${i.title}\n(${i.type})\n${itemText}`)
                }
            }

            const content = itemsToProcess.join(' ')
            if (!content.trim()) {
                toast.warning("No content available in these courses to generate exercises.")
            } else {
                setAggregatedContent(content)
                setIsGenerateModalOpen(true)
            }
        } catch (e) {
            console.error(e)
            toast.error("Failed to aggregate content.")
        } finally {
            setIsAggregating(false)
        }
    }

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground">{t('status.loading')}</div>
    }

    if (!folder) return <div>Folder not found</div>

    return (
        <div className="flex-1 h-full flex flex-col overflow-hidden bg-background/50">
            {/* Header */}
            <div className="border-b bg-card/50 backdrop-blur-sm p-6 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="p-3 bg-primary/10 rounded-lg">
                        <FolderIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{folder.name}</h1>
                        <p className="text-muted-foreground text-sm">
                            {subFolders?.length || 0} folders • {courses?.length || 0} courses
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreateCourseOpen(true)}
                        className="flex items-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('nav.newCourse')}</span>
                    </button>
                    <button
                        onClick={handleCreateFolder}
                        className="flex items-center gap-2 bg-muted text-muted-foreground py-2 px-4 rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
                    >
                        <FolderPlus className="h-4 w-4" />
                        <span>{t('folder.create.sub')}</span>
                    </button>

                    <div className="h-8 w-px bg-border mx-2" />

                    <button
                        onClick={handleOpenGeneration}
                        disabled={isAggregating}
                        className="flex items-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {isAggregating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                        <span>Générer Exercices IA</span>
                    </button>

                    <button
                        onClick={() => {
                            if (confirm(t('folder.delete.confirm'))) {
                                // Logic handled by Delete Mutation? 
                                // Ideally backend handles recursive delete or we move items to parent?
                                // Let's delete for now as moving is complex to implement without backend support
                                deleteFolderMutation.mutate(folderId!)
                            }
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors ml-auto"
                        title={t('action.delete')}
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

                    {/* Render Sub-Folders */}
                    {subFolders?.map((sub: any) => (
                        <Link
                            key={`sub-${sub.id}`}
                            to={`/folder/${sub.id}`}
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
                            to={`/course/${course.id}`}
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
        </div>
    )
}

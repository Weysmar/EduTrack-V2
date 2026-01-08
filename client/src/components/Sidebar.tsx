import { Plus, FolderPlus, Settings, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseQueries, folderQueries } from '@/lib/api/queries'
import { CreateCourseModal } from './CreateCourseModal'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { FolderTree } from './FolderTree'
import { ProfileDropdown } from './profile/ProfileDropdown'
import { useProfileStore } from '@/store/profileStore'

export function Sidebar() {
    // Use selector for better reactivity - Sidebar V6.9
    const activeProfile = useProfileStore(state => state.activeProfile);
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    // Using useQuery with activeProfile check
    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    })

    const { data: folders } = useQuery({
        queryKey: ['folders'],
        queryFn: folderQueries.getAll,
        enabled: !!activeProfile
    })

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

    const handleCreateFolder = async () => {
        if (!activeProfile) return toast.error(t('nav.selectProfile'))

        const name = prompt(t('folder.create.prompt') || "Folder Name:")
        if (name) {
            createFolderMutation.mutate({
                name,
                profileId: activeProfile.id
            })
        }
    }

    return (
        <div className="flex flex-col h-full bg-card border-r">
            {/* App Header */}
            <div className="h-14 flex items-center justify-start px-4 border-b">
                <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                        <FolderPlus className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-lg">{t('app.title')}</span>
                </Link>
            </div>

            <div className="p-4 border-b space-y-2">
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-medium hidden md:block">{t('nav.newCourse')}</span>
                </button>
                <button
                    onClick={handleCreateFolder}
                    className="w-full flex items-center justify-center gap-2 bg-muted text-muted-foreground py-1.5 px-4 rounded-md hover:bg-muted/80 transition-colors text-sm"
                >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span className="font-medium hidden md:block">{t('folder.new')}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('nav.myCourses')}
                </h2>
                <nav className="space-y-1 px-2">
                    {/* Render Root Level Items (No Folder) */}
                    {(courses && folders) && (
                        <FolderTree
                            folders={folders}
                            courses={courses}
                        />
                    )}

                    {courses?.length === 0 && folders?.length === 0 && (
                        <p className="px-2 text-sm text-muted-foreground italic">{t('nav.noCourses')}</p>
                    )}
                </nav>
            </div>

            <div className="p-4 border-t mt-auto flex items-center gap-2">
                <div className="flex-1 min-w-0">
                    <ProfileDropdown />
                </div>
                <Link
                    to="/settings"
                    className="flex items-center justify-center p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border"
                    title={t('nav.settings')}
                >
                    <Settings className="h-5 w-5 text-muted-foreground" />
                </Link>
            </div>

            <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    )
}

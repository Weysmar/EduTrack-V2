import { Plus, FolderPlus, Settings, Trash2, Map as MapIcon, RotateCcw, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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
import { FocusTimer } from './FocusTimer'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

export function Sidebar() {
    const activeProfile = useProfileStore(state => state.activeProfile);
    const { t } = useLanguage()
    const queryClient = useQueryClient()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const { isCollapsed, toggleCollapse } = useUIStore()

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
        <div className={cn("flex flex-col h-full bg-card border-r transition-all duration-300", isCollapsed ? "w-20" : "w-64")}>
            {/* App Header */}
            <div className={cn("h-14 flex items-center border-b transition-all shrink-0", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
                {!isCollapsed && (
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden">
                        <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0">
                            <FolderPlus className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-lg whitespace-nowrap">{t('app.title')}</span>
                    </Link>
                )}

                {isCollapsed && (
                    <Link to="/" className="bg-primary text-primary-foreground p-1.5 rounded-lg shrink-0 hover:opacity-80">
                        <FolderPlus className="h-5 w-5" />
                    </Link>
                )}

                <button
                    onClick={toggleCollapse}
                    className={cn("text-muted-foreground hover:text-foreground transition-colors hidden lg:block", !isCollapsed && "ml-auto")}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
            </div>

            <div className={cn("py-4", isCollapsed ? "px-2" : "px-4")}>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className={cn(
                        "flex items-center gap-3 transition-all duration-300 shadow-sm hover:shadow-md",
                        isCollapsed
                            ? "h-14 w-14 justify-center rounded-2xl bg-primary text-primary-foreground"
                            : "h-14 w-40 px-5 rounded-2xl bg-[#C2E7FF] text-[#001D35] dark:bg-primary dark:text-primary-foreground"
                    )}
                    title={t('nav.newCourse')}
                >
                    <Plus className={cn("transition-all", isCollapsed ? "h-6 w-6" : "h-6 w-6")} />
                    {!isCollapsed && <span className="font-medium text-[15px]">{t('nav.newCourse')}</span>}
                </button>

                {!isCollapsed && (
                    <button
                        onClick={handleCreateFolder}
                        className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-4 py-2 rounded-full hover:bg-muted/50 transition-colors w-full"
                        title={t('folder.new')}
                    >
                        <Plus className="h-4 w-4" />
                        <span>{t('folder.new')}</span>
                    </button>
                )}
                {isCollapsed && (
                    <button
                        onClick={handleCreateFolder}
                        className="mt-4 h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors mx-auto"
                        title={t('folder.new')}
                    >
                        <FolderPlus className="h-5 w-5" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto py-4 overflow-x-hidden">
                {!isCollapsed && (
                    <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">
                        {t('nav.myCourses')}
                    </h2>
                )}

                <nav className="space-y-1 px-2">
                    {/* Render Root Level Items (No Folder) */}
                    {(courses && folders) && (
                        !isCollapsed ? (
                            <FolderTree
                                folders={folders}
                                courses={courses}
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 opacity-50 mt-4">
                                <span className="text-xs text-center text-muted-foreground writing-vertical">
                                    ...
                                </span>
                            </div>
                        )
                    )}

                    {courses?.length === 0 && folders?.length === 0 && !isCollapsed && (
                        <p className="px-2 text-sm text-muted-foreground italic">{t('nav.noCourses')}</p>
                    )}
                </nav>

                {/* Main Navigation Links */}
                <div className="mt-4 px-2 space-y-1">
                    {!isCollapsed && (
                        <h2 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 whitespace-nowrap">
                            {t('nav.explore') || 'Explorer'}
                        </h2>
                    )}

                    <Link
                        to="/board"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium",
                            "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                            isCollapsed ? "justify-center" : ""
                        )}
                        title={t('board.mapTitle') || "Tableau d'Enquête"}
                    >
                        <MapIcon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{t('board.mapTitle') || "Tableau d'Enquête"}</span>}
                    </Link>
                </div>
            </div>

            <div className={cn("border-t mt-auto flex items-center gap-2 transition-all", isCollapsed ? "p-2 justify-center" : "p-4")}>
                {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                        <ProfileDropdown />
                    </div>
                )}

                <Link
                    to="/settings"
                    className="flex items-center justify-center p-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border"
                    title={t('nav.settings')}
                >
                    <Settings className="h-5 w-5 text-muted-foreground" />
                </Link>

                {isCollapsed && (
                    <div className="absolute left-20 bottom-4 bg-popover p-2 rounded shadow-md hidden group-hover:block whitespace-nowrap z-50">
                        Profile
                    </div>
                )}
            </div>

            <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    )
}

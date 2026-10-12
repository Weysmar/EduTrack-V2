import { Plus, FolderPlus, Settings, PanelLeftClose, PanelLeftOpen, LayoutGrid, Map as MapIcon, Folder } from 'lucide-react'
import { toast } from "sonner"
import { Link, NavLink } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { courseQueries, folderQueries } from '@/lib/api/queries'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { FolderTree } from '@/components/FolderTree'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { useProfileStore } from '@/store/profileStore'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { PRIMARY_NAV } from './navItems'
import { useNavT } from './navI18n'
import { useMediaQuery } from './useMediaQuery'

interface EduSidebarProps {
    /** Opens the knowledge map (state owned by EduLayout). */
    onOpenKnowledgeMap?: () => void
}

export function EduSidebar({ onOpenKnowledgeMap }: EduSidebarProps) {
    const activeProfile = useProfileStore(state => state.activeProfile);
    const { t } = useLanguage()
    const tr = useNavT()
    const { minecraftTheme } = useTheme()
    const queryClient = useQueryClient()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const isCollapsed = useUIStore(state => state.isCollapsed)
    const toggleCollapse = useUIStore(state => state.toggleCollapse)
    const closeSidebar = useUIStore(state => state.closeSidebar)

    // The collapsed (icons only) mode only exists on desktop: the mobile drawer always shows labels.
    const isDesktop = useMediaQuery('(min-width: 1024px)')
    const collapsed = isCollapsed && isDesktop

    const logoSrc = minecraftTheme ? '/logo-mc.svg' : '/logo.svg'

    const { data } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseQueries.getAll(1, 1000), // Get all for sidebar
        enabled: !!activeProfile
    })

    const courses = data?.courses || []

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

    const handleOpenMap = () => {
        if (!isDesktop) closeSidebar()
        onOpenKnowledgeMap?.()
    }

    const navItemClass = (active: boolean) => cn(
        "flex items-center gap-3 rounded-md text-sm font-medium transition-colors min-h-[44px] lg:min-h-[38px] w-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed ? "justify-center px-0" : "px-3",
        active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )

    const iconButtonClass = "flex items-center justify-center h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors border border-transparent hover:border-border"

    return (
        <div className={cn("flex flex-col h-full bg-card border-r transition-all duration-300", collapsed ? "w-20" : "w-64")}>
            {/* App Header */}
            <div className={cn("h-14 flex items-center border-b transition-all shrink-0", collapsed ? "justify-center px-2" : "justify-between px-4")}>
                <Link
                    to="/edu/dashboard"
                    className={cn("flex items-center gap-3 hover:opacity-80 transition-opacity overflow-hidden", collapsed && "justify-center")}
                    title={collapsed ? 'EduTrack' : undefined}
                >
                    <img src={logoSrc} alt="EduTrack" className="h-8 w-8 object-contain shrink-0" />
                    {!collapsed && <span className="font-bold text-lg whitespace-nowrap">EduTrack</span>}
                </Link>

                {!collapsed && (
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        className="hidden lg:flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title={tr('nav.collapse')}
                        aria-label={tr('nav.collapse')}
                    >
                        <PanelLeftClose className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {/* Primary navigation */}
                <nav aria-label={tr('nav.mainNav')} className={cn("space-y-0.5 border-b", collapsed ? "p-2" : "p-3")}>
                    {PRIMARY_NAV.map(({ to, labelKey, icon: Icon, end }) => {
                        const label = tr(labelKey)
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) => navItemClass(isActive)}
                                title={collapsed ? label : undefined}
                                aria-label={collapsed ? label : undefined}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {!collapsed && <span className="truncate">{label}</span>}
                            </NavLink>
                        )
                    })}

                    {onOpenKnowledgeMap && (
                        <button
                            type="button"
                            onClick={handleOpenMap}
                            className={navItemClass(false)}
                            title={collapsed ? tr('nav.knowledgeMap') : undefined}
                            aria-label={collapsed ? tr('nav.knowledgeMap') : undefined}
                        >
                            <MapIcon className="h-5 w-5 shrink-0" />
                            {!collapsed && <span className="truncate">{tr('nav.knowledgeMap')}</span>}
                        </button>
                    )}
                </nav>

                {/* Create actions */}
                <div className={cn("space-y-2 border-b transition-all", collapsed ? "p-2" : "p-3")}>
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className={cn(
                            "w-full flex items-center gap-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all min-h-[44px] lg:min-h-[38px]",
                            collapsed ? "justify-center p-2" : "justify-center px-4"
                        )}
                        title={t('nav.newCourse')}
                        aria-label={collapsed ? t('nav.newCourse') : undefined}
                    >
                        <Plus className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="font-medium truncate">{t('nav.newCourse')}</span>}
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateFolder}
                        className={cn(
                            "w-full flex items-center gap-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-all text-sm min-h-[44px] lg:min-h-[34px]",
                            collapsed ? "justify-center p-2" : "justify-center px-4"
                        )}
                        title={t('folder.new')}
                        aria-label={collapsed ? t('folder.new') : undefined}
                    >
                        <FolderPlus className="h-3.5 w-3.5 shrink-0" />
                        {!collapsed && <span className="font-medium truncate">{t('folder.new')}</span>}
                    </button>
                </div>

                {/* Folders / courses tree */}
                <div className="py-3 px-2">
                    {!collapsed && (
                        <h2 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                            {t('nav.myCourses')}
                        </h2>
                    )}

                    {(courses && folders) && (
                        !collapsed ? (
                            <FolderTree
                                folders={folders}
                                courses={courses}
                            />
                        ) : (
                            <div className="flex justify-center mt-1">
                                <button
                                    type="button"
                                    onClick={toggleCollapse}
                                    className="flex items-center justify-center h-10 w-10 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title={t('nav.myCourses')}
                                    aria-label={t('nav.myCourses')}
                                >
                                    <Folder className="h-5 w-5" />
                                </button>
                            </div>
                        )
                    )}

                    {courses?.length === 0 && folders?.length === 0 && !collapsed && (
                        <p className="px-2 text-sm text-muted-foreground italic">{t('nav.noCourses')}</p>
                    )}
                </div>
            </div>

            {/* Footer: profile, hub, settings */}
            <div className={cn(
                "border-t mt-auto flex items-center gap-1 transition-all shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
                collapsed ? "flex-col p-2" : "p-3"
            )}>
                {!collapsed && (
                    <div className="flex-1 min-w-0">
                        <ProfileDropdown />
                    </div>
                )}

                <Link
                    to="/hub"
                    className={iconButtonClass}
                    title={tr('nav.hub')}
                    aria-label={tr('nav.hub')}
                >
                    <LayoutGrid className="h-[18px] w-[18px]" />
                </Link>

                <NavLink
                    to="/edu/settings"
                    className={({ isActive }) => cn(iconButtonClass, isActive && "bg-primary/10 text-primary")}
                    title={t('nav.settings')}
                    aria-label={t('nav.settings')}
                >
                    <Settings className="h-5 w-5" />
                </NavLink>

                {collapsed && (
                    <button
                        type="button"
                        onClick={toggleCollapse}
                        className={iconButtonClass}
                        title={tr('nav.expand')}
                        aria-label={tr('nav.expand')}
                    >
                        <PanelLeftOpen className="h-5 w-5" />
                    </button>
                )}
            </div>

            <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
        </div>
    )
}

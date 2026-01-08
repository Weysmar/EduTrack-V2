import { Link } from 'react-router-dom'
import { Folder, Book, Clock, Zap, FileText, Dumbbell, ArrowRight, Plus, UserCircle, Calendar, Sparkles } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useState } from 'react'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { RevisionProgramModal } from '@/components/RevisionProgramModal'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useProfileStore } from '@/store/profileStore'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { useQuery } from '@tanstack/react-query'
import { courseQueries, itemQueries } from '@/lib/api/queries'

export function Dashboard() {
    const { t } = useLanguage()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false)
    const { activeProfile } = useProfileStore()

    // Queries
    const { data: courses } = useQuery({
        queryKey: ['courses'],
        queryFn: courseQueries.getAll,
        enabled: !!activeProfile
    })

    const { data: allItems } = useQuery({
        queryKey: ['items'],
        queryFn: itemQueries.getAll,
        enabled: !!activeProfile
    })

    if (!activeProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                <div className="bg-primary/10 p-6 rounded-full">
                    <UserCircle className="h-16 w-16 text-primary" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h1 className="text-3xl font-bold">Welcome to EduTrack</h1>
                    <p className="text-muted-foreground">Please select a profile to access your courses, plans, and analytics.</p>
                </div>
                <div className="bg-card border rounded-xl p-6 w-full max-w-sm shadow-sm space-y-4">
                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Select Profile</div>
                    <div className="flex justify-center">
                        <ProfileDropdown />
                    </div>
                </div>
            </div>
        )
    }

    const courseList = courses || []
    const itemList = allItems || []

    // Derived Data
    const courseCount = courseList.length
    const exerciseCount = itemList.filter((i: any) => i.type === 'exercise').length
    const noteCount = itemList.filter((i: any) => i.type === 'note').length

    const recentCourses = [...courseList].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)

    // Enrich activity
    const activity = [...itemList].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((item: any) => {
        const course = courseList.find((c: any) => c.id === item.courseId)
        return { ...item, courseTitle: course?.title }
    })

    const inProgress = itemList.filter((i: any) => i.status === 'in-progress').slice(0, 3).map((item: any) => {
        const course = courseList.find((c: any) => c.id === item.courseId)
        return { ...item, courseTitle: course?.title }
    })

    const hasCourses = courseCount > 0

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">{t('welcome.title')}</h1>
                    <p className="text-muted-foreground text-lg">{t('welcome.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsRevisionModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:from-violet-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
                >
                    <Calendar className="h-5 w-5" />
                    <span>{t('revision.generate')}</span>
                </button>
            </header>

            <RevisionProgramModal isOpen={isRevisionModalOpen} onClose={() => setIsRevisionModalOpen(false)} />

            {!hasCourses ? (
                <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/20 border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold mb-2">📚 {t('welcome.empty.title')}</h2>
                        <p className="text-muted-foreground">{t('welcome.empty.desc')}</p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        {t('welcome.create.button')}
                    </button>
                    <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:border-primary/50 transition-colors">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                            <Book className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.courses')}</p>
                            <h2 className="text-3xl font-bold">{courseCount}</h2>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:border-primary/50 transition-colors">
                        <div className="p-3 bg-green-500/10 rounded-lg text-green-500">
                            <Dumbbell className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.exercises')}</p>
                            <h2 className="text-3xl font-bold">{exerciseCount}</h2>
                        </div>
                    </div>
                    <div className="bg-card p-6 rounded-xl border shadow-sm flex items-center gap-4 hover:border-primary/50 transition-colors">
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-500">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.notes')}</p>
                            <h2 className="text-3xl font-bold">{noteCount}</h2>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full">
                <CalendarWidget />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-xl font-semibold">{t('dashboard.recent')}</h2>
                    </div>

                    {recentCourses.length > 0 ? (
                        <div className="grid grid-rows-2 grid-flow-col auto-cols-[280px] gap-4 overflow-x-auto pb-4 pt-2 snap-x">
                            {recentCourses.map((course: any) => (
                                <Link
                                    key={course.id}
                                    to={`/course/${course.id}`}
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('courseId', course.id.toString())
                                        e.dataTransfer.effectAllowed = 'move'
                                    }}
                                    className="snap-start bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 block h-40 group relative cursor-grab active:cursor-grabbing"
                                >
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-2 transition-all group-hover:w-full opacity-5"
                                        style={{ backgroundColor: course.color }}
                                    />
                                    <div className="p-5 flex flex-col h-full justify-between relative z-10">
                                        <div className="flex items-star gap-3">
                                            {course.icon ? (
                                                <span className="text-3xl bg-background/50 rounded-lg p-1">{course.icon}</span>
                                            ) : (
                                                <div
                                                    className="w-4 h-4 rounded-full mt-1"
                                                    style={{ backgroundColor: course.color }}
                                                />
                                            )}
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight line-clamp-2">{course.title}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">{new Date(course.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="h-32 bg-muted/20 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                            {t('dashboard.empty.courses')}
                        </div>
                    )}

                    {inProgress.length > 0 && (
                        <div className="pt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-orange-500" />
                                <h2 className="text-xl font-semibold">{t('dashboard.inprogress')}</h2>
                            </div>
                            <div className="grid gap-3">
                                {inProgress.map((item: any) => (
                                    <Link
                                        key={item.id}
                                        to={`/course/${item.courseId}`}
                                        className="bg-card border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 text-primary rounded-md">
                                                <Dumbbell className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium">{item.title}</h4>
                                                <p className="text-xs text-muted-foreground">{item.courseTitle} • {t(`status.${item.status}`)}</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        {t('dashboard.activity')}
                    </h2>
                    <div className="bg-card border rounded-xl p-3 relative overflow-hidden h-full">
                        <div className="space-y-3 relative">
                            {activity.length > 0 && (
                                <div className="absolute left-[15px] top-9 bottom-9 w-0.5 bg-muted/30" />
                            )}
                            {activity.length > 0 ? (
                                activity.map((item: any) => (
                                    <div key={item.id} className="relative flex items-start group">
                                        <div className="relative z-10 flex-shrink-0 w-8 flex items-center justify-center mt-9 mr-4">
                                            <div className="w-3 h-3 rounded-full bg-background border-2 border-primary group-hover:scale-125 group-hover:bg-primary transition-all ring-4 ring-card" />
                                        </div>
                                        <Link
                                            to={`/course/${item.courseId}`}
                                            className="flex-1 bg-muted/5 hover:bg-muted/40 border border-transparent hover:border-border p-3.5 rounded-xl transition-all"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background border px-2 py-0.5 rounded-md">
                                                    {item.type === 'exercise' && <Dumbbell className="h-3 w-3" />}
                                                    {item.type === 'note' && <FileText className="h-3 w-3" />}
                                                    {item.type === 'resource' && <Folder className="h-3 w-3" />}
                                                    <span className="opacity-70">{t('common.in')}</span>
                                                    <span className="font-semibold text-primary/80">{item.courseTitle}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">{t('dashboard.empty.activity')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

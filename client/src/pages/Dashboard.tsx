import { Link } from 'react-router-dom'
import { Folder, Book, Clock, Zap, FileText, Dumbbell, ArrowRight, Plus, UserCircle, Calendar as CalendarIcon, Sparkles, Flame, Target, PenTool, Layout, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useState, useMemo } from 'react'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { RevisionProgramModal } from '@/components/RevisionProgramModal'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useProfileStore } from '@/store/profileStore'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { useQuery } from '@tanstack/react-query'
import { courseQueries, itemQueries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'

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

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Bonjour";
        if (hour < 18) return "Bonne après-midi";
        return "Bonsoir";
    }, []);

    // Mock Streak Logic (replace with real data later)
    const streakDays = 5;

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

    const recentCourses = [...courseList].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
    const lastActiveCourse = recentCourses[0];

    // Enrich activity
    const activity = [...itemList].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((item: any) => {
        const course = courseList.find((c: any) => c.id === item.courseId)
        return { ...item, courseTitle: course?.title }
    })

    // Quick Actions
    const quickActions = [
        { icon: Plus, label: "Nouveau Sujet", action: () => setIsCreateModalOpen(true), color: "bg-blue-500" },
        { icon: PenTool, label: "Nouvelle Note", link: lastActiveCourse ? `/course/${lastActiveCourse.id}` : null, color: "bg-amber-500" }, // Fallback logic
        { icon: Zap, label: "Mode Focus", link: "/focus", color: "bg-violet-600" },
        { icon: CalendarIcon, label: "Mon Planning", action: () => setIsRevisionModalOpen(true), color: "bg-emerald-500" },
    ]

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24 space-y-6">

            {/* HERO SECTION */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                {/* Background decorative elements */}
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <Sparkles className="w-64 h-64" />
                </div>

                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3 text-white/80">
                            <span className="text-sm font-medium uppercase tracking-wider flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
                                {streakDays} Jours de série
                            </span>
                            <span className="text-sm font-medium uppercase tracking-wider flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                <Target className="w-4 h-4 text-emerald-400" />
                                Objectif hebdo: 80%
                            </span>
                        </div>

                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
                                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-violet-300">{activeProfile.name}</span>.
                            </h1>
                            <p className="text-lg text-slate-300 max-w-lg leading-relaxed">
                                Prêt à continuer votre progression ? Vous étiez sur <strong className="text-white">{lastActiveCourse?.title || "vos cours"}</strong> récemment.
                            </p>
                        </div>

                        {lastActiveCourse && (
                            <div className="pt-2">
                                <Link
                                    to={`/course/${lastActiveCourse.id}`}
                                    className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
                                >
                                    <Zap className="w-4 h-4 fill-slate-900" />
                                    Reprendre {lastActiveCourse.title}
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* DOCK (Quick Actions integrated into Hero for better visibility) */}
                    <div className="flex gap-4">
                        {quickActions.map((action, idx) => (
                            action.link ? (
                                <Link
                                    key={idx}
                                    to={action.link}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", action.color)}>
                                        <action.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{action.label}</span>
                                </Link>
                            ) : (
                                <button
                                    key={idx}
                                    onClick={action.action}
                                    className="group flex flex-col items-center gap-2"
                                >
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110", action.color)}>
                                        <action.icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{action.label}</span>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </section>

            <CreateCourseModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
            <RevisionProgramModal isOpen={isRevisionModalOpen} onClose={() => setIsRevisionModalOpen(false)} />

            {/* BENTO GRID LAYOUT */}
            <div className="space-y-6">

                {/* CALENDAR (Moved up as requested) */}
                <div className="w-full">
                    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden h-full min-h-[500px]">
                        <CalendarWidget />
                    </div>
                </div>

                {/* BOTTOM ROW: CONTENT (Stats + Recents + Activity) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-12 space-y-6">

                        {/* STATS ROW */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all hover:bg-card">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                                    <Book className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.stats.courses')}</p>
                                    <h2 className="text-2xl font-bold">{courseCount}</h2>
                                </div>
                            </div>
                            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all hover:bg-card">
                                <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
                                    <Dumbbell className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.stats.exercises')}</p>
                                    <h2 className="text-2xl font-bold">{exerciseCount}</h2>
                                </div>
                            </div>
                            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all hover:bg-card">
                                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dashboard.stats.notes')}</p>
                                    <h2 className="text-2xl font-bold">{noteCount}</h2>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* RECENT COURSES SLIDER (Span 2) */}
                            <div className="lg:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        {t('dashboard.recent')}
                                    </h2>
                                    <Link to="/library" className="text-xs text-primary hover:underline">Voir tout</Link>
                                </div>

                                {recentCourses.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {recentCourses.slice(0, 4).map((course: any) => (
                                            <Link
                                                key={course.id}
                                                to={`/course/${course.id}`}
                                                className="group bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all hover:-translate-y-1"
                                            >
                                                <div className="h-2 w-full" style={{ backgroundColor: course.color }} />
                                                <div className="p-5">
                                                    <div className="flex justify-between items-start mb-4">
                                                        {course.icon ? (
                                                            <span className="text-2xl bg-muted/50 p-2 rounded-lg">{course.icon}</span>
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                                                <Folder className="h-5 w-5 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                    </div>
                                                    <h3 className="font-bold text-lg line-clamp-1 mb-1">{course.title}</h3>
                                                    <p className="text-xs text-muted-foreground line-clamp-2">{course.description || "Aucune description"}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-32 bg-muted/20 border-2 border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                                        {t('dashboard.empty.courses')}
                                    </div>
                                )}
                            </div>

                            {/* ACTIVITY FEED (Span 1) */}
                            <div className="space-y-3">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                    Activité Récente
                                </h2>
                                <div className="bg-card border rounded-2xl p-4 space-y-1 max-h-[400px] overflow-auto">
                                    {activity.length > 0 ? (
                                        activity.map((item: any) => (
                                            <Link key={item.id} to={`/course/${item.courseId}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors group">
                                                <div className="p-2 rounded-lg bg-background border shadow-sm group-hover:scale-105 transition-transform">
                                                    {item.type === 'exercise' && <Dumbbell className="h-4 w-4 text-green-500" />}
                                                    {item.type === 'note' && <FileText className="h-4 w-4 text-yellow-500" />}
                                                    {item.type === 'resource' && <Folder className="h-4 w-4 text-blue-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{item.title}</h4>
                                                    <p className="text-xs text-muted-foreground truncate">{item.courseTitle} • <span className="lowercase">{t(`common.in`)} {t(item.type)}</span></p>
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {new Date(item.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground text-sm">
                                            {t('dashboard.empty.activity')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}

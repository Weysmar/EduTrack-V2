import { Link } from 'react-router-dom'
import { Folder, Book, Clock, Zap, FileText, Dumbbell, ArrowRight, Plus, UserCircle, Calendar as CalendarIcon, Sparkles, Flame, PenTool, Layout, CheckCircle2, Network } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useState, useMemo, useEffect, useRef } from 'react'
import { CreateCourseModal } from '@/components/CreateCourseModal'
import { RevisionProgramModal } from '@/components/RevisionProgramModal'
import { CalendarWidget } from '@/components/CalendarWidget'
import { useProfileStore } from '@/store/profileStore'
import { ProfileDropdown } from '@/components/profile/ProfileDropdown'
import { useQuery } from '@tanstack/react-query'
import { courseQueries, itemQueries, analyticsQueries } from '@/lib/api/queries'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { StatCardVariant } from '@/components/ui/StatCard';
import { apiClient } from '@/lib/api/client'
import { useTheme } from '@/components/theme-provider'

export function Dashboard() {
    const { t, language } = useLanguage()
    const { minecraftTheme } = useTheme()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false)
    const { activeProfile } = useProfileStore()
    const queryClient = useQueryClient()
    const isLoggingVisit = useRef(false)

    // Synchronize latest profile data (including real-time AI Generation count)
    const { data: currentProfile } = useQuery({
        queryKey: ['profile', 'me'],
        queryFn: async () => {
            const res = await apiClient.get('/auth/me');
            if (res.data) {
                useProfileStore.setState({ activeProfile: res.data });
            }
            return res.data;
        },
        enabled: !!activeProfile
    })

    // Queries
    const { data: coursesData } = useQuery({
        queryKey: ['courses'],
        queryFn: () => courseQueries.getAll(1, 10), // Get recent for dashboard
        enabled: !!activeProfile
    })

    const courses = coursesData?.courses || []

    const { data: itemsData } = useQuery({
        queryKey: ['items'],
        queryFn: () => itemQueries.getAll(1, 1000), // Get all items for stats
        enabled: !!activeProfile
    })

    const allItems = itemsData?.items || []

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (language === 'fr') {
            if (hour < 12) return "Bonjour";
            if (hour < 18) return "Bon après-midi";
            return "Bonsoir";
        } else {
            if (hour < 12) return "Good morning";
            if (hour < 18) return "Good afternoon";
            return "Good evening";
        }
    }, [language]);

    // Calculate Streak from Session Data
    const { data: sessions = [] } = useQuery({
        queryKey: ['analytics-sessions', activeProfile?.id],
        queryFn: () => analyticsQueries.getSessions(),
        enabled: !!activeProfile
    });

    // Auto-log daily visit for streak
    useEffect(() => {
        if (!sessions || !activeProfile || isLoggingVisit.current) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if we have any session for today
        const hasActivityToday = Array.isArray(sessions) && sessions.some((s: any) => {
            const sDate = new Date(s.date || s.createdAt);
            sDate.setHours(0, 0, 0, 0);
            return sDate.getTime() === today.getTime();
        });

        if (!hasActivityToday) {
            isLoggingVisit.current = true;
            console.log("No activity today, logging daily visit for streak...");
            analyticsQueries.recordSession({
                profileId: activeProfile.id,
                date: new Date(),
                startTime: new Date(),
                durationMinutes: 1,
                type: 'daily_login',
                courseId: null,
                notes: 'Auto-logged daily visit'
            }).then(() => {
                queryClient.invalidateQueries({ queryKey: ['analytics-sessions'] });
            }).catch((err) => {
                console.error("Failed to log daily visit", err);
            });
        }
    }, [sessions, activeProfile, queryClient]);

    const streakDays = useMemo(() => {
        if (!sessions || sessions.length === 0) return 0;

        // Sort sessions by date (newest first)
        const sortedSessions = [...sessions].sort((a: any, b: any) =>
            new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        );

        // Calculate consecutive days
        let streak = 0;
        let lastDate: Date | null = null;

        for (const session of sortedSessions) {
            const sessionDate = new Date(session.date || session.createdAt);
            sessionDate.setHours(0, 0, 0, 0); // Normalize to start of day

            if (!lastDate) {
                // First session (most recent)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                // Streak only counts if last session was today or yesterday
                if (sessionDate.getTime() === today.getTime() || sessionDate.getTime() === yesterday.getTime()) {
                    streak = 1;
                    lastDate = sessionDate;
                } else {
                    break; // Streak is broken
                }
            } else {
                // Check if this session is the day before the last one
                const expectedDate = new Date(lastDate);
                expectedDate.setDate(expectedDate.getDate() - 1);

                if (sessionDate.getTime() === expectedDate.getTime()) {
                    streak++;
                    lastDate = sessionDate;
                } else {
                    break; // Gap in streak
                }
            }
        }

        return streak;
    }, [sessions]);


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
    const activity = itemList
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((item: any) => {
            const course = courseList.find((c: any) => c.id === item.courseId);
            return { ...item, courseTitle: course?.title };
        });

    // Quick Actions
    const quickActions = [
        { 
            icon: Plus, 
            label: language === 'fr' ? "Nouveau Sujet" : "New Course", 
            action: () => setIsCreateModalOpen(true), 
            color: minecraftTheme ? "bg-[#2d6a4f] hover:bg-[#40916c] border-[#52b788]/60 text-white" : "bg-blue-500" 
        },
        { 
            icon: PenTool, 
            label: language === 'fr' ? "Nouvelle Note" : "New Note", 
            link: lastActiveCourse ? `/edu/course/${lastActiveCourse.id}` : null, 
            color: minecraftTheme ? "bg-[#8c501e] hover:bg-[#a45e23] border-[#d4976a]/60 text-white" : "bg-amber-500" 
        },
        { 
            icon: Zap, 
            label: language === 'fr' ? "Mode Focus" : "Focus Mode", 
            link: "/edu/focus", 
            color: minecraftTheme ? "bg-[#5a189a] hover:bg-[#7b2cbf] border-[#b5179e]/60 text-white" : "bg-violet-600" 
        },
        { 
            icon: CalendarIcon, 
            label: language === 'fr' ? "Mon Planning" : "My Schedule", 
            action: () => setIsRevisionModalOpen(true), 
            color: minecraftTheme ? "bg-[#0077b6] hover:bg-[#0096c7] border-[#90e0ef]/60 text-white" : "bg-emerald-500" 
        },
    ]

    return (
        <div className="p-3 md:p-4 lg:p-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24 space-y-4 md:space-y-6">

            {/* HERO SECTION */}
            <section className={cn(
                "relative overflow-hidden transition-all",
                minecraftTheme
                    ? "rounded-none border-4 border-[#2d6a4f] bg-gradient-to-br from-[#143624] via-[#1b4332] to-[#081c15] text-white shadow-[6px_6px_0px_0px_#081c15]"
                    : "rounded-3xl bg-card border text-card-foreground shadow-sm dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 dark:text-white dark:shadow-xl dark:border-0"
            )}>
                {/* Background decorative elements */}
                {minecraftTheme ? (
                    <div className="absolute -top-4 -right-4 p-6 opacity-30 select-none pointer-events-none">
                        <img 
                            src="/assets/minecraft_grass_block.webp" 
                            alt="Minecraft Grass Block" 
                            className="w-56 h-56 object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.8)] rotate-6" 
                        />
                    </div>
                ) : (
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Sparkles className="w-64 h-64 text-primary dark:text-white" />
                    </div>
                )}

                <div className="relative z-10 p-6 md:p-8 lg:p-10 flex flex-col gap-6">
                    <div className="space-y-3 md:space-y-4 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn(
                                "text-xs md:text-sm font-medium uppercase tracking-wider flex items-center gap-1.5 transition-all select-none",
                                minecraftTheme
                                    ? "rounded-none border-2 border-[#52b788] bg-[#081c15]/90 text-[#b7e4c7] px-3 py-1 shadow-[2px_2px_0px_0px_#081c15]"
                                    : "rounded-full border border-border bg-muted text-foreground px-2.5 md:px-3 py-1 dark:bg-white/10 dark:text-white/80 dark:border-white/10"
                            )}>
                                <Flame className={cn("w-3 h-3 md:w-4 md:h-4", minecraftTheme ? "text-[#55ff55] fill-[#55ff55]" : "text-orange-500 fill-orange-500 dark:text-orange-400 dark:fill-orange-400")} />
                                <span className="hidden sm:inline">
                                    {streakDays} {language === 'fr' ? (streakDays > 1 ? 'Jours de série' : 'Jour de série') : (streakDays > 1 ? 'Days streak' : 'Day streak')}
                                </span>
                                <span className="sm:hidden">{streakDays}{language === 'fr' ? 'j' : 'd'}</span>
                            </span>

                        </div>

                        <div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-2 text-foreground dark:text-white">
                                {greeting},{" "}
                                <span className={cn(
                                    minecraftTheme 
                                        ? "text-[#55ff55] drop-shadow-[2px_2px_0px_#000]" 
                                        : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-300 dark:to-violet-300"
                                )}>
                                    {activeProfile.name}
                                </span>.
                            </h1>
                            <p className={cn(
                                "text-sm md:text-base lg:text-lg max-w-lg leading-relaxed line-clamp-2 md:line-clamp-none",
                                minecraftTheme ? "text-emerald-100/90" : "text-muted-foreground dark:text-slate-300"
                            )}>
                                {language === 'fr' ? (
                                    <>Prêt à continuer votre progression ? Vous étiez sur <strong className={cn(minecraftTheme ? "text-white bg-[#081c15]/60 px-1 border border-[#52b788]/50" : "text-foreground dark:text-white")}>{lastActiveCourse?.title || "vos cours"}</strong> récemment.</>
                                ) : (
                                    <>Ready to continue your progress? You were working on <strong className={cn(minecraftTheme ? "text-white bg-[#081c15]/60 px-1 border border-[#52b788]/50" : "text-foreground dark:text-white")}>{lastActiveCourse?.title || "your courses"}</strong> recently.</>
                                )}
                            </p>
                        </div>

                        {lastActiveCourse && (
                            <div className="pt-2">
                                <Link
                                    to={`/edu/course/${lastActiveCourse.id}`}
                                    className={cn(
                                        "inline-flex items-center justify-center gap-2 font-bold text-sm transition-all shadow-sm w-full sm:w-auto",
                                        minecraftTheme
                                            ? "rounded-none border-2 border-[#74c69d] bg-[#3a7d44] hover:bg-[#469d53] text-white px-5 py-2.5 shadow-[3px_3px_0px_0px_#081c15] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                            : "rounded-xl bg-primary text-primary-foreground px-4 md:px-6 py-2.5 md:py-3 hover:bg-primary/90 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:shadow-white/10"
                                    )}
                                >
                                    <Zap className={cn("w-4 h-4", minecraftTheme ? "fill-yellow-300 text-yellow-300" : "fill-primary-foreground dark:fill-slate-900")} />
                                    <span className="truncate">
                                        {language === 'fr' ? `Reprendre ${lastActiveCourse.title}` : `Resume ${lastActiveCourse.title}`}
                                    </span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* DOCK (Quick Actions) - Grid 4 cols on mobile, flex on desktop */}
                    <div className="grid grid-cols-4 sm:flex gap-2 sm:gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                        {quickActions.map((action, idx) => (
                            action.link ? (
                                <Link
                                    key={idx}
                                    to={action.link}
                                    className="group flex flex-col items-center gap-1 sm:gap-1.5"
                                >
                                    <div className={cn(
                                        "w-12 h-12 sm:w-12 sm:h-12 flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 active:scale-95",
                                        minecraftTheme 
                                            ? "rounded-none border-2 border-black/50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" 
                                            : "rounded-2xl",
                                        action.color
                                    )}>
                                        <action.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className={cn(
                                        "text-[11px] sm:text-xs font-medium transition-colors text-center truncate max-w-[70px] sm:max-w-none",
                                        minecraftTheme 
                                            ? "text-emerald-100/80 group-hover:text-white" 
                                            : "text-muted-foreground group-hover:text-foreground dark:text-white/70 dark:group-hover:text-white"
                                    )}>
                                        {action.label}
                                    </span>
                                </Link>
                            ) : (
                                <button
                                    key={idx}
                                    onClick={action.action}
                                    className="group flex flex-col items-center gap-1 sm:gap-1.5"
                                >
                                    <div className={cn(
                                        "w-12 h-12 sm:w-12 sm:h-12 flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105 active:scale-95",
                                        minecraftTheme 
                                            ? "rounded-none border-2 border-black/50 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.6)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none" 
                                            : "rounded-2xl",
                                        action.color
                                    )}>
                                        <action.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <span className={cn(
                                        "text-[11px] sm:text-xs font-medium transition-colors text-center truncate max-w-[70px] sm:max-w-none",
                                        minecraftTheme 
                                            ? "text-emerald-100/80 group-hover:text-white" 
                                            : "text-muted-foreground group-hover:text-foreground dark:text-white/70 dark:group-hover:text-white"
                                    )}>
                                        {action.label}
                                    </span>
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
                <div className="w-full min-w-0 max-w-full overflow-hidden">
                    <div className="bg-card border rounded-2xl shadow-sm overflow-hidden h-full min-w-0 max-w-full">
                        <CalendarWidget />
                    </div>
                </div>

                {/* BOTTOM ROW: CONTENT (Stats + Recents + Activity) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-12 space-y-6">

                        {/* STATS ROW */}

                        {/* STATS ROW */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                            <StatCardVariant
                                title={t('dashboard.stats.courses')}
                                value={courseCount}
                                icon={<Book className="h-6 w-6" />}
                                variant="blue"
                                className="bg-card/50 backdrop-blur-sm"
                            />
                            <StatCardVariant
                                title={t('dashboard.stats.exercises')}
                                value={exerciseCount}
                                icon={<Dumbbell className="h-6 w-6" />}
                                variant="green"
                                className="bg-card/50 backdrop-blur-sm"
                            />
                            <StatCardVariant
                                title={t('dashboard.stats.notes')}
                                value={noteCount}
                                icon={<FileText className="h-6 w-6" />}
                                variant="yellow"
                                className="bg-card/50 backdrop-blur-sm"
                            />
                            <StatCardVariant
                                title={t('dashboard.stats.aiGeneration')}
                                value={(currentProfile?.aiGenerationsCount ?? (currentProfile?.settings as any)?.aiGenerationCount)
                                    ?? (activeProfile?.aiGenerationsCount ?? (activeProfile?.settings as any)?.aiGenerationCount)
                                    ?? 0}
                                icon={<Sparkles className="h-6 w-6" />}
                                variant="purple"
                                className="bg-card/50 backdrop-blur-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* RECENT COURSES SLIDER (Span 2) */}
                            <div className="lg:col-span-2 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        {t('dashboard.recent')}
                                    </h2>
                                    <Link
                                        to="/edu/library"
                                        className={cn(
                                            "text-xs transition-colors",
                                            minecraftTheme
                                                ? "text-[#55ff55] hover:text-[#74c69d] font-bold drop-shadow-[1px_1px_0px_#000]"
                                                : "text-primary hover:underline"
                                        )}
                                    >
                                        {language === 'fr' ? "Voir tout" : "View all"}
                                    </Link>
                                </div>

                                {recentCourses.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {recentCourses.slice(0, 4).map((course: any) => (
                                            <Link
                                                key={course.id}
                                                to={`/edu/course/${course.id}`}
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
                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                        {course.description || (language === 'fr' ? "Aucune description" : "No description")}
                                                    </p>
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
                                    {language === 'fr' ? "Activité Récente" : "Recent Activity"}
                                </h2>
                                <div className="bg-card border rounded-2xl p-4 space-y-1 max-h-[400px] overflow-auto">
                                    {activity.length > 0 ? (
                                        activity.map((item: any) => (
                                            <Link key={item.id} to={`/edu/course/${item.courseId}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-xl transition-colors group">
                                                <div className="p-2 rounded-lg bg-background border shadow-sm group-hover:scale-105 transition-transform">
                                                    {item.type === 'exercise' && <Dumbbell className="h-4 w-4 text-green-500" />}
                                                    {item.type === 'note' && <FileText className="h-4 w-4 text-yellow-500" />}
                                                    {item.type === 'resource' && <Folder className="h-4 w-4 text-blue-500" />}
                                                    {item.activityType === 'mindmap' && <Network className="h-4 w-4 text-indigo-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{item.title}</h4>
                                                    <p className="text-xs text-muted-foreground truncate">{item.courseTitle || t('common.noDesc')} • <span className="lowercase">{t('common.in')} {t(item.activityType || item.type)}</span></p>
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

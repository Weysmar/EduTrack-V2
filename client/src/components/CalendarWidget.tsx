import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon,
    Loader2, CheckSquare, Square, Clock, AlertCircle,
    Plus, Trash2, X, ExternalLink, MapPin, ZoomIn, ZoomOut,
    SlidersHorizontal
} from 'lucide-react'
import {
    format, addWeeks, subWeeks, addDays, subDays,
    startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday
} from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfileStore } from '@/store/profileStore'
import { useCalendarStore } from '@/store/calendarStore'
import { fetchAllICalFeeds, type ICalEvent, type ICalFeedTarget } from '@/lib/ical-parser'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studyPlanQueries, courseQueries } from '@/lib/api/queries'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'
import { CreateTaskModal } from '@/components/CreateTaskModal'

export const TASK_TYPES = [
    { id: 'exam', label: 'Examen / Partiel', labelEn: 'Exam', icon: '🎓', color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
    { id: 'assignment', label: 'Rendu / Devoir', labelEn: 'Assignment', icon: '📝', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'exercise', label: 'Exercice', labelEn: 'Exercise', icon: '🏋️', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'revision', label: 'Révision', labelEn: 'Revision', icon: '📖', color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'project', label: 'Projet', labelEn: 'Project', icon: '👥', color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { id: 'task', label: 'Tâche', labelEn: 'Task', icon: '📌', color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' },
];

export interface TimedCalendarItem {
    id: string;
    itemType: 'event' | 'task';
    title: string;
    startMinutes: number; // 0..1440
    endMinutes: number;   // 0..1440
    raw: any;
    columnIndex?: number;
    totalColumns?: number;
}

/**
 * Robust overlapping layout algorithm (greedy coloring / cluster scheduling).
 * Groups overlapping items and assigns each a column index + total columns
 * so that they can be displayed side-by-side without masking each other.
 */
export function layoutDayTimedItems(items: TimedCalendarItem[]): TimedCalendarItem[] {
    if (!items || items.length === 0) return [];

    // 1. Sort by startMinutes ASC, then by duration DESC
    const sorted = [...items].sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) {
            return a.startMinutes - b.startMinutes;
        }
        return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
    });

    // 2. Group into overlapping clusters
    const clusters: TimedCalendarItem[][] = [];
    let currentCluster: TimedCalendarItem[] = [];
    let clusterEnd = -1;

    for (const item of sorted) {
        if (currentCluster.length === 0) {
            currentCluster.push(item);
            clusterEnd = item.endMinutes;
        } else if (item.startMinutes < clusterEnd) {
            // Overlaps with current cluster
            currentCluster.push(item);
            clusterEnd = Math.max(clusterEnd, item.endMinutes);
        } else {
            clusters.push(currentCluster);
            currentCluster = [item];
            clusterEnd = item.endMinutes;
        }
    }
    if (currentCluster.length > 0) {
        clusters.push(currentCluster);
    }

    // 3. Assign columns within each cluster
    const result: TimedCalendarItem[] = [];

    for (const cluster of clusters) {
        const columnEnds: number[] = [];

        for (const item of cluster) {
            let assignedCol = -1;
            for (let c = 0; c < columnEnds.length; c++) {
                if (columnEnds[c] <= item.startMinutes) {
                    assignedCol = c;
                    columnEnds[c] = item.endMinutes;
                    break;
                }
            }
            if (assignedCol === -1) {
                assignedCol = columnEnds.length;
                columnEnds.push(item.endMinutes);
            }
            item.columnIndex = assignedCol;
        }

        const totalCols = columnEnds.length;
        for (const item of cluster) {
            item.totalColumns = totalCols;
            result.push(item);
        }
    }

    return result;
}

export function CalendarWidget() {
    const { apiKeys, activeProfile } = useProfileStore()
    const { 
        feeds, 
        icalUrl: storeUrl,
        startHour,
        endHour,
        hourHeight,
        autoFitHours,
        setTimeRange,
        setHourHeight,
        setAutoFitHours,
        toggleFeed
    } = useCalendarStore()
    const { language, t } = useLanguage()
    const queryClient = useQueryClient()

    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<ICalEvent[]>([])
    const [isLoadingEvents, setIsLoadingEvents] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    // Display options popover state
    const [isDisplaySettingsOpen, setIsDisplaySettingsOpen] = useState(false)

    // Current real-time clock for now line
    const [now, setNow] = useState(new Date())
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Filter by course
    const [filterCourseId, setFilterCourseId] = useState<string>('all')

    // Pop-up Task Creation Modal state
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
    const [selectedModalDate, setSelectedModalDate] = useState<Date | null>(null)
    const [selectedModalTime, setSelectedModalTime] = useState<string | null>(null)
    const [showGoogleTip, setShowGoogleTip] = useState(true)

    const gridContainerRef = useRef<HTMLDivElement>(null)

    const legacyIcalUrl = apiKeys.google_calendar || storeUrl;
    const hasAnyFeed = (feeds && feeds.length > 0) || !!legacyIcalUrl;
    const locale = language === 'fr' ? fr : enUS

    // Fetch user courses
    const { data: coursesData } = useQuery({
        queryKey: ['courses', activeProfile?.id],
        queryFn: () => courseQueries.getAll(1, 1000),
        enabled: !!activeProfile
    });
    const courses = coursesData?.courses || [];

    // Fetch EduTrack study tasks
    const { data: studyTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
        queryKey: ['studyTasks', activeProfile?.id],
        queryFn: () => studyPlanQueries.getTasks(),
        enabled: !!activeProfile
    });

    // Mutation to toggle task completion directly from calendar
    const toggleTaskMutation = useMutation({
        mutationFn: ({ taskId, isCompleted }: { taskId: string, isCompleted: boolean }) =>
            studyPlanQueries.updateTask(taskId, { isCompleted }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
        }
    });

    // Mutation to delete task directly from calendar
    const deleteTaskMutation = useMutation({
        mutationFn: (taskId: string) => studyPlanQueries.deleteTask(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] });
        }
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const loadEvents = async () => {
        refetchTasks();

        // Build active feeds targets
        const activeTargets: ICalFeedTarget[] = [];
        if (feeds && feeds.length > 0) {
            for (const f of feeds) {
                if (f.enabled && f.url) {
                    activeTargets.push({ id: f.id, name: f.name, url: f.url, color: f.color });
                }
            }
        } else if (legacyIcalUrl) {
            activeTargets.push({ id: 'legacy', name: 'Google Calendar', url: legacyIcalUrl, color: '#3b82f6' });
        }

        if (activeTargets.length === 0) {
            setEvents([]);
            return;
        }

        setIsLoadingEvents(true)
        setError(null)
        try {
            const fetchedEvents = await fetchAllICalFeeds(activeTargets)
            setEvents(fetchedEvents)
            setLastSynced(new Date())
        } catch (err: any) {
            console.error('[CalendarWidget] iCal fetch error:', err)
            let serverMsg = err.response?.data?.error || err.response?.data?.message;
            if (!serverMsg && typeof err.response?.data === 'string') {
                try {
                    const parsed = JSON.parse(err.response.data);
                    serverMsg = parsed.error || parsed.message;
                } catch {}
            }
            const status = err.response?.status;

            let friendlyError: string;
            if (serverMsg) {
                friendlyError = serverMsg;
            } else if (status === 400) {
                friendlyError = language === 'fr'
                    ? "URL iCal invalide ou inaccessible. Vérifiez l'adresse dans vos paramètres."
                    : "Invalid or unreachable iCal URL. Check the address in your settings.";
            } else if (status === 502 || status === 504) {
                friendlyError = language === 'fr'
                    ? "Impossible de joindre le serveur de calendrier. Réessayez dans quelques instants."
                    : "Could not reach the calendar server. Please retry in a moment.";
            } else {
                friendlyError = language === 'fr'
                    ? "Impossible de charger les flux iCal."
                    : "Failed to load iCal feeds.";
            }
            setError(friendlyError)
        } finally {
            setIsLoadingEvents(false)
        }
    }

    useEffect(() => {
        loadEvents()
    }, [currentDate, feeds, legacyIcalUrl])

    const weekStart = startOfWeek(currentDate, { locale })
    const weekEnd = endOfWeek(currentDate, { locale })
    const allDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const days = isMobile
        ? (() => {
            const startDay = new Date(currentDate)
            startDay.setHours(0, 0, 0, 0)
            return eachDayOfInterval({ start: startDay, end: addDays(startDay, 2) })
        })()
        : allDays

    // Compute effective hours based on user configuration and auto-fit
    const { effectiveStartHour, effectiveEndHour } = useMemo(() => {
        if (!autoFitHours) {
            const s = Math.max(0, Math.min(22, startHour));
            const e = Math.max(s + 2, Math.min(24, endHour));
            return { effectiveStartHour: s, effectiveEndHour: e };
        }

        // Auto-fit: dynamically calculate bounding hours from visible days' items
        let minMinutes = 24 * 60;
        let maxMinutes = 0;
        let hasAnyItem = false;

        // Scan events
        for (const e of events) {
            if (!e.start || e.allDay || e.isTask) continue;
            const sDate = new Date(e.start);
            if (days.some(d => isSameDay(d, sDate))) {
                hasAnyItem = true;
                const sm = sDate.getHours() * 60 + sDate.getMinutes();
                let em = sm + 60;
                if (e.end) {
                    const eDate = new Date(e.end);
                    em = Math.max(em, eDate.getHours() * 60 + eDate.getMinutes());
                }
                minMinutes = Math.min(minMinutes, sm);
                maxMinutes = Math.max(maxMinutes, em);
            }
        }

        // Scan timed study tasks
        for (const task of studyTasks) {
            if (!task.week?.startDate || !task.dueTime || task.dueTime === '23:59') continue;
            const taskDate = addDays(new Date(task.week.startDate), (task.dayNumber || 1) - 1);
            if (days.some(d => isSameDay(d, taskDate))) {
                hasAnyItem = true;
                const [h, m] = task.dueTime.split(':').map(Number);
                const sm = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
                const duration = task.durationMinutes || 45;
                minMinutes = Math.min(minMinutes, sm);
                maxMinutes = Math.max(maxMinutes, sm + duration);
            }
        }

        if (!hasAnyItem) {
            const s = Math.max(0, Math.min(22, startHour));
            const e = Math.max(s + 2, Math.min(24, endHour));
            return { effectiveStartHour: s, effectiveEndHour: e };
        }

        // Buffer: 1 hour before earliest item, 1 hour after latest item
        const fitStart = Math.max(0, Math.floor(minMinutes / 60) - 1);
        const fitEnd = Math.min(24, Math.ceil(maxMinutes / 60) + 1);

        const safeStart = Math.min(fitStart, 18);
        const safeEnd = Math.max(safeStart + 3, fitEnd);
        return { effectiveStartHour: safeStart, effectiveEndHour: safeEnd };
    }, [autoFitHours, startHour, endHour, events, studyTasks, days]);

    const displayedHours = useMemo(() => {
        const list: number[] = [];
        for (let h = effectiveStartHour; h < effectiveEndHour; h++) {
            list.push(h);
        }
        return list;
    }, [effectiveStartHour, effectiveEndHour]);

    const startOffsetMinutes = effectiveStartHour * 60;
    const endLimitMinutes = effectiveEndHour * 60;
    const scale = hourHeight / 60;

    // Auto-scroll to morning or current hour on mount / view switch
    useEffect(() => {
        if (gridContainerRef.current) {
            const hasToday = days.some(d => isToday(d));
            const currentHour = now.getHours() + now.getMinutes() / 60;
            const targetHour = hasToday && currentHour >= effectiveStartHour
                ? Math.max(0, currentHour - effectiveStartHour - 0.5)
                : 0.5;
            gridContainerRef.current.scrollTop = targetHour * hourHeight;
        }
    }, [currentDate, isMobile, effectiveStartHour, hourHeight]);

    const isLoading = isLoadingEvents || isLoadingTasks;

    const handleSlotClick = (day: Date, hour: number) => {
        setSelectedModalDate(day);
        setSelectedModalTime(`${hour.toString().padStart(2, '0')}:00`);
        setIsCreateTaskModalOpen(true);
    };

    return (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Header */}
            <div className="p-3 md:p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/30">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base md:text-lg capitalize">
                        <span className="hidden sm:inline">{format(weekStart, 'd MMM', { locale })} - {format(weekEnd, 'd MMM yyyy', { locale })}</span>
                        <span className="sm:hidden">{format(currentDate, 'd MMM yyyy', { locale })}</span>
                    </h3>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Course Filter Dropdown */}
                    {courses.length > 0 && (
                        <select
                            value={filterCourseId}
                            onChange={(e) => setFilterCourseId(e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-foreground transition-colors max-w-[150px] truncate focus:ring-1 focus:ring-primary shadow-xs"
                            title={language === 'fr' ? "Filtrer par cours" : "Filter by course"}
                        >
                            <option value="all">📚 {language === 'fr' ? 'Tous les cours' : 'All courses'}</option>
                            {courses.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.icon ? `${c.icon} ` : ''}{c.title}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Display & Time Range settings dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsDisplaySettingsOpen(!isDisplaySettingsOpen)}
                            className={cn(
                                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors shadow-xs",
                                isDisplaySettingsOpen || autoFitHours
                                    ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                                    : "border-border bg-background hover:bg-muted text-foreground"
                            )}
                            title={language === 'fr' ? "Personnaliser les horaires et l'affichage" : "Customize calendar hours"}
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">
                                {autoFitHours
                                    ? (language === 'fr' ? 'Auto-ajusté' : 'Auto-fit')
                                    : `${effectiveStartHour}h - ${effectiveEndHour}h`}
                            </span>
                        </button>

                        {isDisplaySettingsOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsDisplaySettingsOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-1.5 z-50 w-72 p-3.5 rounded-xl border bg-card text-card-foreground shadow-xl space-y-3 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                            {language === 'fr' ? 'Horaires & Zoom' : 'Hours & Zoom'}
                                        </span>
                                        <button
                                            onClick={() => setIsDisplaySettingsOpen(false)}
                                            className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Auto-fit toggle */}
                                    <div className="space-y-1">
                                        <label className="flex items-start gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={autoFitHours}
                                                onChange={(e) => setAutoFitHours(e.target.checked)}
                                                className="mt-0.5 rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                            />
                                            <div className="text-xs">
                                                <span className="font-medium text-foreground">
                                                    {language === 'fr' ? 'Ajustement auto du jour' : 'Auto-fit day hours'}
                                                </span>
                                                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                                    {language === 'fr'
                                                        ? 'Supprime les zones nocturnes vides selon vos cours et devoirs.'
                                                        : 'Removes empty night gaps based on active classes and tasks.'}
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Manual Hour Range Selectors */}
                                    {!autoFitHours && (
                                        <div className="space-y-2 pt-1 border-t">
                                            <span className="text-[11px] font-medium text-muted-foreground block">
                                                {language === 'fr' ? 'Plage d\'heures fixes :' : 'Fixed time range:'}
                                            </span>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground block mb-0.5">
                                                        {language === 'fr' ? 'Début' : 'Start'}
                                                    </label>
                                                    <select
                                                        value={startHour}
                                                        onChange={(e) => setTimeRange(Number(e.target.value), endHour)}
                                                        className="w-full text-xs font-mono px-2 py-1 rounded border bg-background"
                                                    >
                                                        {[0, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                                                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-muted-foreground block mb-0.5">
                                                        {language === 'fr' ? 'Fin' : 'End'}
                                                    </label>
                                                    <select
                                                        value={endHour}
                                                        onChange={(e) => setTimeRange(startHour, Number(e.target.value))}
                                                        className="w-full text-xs font-mono px-2 py-1 rounded border bg-background"
                                                    >
                                                        {[14, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(h => (
                                                            <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            <div className="flex items-center gap-1 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setTimeRange(8, 19)}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                                >
                                                    8h - 19h
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTimeRange(7, 21)}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                                >
                                                    7h - 21h
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setTimeRange(0, 24)}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
                                                >
                                                    24h
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Zoom level slider / buttons */}
                                    <div className="space-y-1.5 pt-1 border-t">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-muted-foreground">
                                                {language === 'fr' ? 'Zoom vertical :' : 'Vertical zoom:'}
                                            </span>
                                            <span className="text-[11px] font-mono font-semibold">{hourHeight}px/h</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setHourHeight(Math.max(35, hourHeight - 10))}
                                                className="p-1 rounded border hover:bg-muted text-muted-foreground transition-colors"
                                                title={language === 'fr' ? "Dézoomer (plus compact)" : "Zoom out"}
                                            >
                                                <ZoomOut className="h-3 w-3" />
                                            </button>
                                            <input
                                                type="range"
                                                min="35"
                                                max="120"
                                                step="5"
                                                value={hourHeight}
                                                onChange={(e) => setHourHeight(Number(e.target.value))}
                                                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
                                            />
                                            <button
                                                onClick={() => setHourHeight(Math.min(120, hourHeight + 10))}
                                                className="p-1 rounded border hover:bg-muted text-muted-foreground transition-colors"
                                                title={language === 'fr' ? "Zoomer (plus étalé)" : "Zoom in"}
                                            >
                                                <ZoomIn className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Quick Zoom In/Out Toolbar Buttons */}
                    <div className="hidden sm:flex items-center gap-0.5 border border-border rounded-md px-1 py-0.5 bg-background shadow-xs">
                        <button
                            onClick={() => setHourHeight(Math.max(35, hourHeight - 10))}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title={language === 'fr' ? "Dézoomer (réduire la hauteur des heures)" : "Zoom out"}
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => setHourHeight(60)}
                            className="text-[10px] font-mono px-1 text-muted-foreground hover:text-foreground"
                            title={language === 'fr' ? "Réinitialiser le zoom (60px)" : "Reset zoom"}
                        >
                            {hourHeight}px
                        </button>
                        <button
                            onClick={() => setHourHeight(Math.min(120, hourHeight + 10))}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            title={language === 'fr' ? "Zoomer (augmenter la hauteur des heures)" : "Zoom in"}
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Compact Agendas manager button */}
                    <GoogleConnectButton variant="compact" />

                    <div className="h-4 w-px bg-border mx-0.5 hidden sm:block" />

                    {/* Refresh button */}
                    <button onClick={loadEvents} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title={t('action.refresh')}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>

                    {/* Navigation buttons */}
                    <button
                        onClick={() => setCurrentDate(isMobile ? subDays(currentDate, 3) : subWeeks(currentDate, 1))}
                        className="p-1.5 hover:bg-muted rounded"
                        aria-label={isMobile ? "3 jours précédents" : "Semaine précédente"}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-medium px-2 py-1 hover:bg-muted rounded hidden sm:block">
                        {t('calendar.today') || 'Auj.'}
                    </button>
                    <button
                        onClick={() => setCurrentDate(isMobile ? addDays(currentDate, 3) : addWeeks(currentDate, 1))}
                        className="p-1.5 hover:bg-muted rounded"
                        aria-label={isMobile ? "3 jours suivants" : "Semaine suivante"}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Multi-feed Pills Bar */}
            {feeds && feeds.length > 0 && (
                <div className="px-3 md:px-4 py-1.5 border-b bg-muted/10 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
                        {language === 'fr' ? 'Agendas :' : 'Calendars:'}
                    </span>
                    {feeds.map((feed) => (
                        <button
                            key={feed.id}
                            onClick={() => toggleFeed(feed.id)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-all select-none",
                                feed.enabled
                                    ? "bg-card border-border shadow-2xs text-foreground hover:border-primary/50"
                                    : "bg-muted/30 border-dashed border-border/60 text-muted-foreground line-through opacity-60 hover:opacity-100"
                            )}
                            title={feed.enabled 
                                ? (language === 'fr' ? `Cliquer pour masquer « ${feed.name} »` : `Click to hide "${feed.name}"`)
                                : (language === 'fr' ? `Cliquer pour afficher « ${feed.name} »` : `Click to show "${feed.name}"`)}
                        >
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: feed.enabled ? feed.color : '#94a3b8' }}
                            />
                            <span className="truncate max-w-[130px]">{feed.name}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Notification if no external calendar is linked */}
            {!hasAnyFeed && (
                <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            {language === 'fr'
                                ? "Aucun agenda externe connecté : seules vos tâches EduTrack sont affichées."
                                : "No external calendar connected: only your EduTrack tasks are shown."}
                        </span>
                    </div>
                    <GoogleConnectButton />
                </div>
            )}

            {/* Hint about Google Tasks vs Events */}
            {hasAnyFeed && showGoogleTip && (
                <div className="bg-muted/20 border-b px-4 py-2 text-xs flex items-center justify-between gap-2 text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">💡</span>
                        <span>
                            {language === 'fr' ? (
                                <>
                                    <strong>Astuce synchronisation :</strong> La synchronisation est <strong>100% en lecture seule</strong>. Aucun événement ne sera jamais envoyé ni modifié sur vos agendas distants (promo ou école).
                                </>
                            ) : (
                                <>
                                    <strong>Sync tip:</strong> Synchronization is <strong>100% read-only</strong>. No events will ever be written back or modified on your remote calendars.
                                </>
                            )}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowGoogleTip(false)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                        title={language === 'fr' ? "Masquer cette astuce" : "Dismiss tip"}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div className="bg-destructive/10 border-b border-destructive/20 text-destructive text-xs p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={loadEvents}
                        className="underline hover:no-underline text-xs font-semibold shrink-0"
                    >
                        {t('action.retry') || "Réessayer"}
                    </button>
                </div>
            )}

            {/* Day Columns Header & All-Day Header */}
            <div className="border-b border-border bg-card sticky top-0 z-30 shadow-2xs">
                {/* 1. Day Titles Header */}
                <div className="flex border-b border-border/40">
                    {/* Time Gutter Header spacer */}
                    <div className="w-14 sm:w-16 shrink-0 border-r border-border/40 flex items-center justify-center p-2 text-[10px] text-muted-foreground font-mono">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>

                    {/* Day Headers */}
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((day) => {
                            const today = isToday(day);
                            return (
                                <div
                                    key={`header-${day.toISOString()}`}
                                    className={cn(
                                        "p-2 text-center border-r border-border/30 last:border-r-0 flex items-center justify-between gap-1 transition-colors",
                                        today ? "bg-primary/5" : "bg-card"
                                    )}
                                >
                                    <div className="flex-1 text-center min-w-0">
                                        <div className="text-[11px] font-semibold text-muted-foreground uppercase truncate hidden sm:block">
                                            {format(day, 'EEE', { locale })}
                                        </div>
                                        <div className="text-[11px] font-semibold text-muted-foreground uppercase truncate sm:hidden">
                                            {format(day, 'EEEEE', { locale })}
                                        </div>
                                        <div className={cn(
                                            "text-xs sm:text-sm font-bold w-6 h-6 sm:w-7 sm:h-7 mx-auto flex items-center justify-center rounded-full mt-0.5 transition-transform",
                                            today ? "bg-primary text-primary-foreground shadow-sm scale-105" : "text-foreground"
                                        )}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedModalDate(day);
                                            setSelectedModalTime(null);
                                            setIsCreateTaskModalOpen(true);
                                        }}
                                        className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-all shrink-0 active:scale-95"
                                        title={language === 'fr' ? "Ajouter une échéance / tâche" : "Add deadline / task"}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. All-Day / Untimed Section */}
                <div className="flex min-h-[38px] max-h-[120px] overflow-y-auto border-b border-border/60 bg-muted/15">
                    {/* Time Gutter Label */}
                    <div className="w-14 sm:w-16 shrink-0 border-r border-border/40 p-1 flex items-center justify-center text-[10px] font-medium text-muted-foreground uppercase text-center leading-tight">
                        <span className="hidden sm:inline">{language === 'fr' ? 'Journée' : 'All day'}</span>
                        <span className="sm:hidden">24h</span>
                    </div>

                    {/* Day All-Day Cells */}
                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((day) => {
                            // Filter all-day events
                            const dayAllDayEvents = events.filter(e => {
                                if (!e.start) return false;
                                return isSameDay(new Date(e.start), day) && (e.allDay || e.isTask);
                            });

                            // Filter untimed or 23:59 study tasks
                            const dayUntimedStudyTasks = studyTasks.filter((task: any) => {
                                if (!task.week?.startDate) return false;
                                const taskDate = addDays(new Date(task.week.startDate), (task.dayNumber || 1) - 1);
                                if (!isSameDay(taskDate, day)) return false;

                                if (filterCourseId !== 'all') {
                                    const cId = task.course?.id || task.courseId || task.plan?.course?.id || task.plan?.courseId;
                                    if (cId !== filterCourseId) return false;
                                }

                                return !task.dueTime || task.dueTime === '23:59';
                            });

                            const hasAllDayItems = dayAllDayEvents.length > 0 || dayUntimedStudyTasks.length > 0;

                            return (
                                <div
                                    key={`allday-${day.toISOString()}`}
                                    className={cn(
                                        "p-1 border-r border-border/30 last:border-r-0 flex flex-col gap-1 overflow-y-auto",
                                        isToday(day) ? "bg-primary/5" : "bg-transparent"
                                    )}
                                >
                                    {dayAllDayEvents.map(event => {
                                        const feedColor = event.feedColor || '#3b82f6';
                                        return (
                                            <div
                                                key={`allday-event-${event.id}`}
                                                className="px-1.5 py-0.5 rounded border text-[11px] font-medium truncate flex items-center gap-1 shadow-2xs"
                                                style={{
                                                    backgroundColor: `${feedColor}18`,
                                                    borderColor: `${feedColor}40`
                                                }}
                                                title={`${event.summary}${event.feedName ? ` (${event.feedName})` : ''}`}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: feedColor }}
                                                />
                                                <span className="truncate font-semibold" style={{ color: feedColor }}>
                                                    {event.summary}
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {dayUntimedStudyTasks.map((task: any) => {
                                        const course = task.course;
                                        return (
                                            <div
                                                key={`allday-task-${task.id}`}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded border text-[11px] flex items-center justify-between gap-1 group shadow-2xs transition-all",
                                                    task.isCompleted
                                                        ? "bg-muted/40 border-muted text-muted-foreground line-through opacity-70"
                                                        : "bg-card border-purple-500/30 hover:border-purple-500/60"
                                                )}
                                                style={{
                                                    borderLeftColor: course?.color || '#8b5cf6',
                                                    borderLeftWidth: '3px'
                                                }}
                                                title={task.description}
                                            >
                                                <button
                                                    onClick={() => toggleTaskMutation.mutate({
                                                        taskId: task.id,
                                                        isCompleted: !task.isCompleted
                                                    })}
                                                    className="shrink-0 text-purple-600 dark:text-purple-400"
                                                >
                                                    {task.isCompleted ? <CheckSquare className="h-3 w-3 text-emerald-500" /> : <Square className="h-3 w-3" />}
                                                </button>
                                                <span className="truncate flex-1 font-medium">{task.description}</span>
                                                <button
                                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-0.5 shrink-0 transition-opacity"
                                                    title={language === 'fr' ? "Supprimer" : "Delete"}
                                                >
                                                    <Trash2 className="h-2.5 w-2.5" />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {!hasAllDayItems && (
                                        <div className="h-6" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 3. Main Scrollable Vertical Time Grid */}
            <div
                ref={gridContainerRef}
                className="flex-1 overflow-y-auto overflow-x-auto relative select-none"
                style={{ height: 'calc(100% - 130px)' }}
            >
                <div className="flex min-w-[650px] relative" style={{ height: `${displayedHours.length * hourHeight}px` }}>
                    {/* Time Gutter Column */}
                    <div className="w-14 sm:w-16 shrink-0 border-r border-border/40 bg-card/60 sticky left-0 z-20 select-none">
                        {displayedHours.map(hour => (
                            <div
                                key={`gutter-${hour}`}
                                className="border-b border-border/30 relative text-right pr-2 text-[10px] font-mono text-muted-foreground flex items-start justify-end pt-1"
                                style={{ height: `${hourHeight}px` }}
                            >
                                <span className="-mt-2.5 bg-card px-1 rounded">
                                    {hour.toString().padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((day) => {
                            const today = isToday(day);

                            // Current time minute for today line
                            const currentMinutes = now.getHours() * 60 + now.getMinutes();
                            const isNowVisible = currentMinutes >= startOffsetMinutes && currentMinutes <= endLimitMinutes;

                            // 1. Timed iCal Events
                            const timedEvents: TimedCalendarItem[] = events
                                .filter(e => {
                                    if (!e.start || e.allDay || e.isTask) return false;
                                    return isSameDay(new Date(e.start), day);
                                })
                                .map(e => {
                                    const startDate = new Date(e.start);
                                    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                                    let endMinutes = startMinutes + 60;
                                    if (e.end) {
                                        const endDate = new Date(e.end);
                                        const rawEnd = endDate.getHours() * 60 + endDate.getMinutes();
                                        if (rawEnd > startMinutes) {
                                            endMinutes = rawEnd;
                                        }
                                    }
                                    const duration = Math.max(30, endMinutes - startMinutes);
                                    return {
                                        id: `event-${e.id}`,
                                        itemType: 'event',
                                        title: e.summary,
                                        startMinutes,
                                        endMinutes: Math.min(1440, startMinutes + duration),
                                        raw: e
                                    };
                                });

                            // 2. Timed Study Tasks
                            const timedTasks: TimedCalendarItem[] = studyTasks
                                .filter((task: any) => {
                                    if (!task.week?.startDate) return false;
                                    const taskDate = addDays(new Date(task.week.startDate), (task.dayNumber || 1) - 1);
                                    if (!isSameDay(taskDate, day)) return false;

                                    if (filterCourseId !== 'all') {
                                        const cId = task.course?.id || task.courseId || task.plan?.course?.id || task.plan?.courseId;
                                        if (cId !== filterCourseId) return false;
                                    }

                                    return task.dueTime && task.dueTime !== '23:59';
                                })
                                .map((task: any) => {
                                    const [h, m] = task.dueTime.split(':').map(Number);
                                    const startMinutes = (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
                                    const duration = task.durationMinutes || 45;
                                    return {
                                        id: `task-${task.id}`,
                                        itemType: 'task',
                                        title: task.description,
                                        startMinutes,
                                        endMinutes: Math.min(1440, startMinutes + duration),
                                        raw: task
                                    };
                                });

                            // 3. Compute layout with overlapping columns
                            const positionedItems = layoutDayTimedItems([...timedEvents, ...timedTasks]);

                            return (
                                <div
                                    key={`col-${day.toISOString()}`}
                                    className={cn(
                                        "relative border-r border-border/30 last:border-r-0 h-full",
                                        today ? "bg-primary/[0.02]" : "bg-transparent"
                                    )}
                                >
                                    {/* Hour Slot Backgrounds & Guide Lines */}
                                    {displayedHours.map(hour => (
                                        <div
                                            key={`slot-${day.toISOString()}-${hour}`}
                                            onClick={() => handleSlotClick(day, hour)}
                                            className="border-b border-border/30 w-full relative group/slot cursor-pointer transition-colors hover:bg-primary/5"
                                            style={{ height: `${hourHeight}px` }}
                                            title={language === 'fr' ? `Cliquer pour ajouter à ${hour}:00` : `Click to add at ${hour}:00`}
                                        >
                                            {/* Subtle Half-hour dashed line */}
                                            <div
                                                className="absolute left-0 right-0 border-b border-dashed border-border/15 pointer-events-none"
                                                style={{ top: `${hourHeight / 2}px` }}
                                            />
                                            {/* Plus button hint on slot hover */}
                                            <div className="absolute right-1 top-1 opacity-0 group-hover/slot:opacity-100 text-muted-foreground/40 hover:text-primary transition-opacity">
                                                <Plus className="h-3 w-3" />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Current Time Indicator Line (for Today) */}
                                    {today && isNowVisible && (
                                        <div
                                            className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                                            style={{ top: `${(currentMinutes - startOffsetMinutes) * scale}px` }}
                                        >
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 shadow-sm ring-2 ring-background" />
                                            <div className="h-[2px] bg-red-500 w-full shadow-xs" />
                                        </div>
                                    )}

                                    {/* Render Positioned Timed Items with Side-by-Side Overlapping */}
                                    {positionedItems.map(item => {
                                        if (item.endMinutes <= startOffsetMinutes || item.startMinutes >= endLimitMinutes) {
                                            return null;
                                        }
                                        const visibleStart = Math.max(item.startMinutes, startOffsetMinutes);
                                        const visibleEnd = Math.min(item.endMinutes, endLimitMinutes);
                                        const topPx = (visibleStart - startOffsetMinutes) * scale;
                                        const heightPx = Math.max(26, (visibleEnd - visibleStart) * scale);
                                        const totalCols = item.totalColumns || 1;
                                        const colIndex = item.columnIndex || 0;

                                        // Column width & left offset
                                        const leftPercent = (colIndex / totalCols) * 100;
                                        const widthPercent = 100 / totalCols;

                                        if (item.itemType === 'event') {
                                            const event = item.raw as ICalEvent;
                                            const feedColor = event.feedColor || '#3b82f6';

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="absolute rounded-lg p-1.5 text-xs shadow-xs transition-all hover:z-30 hover:shadow-md cursor-pointer overflow-hidden border flex flex-col justify-between"
                                                    style={{
                                                        top: `${topPx}px`,
                                                        height: `${heightPx}px`,
                                                        left: `calc(${leftPercent}% + 1px)`,
                                                        width: `calc(${widthPercent}% - 2px)`,
                                                        zIndex: 10 + colIndex,
                                                        borderLeftColor: feedColor,
                                                        borderLeftWidth: '3.5px',
                                                        backgroundColor: `${feedColor}18`,
                                                        borderColor: `${feedColor}35`,
                                                    }}
                                                    title={`${event.summary}\n${formatEventTime(event, t)}${event.feedName ? `\n📅 ${event.feedName}` : ''}${event.location ? `\n📍 ${event.location}` : ''}`}
                                                >
                                                    <div className="min-w-0">
                                                        <div 
                                                            className="font-semibold text-[11px] leading-tight truncate"
                                                            style={{ color: feedColor }}
                                                        >
                                                            {event.summary}
                                                        </div>
                                                        {heightPx >= 42 && (
                                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                                                <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                                                <span className="truncate">{formatEventTime(event, t)}</span>
                                                            </div>
                                                        )}
                                                        {heightPx >= 58 && ((event.feedName && feeds.length > 1) || event.location) && (
                                                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-muted-foreground/80 truncate">
                                                                {event.feedName && feeds.length > 1 && (
                                                                    <span 
                                                                        className="px-1 py-0.2 rounded font-semibold truncate max-w-[85px]"
                                                                        style={{ backgroundColor: `${feedColor}25`, color: feedColor }}
                                                                    >
                                                                        {event.feedName}
                                                                    </span>
                                                                )}
                                                                {event.location && (
                                                                    <span className="flex items-center gap-0.5 truncate">
                                                                        <MapPin className="h-2 w-2 shrink-0" />
                                                                        <span className="truncate">{event.location}</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Item is an EduTrack Task
                                        const task = item.raw;
                                        const course = task.course;

                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "absolute rounded-lg p-1.5 text-xs shadow-xs transition-all hover:z-30 hover:shadow-md overflow-hidden border group flex flex-col justify-between",
                                                    task.isCompleted
                                                        ? "bg-muted/40 border-muted text-muted-foreground line-through opacity-70"
                                                        : task.type === 'exam'
                                                            ? "bg-rose-500/10 border-rose-500/40 hover:border-rose-500/70"
                                                            : task.type === 'assignment'
                                                                ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500/70"
                                                                : task.type === 'exercise'
                                                                    ? "bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-500/70"
                                                                    : "bg-card border-purple-500/30 hover:border-purple-500/60"
                                                )}
                                                style={{
                                                    top: `${topPx}px`,
                                                    height: `${heightPx}px`,
                                                    left: `calc(${leftPercent}% + 1px)`,
                                                    width: `calc(${widthPercent}% - 2px)`,
                                                    zIndex: 10 + colIndex,
                                                    borderLeftColor: course?.color || '#8b5cf6',
                                                    borderLeftWidth: '3.5px'
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-1 min-w-0">
                                                    <div className="flex items-start gap-1 min-w-0 flex-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleTaskMutation.mutate({
                                                                    taskId: task.id,
                                                                    isCompleted: !task.isCompleted
                                                                });
                                                            }}
                                                            className="mt-0.5 text-purple-600 dark:text-purple-400 shrink-0 hover:scale-110 transition-transform"
                                                            title={task.isCompleted ? "Marquer non terminée" : "Marquer terminée"}
                                                        >
                                                            {task.isCompleted ? (
                                                                <CheckSquare className="h-3 w-3 text-emerald-500" />
                                                            ) : (
                                                                <Square className="h-3 w-3" />
                                                            )}
                                                        </button>
                                                        <div className="min-w-0 flex-1">
                                                            {task.itemId && course ? (
                                                                <Link
                                                                    to={`/edu/course/${course.id}/item/${task.itemId}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="font-semibold text-[11px] leading-tight line-clamp-1 hover:underline text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-0.5"
                                                                >
                                                                    <span className="truncate">{task.description}</span>
                                                                    <ExternalLink className="h-2 w-2 shrink-0 opacity-60" />
                                                                </Link>
                                                            ) : (
                                                                <div className="font-semibold text-[11px] leading-tight line-clamp-1 truncate">
                                                                    {task.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteTaskMutation.mutate(task.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
                                                        title={language === 'fr' ? "Supprimer la tâche" : "Delete task"}
                                                    >
                                                        <Trash2 className="h-2.5 w-2.5" />
                                                    </button>
                                                </div>

                                                {/* Meta: Course, Type, Time */}
                                                {heightPx >= 45 && (
                                                    <div className="flex items-center gap-1 mt-0.5 text-[9px] text-muted-foreground truncate">
                                                        {course && (
                                                            <span
                                                                className="px-1 py-0.2 rounded font-bold truncate max-w-[80px]"
                                                                style={{
                                                                    backgroundColor: `${course.color || '#8b5cf6'}20`,
                                                                    color: course.color || '#8b5cf6'
                                                                }}
                                                            >
                                                                {course.title}
                                                            </span>
                                                        )}
                                                        <span className="font-mono flex items-center gap-0.5 ml-auto shrink-0">
                                                            <Clock className="h-2.5 w-2.5" />
                                                            {task.dueTime}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer / Synced Status */}
            {lastSynced && (
                <div className="p-2 border-t text-[10px] text-center text-muted-foreground bg-muted/10 shrink-0">
                    {t('calendar.synced')}: {format(lastSynced, 'HH:mm')}
                </div>
            )}

            {/* Create Task / Deadline Modal */}
            <CreateTaskModal
                isOpen={isCreateTaskModalOpen}
                onClose={() => {
                    setIsCreateTaskModalOpen(false)
                    setSelectedModalDate(null)
                    setSelectedModalTime(null)
                }}
                initialDate={selectedModalDate}
                initialTime={selectedModalTime}
                initialCourseId={filterCourseId !== 'all' ? filterCourseId : ''}
                courses={courses}
            />
        </div>
    )
}

function formatEventTime(event: ICalEvent, t: (key: string) => string) {
    if (event.allDay) return t('calendar.allDay') || 'Toute la journée'
    const startTime = format(new Date(event.start), 'HH:mm')
    if (event.end) {
        const endTime = format(new Date(event.end), 'HH:mm')
        return `${startTime} - ${endTime}`
    }
    return startTime
}

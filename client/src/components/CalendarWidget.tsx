import React, { useState, useEffect } from 'react'
import {
    ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon,
    Loader2, CheckSquare, Square, CheckCircle2, Clock, BookOpen, AlertCircle,
    Plus, Trash2, X, Sparkles
} from 'lucide-react'
import {
    format, addWeeks, subWeeks, addDays, subDays,
    startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday
} from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfileStore } from '@/store/profileStore'
import { useCalendarStore } from '@/store/calendarStore'
import { fetchICalFeed, ICalEvent } from '@/lib/ical-parser'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studyPlanQueries } from '@/lib/api/queries'
import { GoogleConnectButton } from '@/components/GoogleConnectButton'

export function CalendarWidget() {
    const { apiKeys, activeProfile } = useProfileStore()
    const { icalUrl: storeUrl } = useCalendarStore()
    const { language, t } = useLanguage()
    const queryClient = useQueryClient()

    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<ICalEvent[]>([])
    const [isLoadingEvents, setIsLoadingEvents] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    // Quick Task Creation state
    const [addingTaskForDate, setAddingTaskForDate] = useState<string | null>(null)
    const [newTaskTitle, setNewTaskTitle] = useState('')
    const [showGoogleTip, setShowGoogleTip] = useState(true)

    const icalUrl = apiKeys.google_calendar || storeUrl;
    const isConnected = !!icalUrl;
    const locale = language === 'fr' ? fr : enUS

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

    // Mutation to create task directly from calendar
    const createTaskMutation = useMutation({
        mutationFn: (data: { description: string; date: string }) =>
            studyPlanQueries.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] });
            setAddingTaskForDate(null);
            setNewTaskTitle('');
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
        if (!icalUrl || !isConnected) return

        setIsLoadingEvents(true)
        setError(null)
        try {
            const fetchedEvents = await fetchICalFeed(icalUrl)
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
                    ? "Impossible de charger le flux iCal."
                    : "Failed to load iCal feed.";
            }
            setError(friendlyError)
        } finally {
            setIsLoadingEvents(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            loadEvents()
        } else {
            setEvents([]);
        }
    }, [currentDate, isConnected, icalUrl])

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

    const isLoading = isLoadingEvents || isLoadingTasks;

    return (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[450px]">
            {/* Header */}
            <div className="p-3 md:p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-muted/30">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base md:text-lg capitalize">
                        <span className="hidden sm:inline">{format(weekStart, 'd MMM', { locale })} - {format(weekEnd, 'd MMM yyyy', { locale })}</span>
                        <span className="sm:hidden">{format(currentDate, 'd MMM yyyy', { locale })}</span>
                    </h3>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={loadEvents} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title={t('action.refresh')}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>
                    <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
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

            {/* Notification if Google Calendar is not linked */}
            {!isConnected && (
                <div className="bg-primary/5 border-b border-primary/10 px-4 py-2 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            {language === 'fr'
                                ? "Google Agenda non connecté : seules vos tâches EduTrack sont affichées."
                                : "Google Calendar not connected: only your EduTrack tasks are shown."}
                        </span>
                    </div>
                    <GoogleConnectButton />
                </div>
            )}

            {/* Google Tasks Tip Banner */}
            {isConnected && showGoogleTip && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-2 text-xs flex items-center justify-between gap-2 text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>
                            {language === 'fr' ? (
                                <>
                                    <strong>Astuce Google Agenda :</strong> Google n'inclut pas ses « Tâches » dans le lien iCal (seuls les <strong>« Événements »</strong> sont synchronisés). Pour voir une tâche ici, enregistrez-la en tant qu'<strong>Événement</strong> dans Google Agenda, ou ajoutez-la directement ci-dessous avec le bouton <strong>+</strong>.
                                </>
                            ) : (
                                <>
                                    <strong>Google Tip:</strong> Google does not export "Tasks" via iCal (only <strong>"Events"</strong> are synced). To view tasks here, save them as <strong>Events</strong> in Google Calendar, or add them directly below using the <strong>+</strong> button.
                                </>
                            )}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowGoogleTip(false)}
                        className="p-1 hover:bg-amber-500/20 rounded text-amber-800 dark:text-amber-300 shrink-0"
                        title="Fermer"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-2 text-center flex items-center justify-center gap-2 flex-wrap border-b">
                    <span className="shrink">{error}</span>
                    <button onClick={loadEvents} className="underline font-medium whitespace-nowrap hover:opacity-80">
                        {t('action.retry') || 'Réessayer'}
                    </button>
                </div>
            )}

            {/* Week Grid */}
            <div className="flex-1 p-2 md:p-4 overflow-x-auto">
                <div className="grid grid-cols-3 md:grid-cols-7 gap-1 md:gap-3 w-full h-full min-h-[350px]">
                    {days.map((day) => {
                        // 1. External Events
                        const dayEvents = events.filter(e => {
                            if (!e.start) return false
                            return isSameDay(new Date(e.start), day)
                        }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

                        // 2. Separate VTODO tasks from events in iCal
                        const iCalTasks = dayEvents.filter(e => e.isTask)
                        const pureEvents = dayEvents.filter(e => !e.isTask)

                        // 3. EduTrack Study Tasks
                        const dayStudyTasks = studyTasks.filter((task: any) => {
                            if (!task.week?.startDate) return false;
                            const taskDate = addDays(new Date(task.week.startDate), (task.dayNumber || 1) - 1);
                            return isSameDay(taskDate, day);
                        });

                        const totalTasksCount = dayStudyTasks.length + iCalTasks.length;
                        const totalEventsCount = pureEvents.length;
                        const isAddingForThisDay = addingTaskForDate === day.toISOString();

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "flex flex-col rounded-xl p-2 transition-colors min-h-[160px]",
                                    isToday(day)
                                        ? "bg-primary/5 border-2 border-primary/30 shadow-sm"
                                        : "bg-muted/10 border border-border/50 hover:border-border transition-colors"
                                )}
                            >
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/30">
                                    <div className="flex-1 text-center">
                                        <div className="text-[11px] font-semibold text-muted-foreground uppercase hidden md:block">
                                            {format(day, 'EEE', { locale })}
                                        </div>
                                        <div className="text-[11px] font-semibold text-muted-foreground uppercase md:hidden">
                                            {format(day, 'EEEEE', { locale })}
                                        </div>
                                        <div className={cn(
                                            "text-sm md:text-base font-bold w-7 h-7 mx-auto flex items-center justify-center rounded-full mt-0.5",
                                            isToday(day) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                                        )}>
                                            {format(day, 'd')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setAddingTaskForDate(isAddingForThisDay ? null : day.toISOString());
                                            setNewTaskTitle('');
                                        }}
                                        className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors shrink-0"
                                        title={language === 'fr' ? "Ajouter une tâche" : "Add task"}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* Items Container */}
                                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto max-h-[300px] pr-0.5">
                                    {/* Inline Add Task Form */}
                                    {isAddingForThisDay && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                if (newTaskTitle.trim()) {
                                                    createTaskMutation.mutate({
                                                        description: newTaskTitle.trim(),
                                                        date: day.toISOString()
                                                    });
                                                }
                                            }}
                                            className="p-2 rounded-lg border border-primary bg-background shadow-md space-y-1.5"
                                        >
                                            <input
                                                type="text"
                                                placeholder={language === 'fr' ? "Nom de la tâche..." : "Task description..."}
                                                value={newTaskTitle}
                                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                                className="w-full text-xs px-2 py-1 rounded bg-muted/40 border focus:outline-none focus:ring-1 focus:ring-primary"
                                                autoFocus
                                            />
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setAddingTaskForDate(null)}
                                                    className="px-2 py-0.5 text-[10px] hover:bg-muted rounded text-muted-foreground"
                                                >
                                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                                                    className="px-2 py-0.5 text-[10px] bg-primary text-primary-foreground rounded font-medium disabled:opacity-50"
                                                >
                                                    {createTaskMutation.isPending ? '...' : (language === 'fr' ? 'Ajouter' : 'Add')}
                                                </button>
                                            </div>
                                        </form>
                                    )}

                                    {/* EduTrack Tasks Section */}
                                    {dayStudyTasks.map((task: any) => (
                                        <div
                                            key={`task-${task.id}`}
                                            className={cn(
                                                "p-2 rounded-lg border text-xs space-y-1 transition-all group",
                                                task.isCompleted
                                                    ? "bg-muted/30 border-muted text-muted-foreground line-through opacity-70"
                                                    : "bg-card border-purple-500/30 hover:border-purple-500/60 shadow-xs"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-1.5">
                                                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                                    <button
                                                        onClick={() => toggleTaskMutation.mutate({
                                                            taskId: task.id,
                                                            isCompleted: !task.isCompleted
                                                        })}
                                                        className="mt-0.5 text-purple-600 dark:text-purple-400 hover:scale-110 transition-transform shrink-0"
                                                        title={task.isCompleted ? "Marquer non terminée" : "Marquer terminée"}
                                                    >
                                                        {task.isCompleted ? (
                                                            <CheckSquare className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Square className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>
                                                    <div className="font-semibold leading-tight line-clamp-2 select-none break-words">
                                                        {task.description}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
                                                    title={language === 'fr' ? "Supprimer la tâche" : "Delete task"}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                                                <span className="truncate max-w-[80px] font-medium text-purple-600 dark:text-purple-400">
                                                    {task.plan?.course?.title || task.type || 'Tâche'}
                                                </span>
                                                {task.durationMinutes && (
                                                    <span className="shrink-0">{task.durationMinutes}m</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* iCal VTODO Tasks */}
                                    {iCalTasks.map(task => (
                                        <div
                                            key={`ical-task-${task.id}`}
                                            className={cn(
                                                "p-2 rounded-lg border text-xs space-y-1 transition-all",
                                                task.isCompleted
                                                    ? "bg-muted/30 border-muted text-muted-foreground line-through opacity-70"
                                                    : "bg-card border-blue-500/30 hover:border-blue-500/60 shadow-xs"
                                            )}
                                        >
                                            <div className="flex items-start gap-1.5">
                                                <div className="mt-0.5 text-blue-600 dark:text-blue-400 shrink-0">
                                                    {task.isCompleted ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                                </div>
                                                <div className="font-semibold leading-tight line-clamp-2">
                                                    {task.summary}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Calendar Events */}
                                    {pureEvents.map(event => (
                                        <div
                                            key={`event-${event.id}`}
                                            className="p-2 rounded-lg bg-card border border-border/80 shadow-xs text-xs space-y-1 hover:border-primary/50 transition-colors cursor-default"
                                            title={event.summary}
                                        >
                                            <div className="font-semibold truncate leading-tight">
                                                {event.summary}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                                                <span className="truncate">{formatEventTime(event, t)}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {totalTasksCount === 0 && totalEventsCount === 0 && !isAddingForThisDay && (
                                        <div className="flex-1 flex items-center justify-center py-6">
                                            <span className="text-[10px] text-muted-foreground/40 italic hidden md:block">
                                                {t('calendar.noEvents') || 'Libre'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {lastSynced && (
                <div className="p-2 border-t text-[10px] text-center text-muted-foreground bg-muted/10">
                    {t('calendar.synced')}: {format(lastSynced, 'HH:mm')}
                </div>
            )}
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

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon, ExternalLink, Loader2 } from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useProfileStore } from '@/store/profileStore'
import { fetchICalFeed, ICalEvent } from '@/lib/ical-parser'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

export function CalendarWidget() {
    const { apiKeys } = useProfileStore()
    const { language, t } = useLanguage()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<ICalEvent[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lastSynced, setLastSynced] = useState<Date | null>(null)

    const icalUrl = apiKeys.google_calendar;
    const isConnected = !!icalUrl;

    const locale = language === 'fr' ? fr : enUS

    const loadEvents = async () => {
        if (!icalUrl || !isConnected) return

        setIsLoading(true)
        setError(null)
        try {
            const fetchedEvents = await fetchICalFeed(icalUrl)
            setEvents(fetchedEvents)
            setLastSynced(new Date())
        } catch (err) {
            console.error(err)
            setError("Failed to load iCal feed")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isConnected) {
            loadEvents()
        } else {
            setEvents([]); // Clear events if disconnected or switched profile
        }
    }, [currentDate, isConnected, icalUrl]) // Re-run if URL changes (profile switch)

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1))
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1))

    if (!isConnected) {
        return (
            <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-4 h-[300px]">
                <div className="p-4 bg-muted rounded-full">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Calendar</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">Connect your calendar using the button in the header.</p>
                </div>
            </div>
        )
    }

    const weekStart = startOfWeek(currentDate, { locale })
    const weekEnd = endOfWeek(currentDate, { locale })

    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const weekDays = days.map(d => format(d, 'EEEE', { locale }))

    return (
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[300px]">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg capitalize">
                        {format(weekStart, 'd MMM', { locale })} - {format(weekEnd, 'd MMM yyyy', { locale })}
                    </h3>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={loadEvents} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title={t('action.refresh')}>
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button onClick={prevWeek} className="p-1.5 hover:bg-muted rounded">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-medium px-2 py-1 hover:bg-muted rounded">
                        Today
                    </button>
                    <button onClick={nextWeek} className="p-1.5 hover:bg-muted rounded">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-xs p-2 text-center">
                    {error} <button onClick={loadEvents} className="underline">Retry</button>
                </div>
            )}

            {/* Week Grid */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="grid grid-cols-7 gap-4 min-w-[800px] h-full">
                    {days.map((day, idx) => {
                        const dayEvents = events.filter(e => {
                            if (!e.start) return false
                            return isSameDay(e.start, day)
                        }).sort((a, b) => a.start.getTime() - b.start.getTime())

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "flex flex-col gap-2 rounded-lg p-2 transition-colors",
                                    isToday(day) ? "bg-primary/5 border border-primary/20" : "bg-muted/10 border border-transparent"
                                )}
                            >
                                <div className="text-center mb-2">
                                    <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, 'EEE', { locale })}</div>
                                    <div className={cn(
                                        "text-lg font-bold w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1",
                                        isToday(day) && "bg-primary text-primary-foreground"
                                    )}>
                                        {format(day, 'd')}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 flex-1">
                                    {dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className="p-2 rounded bg-card border shadow-sm text-xs space-y-1 hover:border-primary/50 transition-colors cursor-default"
                                            title={event.summary}
                                        >
                                            <div className="font-semibold truncate leading-tight">
                                                {event.summary}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <ClockIcon className="h-3 w-3" />
                                                {formatEventTime(event, t)}
                                            </div>
                                        </div>
                                    ))}
                                    {dayEvents.length === 0 && (
                                        <div className="flex-1 flex items-center justify-center">
                                            <span className="text-[10px] text-muted-foreground/30 italic">{t('calendar.noEvents')}</span>
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
    if (event.allDay) return t('calendar.allDay')

    const startTime = format(event.start, 'HH:mm')

    // Show end time if available
    if (event.end) {
        const endTime = format(event.end, 'HH:mm')
        return `${startTime} - ${endTime}`
    }

    return startTime
}

function ClockIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}

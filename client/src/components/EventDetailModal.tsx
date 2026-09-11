import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    X, Calendar as CalendarIcon, Clock, MapPin, Tag,
    ExternalLink, CheckCircle2, Circle, Trash2, BookOpen
} from 'lucide-react'
import { format, isSameDay, differenceInMinutes } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useLanguage } from '@/components/language-provider'
import type { ICalEvent } from '@/lib/ical-parser'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

interface EventDetailModalProps {
    isOpen: boolean
    onClose: () => void
    event?: ICalEvent | null
    task?: any | null
    onToggleTask?: (taskId: string, isCompleted: boolean) => void
    onDeleteTask?: (taskId: string) => void
}

export function EventDetailModal({
    isOpen,
    onClose,
    event,
    task,
    onToggleTask,
    onDeleteTask
}: EventDetailModalProps) {
    const { language } = useLanguage()
    const locale = language === 'fr' ? fr : enUS

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen || (!event && !task)) return null

    // Determine if it's an iCal event or an EduTrack study task
    const isStudyTask = !!task && !event
    const title = isStudyTask ? task.description : (event?.summary || (language === 'fr' ? 'Sans titre' : 'Untitled'))
    const accentColor = isStudyTask
        ? (task.course?.color || '#8b5cf6')
        : (event?.feedColor || '#3b82f6')

    // Date calculations for iCal event
    let formattedDate = ''
    let formattedTime = ''
    let durationText = ''

    if (event && event.start) {
        const start = new Date(event.start)
        const end = event.end ? new Date(event.end) : null

        formattedDate = format(start, 'EEEE d MMMM yyyy', { locale })
        // Capitalize first letter of day
        formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)

        if (event.allDay) {
            formattedTime = language === 'fr' ? 'Toute la journée' : 'All day'
            if (end && !isSameDay(start, end)) {
                const endDay = format(end, 'EEEE d MMMM yyyy', { locale })
                formattedDate = `${formattedDate} → ${endDay.charAt(0).toUpperCase() + endDay.slice(1)}`
            }
        } else {
            const startTimeStr = format(start, 'HH:mm')
            if (end) {
                const endTimeStr = format(end, 'HH:mm')
                if (isSameDay(start, end)) {
                    formattedTime = `${startTimeStr} - ${endTimeStr}`
                    const diffMin = differenceInMinutes(end, start)
                    if (diffMin > 0) {
                        const h = Math.floor(diffMin / 60)
                        const m = diffMin % 60
                        if (h > 0 && m > 0) {
                            durationText = `${h}h${m.toString().padStart(2, '0')}`
                        } else if (h > 0) {
                            durationText = `${h}h`
                        } else {
                            durationText = `${m} min`
                        }
                    }
                } else {
                    formattedTime = `${startTimeStr} → ${format(end, 'd MMM HH:mm', { locale })}`
                }
            } else {
                formattedTime = startTimeStr
            }
        }
    } else if (isStudyTask) {
        if (task.week?.startDate) {
            const taskDate = new Date(task.week.startDate)
            if (task.dayNumber && task.dayNumber > 1) {
                taskDate.setDate(taskDate.getDate() + (task.dayNumber - 1))
            }
            formattedDate = format(taskDate, 'EEEE d MMMM yyyy', { locale })
            formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
        }
        if (task.dueTime && task.dueTime !== '23:59') {
            formattedTime = task.dueTime
            if (task.durationMinutes) {
                const h = Math.floor(task.durationMinutes / 60)
                const m = task.durationMinutes % 60
                durationText = h > 0 ? (m > 0 ? `${h}h${m}` : `${h}h`) : `${m} min`
            }
        } else {
            formattedTime = language === 'fr' ? 'Fin de journée (23:59)' : 'End of day (23:59)'
        }
    }

    // URL detection in description
    const renderDescription = (text?: string) => {
        if (!text) return null
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const parts = text.split(urlRegex)
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:opacity-80 inline-flex items-center gap-0.5 break-all font-medium"
                    >
                        <span>{part}</span>
                        <ExternalLink className="h-3 w-3 inline shrink-0 ml-0.5" />
                    </a>
                )
            }
            return <span key={i}>{part}</span>
        })
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-modal-title"
            >
                {/* Header with accent color */}
                <div
                    className="p-5 border-b text-white relative transition-colors"
                    style={{ backgroundColor: accentColor }}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs shadow-inner shrink-0">
                                {isStudyTask ? (
                                    <BookOpen className="h-5 w-5 text-white" />
                                ) : (
                                    <CalendarIcon className="h-5 w-5 text-white" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-wider opacity-90 block">
                                    {isStudyTask
                                        ? (language === 'fr' ? 'Tâche EduTrack' : 'EduTrack Task')
                                        : (event?.feedName || (language === 'fr' ? 'Événement Agenda' : 'Calendar Event'))}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors shrink-0"
                            title={language === 'fr' ? 'Fermer' : 'Close'}
                            aria-label={language === 'fr' ? 'Fermer' : 'Close'}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <h2
                        id="event-modal-title"
                        className="font-bold text-lg md:text-xl leading-snug mt-3 text-white break-words"
                    >
                        {title}
                    </h2>
                </div>

                {/* Body Details */}
                <div className="p-5 overflow-y-auto space-y-4 text-sm">
                    {/* Date & Time Row */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                        <div className="p-2 rounded-lg bg-background border border-border/60 text-primary shrink-0 mt-0.5">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground text-sm">
                                {formattedDate || (language === 'fr' ? 'Date non spécifiée' : 'No date specified')}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-medium">{formattedTime}</span>
                                {durationText && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                                        {durationText}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Location / Room */}
                    {event?.location && (
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                            <div className="p-2 rounded-lg bg-background border border-border/60 text-rose-500 shrink-0 mt-0.5">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {language === 'fr' ? 'Lieu / Salle' : 'Location / Room'}
                                </div>
                                <div className="font-semibold text-foreground text-sm mt-0.5 break-words">
                                    {event.location}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Source Calendar */}
                    {event?.feedName && (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/30 border border-border/40 text-xs">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">
                                {language === 'fr' ? 'Agenda :' : 'Calendar:'}
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded-full text-xs"
                                style={{
                                    backgroundColor: `${accentColor}18`,
                                    color: accentColor,
                                    borderColor: `${accentColor}40`,
                                    borderWidth: 1
                                }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: accentColor }}
                                />
                                {event.feedName}
                            </span>
                        </div>
                    )}

                    {/* Associated Course for Study Task */}
                    {isStudyTask && task.course && (
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                                    {language === 'fr' ? 'Cours associé' : 'Associated Course'}
                                </span>
                                <span className="font-semibold text-foreground text-sm truncate block mt-0.5">
                                    {task.course.icon ? `${task.course.icon} ` : ''}{task.course.title}
                                </span>
                            </div>
                            {task.itemId && (
                                <Link
                                    to={`/edu/course/${task.course.id}/item/${task.itemId}`}
                                    onClick={onClose}
                                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1 shrink-0"
                                >
                                    <span>{language === 'fr' ? 'Ouvrir' : 'Open'}</span>
                                    <ExternalLink className="h-3 w-3" />
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Task Status for Study Task */}
                    {isStudyTask && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
                            <div className="flex items-center gap-2 text-xs">
                                {task.isCompleted ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="font-medium">
                                    {task.isCompleted
                                        ? (language === 'fr' ? 'Tâche terminée' : 'Task completed')
                                        : (language === 'fr' ? 'À réaliser' : 'To do')}
                                </span>
                            </div>
                            {onToggleTask && (
                                <button
                                    type="button"
                                    onClick={() => onToggleTask(task.id, !task.isCompleted)}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all",
                                        task.isCompleted
                                            ? "border-muted bg-card hover:bg-muted text-muted-foreground"
                                            : "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                    )}
                                >
                                    {task.isCompleted
                                        ? (language === 'fr' ? 'Marquer à faire' : 'Mark as undone')
                                        : (language === 'fr' ? 'Marquer fait' : 'Mark as done')}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Description Notes */}
                    {event?.description && (
                        <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                {language === 'fr' ? 'Description / Informations' : 'Description / Details'}
                            </span>
                            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {renderDescription(event.description)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 border-t bg-muted/10 flex items-center justify-between gap-2">
                    {isStudyTask && onDeleteTask ? (
                        <button
                            type="button"
                            onClick={() => {
                                onDeleteTask(task.id)
                                onClose()
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-colors inline-flex items-center gap-1.5"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{language === 'fr' ? 'Supprimer' : 'Delete'}</span>
                        </button>
                    ) : (
                        <div />
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                    >
                        {language === 'fr' ? 'Fermer' : 'Close'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

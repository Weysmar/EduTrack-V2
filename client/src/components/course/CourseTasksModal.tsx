import React, { useState } from 'react'
import {
    Calendar as CalendarIcon, CheckSquare, Square, Plus, Trash2,
    Clock, AlertCircle, X, CheckCircle2
} from 'lucide-react'
import { format, addDays, isSameDay } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studyPlanQueries } from '@/lib/api/queries'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { TASK_TYPES } from '@/components/CalendarWidget'

interface CourseTasksModalProps {
    isOpen: boolean
    onClose: () => void
    courseId: string
    courseTitle: string
    courseColor?: string
}

export function CourseTasksModal({
    isOpen,
    onClose,
    courseId,
    courseTitle,
    courseColor = '#3b82f6'
}: CourseTasksModalProps) {
    const { language } = useLanguage()
    const locale = language === 'fr' ? fr : enUS
    const queryClient = useQueryClient()

    const [isAdding, setIsAdding] = useState(false)
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
    const [type, setType] = useState('assignment')

    // Fetch tasks specifically for this course
    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['studyTasks', courseId],
        queryFn: () => studyPlanQueries.getTasks(courseId),
        enabled: isOpen && !!courseId
    })

    // Create task mutation
    const createTaskMutation = useMutation({
        mutationFn: (data: { description: string; date: string; courseId: string; type: string }) =>
            studyPlanQueries.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
            setIsAdding(false)
            setTitle('')
            setDate(new Date().toISOString().split('T')[0])
            setType('assignment')
        }
    })

    // Toggle task mutation
    const toggleTaskMutation = useMutation({
        mutationFn: ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) =>
            studyPlanQueries.updateTask(taskId, { isCompleted }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
        }
    })

    // Delete task mutation
    const deleteTaskMutation = useMutation({
        mutationFn: (taskId: string) => studyPlanQueries.deleteTask(taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
        }
    })

    if (!isOpen) return null

    // Filter and sort tasks for this course
    const courseTasks = tasks.filter((t: any) => {
        const cId = t.course?.id || t.courseId || t.plan?.course?.id || t.plan?.courseId
        return cId === courseId
    }).sort((a: any, b: any) => {
        const dateA = a.week?.startDate ? addDays(new Date(a.week.startDate), (a.dayNumber || 1) - 1).getTime() : 0
        const dateB = b.week?.startDate ? addDays(new Date(b.week.startDate), (b.dayNumber || 1) - 1).getTime() : 0
        return dateA - dateB
    })

    const pendingTasks = courseTasks.filter((t: any) => !t.isCompleted)
    const completedTasks = courseTasks.filter((t: any) => t.isCompleted)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        createTaskMutation.mutate({
            description: title.trim(),
            date: new Date(date).toISOString(),
            courseId,
            type
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div
                    className="p-5 border-b flex items-center justify-between text-white"
                    style={{ backgroundColor: courseColor }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                            <CalendarIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">
                                {language === 'fr' ? 'Échéances & Tâches' : 'Deadlines & Tasks'}
                            </h2>
                            <p className="text-xs opacity-90 truncate max-w-[280px]">
                                {courseTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1">
                    {/* Add Task Button / Form */}
                    {!isAdding ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/5 transition-all text-xs font-semibold flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span>
                                {language === 'fr' ? 'Ajouter une échéance (Examen, Rendu, Révision...)' : 'Add deadline (Exam, Assignment, Revision...)'}
                            </span>
                        </button>
                    ) : (
                        <form
                            onSubmit={handleSubmit}
                            className="p-4 rounded-xl border-2 border-primary/50 bg-muted/20 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">
                                    {language === 'fr' ? 'Nouvelle échéance pour ce cours' : 'New deadline for this course'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    ✕
                                </button>
                            </div>

                            <input
                                type="text"
                                placeholder={language === 'fr' ? "Titre (ex: Partiel final, Rendu étude de cas...)" : "Title (e.g. Final exam, Case study paper...)"}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                autoFocus
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                                        {language === 'fr' ? 'Date de l\'échéance' : 'Due date'}
                                    </label>
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                                        {language === 'fr' ? 'Type' : 'Type'}
                                    </label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                        className="w-full text-xs px-3 py-1.5 rounded-lg bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                                    >
                                        {TASK_TYPES.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.icon} {language === 'fr' ? t.label : t.labelEn}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                                <button
                                    type="button"
                                    onClick={() => setIsAdding(false)}
                                    className="px-3 py-1.5 text-xs hover:bg-muted rounded-lg text-muted-foreground"
                                >
                                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={!title.trim() || createTaskMutation.isPending}
                                    className="px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-semibold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-xs"
                                >
                                    {createTaskMutation.isPending ? '...' : (language === 'fr' ? 'Créer l\'échéance' : 'Create deadline')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Tasks List */}
                    {isLoading ? (
                        <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
                            {language === 'fr' ? 'Chargement des échéances...' : 'Loading deadlines...'}
                        </div>
                    ) : courseTasks.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed rounded-2xl bg-muted/10">
                            <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                            <p className="text-xs font-semibold text-foreground">
                                {language === 'fr' ? 'Aucune échéance pour ce cours' : 'No deadlines for this course'}
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                                {language === 'fr'
                                    ? 'Ajoutez vos partiels, rendus de devoirs et objectifs de révisions pour les retrouver dans votre calendrier.'
                                    : 'Add your exams, assignments, and revision targets to track them in your calendar.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Pending Tasks */}
                            {pendingTasks.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                        {language === 'fr' ? `À faire (${pendingTasks.length})` : `To do (${pendingTasks.length})`}
                                    </div>
                                    <div className="space-y-2">
                                        {pendingTasks.map((task: any) => {
                                            const taskTypeInfo = TASK_TYPES.find(t => t.id === task.type) || TASK_TYPES[4]
                                            const taskDate = task.week?.startDate
                                                ? addDays(new Date(task.week.startDate), (task.dayNumber || 1) - 1)
                                                : null

                                            return (
                                                <div
                                                    key={task.id}
                                                    className={cn(
                                                        "p-3 rounded-xl border text-xs flex items-center justify-between gap-3 bg-card hover:border-primary/40 transition-all shadow-xs group",
                                                        task.type === 'exam'
                                                            ? "border-rose-500/30 bg-rose-500/5"
                                                            : task.type === 'assignment'
                                                                ? "border-amber-500/30 bg-amber-500/5"
                                                                : "border-border"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <button
                                                            onClick={() => toggleTaskMutation.mutate({
                                                                taskId: task.id,
                                                                isCompleted: true
                                                            })}
                                                            className="text-muted-foreground hover:text-emerald-500 hover:scale-110 transition-transform shrink-0"
                                                            title={language === 'fr' ? "Marquer comme fait" : "Mark as done"}
                                                        >
                                                            <Square className="h-4 w-4" />
                                                        </button>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-semibold text-foreground truncate">
                                                                {task.description}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                                                <span className={cn("font-bold px-1.5 py-0.5 rounded border text-[9px] flex items-center gap-0.5", taskTypeInfo.color)}>
                                                                    <span>{taskTypeInfo.icon}</span>
                                                                    <span>{language === 'fr' ? taskTypeInfo.label : taskTypeInfo.labelEn}</span>
                                                                </span>
                                                                {taskDate && (
                                                                    <span className="flex items-center gap-1 font-medium text-foreground">
                                                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                                                        {format(taskDate, 'EEEE d MMMM yyyy', { locale })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => deleteTaskMutation.mutate(task.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
                                                        title={language === 'fr' ? "Supprimer" : "Delete"}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Completed Tasks */}
                            {completedTasks.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-border/40">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                        {language === 'fr' ? `Terminées (${completedTasks.length})` : `Completed (${completedTasks.length})`}
                                    </div>
                                    <div className="space-y-1.5 opacity-60 hover:opacity-100 transition-opacity">
                                        {completedTasks.map((task: any) => (
                                            <div
                                                key={task.id}
                                                className="p-2.5 rounded-xl border border-muted bg-muted/20 text-xs flex items-center justify-between gap-3"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <button
                                                        onClick={() => toggleTaskMutation.mutate({
                                                            taskId: task.id,
                                                            isCompleted: false
                                                        })}
                                                        className="text-emerald-500 hover:scale-110 transition-transform shrink-0"
                                                        title={language === 'fr' ? "Marquer non terminée" : "Mark as uncompleted"}
                                                    >
                                                        <CheckSquare className="h-4 w-4" />
                                                    </button>
                                                    <span className="line-through text-muted-foreground truncate">
                                                        {task.description}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => deleteTaskMutation.mutate(task.id)}
                                                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                                                    title={language === 'fr' ? "Supprimer" : "Delete"}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                        {language === 'fr'
                            ? "Synchronisé avec votre calendrier EduTrack"
                            : "Synced with your EduTrack calendar"}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg font-medium transition-colors"
                    >
                        {language === 'fr' ? 'Fermer' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    )
}

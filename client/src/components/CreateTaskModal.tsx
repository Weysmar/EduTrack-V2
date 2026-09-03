import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar as CalendarIcon, Clock, CheckCircle2, BookOpen, AlertCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { studyPlanQueries } from '@/lib/api/queries'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'
import { TASK_TYPES } from '@/components/CalendarWidget'
import { format } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'

interface CreateTaskModalProps {
    isOpen: boolean
    onClose: () => void
    initialDate?: Date | string | null
    initialCourseId?: string
    initialType?: string
    courses: any[]
}

const DURATIONS = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
    { label: '1h30', value: 90 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
]

export function CreateTaskModal({
    isOpen,
    onClose,
    initialDate,
    initialCourseId = '',
    initialType = 'task',
    courses
}: CreateTaskModalProps) {
    const { language } = useLanguage()
    const locale = language === 'fr' ? fr : enUS
    const queryClient = useQueryClient()

    const [description, setDescription] = useState('')
    const [date, setDate] = useState(() => {
        if (!initialDate) return new Date().toISOString().split('T')[0]
        const d = typeof initialDate === 'string' ? new Date(initialDate) : initialDate
        return d.toISOString().split('T')[0]
    })
    const [courseId, setCourseId] = useState(initialCourseId)
    const [type, setType] = useState(initialType)
    const [durationMinutes, setDurationMinutes] = useState(30)

    useEffect(() => {
        if (isOpen) {
            if (initialDate) {
                const d = typeof initialDate === 'string' ? new Date(initialDate) : initialDate
                setDate(d.toISOString().split('T')[0])
            }
            if (initialCourseId !== undefined) {
                setCourseId(initialCourseId)
            }
            if (initialType) {
                setType(initialType)
            }
        }
    }, [isOpen, initialDate, initialCourseId, initialType])

    const createTaskMutation = useMutation({
        mutationFn: (data: { description: string; date: string; courseId?: string; type?: string; durationMinutes?: number }) =>
            studyPlanQueries.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studyTasks'] })
            handleClose()
        }
    })

    const handleClose = () => {
        setDescription('')
        setCourseId('')
        setType('task')
        setDurationMinutes(30)
        onClose()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!description.trim()) return

        createTaskMutation.mutate({
            description: description.trim(),
            date: new Date(date).toISOString(),
            courseId: courseId || undefined,
            type,
            durationMinutes
        })
    }

    if (!isOpen) return null

    const selectedCourse = courses.find((c: any) => c.id === courseId)
    const activeType = TASK_TYPES.find(t => t.id === type) || TASK_TYPES[4]

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div
                    className="p-5 border-b flex items-center justify-between text-white transition-colors"
                    style={{ backgroundColor: selectedCourse?.color || '#3b82f6' }}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs shadow-inner">
                            <span className="text-xl leading-none">{activeType.icon}</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight">
                                {language === 'fr' ? 'Ajouter une échéance' : 'Add a Deadline'}
                            </h2>
                            <p className="text-xs opacity-90 truncate max-w-[280px]">
                                {selectedCourse ? selectedCourse.title : (language === 'fr' ? 'Échéance générale / sans cours' : 'General deadline / no course')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 rounded-full hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                        title={language === 'fr' ? 'Fermer' : 'Close'}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* 1. Description */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {language === 'fr' ? 'Intitulé de l\'échéance' : 'Title / Description'} *
                        </label>
                        <input
                            type="text"
                            placeholder={
                                type === 'exam'
                                    ? (language === 'fr' ? "Ex: Partiel final de Finance, QCM de mi-semestre..." : "E.g. Final Finance Exam...")
                                    : type === 'assignment'
                                        ? (language === 'fr' ? "Ex: Rendu de l'étude de cas, Dossier de groupe..." : "E.g. Case study report...")
                                        : (language === 'fr' ? "Ex: Révision du chapitre 3, Exercices p.42..." : "E.g. Chapter 3 revision...")
                            }
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-muted/40 border border-input focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-all"
                            autoFocus
                            required
                        />
                    </div>

                    {/* 2. Type Selection (Pills) */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {language === 'fr' ? 'Type d\'échéance' : 'Type of deadline'}
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TASK_TYPES.map((t) => {
                                const isSelected = type === t.id
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setType(t.id)}
                                        className={cn(
                                            "flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all text-left",
                                            isSelected
                                                ? cn(t.color, "border-current ring-2 ring-primary/40 shadow-sm")
                                                : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                                        )}
                                    >
                                        <span className="text-base">{t.icon}</span>
                                        <span className="truncate">{language === 'fr' ? t.label : t.labelEn}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 3. Course Link Selector */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {language === 'fr' ? 'Lier à un cours (optionnel)' : 'Link to a course (optional)'}
                        </label>
                        <select
                            value={courseId}
                            onChange={(e) => setCourseId(e.target.value)}
                            className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-muted/40 border border-input focus:outline-none focus:ring-2 focus:ring-primary font-medium transition-all"
                        >
                            <option value="">{language === 'fr' ? '— Aucun cours (Général) —' : '— No course (General) —'}</option>
                            {courses.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                    {c.icon ? `${c.icon} ` : '📚 '}{c.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Date & Duration in Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <CalendarIcon className="h-3.5 w-3.5" />
                                {language === 'fr' ? 'Date prévue' : 'Scheduled Date'}
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-muted/40 border border-input focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                {language === 'fr' ? 'Durée estimée' : 'Estimated Duration'}
                            </label>
                            <div className="flex flex-wrap gap-1">
                                {DURATIONS.map((dur) => (
                                    <button
                                        key={dur.value}
                                        type="button"
                                        onClick={() => setDurationMinutes(dur.value)}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-xs font-semibold border transition-all",
                                            durationMinutes === dur.value
                                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                : "border-border/60 hover:bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {dur.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-xs font-semibold hover:bg-muted rounded-xl text-muted-foreground transition-colors"
                        >
                            {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={!description.trim() || createTaskMutation.isPending}
                            className="px-5 py-2.5 text-xs bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50 hover:bg-primary/90 transition-all shadow-md flex items-center gap-1.5"
                        >
                            {createTaskMutation.isPending ? (
                                <span>{language === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{language === 'fr' ? 'Ajouter l\'échéance' : 'Add deadline'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

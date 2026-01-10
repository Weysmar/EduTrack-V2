import React, { useState } from 'react'
import { Calendar, Clock, Target, BookOpen, Brain, Loader2, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateStudyPlan } from '@/lib/plans/generator'
import { useCalendarStore } from '@/store/calendarStore'
import { fetchICalFeed } from '@/lib/ical-parser'
import { useProfileStore } from '@/store/profileStore'
import { useLanguage } from '@/components/language-provider'
import { toast } from 'sonner'

interface GeneratePlanModalProps {
    isOpen: boolean
    onClose: () => void
    courseId: string
    onPlanGenerated: () => void
}

export function GeneratePlanModal({ isOpen, onClose, courseId, onPlanGenerated }: GeneratePlanModalProps) {
    const { t } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const { icalUrl, isConnected } = useCalendarStore()

    // Form Data
    const [deadline, setDeadline] = useState<string>('')
    const [hours, setHours] = useState(5)
    const [goal, setGoal] = useState('exam-prep')

    // Preferences ratios (sum to 100 approx)
    const [flashcardsRatio, setFlashcardsRatio] = useState(0.4)
    const [quizRatio, setQuizRatio] = useState(0.4)
    const [readingRatio, setReadingRatio] = useState(0.2)

    if (!isOpen) return null

    const handleSyncCalendar = async () => {
        if (!isConnected || !icalUrl) {
            toast.error(t('plan.calendar.notConnected') || "Connectez d'abord votre calendrier Google.")
            return
        }

        try {
            setIsLoading(true)
            const { courseQueries } = await import('@/lib/api/queries');
            const course = await courseQueries.getOne(courseId);

            if (!course) return

            // Decode URL if strictly needed, but fetchICalFeed handles it via proxy
            const events = await fetchICalFeed(icalUrl)

            // Searching for exam event in calendar

            const examEvent = events.find(e =>
                e.summary.toLowerCase().includes(`examen ${course.title.toLowerCase()}`) ||
                e.summary.toLowerCase().includes(`exam ${course.title.toLowerCase()}`) ||
                e.summary.toLowerCase().includes(course.title.toLowerCase()) && e.summary.toLowerCase().includes('examen')
            )

            if (examEvent) {
                const dateStr = examEvent.start.toISOString().split('T')[0]
                setDeadline(dateStr)
                toast.success(t('plan.calendar.found', { event: examEvent.summary, date: dateStr }) || `Examen trouvé : ${examEvent.summary} le ${dateStr}`)
            } else {
                toast.warning(t('plan.calendar.notFound', { course: course.title }) || `Aucun événement "Examen ${course.title}" trouvé.`)
            }
        } catch (error) {
            console.error(error)
            toast.error(t('plan.calendar.error') || "Erreur de synchronisation calendrier.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!deadline) {
            toast.error(t('plan.error.noDeadline') || "Veuillez sélectionner une date d'examen.")
            return
        }

        setIsLoading(true)
        try {
            await generateStudyPlan({
                courseId,
                profileId: useProfileStore.getState().activeProfile?.id || "unknown",
                deadline: new Date(deadline),
                hoursPerWeek: hours,
                goal,
                preferences: { flashcardsRatio, quizRatio, readingRatio }
            })
            toast.success(t('plan.success') || "Programme de révision généré avec succès !")
            onPlanGenerated()
            onClose()
        } catch (error) {
            console.error(error)
            toast.error(t('plan.error.failed') || "Échec de la génération. Veuillez réessayer.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card rounded-lg shadow-lg border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold">Generate Intelligent Study Plan</h2>
                        <p className="text-sm text-muted-foreground">AI will analyze your course content and schedule.</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Deadline */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Exam Deadline
                            </label>
                            <button
                                onClick={handleSyncCalendar}
                                className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                title="Auto-detect from Google Calendar"
                            >
                                <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
                                Sync from Calendar
                            </button>
                        </div>
                        <input
                            type="date"
                            className="w-full p-2 border rounded-md bg-transparent focus:ring-2 focus:ring-primary/50 outline-none"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Tip: Name your event "Examen {`{Course Name}`}" in Google Calendar.
                        </p>
                    </div>

                    {/* Hours per Week */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center justify-between">
                            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Weekly Availability</span>
                            <span className="text-primary font-bold">{hours}h / week</span>
                        </label>
                        <input
                            type="range"
                            min="1" max="30"
                            value={hours}
                            onChange={(e) => setHours(parseInt(e.target.value))}
                            className="w-full accent-primary"
                        />
                    </div>

                    {/* Goal */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Target className="h-4 w-4" /> Goal
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {['mastery', 'exam-prep', 'review', 'catch-up'].map((g) => (
                                <button
                                    key={g}
                                    onClick={() => setGoal(g)}
                                    className={cn(
                                        "p-3 rounded-lg border text-left text-sm transition-all",
                                        goal === g ? "bg-primary/10 border-primary ring-1 ring-primary" : "hover:bg-muted hover:border-muted-foreground/30"
                                    )}
                                >
                                    <div className="font-semibold capitalize">{g.replace('-', ' ')}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Learning Style */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Brain className="h-4 w-4" /> Learning Style Mix
                        </label>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex-1 text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
                                <div>Flashcards</div>
                                <div className="font-bold text-blue-500">{(flashcardsRatio * 100).toFixed(0)}%</div>
                            </div>
                            <div className="flex-1 text-center p-2 bg-purple-500/10 rounded border border-purple-500/20">
                                <div>Quizzes</div>
                                <div className="font-bold text-purple-500">{(quizRatio * 100).toFixed(0)}%</div>
                            </div>
                            <div className="flex-1 text-center p-2 bg-green-500/10 rounded border border-green-500/20">
                                <div>Reading</div>
                                <div className="font-bold text-green-500">{(readingRatio * 100).toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t p-4 flex justify-end gap-2 bg-muted/20">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isLoading ? "Analyzing..." : "Generate Plan"}
                    </button>
                </div>
            </div>
        </div>
    )
}

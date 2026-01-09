import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Calendar, Clock, BookOpen, ChevronRight, Loader2, Sparkles, Folder, Brain, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { courseQueries, folderQueries, studyPlanQueries } from '@/lib/api/queries'
import { useProfileStore } from '@/store/profileStore'
import { useCalendarStore } from '@/store/calendarStore'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

interface RevisionProgramModalProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 1 | 2 | 3 | 4; // 1: Target, 2: Date, 3: Parameters, 4: Result

export function RevisionProgramModal({ isOpen, onClose }: RevisionProgramModalProps) {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const [step, setStep] = useState<Step>(1)

    // State
    const [selectedTarget, setSelectedTarget] = useState<{ id: string, type: 'course' | 'folder', title: string } | null>(null)
    const [examDate, setExamDate] = useState<string>('')

    // New Params
    const [hoursPerDay, setHoursPerDay] = useState<number>(2)
    const [daysPerWeek, setDaysPerWeek] = useState<number>(5)

    // AI Provider
    const [provider, setProvider] = useState<'google' | 'perplexity'>('google')

    const [generatedPlan, setGeneratedPlan] = useState<any>(null)

    const { apiKeys } = useProfileStore()
    const { isConnected: isCalendarConnected } = useCalendarStore()

    const apiKey = provider === 'google'
        ? (apiKeys?.google_gemini_exercises || apiKeys?.google_gemini_summaries)
        : (apiKeys?.perplexity_exercises || apiKeys?.perplexity_summaries);

    // Data Fetching
    const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: courseQueries.getAll })
    const { data: folders } = useQuery({ queryKey: ['folders'], queryFn: folderQueries.getAll })

    const generateMutation = useMutation({
        mutationFn: (data: any) => studyPlanQueries.generate(data, apiKey),
        onSuccess: (data) => {
            setGeneratedPlan(data.program)
            setStep(4)
        },
        onError: (error: any) => {
            console.error(error)
            const errMsg = error.response?.data?.error || error.message || "Failed to generate plan."
            toast.error(errMsg)
        }
    })

    const handleNext = () => {
        if (step === 1 && !selectedTarget) return
        if (step === 2 && !examDate) return

        if (step === 3) {
            // Validate API Key
            if (!apiKey) {
                toast.error(t('settings.api.missing') + ` (${provider === 'google' ? 'Gemini' : 'Perplexity'})`);
                return;
            }

            // Trigger generation
            generateMutation.mutate({
                targetId: selectedTarget?.id,
                targetType: selectedTarget?.type,
                examDate,
                hoursPerDay,
                daysPerWeek,
                provider
            })
            return // Wait for mutation
        }

        setStep(prev => (prev + 1) as Step)
    }

    const reset = () => {
        setStep(1)
        setSelectedTarget(null)
        setGeneratedPlan(null)
        setExamDate('')
        setHoursPerDay(2)
        setDaysPerWeek(5)
    }

    useEffect(() => {
        if (!isOpen) reset()
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl border animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-bold">{t('revision.program')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                {step < 4 && (
                    <div className="w-full bg-muted h-1">
                        <div
                            className="bg-primary h-full transition-all duration-300 ease-in-out"
                            style={{ width: `${(step / 3) * 100}%` }}
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {generateMutation.isPending ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center animate-pulse">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium text-muted-foreground">{t('revision.generating')}</p>
                            <p className="text-sm text-muted-foreground/70">{provider === 'perplexity' ? "Consulting the knowledge of the universe..." : "Gemini is thinking..."}</p>
                        </div>
                    ) : (
                        <>
                            {step === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold mb-4">{t('revision.selectTarget')}</h3>

                                    <div className="grid gap-3">
                                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Courses</div>
                                        {courses?.map((course: any) => (
                                            <button
                                                key={course.id}
                                                onClick={() => setSelectedTarget({ id: course.id, type: 'course', title: course.title })}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:bg-muted/50",
                                                    selectedTarget?.id === course.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                                )}
                                            >
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }} />
                                                <span className="font-medium">{course.title}</span>
                                            </button>
                                        ))}

                                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 mt-4">Folders (Subjects)</div>
                                        {folders?.map((folder: any) => (
                                            <button
                                                key={folder.id}
                                                onClick={() => setSelectedTarget({ id: folder.id, type: 'folder', title: folder.name })}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border text-left transition-all hover:bg-muted/50",
                                                    selectedTarget?.id === folder.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                                                )}
                                            >
                                                <Folder className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">{folder.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <h3 className="text-xl font-semibold">{t('revision.examDate')}</h3>
                                    <div className="bg-muted/30 p-6 rounded-xl border flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <Calendar className="h-6 w-6 text-muted-foreground" />
                                            <div className="flex-1">
                                                <label className="text-sm font-medium mb-1 block">Date</label>
                                                <input
                                                    type="date"
                                                    value={examDate}
                                                    onChange={e => setExamDate(e.target.value)}
                                                    className="w-full p-2 rounded-md border bg-background"
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                        </div>

                                        {/* Updated Calendar Status Link */}
                                        <div className="flex items-center justify-between text-sm mt-2">
                                            {isCalendarConnected ? (
                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    {t('calendar.connected') || "Calendar Linked"}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground">
                                                    {t('revision.noCalendar')} • <button onClick={() => navigate('/calendar')} className="underline cursor-pointer hover:text-primary transition-colors">{t('revision.linkCalendar')}</button>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8">
                                    <h3 className="text-xl font-semibold">{t('revision.availableTime')}</h3>

                                    {/* Two Column Layout for Time Selection */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                        {/* Hours Per Day */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-muted-foreground">Hours per Day</label>
                                                <span className="text-lg font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{hoursPerDay}h</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="12"
                                                step="0.5"
                                                value={hoursPerDay}
                                                onChange={e => setHoursPerDay(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>30min</span>
                                                <span>12h</span>
                                            </div>
                                        </div>

                                        {/* Days Per Week */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-medium text-muted-foreground">Days per Week</label>
                                                <span className="text-lg font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{daysPerWeek}d</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="7"
                                                step="1"
                                                value={daysPerWeek}
                                                onChange={e => setDaysPerWeek(parseInt(e.target.value))}
                                                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>1d</span>
                                                <span>7d</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary & Provider Selection */}
                                    <div className="bg-muted/30 p-4 rounded-xl border space-y-4">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <span className="font-medium">Total Weekly Effort:</span>
                                            <span className="font-bold">~{hoursPerDay * daysPerWeek} hours / week</span>
                                        </div>

                                        <div className="border-t pt-4">
                                            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3 block">AI Model Provider</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setProvider('google')}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                                        provider === 'google'
                                                            ? "bg-background border-primary ring-1 ring-primary shadow-sm"
                                                            : "bg-muted/50 border-transparent hover:bg-background"
                                                    )}
                                                >
                                                    <Brain className={cn("w-4 h-4", provider === 'google' ? "text-primary" : "text-muted-foreground")} />
                                                    <span className="font-medium text-sm">Google Gemini</span>
                                                </button>
                                                <button
                                                    onClick={() => setProvider('perplexity')}
                                                    className={cn(
                                                        "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all",
                                                        provider === 'perplexity'
                                                            ? "bg-background border-primary ring-1 ring-primary shadow-sm"
                                                            : "bg-muted/50 border-transparent hover:bg-background"
                                                    )}
                                                >
                                                    <Zap className={cn("w-4 h-4", provider === 'perplexity' ? "text-primary" : "text-muted-foreground")} />
                                                    <span className="font-medium text-sm">Perplexity AI</span>
                                                </button>
                                            </div>

                                            {!apiKey && (
                                                <div className="flex items-center gap-2 mt-3 text-amber-600 dark:text-amber-500 text-xs bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                                                    <AlertTriangle className="h-3 w-3" />
                                                    <span>API Key missing for {provider === 'google' ? 'Gemini' : 'Perplexity'}. Check settings.</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && generatedPlan && (
                                <div className="space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="inline-flex p-3 bg-green-500/10 rounded-full text-green-500 mb-2">
                                            <Sparkles className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-xl font-bold">Plan Ready!</h3>
                                        <p className="text-muted-foreground">Here is your optimized path to success.</p>
                                    </div>

                                    {/* Timeline Visualization */}
                                    <div className="mt-6 space-y-6 relative border-l-2 border-muted ml-4 pl-8 pb-4">
                                        {generatedPlan.sessions?.map((session: any, idx: number) => (
                                            <div key={idx} className="relative">
                                                <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-background border-4 border-primary box-content" />
                                                <div className="mb-2 flex items-center gap-2">
                                                    <h4 className="font-bold text-lg">Day {session.day}</h4>
                                                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{session.date}</span>
                                                </div>

                                                <div className="space-y-3">
                                                    {session.tasks?.map((task: any, tIdx: number) => (
                                                        <div key={tIdx} className="bg-card border rounded-lg p-3 flex items-start gap-3 hover:border-primary/50 transition-colors">
                                                            <div className={cn(
                                                                "p-2 rounded-md",
                                                                task.type === 'practice' ? "bg-orange-500/10 text-orange-500" :
                                                                    task.type === 'review' ? "bg-blue-500/10 text-blue-500" :
                                                                        "bg-green-500/10 text-green-500"
                                                            )}>
                                                                {task.type === 'practice' ? <Sparkles className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-medium">{task.title}</p>
                                                                    {task.priority === 'high' && <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">High Priority</span>}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-0.5">{task.duration} min • {task.type}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {/* Exam Day */}
                                        <div className="relative">
                                            <div className="absolute -left-[41px] top-0 w-6 h-6 rounded-full bg-red-500 border-4 border-background box-content" />
                                            <h4 className="font-bold text-lg text-red-600">Exam Day</h4>
                                            <p className="text-muted-foreground">{generatedPlan.examDate}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-center pt-8 pb-4">
                                        <button
                                            onClick={onClose}
                                            className="px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:scale-105 transition-all"
                                        >
                                            Start My Quest!
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {step < 4 && !generateMutation.isPending && (
                    <div className="p-4 border-t bg-muted/20 flex justify-between">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(prev => (prev - 1) as Step)}
                                className="px-4 py-2 hover:bg-muted rounded-md transition-colors"
                            >
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        <button
                            onClick={handleNext}
                            disabled={
                                (step === 1 && !selectedTarget) ||
                                (step === 2 && !examDate) ||
                                (step === 3 && !apiKey)
                            }
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-medium"
                        >
                            {step === 3 ? t('revision.generate') : 'Next'}
                            {step < 3 && <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

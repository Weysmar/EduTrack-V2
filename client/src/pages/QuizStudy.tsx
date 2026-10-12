import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, useBlocker } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { quizQueries } from '@/lib/api/queries'
import { QuizQuestion } from '@/components/QuizQuestion'
import { QuizHistoryChart } from '@/components/item/QuizHistoryChart'
import { QuizConfirmDialog } from '@/components/quiz/QuizConfirmDialog'
import { QuizReview } from '@/components/quiz/QuizReview'
import { getOptionIndexForKey, isAnswerCorrect, isTrueFalseOptions, parseQuizOptions } from '@/components/quiz/quizUtils'
import {
    Trophy, RotateCcw, LayoutGrid, ArrowLeft, CheckCircle, SkipForward, ChevronLeft, ChevronRight, HelpCircle, Repeat, AlertCircle, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'

interface QuestionAnswer {
    selected: number // index of option, or -1 if explicitly skipped ("Passer")
    time: number
    isSubmitted: boolean
}

type SessionMode = 'full' | 'retry'
type SubmitPayload = { score: number; correctAnswers: number; totalQuestions: number }

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s.toString().padStart(2, '0')}s`
}

export function QuizStudy() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { minecraftTheme } = useTheme()
    const { t } = useLanguage()
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const resultsRef = useRef<HTMLDivElement>(null)
    const stepperRef = useRef<HTMLDivElement>(null)
    const stepRefs = useRef<Array<HTMLButtonElement | null>>([])

    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    // Keyed by position inside the current session (0..sessionQuestions.length-1)
    const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({})
    const [startTime, setStartTime] = useState(Date.now())
    const [isFinished, setIsFinished] = useState(false)
    const [finalSummary, setFinalSummary] = useState<{ correctCount: number; score: number; totalTime: number } | null>(null)
    // null = every question of the quiz; otherwise original question indices (retry of mistakes)
    const [sessionOrder, setSessionOrder] = useState<number[] | null>(null)
    const [sessionMode, setSessionMode] = useState<SessionMode>('full')
    const [sessionKey, setSessionKey] = useState(0)
    const [finishConfirm, setFinishConfirm] = useState<number[] | null>(null) // unanswered positions

    const plural = useCallback((key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count }), [t])

    const { data: quiz, isLoading } = useQuery({
        queryKey: ['quizzes', id],
        queryFn: () => quizQueries.getOne(id!),
        enabled: !!id
    })

    const { data: attempts, refetch: refetchAttempts } = useQuery({
        queryKey: ['quizzes', id, 'attempts'],
        queryFn: () => quizQueries.getAttempts(id!),
        enabled: isFinished && !!id
    })

    const questions: any[] = useMemo(() => quiz?.questions || [], [quiz?.questions])
    const sessionQuestions: any[] = useMemo(
        () => (sessionOrder ? sessionOrder.map(i => questions[i]).filter(Boolean) : questions),
        [sessionOrder, questions]
    )
    const totalQuestions = sessionQuestions.length
    const currentQuestion = sessionQuestions[currentIndex]
    const currentOptions = useMemo(() => parseQuizOptions(currentQuestion), [currentQuestion])
    const isLastQuestion = currentIndex === totalQuestions - 1

    const submitResultMutation = useMutation({
        mutationFn: (payload: SubmitPayload) => quizQueries.submit(id!, payload),
        onSuccess: () => {
            toast.dismiss('quiz-submit-error')
            refetchAttempts()
        },
        onError: (_error, variables) => {
            toast.error(t('quiz.submit.error'), {
                id: 'quiz-submit-error',
                description: t('quiz.submit.errorDesc'),
                duration: 10000,
                action: {
                    label: t('action.retry'),
                    onClick: () => submitResultMutation.mutate(variables)
                }
            })
        }
    })

    // ---- Leave protection (in-app confirm when at least one answer was given) ----
    const hasProgress = !isFinished && Object.keys(answers).length > 0
    const shouldBlock = useCallback(
        ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
            hasProgress && currentLocation.pathname !== nextLocation.pathname,
        [hasProgress]
    )
    const blocker = useBlocker(shouldBlock)

    useEffect(() => {
        if (!hasProgress) return
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasProgress])

    const courseUrl = quiz?.courseId ? `/edu/course/${quiz.courseId}` : '/edu/dashboard'
    const handleBack = useCallback(() => {
        // navigate(-1) would leave the app when the quiz was opened directly (no history entry)
        const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
        if (idx > 0) navigate(-1)
        else navigate(courseUrl)
    }, [navigate, courseUrl])

    // Auto-scroll to top and reset timer on question / session change
    useEffect(() => {
        setStartTime(Date.now())
        window.scrollTo({ top: 0, behavior: 'smooth' })
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
        // Keep the active step visible in the horizontal stepper (horizontal scroll only)
        const container = stepperRef.current
        const step = stepRefs.current[currentIndex]
        if (container && step) {
            container.scrollTo({ left: step.offsetLeft - container.clientWidth / 2 + step.clientWidth / 2, behavior: 'smooth' })
        }
    }, [currentIndex, sessionKey])

    useEffect(() => {
        if (isFinished) resultsRef.current?.scrollIntoView({ block: 'start' })
    }, [isFinished])

    // Load saved question state when moving between questions
    const goToQuestion = useCallback((targetIndex: number) => {
        if (targetIndex < 0 || targetIndex >= totalQuestions) return

        const existingAnswer = answers[targetIndex]
        if (existingAnswer) {
            setSelectedOption(existingAnswer.selected)
            setIsSubmitted(existingAnswer.isSubmitted)
        } else {
            setSelectedOption(null)
            setIsSubmitted(false)
        }

        setCurrentIndex(targetIndex)
    }, [totalQuestions, answers])

    const handleSelectOption = useCallback((index: number) => {
        if (isSubmitted) return
        setSelectedOption(index)
    }, [isSubmitted])

    const recordAnswer = useCallback((selected: number) => {
        const timeSpent = (Date.now() - startTime) / 1000
        setAnswers(prev => ({
            ...prev,
            [currentIndex]: { selected, time: timeSpent, isSubmitted: true }
        }))
        setSelectedOption(selected)
        setIsSubmitted(true)
    }, [startTime, currentIndex])

    const handleSubmit = useCallback(() => {
        if (selectedOption === null || isSubmitted) return
        recordAnswer(selectedOption)
    }, [selectedOption, isSubmitted, recordAnswer])

    // "Passer": explicit skip. Stays on the question to reveal the correct answer +
    // explanation; the user moves on with the "Suivant" button.
    const handleSkip = useCallback(() => {
        if (isSubmitted) return
        recordAnswer(-1)
    }, [isSubmitted, recordAnswer])

    const finishQuiz = useCallback((finalAnswersMap: Record<number, QuestionAnswer>) => {
        if (!quiz || !totalQuestions || !id) return

        let correctCount = 0
        let totalTime = 0

        // Unanswered and skipped questions are counted as not correct — the user
        // confirmed this explicitly in the "unanswered questions" dialog.
        sessionQuestions.forEach((q: any, idx: number) => {
            const ans = finalAnswersMap[idx]
            if (ans) {
                totalTime += ans.time || 0
                if (ans.isSubmitted && isAnswerCorrect(q, ans.selected)) correctCount++
            }
        })

        const score = Math.round((correctCount / totalQuestions) * 100)

        setFinalSummary({ correctCount, score, totalTime: Math.round(totalTime) })
        setFinishConfirm(null)
        setIsFinished(true)

        // A "retry mistakes" session only contains a subset of the questions: its score
        // is not comparable and would inflate the best score, so it is not submitted.
        if (sessionMode === 'full') {
            submitResultMutation.mutate({ score, correctAnswers: correctCount, totalQuestions })
        }
    }, [quiz, totalQuestions, id, sessionQuestions, sessionMode, submitResultMutation])

    const requestFinish = useCallback(() => {
        const unanswered = sessionQuestions
            .map((_q, idx) => idx)
            .filter(idx => !answers[idx]?.isSubmitted)
        if (unanswered.length > 0) {
            setFinishConfirm(unanswered)
        } else {
            finishQuiz(answers)
        }
    }, [sessionQuestions, answers, finishQuiz])

    const handleNext = useCallback(() => {
        if (!totalQuestions) return

        // If not submitted yet but an option is selected, validate it first
        if (!isSubmitted) {
            if (selectedOption !== null) handleSubmit()
            return
        }

        if (currentIndex < totalQuestions - 1) {
            goToQuestion(currentIndex + 1)
        } else {
            requestFinish()
        }
    }, [totalQuestions, isSubmitted, selectedOption, handleSubmit, currentIndex, goToQuestion, requestFinish])

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) goToQuestion(currentIndex - 1)
    }, [currentIndex, goToQuestion])

    const startSession = useCallback((order: number[] | null, mode: SessionMode) => {
        setSessionOrder(order)
        setSessionMode(mode)
        setAnswers({})
        setCurrentIndex(0)
        setSelectedOption(null)
        setIsSubmitted(false)
        setFinalSummary(null)
        setFinishConfirm(null)
        setIsFinished(false)
        submitResultMutation.reset()
        toast.dismiss('quiz-submit-error')
        setSessionKey(k => k + 1)
    }, [submitResultMutation])

    // Original indices of the questions answered wrong / skipped / unanswered in this session
    const mistakeIndices = useMemo(() => {
        if (!isFinished) return []
        return sessionQuestions
            .map((q, pos) => ({ q, pos }))
            .filter(({ q, pos }) => !(answers[pos]?.isSubmitted && isAnswerCorrect(q, answers[pos]?.selected)))
            .map(({ pos }) => (sessionOrder ? sessionOrder[pos] : pos))
    }, [isFinished, sessionQuestions, answers, sessionOrder])

    const dialogOpen = finishConfirm !== null || blocker.state === 'blocked'

    // Global keyboard shortcuts — layout independent (uses e.key, works on AZERTY/QWERTY)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || isLoading || !totalQuestions || dialogOpen) return
            if (e.ctrlKey || e.metaKey || e.altKey) return

            const target = e.target as HTMLElement | null
            if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return

            const optionEl = target?.closest?.('[data-quiz-option]') as HTMLElement | null
            const onOtherControl = !optionEl && !!target?.closest?.('button, a, [role="button"], summary')

            if (e.key === 'Enter') {
                // Let focused buttons/links activate natively (no double action)
                if (onOtherControl || e.repeat) return
                // Enter on a focused, not-yet-selected option selects it (native click)
                if (optionEl && !isSubmitted && optionEl.getAttribute('aria-pressed') !== 'true') return
                e.preventDefault()
                if (!isSubmitted) {
                    if (selectedOption !== null) handleSubmit()
                } else {
                    handleNext()
                }
                return
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                handlePrev()
                return
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault()
                if (isSubmitted) handleNext()
                else if (!isLastQuestion) goToQuestion(currentIndex + 1) // leaves it unanswered (warned at the end)
                return
            }

            if (!isSubmitted) {
                const optionIndex = getOptionIndexForKey(e.key, currentOptions)
                if (optionIndex !== null) {
                    e.preventDefault()
                    handleSelectOption(optionIndex)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFinished, isLoading, totalQuestions, dialogOpen, isSubmitted, selectedOption, currentOptions, currentIndex, isLastQuestion, handleSelectOption, handleSubmit, handleNext, handlePrev, goToQuestion])

    const leaveDialog = (
        <QuizConfirmDialog
            open={blocker.state === 'blocked'}
            title={t('quiz.confirmLeave.title')}
            description={t('quiz.confirmLeave.desc')}
            confirmLabel={t('quiz.confirmLeave.confirm')}
            cancelLabel={t('quiz.confirmLeave.cancel')}
            destructive
            onConfirm={() => blocker.proceed?.()}
            onCancel={() => blocker.reset?.()}
        />
    )

    if (isLoading || !quiz) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background gap-3" role="status">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" aria-hidden="true" />
                <p className="text-muted-foreground text-sm font-medium">{t('quiz.loading')}</p>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background p-6">
                <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-6 shadow-md">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <HelpCircle className="w-8 h-8" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold font-heading">{t('quiz.empty.title')}</h2>
                        <p className="text-muted-foreground text-sm">{t('quiz.empty.desc')}</p>
                    </div>
                    <button
                        onClick={() => navigate(`/edu/course/${quiz.courseId || ''}`)}
                        className="w-full min-h-[44px] py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        {t('quiz.backToCourse')}
                    </button>
                </div>
            </div>
        )
    }

    if (isFinished) {
        const score = finalSummary?.score ?? 0
        const correctCount = finalSummary?.correctCount ?? 0
        const totalTime = finalSummary?.totalTime ?? 0
        const isRetry = sessionMode === 'retry'
        const reviewItems = sessionQuestions.map((question, pos) => ({
            question,
            selected: answers[pos]?.isSubmitted ? answers[pos].selected : undefined
        }))

        return (
            <div ref={resultsRef} className="min-h-full bg-background p-4 sm:p-6 flex items-start sm:items-center justify-center">
                <div className="max-w-2xl w-full bg-card border rounded-2xl shadow-lg p-5 sm:p-8 text-center space-y-8 animate-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                        <div className="inline-flex p-4 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 mb-4 shadow-sm">
                            <Trophy className="h-12 w-12" aria-hidden="true" />
                        </div>
                        <h1 className="text-3xl font-bold font-heading">
                            {isRetry ? t('quiz.results.retryTitle') : t('quiz.results.title')}
                        </h1>
                        <p className="text-muted-foreground text-lg">{t('quiz.results.subtitle')}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="p-3 sm:p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('quiz.results.score')}</p>
                            <p className={cn("text-2xl sm:text-3xl font-bold", score >= 80 ? "text-green-600" : score >= 50 ? "text-primary" : "text-amber-500")}>
                                {score}%
                            </p>
                        </div>
                        <div className="p-3 sm:p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('quiz.results.correct')}</p>
                            <p className="text-2xl sm:text-3xl font-bold text-green-600">{correctCount}/{totalQuestions}</p>
                        </div>
                        <div className="p-3 sm:p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('quiz.results.time')}</p>
                            <p className="text-2xl sm:text-3xl font-bold">{formatDuration(totalTime)}</p>
                        </div>
                    </div>

                    {/* Score submission status */}
                    <div aria-live="polite">
                        {isRetry ? (
                            <p className="text-sm text-muted-foreground bg-muted/40 border rounded-xl px-4 py-3">
                                {t('quiz.results.retryNotSaved')}
                            </p>
                        ) : submitResultMutation.isPending ? (
                            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                {t('quiz.submit.saving')}
                            </p>
                        ) : submitResultMutation.isError ? (
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-3">
                                <span className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                                    {t('quiz.submit.error')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => submitResultMutation.variables && submitResultMutation.mutate(submitResultMutation.variables)}
                                    className="min-h-[44px] px-4 rounded-lg border border-red-500/40 font-semibold hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                >
                                    {t('action.retry')}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="pt-6 border-t">
                        <QuizReview items={reviewItems} />
                    </div>

                    <div className="pt-6 border-t">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                {t('quiz.results.history')}
                            </h2>
                            <span className="text-xs text-muted-foreground">{plural('quiz.results.attempts', attempts?.length || 0)}</span>
                        </div>
                        <QuizHistoryChart attempts={attempts || []} />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 justify-center">
                        <button
                            onClick={() => navigate(courseUrl)}
                            className="min-h-[44px] px-6 py-3 rounded-xl border hover:bg-muted transition-colors font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                            {t('quiz.backToCourse')}
                        </button>
                        <button
                            onClick={() => startSession(null, 'full')}
                            className={cn(
                                "min-h-[44px] px-6 py-3 rounded-xl transition-all font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                mistakeIndices.length > 0
                                    ? "border hover:bg-muted"
                                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
                            )}
                        >
                            <RotateCcw className="h-4 w-4" aria-hidden="true" />
                            {isRetry ? t('quiz.results.restartFull') : t('quiz.results.restart')}
                        </button>
                        {mistakeIndices.length > 0 && (
                            <button
                                onClick={() => startSession(mistakeIndices, 'retry')}
                                className="min-h-[44px] px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2 shadow-lg shadow-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <Repeat className="h-4 w-4" aria-hidden="true" />
                                {t('quiz.results.retryMistakes', { count: mistakeIndices.length })}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Score count for currently answered questions
    const answeredCount = Object.values(answers).filter(a => a.isSubmitted).length
    const currentCorrect = Object.entries(answers).filter(([idx, a]) => {
        const q = sessionQuestions[Number(idx)]
        return q && a.isSubmitted && isAnswerCorrect(q, a.selected)
    }).length
    const isTrueFalse = isTrueFalseOptions(currentOptions)

    return (
        <div ref={scrollContainerRef} className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
            {/* Top Navigation Bar */}
            <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 bg-card/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
                <button
                    onClick={handleBack}
                    className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title={t('common.back')}
                    aria-label={t('common.back')}
                >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('quiz.header.question')}</span>
                        <span className="font-bold text-sm sm:text-base">{currentIndex + 1} / {totalQuestions}</span>
                    </div>
                    <div className="h-7 w-px bg-border" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('quiz.header.score')}</span>
                        <span className="font-bold text-primary text-sm sm:text-base">
                            {currentCorrect} / {answeredCount}
                        </span>
                    </div>
                </div>

                <div className="w-11" />
            </header>

            {/* Continuous Progress Bar */}
            <div className="h-1.5 bg-secondary/50 w-full overflow-hidden shrink-0">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
                />
            </div>

            {sessionMode === 'retry' && (
                <div className="w-full bg-primary/5 border-b px-4 py-2 text-center text-xs sm:text-sm text-muted-foreground shrink-0">
                    <Repeat className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5 text-primary" aria-hidden="true" />
                    {t('quiz.retry.banner')}
                </div>
            )}

            {/* Interactive Question Stepper Bar */}
            <nav
                ref={stepperRef}
                aria-label={t('quiz.stepper.label')}
                className="relative w-full bg-card/60 border-b px-4 py-2 overflow-x-auto shrink-0"
            >
                <div className="flex items-center gap-1.5 sm:gap-2 w-max mx-auto">
                    {sessionQuestions.map((q: any, idx: number) => {
                        const ans = answers[idx]
                        const isActive = idx === currentIndex
                        const isAnswered = ans !== undefined && ans.isSubmitted
                        const isSkipped = isAnswered && ans.selected === -1
                        const isCorrect = isAnswered && isAnswerCorrect(q, ans.selected)
                        const isWrong = isAnswered && !isSkipped && !isCorrect
                        const status = isCorrect ? t('quiz.status.correct') : isWrong ? t('quiz.status.incorrect') : isSkipped ? t('quiz.status.skipped') : ''
                        const label = `${t('quiz.stepper.question', { n: idx + 1 })}${status ? ` — ${status}` : ''}`

                        return (
                            <button
                                key={idx}
                                ref={el => { stepRefs.current[idx] = el }}
                                onClick={() => goToQuestion(idx)}
                                aria-current={isActive ? 'step' : undefined}
                                aria-label={label}
                                className={cn(
                                    "w-11 h-11 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                                    isActive && "ring-2 ring-primary ring-offset-1 scale-105 shadow-sm",
                                    isCorrect && "bg-green-500 text-white border-green-600 dark:bg-green-600",
                                    isWrong && "bg-red-500 text-white border-red-600 dark:bg-red-600",
                                    isSkipped && "bg-muted text-muted-foreground border-border",
                                    !isAnswered && !isActive && "bg-card/80 text-muted-foreground hover:bg-muted border-border/70",
                                    !isAnswered && isActive && "bg-primary text-primary-foreground border-primary"
                                )}
                                title={label}
                            >
                                {idx + 1}
                            </button>
                        )
                    })}
                </div>
            </nav>

            {/* Main Question Content */}
            <main className="flex-1 container max-w-3xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-start pt-4 sm:pt-8">
                <div className="w-full mb-4">
                    {currentQuestion && (
                        <QuizQuestion
                            question={currentQuestion}
                            selectedOption={selectedOption}
                            isSubmitted={isSubmitted}
                            onSelectOption={handleSelectOption}
                        />
                    )}
                    {/* Discreet keyboard hint (desktop only) */}
                    <p className="hidden md:block mt-3 text-center text-xs text-muted-foreground/80">
                        {isTrueFalse ? t('quiz.shortcuts.hintTrueFalse') : t('quiz.shortcuts.hint')}
                    </p>
                </div>
            </main>

            {/* Sticky Bottom Action Dock: ALWAYS VISIBLE & ACCESSIBLE! */}
            <footer className="sticky bottom-0 z-40 bg-card/95 backdrop-blur-md border-t px-4 sm:px-8 py-3 shadow-lg shrink-0">
                <div className="container max-w-3xl mx-auto flex items-center justify-between gap-3">
                    {/* Left: Previous button */}
                    <div>
                        {currentIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                aria-label={t('quiz.previous')}
                                className={cn(
                                    "min-h-[44px] min-w-[44px] px-4 sm:px-6 py-2.5 rounded-xl border bg-card hover:bg-muted transition-all font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    minecraftTheme && "rounded-none border-2 border-black/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">{t('quiz.previous')}</span>
                            </button>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Skip Button (before validation): reveals the answer, then "Suivant" */}
                        {!isSubmitted && (
                            <button
                                onClick={handleSkip}
                                className={cn(
                                    "min-h-[44px] px-4 sm:px-5 py-2.5 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    minecraftTheme && "rounded-none border-2 border-black/50"
                                )}
                                title={t('quiz.skip.title')}
                            >
                                <SkipForward className="h-4 w-4" aria-hidden="true" />
                                {t('quiz.skip')}
                            </button>
                        )}

                        {/* Validate Button (when not submitted) */}
                        {!isSubmitted ? (
                            <button
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                                className={cn(
                                    "min-h-[44px] px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    minecraftTheme && "rounded-none border-2 border-[#74c69d] bg-[#3a7d44] hover:bg-[#469d53] text-white shadow-[3px_3px_0px_0px_#081c15]"
                                )}
                            >
                                {t('quiz.validate')}
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                            </button>
                        ) : (
                            /* Next Button (after validation or skip) */
                            <button
                                onClick={handleNext}
                                className={cn(
                                    "min-h-[44px] px-6 sm:px-8 py-2.5 sm:py-3 bg-foreground text-background rounded-xl font-bold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm sm:text-base active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                                    minecraftTheme && "rounded-none border-2 border-white bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                                )}
                            >
                                {isLastQuestion ? t('quiz.finish') : t('quiz.next')}
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>
            </footer>

            <QuizConfirmDialog
                open={finishConfirm !== null}
                title={plural('quiz.confirmFinish.title', finishConfirm?.length ?? 0)}
                description={t('quiz.confirmFinish.desc')}
                confirmLabel={t('quiz.confirmFinish.confirm')}
                cancelLabel={t('quiz.confirmFinish.cancel')}
                onConfirm={() => finishQuiz(answers)}
                onCancel={() => {
                    const first = finishConfirm?.[0]
                    setFinishConfirm(null)
                    if (first !== undefined) goToQuestion(first)
                }}
            />
            {leaveDialog}
        </div>
    )
}

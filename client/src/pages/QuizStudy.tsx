import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { quizQueries } from '@/lib/api/queries'
import { QuizQuestion } from '@/components/QuizQuestion'
import { QuizHistoryChart } from '@/components/item/QuizHistoryChart'
import { 
    Trophy, RotateCcw, LayoutGrid, ArrowLeft, ArrowRight, CheckCircle, SkipForward, ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme-provider'

interface QuestionAnswer {
    selected: number // index of option, or -1 if skipped
    time: number
    isSubmitted: boolean
}

export function QuizStudy() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { minecraftTheme } = useTheme()
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [answers, setAnswers] = useState<Record<number, QuestionAnswer>>({})
    const [startTime, setStartTime] = useState(Date.now())
    const [isFinished, setIsFinished] = useState(false)
    const [finalSummary, setFinalSummary] = useState<{ correctCount: number; score: number; totalTime: number } | null>(null)

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

    const submitResultMutation = useMutation({
        mutationFn: (payload: { score: number; correctAnswers: number; totalQuestions: number }) => 
            quizQueries.submit(id!, payload),
        onSuccess: () => {
            refetchAttempts()
        }
    })

    // Auto-scroll to top and reset timer on question index change
    useEffect(() => {
        setStartTime(Date.now())
        window.scrollTo({ top: 0, behavior: 'smooth' })
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [currentIndex])

    // Load saved question state when moving between questions
    const goToQuestion = useCallback((targetIndex: number) => {
        if (!questions || targetIndex < 0 || targetIndex >= questions.length) return

        const existingAnswer = answers[targetIndex]
        if (existingAnswer) {
            setSelectedOption(existingAnswer.selected)
            setIsSubmitted(existingAnswer.isSubmitted)
        } else {
            setSelectedOption(null)
            setIsSubmitted(false)
        }

        setCurrentIndex(targetIndex)
    }, [questions, answers])

    const handleSelectOption = useCallback((index: number) => {
        if (isSubmitted) return
        setSelectedOption(index)
    }, [isSubmitted])

    const handleSubmit = useCallback(() => {
        if (selectedOption === null || isSubmitted) return

        const timeSpent = (Date.now() - startTime) / 1000
        const updatedAnswer: QuestionAnswer = {
            selected: selectedOption,
            time: timeSpent,
            isSubmitted: true
        }

        setAnswers(prev => ({
            ...prev,
            [currentIndex]: updatedAnswer
        }))
        setIsSubmitted(true)
    }, [selectedOption, isSubmitted, startTime, currentIndex])

    const finishQuiz = useCallback((finalAnswersMap: Record<number, QuestionAnswer>) => {
        if (!quiz || !questions.length || !id) return

        let correctCount = 0
        let totalTime = 0

        questions.forEach((q: any, idx: number) => {
            const ans = finalAnswersMap[idx]
            if (ans) {
                totalTime += ans.time || 0
                if (ans.selected !== -1 && Number(ans.selected) === Number(q.correctAnswer)) {
                    correctCount++
                }
            }
        })

        const score = Math.round((correctCount / questions.length) * 100)

        setFinalSummary({
            correctCount,
            score,
            totalTime: Math.round(totalTime)
        })
        setIsFinished(true)

        submitResultMutation.mutate({
            score,
            correctAnswers: correctCount,
            totalQuestions: questions.length
        })
    }, [quiz, questions, id, submitResultMutation])

    const handleNext = useCallback(() => {
        if (!questions || questions.length === 0) return

        // If not submitted yet but an option is selected, validate it first
        if (!isSubmitted && selectedOption !== null) {
            handleSubmit()
            return
        }

        if (currentIndex < questions.length - 1) {
            goToQuestion(currentIndex + 1)
        } else {
            // Last question: finish quiz
            const timeSpent = (Date.now() - startTime) / 1000
            const finalAnswers = {
                ...answers,
                [currentIndex]: {
                    selected: selectedOption ?? -1,
                    time: timeSpent,
                    isSubmitted: true
                }
            }
            setAnswers(finalAnswers)
            finishQuiz(finalAnswers)
        }
    }, [questions, currentIndex, isSubmitted, selectedOption, handleSubmit, goToQuestion, startTime, answers, finishQuiz])

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            goToQuestion(currentIndex - 1)
        }
    }, [currentIndex, goToQuestion])

    const handleSkip = useCallback(() => {
        if (isSubmitted) {
            handleNext()
            return
        }

        const timeSpent = (Date.now() - startTime) / 1000
        const skippedAnswer: QuestionAnswer = {
            selected: -1,
            time: timeSpent,
            isSubmitted: true
        }

        const updatedAnswers = {
            ...answers,
            [currentIndex]: skippedAnswer
        }
        setAnswers(updatedAnswers)
        setIsSubmitted(true)

        if (currentIndex < questions.length - 1) {
            goToQuestion(currentIndex + 1)
        } else {
            finishQuiz(updatedAnswers)
        }
    }, [isSubmitted, handleNext, startTime, answers, currentIndex, questions.length, goToQuestion, finishQuiz])

    // Global Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || isLoading || !questions.length) return

            // Ignore typing in input fields
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

            // 1-4, NumPad1-4, AZERTY & é " '
            if (!isSubmitted) {
                if (e.key === '1' || e.code === 'Digit1' || e.code === 'Numpad1' || e.key === '&' || e.code === 'KeyA') {
                    e.preventDefault()
                    handleSelectOption(0)
                } else if (e.key === '2' || e.code === 'Digit2' || e.code === 'Numpad2' || e.key === 'é' || e.code === 'KeyB') {
                    e.preventDefault()
                    handleSelectOption(1)
                } else if (e.key === '3' || e.code === 'Digit3' || e.code === 'Numpad3' || e.key === '"' || e.code === 'KeyC') {
                    e.preventDefault()
                    handleSelectOption(2)
                } else if (e.key === '4' || e.code === 'Digit4' || e.code === 'Numpad4' || e.key === "'" || e.code === 'KeyD') {
                    e.preventDefault()
                    handleSelectOption(3)
                }
            }

            // Enter or Space: Validate or Advance
            if (e.key === 'Enter' || e.code === 'Space') {
                e.preventDefault()
                if (!isSubmitted && selectedOption !== null) {
                    handleSubmit()
                } else if (isSubmitted) {
                    handleNext()
                }
            }

            // Arrow Right: Advance or Skip
            if (e.key === 'ArrowRight') {
                e.preventDefault()
                if (isSubmitted) {
                    handleNext()
                } else if (selectedOption !== null) {
                    handleSubmit()
                } else {
                    handleSkip()
                }
            }

            // Arrow Left: Previous
            if (e.key === 'ArrowLeft') {
                e.preventDefault()
                handlePrev()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isFinished, isLoading, questions.length, isSubmitted, selectedOption, handleSelectOption, handleSubmit, handleNext, handleSkip, handlePrev])

    if (isLoading || !quiz) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                <p className="text-muted-foreground text-sm font-medium">Chargement du QCM...</p>
            </div>
        )
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-background p-6">
                <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-6 shadow-md">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                        <HelpCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold font-heading">Aucune question disponible</h2>
                        <p className="text-muted-foreground text-sm">Ce QCM ne contient actuellement aucune question valide.</p>
                    </div>
                    <button
                        onClick={() => navigate(`/edu/course/${quiz.courseId || ''}`)}
                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                    >
                        Retour au cours
                    </button>
                </div>
            </div>
        )
    }

    if (isFinished) {
        const score = finalSummary?.score ?? 0
        const correctCount = finalSummary?.correctCount ?? 0
        const totalTime = finalSummary?.totalTime ?? 0

        return (
            <div className="min-h-full bg-background p-6 flex items-center justify-center">
                <div className="max-w-2xl w-full bg-card border rounded-2xl shadow-lg p-8 text-center space-y-8 animate-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                        <div className="inline-flex p-4 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 mb-4 shadow-sm">
                            <Trophy className="h-12 w-12" />
                        </div>
                        <h1 className="text-3xl font-bold font-heading">Quiz Terminé !</h1>
                        <p className="text-muted-foreground text-lg">Voici le récapitulatif de votre session.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</p>
                            <p className={cn("text-3xl font-bold", score >= 80 ? "text-green-600" : score >= 50 ? "text-primary" : "text-amber-500")}>
                                {score}%
                            </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bonnes réponses</p>
                            <p className="text-3xl font-bold text-green-600">{correctCount}/{questions.length}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temps</p>
                            <p className="text-3xl font-bold">{totalTime}s</p>
                        </div>
                    </div>

                    <div className="pt-6 border-t">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                                Évolution des performances
                            </h2>
                            <span className="text-xs text-muted-foreground">{attempts?.length || 0} tentatives</span>
                        </div>
                        <QuizHistoryChart attempts={attempts || []} />
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate(quiz.courseId ? `/edu/course/${quiz.courseId}` : '/edu/dashboard')}
                            className="px-6 py-3 rounded-xl border hover:bg-muted transition-colors font-medium flex items-center gap-2"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Retour au cours
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Score count for currently answered questions
    const answeredCount = Object.keys(answers).length
    const currentCorrect = Object.entries(answers).filter(([idx, a]) => {
        const q = questions[Number(idx)]
        return q && a.selected !== -1 && Number(a.selected) === Number(q.correctAnswer)
    }).length

    return (
        <div ref={scrollContainerRef} className="flex-1 flex flex-col h-full overflow-y-auto bg-background">
            {/* Top Navigation Bar */}
            <header className="h-14 border-b flex items-center justify-between px-4 sm:px-6 bg-card/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                    title="Retour"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Question</span>
                        <span className="font-bold text-sm sm:text-base">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="h-7 w-px bg-border" />
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Score</span>
                        <span className="font-bold text-primary text-sm sm:text-base">
                            {currentCorrect} / {answeredCount}
                        </span>
                    </div>
                </div>

                <div className="w-10" />
            </header>

            {/* Continuous Progress Bar */}
            <div className="h-1.5 bg-secondary/50 w-full overflow-hidden shrink-0">
                <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
            </div>

            {/* Interactive Question Stepper Bar */}
            <div className="w-full bg-card/60 border-b px-4 py-2 overflow-x-auto flex items-center justify-center gap-1.5 sm:gap-2 shrink-0">
                {questions.map((q: any, idx: number) => {
                    const ans = answers[idx]
                    const isActive = idx === currentIndex
                    const isAnswered = ans !== undefined && ans.isSubmitted
                    const isCorrect = isAnswered && ans.selected !== -1 && Number(ans.selected) === Number(q.correctAnswer)
                    const isWrong = isAnswered && ans.selected !== -1 && Number(ans.selected) !== Number(q.correctAnswer)
                    const isSkipped = isAnswered && ans.selected === -1

                    return (
                        <button
                            key={idx}
                            onClick={() => goToQuestion(idx)}
                            className={cn(
                                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 border",
                                isActive && "ring-2 ring-primary ring-offset-1 scale-105 shadow-sm",
                                isCorrect && "bg-green-500 text-white border-green-600 dark:bg-green-600",
                                isWrong && "bg-red-500 text-white border-red-600 dark:bg-red-600",
                                isSkipped && "bg-muted text-muted-foreground border-border",
                                !isAnswered && !isActive && "bg-card/80 text-muted-foreground hover:bg-muted border-border/70",
                                !isAnswered && isActive && "bg-primary text-primary-foreground border-primary"
                            )}
                            title={`Question ${idx + 1}${isCorrect ? ' (Correcte)' : isWrong ? ' (Incorrecte)' : isSkipped ? ' (Passée)' : ''}`}
                        >
                            {idx + 1}
                        </button>
                    )
                })}
            </div>

            {/* Main Question Content */}
            <main className="flex-1 container max-w-3xl mx-auto p-4 sm:p-6 flex flex-col items-center justify-start pt-4 sm:pt-8">
                <div className="w-full mb-4">
                    <QuizQuestion
                        question={questions[currentIndex]}
                        selectedOption={selectedOption}
                        isSubmitted={isSubmitted}
                        onSelectOption={handleSelectOption}
                    />
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
                                className={cn(
                                    "px-4 sm:px-6 py-2.5 rounded-xl border bg-card hover:bg-muted transition-all font-semibold text-sm flex items-center gap-1.5 shadow-sm active:scale-95",
                                    minecraftTheme && "rounded-none border-2 border-black/50 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                                )}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Précédent</span>
                            </button>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        {/* Skip Button (always available before validation) */}
                        {!isSubmitted && (
                            <button
                                onClick={handleSkip}
                                className={cn(
                                    "px-4 sm:px-5 py-2.5 rounded-xl border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95",
                                    minecraftTheme && "rounded-none border-2 border-black/50"
                                )}
                                title="Passer cette question sans répondre"
                            >
                                <SkipForward className="h-4 w-4" />
                                Passer
                            </button>
                        )}

                        {/* Validate Button (when not submitted) */}
                        {!isSubmitted ? (
                            <button
                                onClick={handleSubmit}
                                disabled={selectedOption === null}
                                className={cn(
                                    "px-6 sm:px-8 py-2.5 sm:py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 text-sm sm:text-base",
                                    minecraftTheme && "rounded-none border-2 border-[#74c69d] bg-[#3a7d44] hover:bg-[#469d53] text-white shadow-[3px_3px_0px_0px_#081c15]"
                                )}
                            >
                                Valider
                                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        ) : (
                            /* Next Button (after validation) */
                            <button
                                onClick={handleNext}
                                className={cn(
                                    "px-6 sm:px-8 py-2.5 sm:py-3 bg-foreground text-background rounded-xl font-bold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm sm:text-base active:scale-95",
                                    minecraftTheme && "rounded-none border-2 border-white bg-white text-black shadow-[3px_3px_0px_0px_#000]"
                                )}
                            >
                                {currentIndex === questions.length - 1 ? 'Terminer le Quiz' : 'Question Suivante'}
                                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </footer>
        </div>
    )
}

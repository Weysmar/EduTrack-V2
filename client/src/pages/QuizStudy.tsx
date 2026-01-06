import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { quizQueries } from '@/lib/api/queries'
import { QuizQuestion } from '@/components/QuizQuestion'
import { ArrowLeft, ArrowRight, CheckCircle, Trophy, RotateCcw, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export function QuizStudy() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [answers, setAnswers] = useState<Record<number, { selected: number, time: number }>>({}) // index -> answer
    const [startTime, setStartTime] = useState(Date.now())
    const [isFinished, setIsFinished] = useState(false)

    const { data: quiz, isLoading } = useQuery({
        queryKey: ['quizzes', id],
        queryFn: () => quizQueries.getOne(id!),
        enabled: !!id
    })

    const questions = quiz?.questions || []

    const submitResultMutation = useMutation({
        mutationFn: (score: number) => quizQueries.submit(id!, score)
    })

    useEffect(() => {
        setStartTime(Date.now())
    }, [currentIndex])

    const handleSelectOption = (index: number) => {
        setSelectedOption(index)
    }

    const handleSubmit = () => {
        if (selectedOption === null) return

        setIsSubmitted(true)
        const timeSpent = (Date.now() - startTime) / 1000

        setAnswers(prev => ({
            ...prev,
            [currentIndex]: { selected: selectedOption, time: timeSpent }
        }))
    }

    const handleNext = () => {
        if (questions && currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1)
            setSelectedOption(null)
            setIsSubmitted(false)
        } else {
            finishQuiz()
        }
    }

    const finishQuiz = async () => {
        if (!quiz || !questions || !id) return

        setIsFinished(true)

        // Calculate stats
        let correctCount = 0
        const detailedAnswers = questions.map((q: any, idx: number) => {
            const ans = answers[idx]
            if (!ans) return null
            const isCorrect = ans.selected === q.correctAnswer
            if (isCorrect) correctCount++
            return {
                questionId: q.id,
                selectedOption: ans.selected,
                isCorrect
            }
        }).filter(Boolean)

        const score = Math.round((correctCount / questions.length) * 100)

        submitResultMutation.mutate(score)
    }

    if (isLoading || !quiz) return <div className="flex items-center justify-center h-screen">Loading...</div>

    if (isFinished) {
        const correctCount = questions.reduce((acc: number, q: any, idx: number) => {
            return acc + (answers[idx]?.selected === q.correctAnswer ? 1 : 0)
        }, 0)

        return (
            <div className="min-h-screen bg-background p-6 flex items-center justify-center">
                <div className="max-w-2xl w-full bg-card border rounded-2xl shadow-lg p-8 text-center space-y-8 animate-in zoom-in-95 duration-300">
                    <div className="space-y-2">
                        <div className="inline-flex p-4 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 mb-4 shadow-sm">
                            <Trophy className="h-12 w-12" />
                        </div>
                        <h1 className="text-3xl font-bold font-heading">Quiz Terminé !</h1>
                        <p className="text-muted-foreground text-lg">Voici comment vous vous êtes débrouillé.</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</p>
                            <p className={cn("text-3xl font-bold", Math.round((correctCount / questions.length) * 100) >= 80 ? "text-green-600" : "text-primary")}>
                                {Math.round((correctCount / questions.length) * 100)}%
                            </p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Correct</p>
                            <p className="text-3xl font-bold text-green-600">{correctCount}/{questions.length}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-xl space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temps</p>
                            <p className="text-3xl font-bold">{Math.round(Object.values(answers).reduce((a, b) => a + b.time, 0))}s</p>
                        </div>
                    </div>

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate(`/course/${quiz.courseId}`)}
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

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="h-16 border-b flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Question</span>
                        <span className="font-bold">{currentIndex + 1} / {questions.length}</span>
                    </div>
                    <div className="h-8 w-px bg-border mx-2" />
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Score</span>
                        <span className="font-bold text-primary">
                            {Object.keys(answers).filter(idx => answers[Number(idx)].selected === questions[Number(idx)].correctAnswer).length}
                        </span>
                    </div>
                </div>

                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Progress Bar */}
            <div className="h-1 bg-secondary w-full">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-in-out"
                    style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 container max-w-4xl mx-auto p-6 flex flex-col items-center justify-start pt-12">

                <div className="w-full mb-8">
                    <QuizQuestion
                        question={questions[currentIndex]}
                        selectedOption={selectedOption}
                        isSubmitted={isSubmitted}
                        onSelectOption={handleSelectOption}
                    />
                </div>

                <div className="flex justify-end w-full max-w-2xl">
                    {!isSubmitted ? (
                        <button
                            onClick={handleSubmit}
                            disabled={selectedOption === null}
                            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                        >
                            Valider
                            <CheckCircle className="h-5 w-5" />
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="px-8 py-3 bg-foreground text-background rounded-xl font-semibold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            {currentIndex === questions.length - 1 ? 'Terminer' : 'Question Suivante'}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    )}
                </div>

            </main>
        </div>
    )
}

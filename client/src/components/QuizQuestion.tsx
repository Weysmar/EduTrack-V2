import React, { useMemo } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'
// import { QuizQuestion as IQuizQuestion } from '../db/db'
import { cn } from '../lib/utils'

interface QuizQuestionProps {
    question: any // Replace with proper type later or define here
    selectedOption: number | null
    isSubmitted: boolean
    onSelectOption: (index: number) => void
}


export function QuizQuestion({ question, selectedOption, isSubmitted, onSelectOption }: QuizQuestionProps) {
    // Randomize options order and strip prefixes (A., B., etc.)
    const shuffledOptions = useMemo(() => {
        const optionsWithIndex = question.options.map((opt, i) => ({
            originalIndex: i,
            text: opt.replace(/^[A-Z]\.\s+/, '') // Remove "A. ", "B. " 
        }))

        // Simple shuffle
        for (let i = optionsWithIndex.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
        }

        return optionsWithIndex
    }, [question.id]) // Re-shuffle only when question content changes

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <HelpCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold leading-relaxed font-heading">
                            {question.stem}
                        </h2>
                    </div>
                </div>

                <div className="space-y-3">
                    {shuffledOptions.map((optionObj, index) => {
                        const isSelected = selectedOption === optionObj.originalIndex
                        const isCorrect = optionObj.originalIndex === question.correctAnswer

                        let variant = "default"
                        if (isSubmitted) {
                            if (isCorrect) variant = "correct"
                            else if (isSelected) variant = "incorrect"
                            else variant = "dimmed"
                        } else {
                            if (isSelected) variant = "selected"
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => !isSubmitted && onSelectOption(optionObj.originalIndex)}
                                disabled={isSubmitted}
                                className={cn(
                                    "w-full text-left p-4 rounded-lg border-2 transition-all relative overflow-hidden group",
                                    variant === 'default' && "border-border hover:border-primary/50 hover:bg-muted/50",
                                    variant === 'selected' && "border-primary bg-primary/5",
                                    variant === 'correct' && "border-green-500 bg-green-500/10",
                                    variant === 'incorrect' && "border-red-500 bg-red-500/10",
                                    variant === 'dimmed' && "border-border/50 opacity-50"
                                )}
                            >
                                <div className="flex items-center justify-between relative z-10">
                                    <span className={cn(
                                        "font-medium",
                                        variant === 'correct' && "text-green-700 dark:text-green-400",
                                        variant === 'incorrect' && "text-red-700 dark:text-red-400",
                                        variant === 'default' && "text-foreground"
                                    )}>
                                        {optionObj.text}
                                    </span>

                                    {isSubmitted && isCorrect && (
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 animate-in zoom-in duration-300" />
                                    )}
                                    {isSubmitted && isSelected && !isCorrect && (
                                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 animate-in zoom-in duration-300" />
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {isSubmitted && (
                    <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className={cn(
                            "p-4 rounded-lg border flex items-start gap-3",
                            selectedOption === question.correctAnswer
                                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900"
                                : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-900"
                        )}>
                            <div className="shrink-0 mt-0.5">
                                {selectedOption === question.correctAnswer
                                    ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    : <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                }
                            </div>
                            <div className="text-sm">
                                <p className="font-semibold mb-1">
                                    {selectedOption === question.correctAnswer ? 'Correct !' : 'Explication'}
                                </p>
                                <p className="text-muted-foreground leading-relaxed">
                                    {question.explanation}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

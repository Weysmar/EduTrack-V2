import React, { useMemo } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import ReactMarkdown from 'react-markdown'

interface QuizQuestionProps {
    question: any
    selectedOption: number | null
    isSubmitted: boolean
    onSelectOption: (index: number) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function QuizQuestion({ question, selectedOption, isSubmitted, onSelectOption }: QuizQuestionProps) {
    // Standardize options order and strip duplicate prefixes (A., B., etc.)
    const optionsList = useMemo(() => {
        if (!question?.options) return []
        return question.options.map((opt: string, i: number) => ({
            originalIndex: i,
            text: opt.replace(/^[A-Z]\.\s+/, '')
        }))
    }, [question?.id, question?.stem, question?.options])

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm transition-all">
                {/* Question Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                        <HelpCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-xl md:text-2xl font-semibold leading-relaxed font-heading text-foreground">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <span className="inline">{children}</span>,
                                    strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-primary-400">{children}</em>
                                }}
                            >
                                {question.stem || ''}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>

                {/* Options List */}
                <div className="space-y-3">
                    {optionsList.map((optionObj: any, index: number) => {
                        const isSelected = selectedOption === optionObj.originalIndex
                        const isCorrect = optionObj.originalIndex === question.correctAnswer
                        const letter = LETTERS[index] || `${index + 1}`

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
                                type="button"
                                onClick={() => !isSubmitted && onSelectOption(optionObj.originalIndex)}
                                disabled={isSubmitted}
                                className={cn(
                                    "w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group flex items-center justify-between gap-4 cursor-pointer",
                                    variant === 'default' && "border-border/80 hover:border-primary/50 hover:bg-muted/40",
                                    variant === 'selected' && "border-primary bg-primary/10 ring-2 ring-primary/20",
                                    variant === 'correct' && "border-green-500 bg-green-500/10 dark:bg-green-950/20",
                                    variant === 'incorrect' && "border-red-500 bg-red-500/10 dark:bg-red-950/20",
                                    variant === 'dimmed' && "border-border/40 opacity-40 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    {/* Choice Badge A, B, C, D */}
                                    <span className={cn(
                                        "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                                        variant === 'default' && "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary",
                                        variant === 'selected' && "bg-primary text-primary-foreground",
                                        variant === 'correct' && "bg-green-500 text-white font-black",
                                        variant === 'incorrect' && "bg-red-500 text-white font-black",
                                        variant === 'dimmed' && "bg-muted/50 text-muted-foreground"
                                    )}>
                                        {letter}
                                    </span>

                                    {/* Option Text */}
                                    <span className={cn(
                                        "font-medium text-base leading-snug break-words flex-1",
                                        variant === 'correct' && "text-green-800 dark:text-green-300 font-semibold",
                                        variant === 'incorrect' && "text-red-800 dark:text-red-300 line-through decoration-red-500/60",
                                        variant === 'selected' && "text-primary font-semibold",
                                        variant === 'default' && "text-foreground"
                                    )}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <span className="inline">{children}</span>,
                                                strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>
                                            }}
                                        >
                                            {optionObj.text}
                                        </ReactMarkdown>
                                    </span>
                                </div>

                                {/* Status Icon */}
                                {isSubmitted && isCorrect && (
                                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 animate-in zoom-in-75 duration-300" />
                                )}
                                {isSubmitted && isSelected && !isCorrect && (
                                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 animate-in zoom-in-75 duration-300" />
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Explanation Card */}
                {isSubmitted && (
                    <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className={cn(
                            "p-4 sm:p-5 rounded-xl border flex items-start gap-3.5",
                            selectedOption === question.correctAnswer
                                ? "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-100"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                        )}>
                            <div className="shrink-0 mt-0.5">
                                {selectedOption === question.correctAnswer
                                    ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    : <HelpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                }
                            </div>
                            <div className="text-sm min-w-0 flex-1">
                                <p className="font-bold mb-1.5 flex items-center gap-2">
                                    {selectedOption === question.correctAnswer ? '🎉 Excellente réponse !' : '💡 Explication détaillée'}
                                </p>
                                <div className="text-foreground/90 leading-relaxed font-normal">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                            strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>,
                                            em: ({ children }) => <em className="italic">{children}</em>
                                        }}
                                    >
                                        {question.explanation || ''}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

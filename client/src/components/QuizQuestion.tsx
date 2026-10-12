import React, { useMemo } from 'react'
import { CheckCircle, XCircle, HelpCircle, SkipForward } from 'lucide-react'
import { cn } from '../lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { useLanguage } from './language-provider'
import {
    OPTION_LETTERS, isAnswerCorrect, isTrueFalseOptions, isTrueOptionText, optionLetter, optionText, parseQuizOptions
} from './quiz/quizUtils'

interface QuizQuestionProps {
    question: any
    selectedOption: number | null
    isSubmitted: boolean
    onSelectOption: (index: number) => void
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export function QuizQuestion({ question, selectedOption, isSubmitted, onSelectOption }: QuizQuestionProps) {
    const { t } = useLanguage()

    // Standardize options order and strip duplicate prefixes (A., B., 1., etc.)
    const optionsList = useMemo(() => parseQuizOptions(question), [question?.id, question?.stem, question?.options])
    const isTrueFalse = useMemo(() => isTrueFalseOptions(optionsList), [optionsList])

    const isCorrectAnswer = isAnswerCorrect(question, selectedOption)
    const isSkipped = selectedOption === -1 || selectedOption === null
    const explanation = typeof question?.explanation === 'string' ? question.explanation.trim() : ''
    const correctIdx = Number(question?.correctAnswer)
    const correctLabel = isTrueFalse
        ? optionText(optionsList, correctIdx)
        : `**${optionLetter(optionsList, correctIdx)}.** ${optionText(optionsList, correctIdx)}`

    const getVariant = (isSelected: boolean, isCorrect: boolean) => {
        if (isSubmitted) {
            if (isCorrect) return 'correct'
            if (isSelected) return 'incorrect'
            return 'dimmed'
        }
        return isSelected ? 'selected' : 'default'
    }

    // Screen-reader-only status appended to each option once the answer is revealed
    const srStatus = (isSelected: boolean, isCorrect: boolean) => {
        if (!isSubmitted) return null
        if (isCorrect) return <span className="sr-only"> — {t('quiz.option.srCorrect')}</span>
        if (isSelected) return <span className="sr-only"> — {t('quiz.option.srYourWrong')}</span>
        return null
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-card border rounded-2xl p-6 sm:p-8 shadow-sm transition-all">
                {/* Question Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-2.5 bg-primary/10 rounded-xl shrink-0 mt-0.5">
                        <HelpCircle className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        {isTrueFalse && (
                            <div className="mb-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    ⚖️ {t('quiz.trueFalseBadge')}
                                </span>
                            </div>
                        )}
                        <div id="quiz-question-stem" className="text-xl md:text-2xl font-semibold leading-relaxed font-heading text-foreground">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
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
                {isTrueFalse ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" role="group" aria-labelledby="quiz-question-stem">
                        {optionsList.map((optionObj, index) => {
                            const isSelected = selectedOption !== null && Number(selectedOption) === Number(optionObj.originalIndex)
                            const isCorrect = Number(optionObj.originalIndex) === correctIdx
                            const isVrai = isTrueOptionText(optionObj.text)
                            // Shortcut shown = first letter of the label (V/T for Vrai/True, F for Faux/False)
                            const shortcutKey = optionObj.text.trim().charAt(0).toUpperCase()
                            const variant = getVariant(isSelected, isCorrect)

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    data-quiz-option=""
                                    onClick={() => !isSubmitted && onSelectOption(optionObj.originalIndex)}
                                    aria-pressed={isSelected}
                                    aria-disabled={isSubmitted}
                                    aria-keyshortcuts={shortcutKey}
                                    className={cn(
                                        "min-h-[44px] p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-3 relative group text-center select-none shadow-xs",
                                        focusRing,
                                        isSubmitted ? "cursor-default" : "cursor-pointer",
                                        variant === 'default' && (
                                            isVrai
                                                ? "border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-foreground"
                                                : "border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 text-foreground"
                                        ),
                                        variant === 'selected' && (
                                            isVrai
                                                ? "border-emerald-500 bg-emerald-500/20 ring-4 ring-emerald-500/20"
                                                : "border-rose-500 bg-rose-500/20 ring-4 ring-rose-500/20"
                                        ),
                                        variant === 'correct' && "border-green-500 bg-green-500/20 text-green-800 dark:text-green-300 font-bold",
                                        variant === 'incorrect' && "border-red-500 bg-red-500/20 text-red-800 dark:text-red-300 font-bold",
                                        variant === 'dimmed' && "opacity-40 border-border/40"
                                    )}
                                >
                                    {/* Keyboard hint badge */}
                                    <span className="hidden sm:inline absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border" aria-hidden="true">
                                        {shortcutKey}
                                    </span>

                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black transition-transform",
                                        !isSubmitted && "group-hover:scale-110",
                                        isVrai ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-rose-500 text-white shadow-md shadow-rose-500/30"
                                    )} aria-hidden="true">
                                        {isVrai ? <CheckCircle className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
                                    </div>

                                    <span className="text-xl font-bold uppercase tracking-wider">
                                        {optionObj.text}
                                        {srStatus(isSelected, isCorrect)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-3" role="group" aria-labelledby="quiz-question-stem">
                        {optionsList.map((optionObj, index) => {
                            const isSelected = selectedOption !== null && Number(selectedOption) === Number(optionObj.originalIndex)
                            const isCorrect = Number(optionObj.originalIndex) === correctIdx
                            const letter = OPTION_LETTERS[index] || `${index + 1}`
                            const variant = getVariant(isSelected, isCorrect)

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    data-quiz-option=""
                                    onClick={() => !isSubmitted && onSelectOption(optionObj.originalIndex)}
                                    aria-pressed={isSelected}
                                    aria-disabled={isSubmitted}
                                    aria-keyshortcuts={index < 4 ? `${letter} ${index + 1}` : undefined}
                                    className={cn(
                                        "w-full min-h-[44px] text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden group flex items-center justify-between gap-4",
                                        focusRing,
                                        isSubmitted ? "cursor-default" : "cursor-pointer",
                                        variant === 'default' && "border-border/80 hover:border-primary/50 hover:bg-muted/40",
                                        variant === 'selected' && "border-primary bg-primary/10 ring-2 ring-primary/20",
                                        variant === 'correct' && "border-green-500 bg-green-500/10 dark:bg-green-950/20",
                                        variant === 'incorrect' && "border-red-500 bg-red-500/10 dark:bg-red-950/20",
                                        variant === 'dimmed' && "border-border/40 opacity-40"
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
                                                remarkPlugins={[remarkMath]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={{
                                                    p: ({ children }) => <span className="inline">{children}</span>,
                                                    strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>
                                                }}
                                            >
                                                {optionObj.text}
                                            </ReactMarkdown>
                                            {srStatus(isSelected, isCorrect)}
                                        </span>
                                    </div>

                                    {/* Status Icon */}
                                    {isSubmitted && isCorrect && (
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 animate-in zoom-in-75 duration-300" aria-hidden="true" />
                                    )}
                                    {isSubmitted && isSelected && !isCorrect && (
                                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 animate-in zoom-in-75 duration-300" aria-hidden="true" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Feedback + Explanation. The live region stays mounted so the
                    result is announced by screen readers when it appears. */}
                <div aria-live="polite" aria-atomic="true">
                    {isSubmitted && (
                        <div className="mt-6 animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className={cn(
                                "p-4 sm:p-5 rounded-xl border flex items-start gap-3.5",
                                isCorrectAnswer
                                    ? "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-100"
                                    : isSkipped
                                        ? "bg-slate-500/10 border-slate-500/30 text-foreground"
                                        : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                            )}>
                                <div className="shrink-0 mt-0.5" aria-hidden="true">
                                    {isCorrectAnswer
                                        ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        : isSkipped
                                            ? <SkipForward className="h-5 w-5 text-muted-foreground" />
                                            : <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    }
                                </div>
                                <div className="text-sm min-w-0 flex-1">
                                    <p className="font-bold mb-1.5">
                                        {isCorrectAnswer
                                            ? `🎉 ${t('quiz.feedback.correct')}`
                                            : isSkipped
                                                ? `⏭️ ${t('quiz.feedback.skipped')}`
                                                : `❌ ${t('quiz.feedback.incorrect')}`}
                                    </p>

                                    {!isCorrectAnswer && optionText(optionsList, correctIdx) && (
                                        <div className="mb-2 text-foreground/90">
                                            <span className="text-muted-foreground">{t('quiz.review.correctAnswer')} </span>
                                            <span className="font-semibold">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{ p: ({ children }) => <span className="inline">{children}</span> }}
                                                >
                                                    {correctLabel}
                                                </ReactMarkdown>
                                            </span>
                                        </div>
                                    )}

                                    {explanation && (
                                        <div className={cn(!isCorrectAnswer && "pt-2 border-t border-black/10 dark:border-white/10")}>
                                            {!isCorrectAnswer && (
                                                <p className="font-semibold mb-1">💡 {t('quiz.feedback.explanation')}</p>
                                            )}
                                            <div className="text-foreground/90 leading-relaxed font-normal">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{
                                                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                                                        strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>,
                                                        em: ({ children }) => <em className="italic">{children}</em>
                                                    }}
                                                >
                                                    {explanation}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

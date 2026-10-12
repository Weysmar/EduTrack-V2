import React, { useMemo, useState } from 'react'
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'
import { isAnswerCorrect, optionLetter, optionText, parseQuizOptions } from './quizUtils'

export interface QuizReviewItem {
    question: any
    /** originalIndex of the chosen option, -1 when skipped, undefined when never answered. */
    selected?: number
}

type ReviewStatus = 'correct' | 'incorrect' | 'skipped'
type Filter = 'all' | 'mistakes'

const inlineMd = {
    p: ({ children }: any) => <span className="inline">{children}</span>,
}
const blockMd = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
}

function Md({ children, block }: { children: string; block?: boolean }) {
    return (
        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={block ? blockMd : inlineMd}>
            {children}
        </ReactMarkdown>
    )
}

export function QuizReview({ items }: { items: QuizReviewItem[] }) {
    const { t } = useLanguage()
    const [filter, setFilter] = useState<Filter>('all')

    const rows = useMemo(() => items.map((item, position) => {
        const options = parseQuizOptions(item.question)
        const answered = item.selected !== undefined && item.selected !== -1
        const status: ReviewStatus = !answered ? 'skipped' : isAnswerCorrect(item.question, item.selected) ? 'correct' : 'incorrect'
        return { ...item, position, options, status }
    }), [items])

    const mistakesCount = rows.filter(r => r.status !== 'correct').length
    const visible = filter === 'all' ? rows : rows.filter(r => r.status !== 'correct')

    const formatOption = (options: ReturnType<typeof parseQuizOptions>, idx: number) => {
        const letter = optionLetter(options, idx)
        const text = optionText(options, idx)
        return letter ? `**${letter}.** ${text}` : text
    }

    const statusLabel: Record<ReviewStatus, string> = {
        correct: t('quiz.status.correct'),
        incorrect: t('quiz.status.incorrect'),
        skipped: t('quiz.status.skipped'),
    }

    return (
        <section className="text-left space-y-4" aria-labelledby="quiz-review-title">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <h2 id="quiz-review-title" className="text-lg font-semibold">{t('quiz.review.title')}</h2>
                <div className="inline-flex rounded-xl border bg-muted/40 p-1" role="group" aria-label={t('quiz.review.filterLabel')}>
                    {(['all', 'mistakes'] as Filter[]).map(f => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            aria-pressed={filter === f}
                            className={cn(
                                "min-h-[36px] px-3 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                filter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f === 'all'
                                ? t('quiz.review.filterAll', { count: rows.length })
                                : t('quiz.review.filterMistakes', { count: mistakesCount })}
                        </button>
                    ))}
                </div>
            </div>

            {visible.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border-2 border-dashed rounded-xl">
                    {t('quiz.review.noMistakes')}
                </p>
            ) : (
                <ol className="space-y-3">
                    {visible.map(row => {
                        const explanation = typeof row.question?.explanation === 'string' ? row.question.explanation.trim() : ''
                        const Icon = row.status === 'correct' ? CheckCircle : row.status === 'incorrect' ? XCircle : MinusCircle
                        return (
                            <li
                                key={row.position}
                                className={cn(
                                    "rounded-xl border p-4 space-y-3",
                                    row.status === 'correct' && "border-green-500/30 bg-green-500/5",
                                    row.status === 'incorrect' && "border-red-500/30 bg-red-500/5",
                                    row.status === 'skipped' && "border-border bg-muted/30"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon
                                        className={cn(
                                            "h-5 w-5 shrink-0 mt-0.5",
                                            row.status === 'correct' && "text-green-600 dark:text-green-400",
                                            row.status === 'incorrect' && "text-red-600 dark:text-red-400",
                                            row.status === 'skipped' && "text-muted-foreground"
                                        )}
                                        aria-hidden="true"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                            {t('quiz.stepper.question', { n: row.position + 1 })}
                                            <span className="sr-only"> — {statusLabel[row.status]}</span>
                                        </p>
                                        <div className="font-medium leading-relaxed break-words">
                                            <Md>{row.question?.stem || ''}</Md>
                                        </div>
                                    </div>
                                </div>

                                <dl className="text-sm space-y-1.5 pl-8">
                                    <div className="flex flex-wrap gap-x-1.5">
                                        <dt className="text-muted-foreground">{t('quiz.review.yourAnswer')}</dt>
                                        <dd className={cn(
                                            "min-w-0 break-words",
                                            row.status === 'correct' && "text-green-700 dark:text-green-300 font-medium",
                                            row.status === 'incorrect' && "text-red-700 dark:text-red-300 font-medium",
                                            row.status === 'skipped' && "italic text-muted-foreground"
                                        )}>
                                            {row.status === 'skipped'
                                                ? (row.selected === -1 ? t('quiz.review.skipped') : t('quiz.review.noAnswer'))
                                                : <Md>{formatOption(row.options, row.selected!)}</Md>}
                                        </dd>
                                    </div>
                                    {row.status !== 'correct' && (
                                        <div className="flex flex-wrap gap-x-1.5">
                                            <dt className="text-muted-foreground">{t('quiz.review.correctAnswer')}</dt>
                                            <dd className="min-w-0 break-words text-green-700 dark:text-green-300 font-medium">
                                                <Md>{formatOption(row.options, Number(row.question?.correctAnswer))}</Md>
                                            </dd>
                                        </div>
                                    )}
                                </dl>

                                {explanation && (
                                    <div className="ml-8 text-sm rounded-lg bg-background/60 border p-3 text-foreground/90">
                                        <p className="font-semibold mb-1">💡 {t('quiz.feedback.explanation')}</p>
                                        <Md block>{explanation}</Md>
                                    </div>
                                )}
                            </li>
                        )
                    })}
                </ol>
            )}
        </section>
    )
}

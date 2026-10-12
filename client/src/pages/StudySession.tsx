import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, CheckCircle, Dumbbell, RotateCcw, CalendarClock, ChevronRight, AlertTriangle } from 'lucide-react'
import { flashcardQueries } from '@/lib/api/queries'
import { calculateNextReview, ReviewGrade } from '@/lib/flashcards/spaced-repetition'
import {
    buildPracticeQueue,
    buildReviewQueue,
    formatRelativeDay,
    getDeckStats,
    isNewCard,
    type SchedulableCard,
} from '@/lib/flashcards/scheduling'
import {
    answerCurrent,
    createSession,
    currentCardId,
    getSessionSummary,
    isFirstAnswer,
    isSessionComplete,
    type SessionMode,
    type SessionState,
} from '@/lib/flashcards/session'
import { CardBackMarkdown, CardFrontMarkdown, toPlainText } from '@/components/flashcards/CardMarkdown'
import { useLanguage } from '@/components/language-provider'
import { useProfileStore } from '@/store/profileStore'
import { cn } from '@/lib/utils'

interface StudyCard extends SchedulableCard {
    front: string
    back: string
}

interface ProgressUpdate {
    cardId: string
    easeFactor: number
    interval: number
    nextReview: string
}

const GRADES: { key: ReviewGrade; shortcut: string; color: string }[] = [
    { key: 'again', shortcut: '1', color: 'hover:border-red-500 text-red-500 border-red-500/30' },
    { key: 'hard', shortcut: '2', color: 'hover:border-amber-500 text-amber-500 border-amber-500/30' },
    { key: 'good', shortcut: '3', color: 'hover:border-blue-500 text-blue-500 border-blue-500/30' },
    { key: 'easy', shortcut: '4', color: 'hover:border-green-500 text-green-500 border-green-500/30' },
]

// Digit row (QWERTY + unshifted AZERTY) and numpad.
const KEY_TO_GRADE: Record<string, ReviewGrade> = {
    '1': 'again', '&': 'again',
    '2': 'hard', 'é': 'hard',
    '3': 'good', '"': 'good',
    '4': 'easy', "'": 'easy',
}
const CODE_TO_GRADE: Record<string, ReviewGrade> = {
    Digit1: 'again', Numpad1: 'again',
    Digit2: 'hard', Numpad2: 'hard',
    Digit3: 'good', Numpad3: 'good',
    Digit4: 'easy', Numpad4: 'easy',
}

export function StudySession() {
    const { setId } = useParams()
    // Remount on deck change ("next deck" button) so the session state starts fresh.
    return <StudySessionView key={setId} setId={setId ?? ''} />
}

function StudySessionView({ setId }: { setId: string }) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { t } = useLanguage()
    const { activeProfile } = useProfileStore()
    const locale = t('common.locale')

    const cardsLabel = useCallback(
        (count: number) => t(count === 1 ? 'flashcards.cardCount.one' : 'flashcards.cardCount.other', { count }),
        [t]
    )

    const { data: setInfo, isLoading, isError, refetch } = useQuery({
        queryKey: ['flashcards', setId],
        queryFn: () => flashcardQueries.getOne(setId),
        enabled: !!setId
    })

    // Used to suggest the next deck with cards to study at the end of the session.
    const { data: allSets } = useQuery({
        queryKey: ['flashcards'],
        queryFn: flashcardQueries.getAll,
        enabled: !!activeProfile
    })

    const deckCards: StudyCard[] = useMemo(
        () => (Array.isArray(setInfo?.flashcards) ? setInfo.flashcards : []),
        [setInfo]
    )

    // ---- Session state ----
    const [checked, setChecked] = useState(false)
    const [session, setSession] = useState<SessionState | null>(null)
    // Snapshot of the cards at session start: background refetches must not change the queue.
    const [cardsById, setCardsById] = useState<Record<string, StudyCard>>({})
    const [revealed, setRevealed] = useState(false)
    const [showBack, setShowBack] = useState(false)
    const [stopped, setStopped] = useState(false)
    // Schedules computed during this session (to show the next review without waiting for refetch).
    const [scheduled, setScheduled] = useState<Record<string, Partial<StudyCard>>>({})

    const cardRef = useRef<HTMLButtonElement>(null)
    const answeredPositionRef = useRef(-1)
    const focusCardRef = useRef(false)

    const startSession = useCallback((mode: SessionMode, cards: StudyCard[]) => {
        setCardsById(Object.fromEntries(cards.map(c => [c.id, c])))
        setSession(createSession(cards.map(c => c.id), mode))
        setRevealed(false)
        setShowBack(false)
        setStopped(false)
        answeredPositionRef.current = -1
    }, [])

    // Auto-start a scheduled review if something is due or new; otherwise show the up-to-date screen.
    useEffect(() => {
        if (!setInfo || checked) return
        setChecked(true)
        const queue = buildReviewQueue(deckCards)
        if (queue.length > 0) startSession('review', queue)
    }, [setInfo, checked, deckCards, startSession])

    // ---- Persistence ----
    const retryRef = useRef<(updates: ProgressUpdate[]) => void>(() => {})
    const progressMutation = useMutation({
        mutationFn: (updates: ProgressUpdate[]) => flashcardQueries.updateProgress(setId, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flashcards'] })
        },
        onError: (_error, updates) => {
            toast.error(t('flashcards.study.saveError'), {
                description: t('flashcards.study.saveErrorDesc'),
                action: { label: t('flashcards.retry'), onClick: () => retryRef.current(updates) }
            })
        }
    })
    retryRef.current = (updates) => progressMutation.mutate(updates)

    // ---- Derived ----
    const currentId = session ? currentCardId(session) : undefined
    const currentCard = currentId ? cardsById[currentId] : undefined
    const isFinished = !!session && (isSessionComplete(session) || stopped)
    const isPractice = session?.mode === 'practice'
    const isRelearning = !!session && !!currentId && !isFirstAnswer(session, currentId)
    const willSchedule = !!session && session.mode === 'review' && !!currentId && isFirstAnswer(session, currentId)

    const reveal = useCallback(() => {
        setRevealed(true)
        setShowBack(true)
        focusCardRef.current = true
    }, [])

    const handleCardClick = useCallback(() => {
        if (!revealed) reveal()
        else setShowBack(prev => !prev)
    }, [revealed, reveal])

    const handleRate = useCallback((grade: ReviewGrade) => {
        if (!session || !currentId || !currentCard || !revealed || isFinished) return
        // Guard against double submission (key repeat / fast double click).
        if (answeredPositionRef.current === session.position) return
        answeredPositionRef.current = session.position

        // Only the first answer of a card in a scheduled review changes its schedule.
        // Practice mode and re-learning steps (cards re-queued after "again") never do.
        if (willSchedule) {
            const result = calculateNextReview(currentCard.interval, currentCard.easeFactor, grade)
            setScheduled(prev => ({
                ...prev,
                [currentId]: {
                    interval: result.interval,
                    easeFactor: result.easeFactor,
                    nextReview: result.nextReview,
                    lastReviewed: new Date()
                }
            }))
            progressMutation.mutate([{
                cardId: currentId,
                easeFactor: result.easeFactor,
                interval: result.interval,
                nextReview: result.nextReview.toISOString()
            }])
        }

        setSession(answerCurrent(session, grade))
        setRevealed(false)
        setShowBack(false)
        focusCardRef.current = true
    }, [session, currentId, currentCard, revealed, isFinished, willSchedule, progressMutation])

    // Move focus to the card after reveal / next card so screen readers announce it.
    useEffect(() => {
        if (focusCardRef.current) {
            focusCardRef.current = false
            cardRef.current?.focus({ preventScroll: true })
        }
    }, [revealed, session?.position])

    // Keyboard shortcuts: Space/Enter = flip, 1-4 (or & é " ') = rate.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!session || isFinished || !currentCard) return
            if (e.ctrlKey || e.metaKey || e.altKey) return
            const target = e.target as HTMLElement | null
            if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return

            if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
                // Focused buttons/links (card, ratings, back...) handle Space/Enter natively.
                if (target?.closest('button, a')) return
                e.preventDefault()
                if (e.repeat) return
                handleCardClick()
                return
            }

            if (!revealed) return
            const grade = CODE_TO_GRADE[e.code] ?? KEY_TO_GRADE[e.key]
            if (grade) {
                e.preventDefault()
                if (!e.repeat) handleRate(grade)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [session, isFinished, currentCard, revealed, handleCardClick, handleRate])

    const previewDays = useCallback((grade: ReviewGrade) => {
        if (!currentCard) return null
        return calculateNextReview(currentCard.interval, currentCard.easeFactor, grade).interval
    }, [currentCard])

    const goBack = () => navigate('/edu/flashcards')

    const startPractice = () => startSession('practice', buildPracticeQueue(deckCards))

    // ---------------- Screens ----------------

    if (isLoading || (setInfo && !checked)) {
        return <div className="p-10 text-center text-muted-foreground" role="status">{t('flashcards.study.loading')}</div>
    }

    if (isError || !setInfo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center gap-4" role="alert">
                <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
                <h2 className="text-2xl font-bold">{t('flashcards.study.loadError')}</h2>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={goBack} className="min-h-11 px-6 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
                        {t('flashcards.backToDecks')}
                    </button>
                    <button onClick={() => refetch()} className="min-h-11 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity">
                        {t('flashcards.retry')}
                    </button>
                </div>
            </div>
        )
    }

    if (deckCards.length === 0 && !session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">{t('flashcards.study.emptyDeck')}</h2>
                <button onClick={goBack} className="mt-4 min-h-11 px-6 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
                    {t('flashcards.backToDecks')}
                </button>
            </div>
        )
    }

    // Deck stats including what was scheduled during this session.
    const mergedCards = deckCards.map(c => (scheduled[c.id] ? { ...c, ...scheduled[c.id] } : c))
    const deckStats = getDeckStats(mergedCards)
    const nextReviewText = deckStats.nextReviewDate
        ? t('flashcards.study.nextReview', {
            when: formatRelativeDay(deckStats.nextReviewDate, new Date(), locale),
            cards: cardsLabel(deckStats.nextReviewCount)
        })
        : null

    const practiceButton = (
        <button
            onClick={startPractice}
            className="min-h-11 px-6 py-2 border border-amber-500/40 text-amber-600 dark:text-amber-400 rounded-lg font-medium hover:bg-amber-500/10 transition-colors flex items-center justify-center gap-2"
        >
            <Dumbbell className="h-4 w-4" aria-hidden="true" />
            {t('flashcards.study.practiceAnyway')}
        </button>
    )

    if (isFinished && session) {
        const summary = getSessionSummary(session)
        const nextDeck = (Array.isArray(allSets) ? allSets : [])
            .filter((s: any) => s.id !== setId)
            .map((s: any) => ({ id: s.id as string, name: s.name as string, stats: getDeckStats(s.flashcards) }))
            .filter(d => d.stats.toStudy > 0)
            .sort((a, b) => b.stats.due - a.stats.due || b.stats.toStudy - a.stats.toStudy)[0]

        return (
            <div className="flex flex-col items-center justify-center min-h-full flex-1 bg-background p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-card border rounded-2xl p-6 md:p-8 text-center space-y-6 shadow-xl">
                    <div className="w-20 h-20 bg-green-100 text-green-600 dark:bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10" aria-hidden="true" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">
                            {isPractice ? t('flashcards.study.practiceFinished') : t('flashcards.study.finished')}
                        </h1>
                        <p className="text-muted-foreground">
                            {t('flashcards.study.reviewedCount', { cards: cardsLabel(summary.reviewed) })}
                        </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-3">
                        <div className="bg-muted p-4 rounded-xl flex flex-col-reverse">
                            <dt className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t('flashcards.study.accuracy')}</dt>
                            <dd className="text-2xl font-bold text-primary">{summary.accuracy}%</dd>
                        </div>
                        <div className="bg-muted p-4 rounded-xl flex flex-col-reverse">
                            <dt className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t('flashcards.study.cardsReviewed')}</dt>
                            <dd className="text-2xl font-bold">{summary.reviewed}</dd>
                        </div>
                    </dl>

                    {summary.relearned > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t('flashcards.study.relearned', { cards: cardsLabel(summary.relearned) })}
                        </p>
                    )}

                    {!isPractice && deckStats.toStudy > 0 && (
                        <p className="text-sm text-muted-foreground">
                            {t('flashcards.study.remainingToday', { cards: cardsLabel(deckStats.toStudy) })}
                        </p>
                    )}

                    {nextReviewText && (
                        <p className="flex items-center justify-center gap-2 text-sm font-medium">
                            <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                            {nextReviewText}
                        </p>
                    )}

                    {isPractice && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">{t('flashcards.study.practiceNoSchedule')}</p>
                    )}

                    <div className="flex flex-col gap-2">
                        {nextDeck && (
                            <button
                                onClick={() => navigate(`/edu/flashcards/study/${nextDeck.id}`)}
                                className="w-full min-h-12 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <span className="truncate">{t('flashcards.study.nextDeck', { name: nextDeck.name, count: nextDeck.stats.toStudy })}</span>
                                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                            </button>
                        )}
                        <button
                            onClick={goBack}
                            className={cn(
                                "w-full min-h-12 py-3 rounded-xl font-bold transition-opacity",
                                nextDeck ? "bg-muted hover:bg-muted/80" : "bg-primary text-primary-foreground hover:opacity-90"
                            )}
                        >
                            {t('flashcards.backToDecks')}
                        </button>
                        {practiceButton}
                    </div>
                </div>
            </div>
        )
    }

    if (!session || !currentCard) {
        // Nothing due and no new cards: up-to-date screen.
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">{t('flashcards.study.upToDate')}</h2>
                <p className="text-muted-foreground mb-2 max-w-sm">{t('flashcards.study.nothingDue')}</p>
                {nextReviewText && (
                    <p className="flex items-center justify-center gap-2 font-medium mb-6">
                        <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
                        {nextReviewText}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                    <button onClick={goBack} className="min-h-11 px-6 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
                        {t('flashcards.backToDecks')}
                    </button>
                    {practiceButton}
                </div>
                <p className="mt-3 text-xs text-muted-foreground max-w-sm">{t('flashcards.study.practiceHint')}</p>
            </div>
        )
    }

    const frontText = toPlainText(currentCard.front)
    const backText = toPlainText(currentCard.back)
    const cardLabel = !revealed
        ? t('flashcards.study.cardQuestionLabel', { text: frontText })
        : showBack
            ? t('flashcards.study.cardAnswerLabel', { text: backText })
            : t('flashcards.study.cardQuestionAgainLabel', { text: frontText })

    return (
        <div className="flex flex-col h-full flex-1 bg-background text-foreground overflow-hidden">
            {/* Top Bar */}
            <div className="h-12 md:h-14 border-b flex items-center justify-between gap-2 px-2 md:px-4 bg-card shrink-0">
                <button
                    onClick={goBack}
                    className="h-11 w-11 flex items-center justify-center hover:bg-muted rounded-full transition-colors shrink-0"
                    title={t('flashcards.backToDecks')}
                    aria-label={t('flashcards.backToDecks')}
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="font-semibold text-xs md:text-sm truncate min-w-0" aria-live="polite">
                    {setInfo.name} • {t('flashcards.study.progress', { current: session.position + 1, total: session.queue.length })}
                </div>
                <button
                    onClick={() => (Object.keys(session.results).length > 0 ? setStopped(true) : goBack())}
                    className="min-h-11 px-3 text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors shrink-0"
                >
                    {t('flashcards.study.stop')}
                </button>
            </div>

            {/* Progress Bar */}
            <div
                className="h-1 bg-muted shrink-0"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={session.queue.length}
                aria-valuenow={session.position}
            >
                <div
                    className={cn("h-full transition-all duration-300", isPractice ? "bg-amber-500" : "bg-primary")}
                    style={{ width: `${(session.position / session.queue.length) * 100}%` }}
                />
            </div>

            {isPractice && (
                <div className="shrink-0 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs md:text-sm px-4 py-2 flex items-center justify-center gap-2 text-center" role="status">
                    <Dumbbell className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span><strong>{t('flashcards.study.practiceMode')}</strong> — {t('flashcards.study.practiceNoSchedule')}</span>
                </div>
            )}

            {/* Flashcard Area */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 md:p-6 max-w-3xl mx-auto w-full overflow-hidden">
                <div className="w-full flex justify-center gap-2 mb-2 min-h-6">
                    {isRelearning && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                            <RotateCcw className="h-3 w-3" aria-hidden="true" />
                            {t('flashcards.study.relearning')}
                        </span>
                    )}
                    {!isRelearning && isNewCard(currentCard) && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {t('flashcards.study.newCard')}
                        </span>
                    )}
                </div>
                <div className="relative w-full h-[260px] sm:h-[320px] md:h-[360px] max-h-[52vh] perspective-1000">
                    {/* key: each card mounts unflipped, so the next answer never shows during the flip-back animation */}
                    <button
                        key={session.position}
                        ref={cardRef}
                        type="button"
                        onClick={handleCardClick}
                        aria-label={cardLabel}
                        className="block w-full h-full p-0 text-inherit bg-transparent border-0 rounded-2xl cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        <div
                            className="w-full h-full transition-transform duration-500 preserve-3d relative bg-card border rounded-2xl shadow-lg"
                            style={{ transformStyle: 'preserve-3d', transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                        >
                            {/* Front */}
                            <div
                                aria-hidden={showBack}
                                className="absolute inset-0 backface-hidden bg-card flex flex-col items-center justify-center p-6 md:p-10 border rounded-2xl overflow-y-auto"
                            >
                                <div className="max-w-none text-center select-none text-xl sm:text-2xl md:text-3xl font-bold leading-snug text-foreground">
                                    <CardFrontMarkdown text={currentCard.front} />
                                </div>
                                {!revealed && (
                                    <p className="mt-6 text-xs md:text-sm text-muted-foreground animate-pulse">{t('flashcards.study.tapToReveal')}</p>
                                )}
                            </div>
                            {/* Back: content only rendered once revealed (not exposed before flipping) */}
                            <div
                                aria-hidden={!showBack}
                                className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 md:p-10 bg-card border rounded-2xl overflow-y-auto"
                                style={{ transform: 'rotateY(180deg)' }}
                            >
                                {revealed && (
                                    <div className="w-full text-left select-none text-base sm:text-lg md:text-xl font-normal leading-relaxed text-foreground">
                                        <CardBackMarkdown text={currentCard.back} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="border-t bg-card/95 backdrop-blur px-4 py-3 flex flex-col items-center justify-center gap-2 shrink-0 shadow-sm">
                {!revealed ? (
                    <button
                        onClick={reveal}
                        className="w-full max-w-md bg-primary text-primary-foreground h-12 md:h-14 rounded-xl font-bold text-base md:text-lg shadow-md hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center"
                        aria-keyshortcuts="Space Enter"
                    >
                        {t('flashcards.study.showAnswer')} <span className="hidden sm:inline text-xs font-normal opacity-80 ml-2">({t('flashcards.study.spaceKey')})</span>
                    </button>
                ) : (
                    <div className="grid grid-cols-4 gap-2 md:gap-3 w-full max-w-xl" role="group" aria-label={t('flashcards.study.rateLabel')}>
                        {GRADES.map(r => {
                            const days = willSchedule ? previewDays(r.key) : null
                            return (
                                <button
                                    key={r.key}
                                    onClick={() => handleRate(r.key)}
                                    aria-keyshortcuts={r.shortcut}
                                    className={cn(
                                        "flex flex-col items-center justify-center min-h-12 md:h-14 px-1 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-all uppercase font-bold text-[11px] md:text-xs active:scale-[0.97]",
                                        r.color
                                    )}
                                >
                                    <span>{t(`flashcards.grade.${r.key}`)}</span>
                                    <span className="text-[9px] md:text-[10px] opacity-70 mt-0.5 normal-case font-medium">
                                        {days !== null ? t('flashcards.study.days', { count: days }) : null}
                                        <span className="hidden sm:inline">{days !== null ? ' · ' : ''}{r.shortcut}</span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}
                <p className="hidden sm:block text-[11px] text-muted-foreground">{t('flashcards.study.shortcutsHint')}</p>
            </div>
        </div>
    )
}

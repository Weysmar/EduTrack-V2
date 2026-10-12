import { Link, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Play, Trash2, Download, AlertTriangle, Library, Layers, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/components/language-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flashcardQueries } from '@/lib/api/queries'
import { useProfileStore } from '@/store/profileStore'
import { getDeckStats, type DeckStats } from '@/lib/flashcards/scheduling'
import { downloadAnkiExport } from '@/lib/flashcards/ankiExport'
import { cn } from '@/lib/utils'

// Helper to calculate progressive mastery percentage
const calculateCardMastery = (card: any) => {
    if (!card.lastReviewed) return 0
    const interval = card.interval || 0
    if (interval <= 0) return 0
    if (interval >= 14) return 100
    if (interval >= 7) return 80
    if (interval >= 3) return 55
    if (interval >= 1) return 35
    return 20
}

const getProgress = (set: any) => {
    if (set.flashcards && set.flashcards.length > 0) {
        const total = set.flashcards.reduce((acc: number, c: any) => acc + calculateCardMastery(c), 0)
        return Math.round(total / set.flashcards.length)
    }
    if (!set.count || set.count === 0) return 0
    return Math.min(100, Math.round(((set.mastered || 0) / set.count) * 100))
}

interface DeckView {
    set: any
    stats: DeckStats
    mastery: number
    cardCount: number
}

export function Flashcards() {
    const { t } = useLanguage()
    const navigate = useNavigate()
    const { activeProfile } = useProfileStore()
    const queryClient = useQueryClient()
    const [exportingId, setExportingId] = useState<string | null>(null)

    const cardsLabel = (count: number) =>
        t(count === 1 ? 'flashcards.cardCount.one' : 'flashcards.cardCount.other', { count })

    const { data: sets, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['flashcards'],
        queryFn: flashcardQueries.getAll,
        enabled: !!activeProfile
    })

    const deleteSetMutation = useMutation({
        mutationFn: flashcardQueries.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flashcards'] })
        },
        onError: () => {
            toast.error(t('flashcards.deleteError'))
        }
    })

    // Decks with cards to review first (most due first), then the original order (newest first).
    const decks: DeckView[] = useMemo(() => {
        const list: any[] = Array.isArray(sets) ? sets : []
        const now = new Date()
        return list
            .map((set, index) => {
                const stats = getDeckStats(set.flashcards, now)
                const cardCount = Array.isArray(set.flashcards) ? set.flashcards.length : (set.count || 0)
                return { set, stats, mastery: getProgress(set), cardCount, index }
            })
            .sort((a, b) => {
                const aHas = a.stats.toStudy > 0 ? 1 : 0
                const bHas = b.stats.toStudy > 0 ? 1 : 0
                if (aHas !== bHas) return bHas - aHas
                if (aHas) return b.stats.due - a.stats.due || b.stats.toStudy - a.stats.toStudy || a.index - b.index
                return a.index - b.index
            })
    }, [sets])

    const totalToStudy = decks.reduce((acc, d) => acc + d.stats.toStudy, 0)
    const firstDeck = decks.find(d => d.stats.toStudy > 0)

    const handleExport = async (set: any) => {
        setExportingId(set.id)
        try {
            let cards = Array.isArray(set.flashcards) ? set.flashcards : null
            if (!cards) {
                const full = await flashcardQueries.getOne(set.id)
                cards = Array.isArray(full?.flashcards) ? full.flashcards : []
            }
            if (!cards || cards.length === 0) {
                toast.info(t('flashcards.exportEmpty'))
                return
            }
            const count = downloadAnkiExport(set.name, cards)
            toast.success(t('flashcards.exportSuccess', { cards: cardsLabel(count) }), {
                description: t('flashcards.exportHowTo')
            })
        } catch {
            toast.error(t('flashcards.exportError'))
        } finally {
            setExportingId(null)
        }
    }

    if (isLoading) {
        return <div className="p-10 text-center text-muted-foreground" role="status">{t('flashcards.loading')}</div>
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in pb-20">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('flashcards.title')}</h1>
                    <p className="text-muted-foreground text-base sm:text-lg">{t('flashcards.subtitle')}</p>
                </div>
                {!isError && decks.length > 0 && (
                    firstDeck ? (
                        <div className="flex flex-col items-stretch sm:items-end gap-1">
                            <button
                                onClick={() => navigate(`/edu/flashcards/study/${firstDeck.set.id}`)}
                                className="min-h-11 px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                                {t('flashcards.reviewAllDue', { count: totalToStudy })}
                            </button>
                            <span className="text-xs text-muted-foreground text-center sm:text-right">
                                {t('flashcards.reviewAllDueHint', { name: firstDeck.set.name })}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            {t('flashcards.allCaughtUp')}
                        </div>
                    )
                )}
            </header>

            {isError ? (
                <div className="text-center py-16 border rounded-xl bg-card space-y-4" role="alert">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto" aria-hidden="true" />
                    <h2 className="text-xl font-bold">{t('flashcards.loadError')}</h2>
                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="min-h-11 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                        {t('flashcards.retry')}
                    </button>
                </div>
            ) : decks.length === 0 ? (
                <div className="text-center py-16 px-4 border-2 border-dashed rounded-xl space-y-4">
                    <Layers className="h-12 w-12 text-muted-foreground mx-auto" aria-hidden="true" />
                    <h2 className="text-2xl font-bold text-muted-foreground">{t('flashcards.empty.title')}</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">{t('flashcards.empty.desc')}</p>
                    <ol className="text-sm text-muted-foreground max-w-md mx-auto text-left list-decimal pl-6 space-y-1">
                        <li>{t('flashcards.empty.step1')}</li>
                        <li>{t('flashcards.empty.step2')}</li>
                        <li>{t('flashcards.empty.step3')}</li>
                    </ol>
                    <Link
                        to="/edu/library"
                        className="inline-flex min-h-11 items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        <Library className="h-4 w-4" aria-hidden="true" />
                        {t('flashcards.empty.cta')}
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {decks.map(({ set, stats, mastery, cardCount }) => {
                        const hasDue = stats.toStudy > 0
                        return (
                            <div
                                key={set.id}
                                className={cn(
                                    "bg-card border rounded-xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col",
                                    hasDue && "border-primary/60 ring-1 ring-primary/30"
                                )}
                            >
                                <div className="flex justify-between items-start gap-2 mb-3">
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-xl line-clamp-1">{set.name}</h3>
                                        <p className="text-sm text-muted-foreground">{cardsLabel(cardCount)}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm(t('flashcards.deleteConfirm'))) deleteSetMutation.mutate(set.id)
                                        }}
                                        className="h-11 w-11 -mr-2 -mt-2 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                        title={t('flashcards.delete')}
                                        aria-label={`${t('flashcards.delete')} — ${set.name}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Due / new counts */}
                                <div className="flex flex-wrap gap-2 mb-4 min-h-6">
                                    {stats.due > 0 && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                            {t('flashcards.dueCount', { count: stats.due })}
                                        </span>
                                    )}
                                    {stats.new > 0 && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                            {t(stats.new === 1 ? 'flashcards.newCount.one' : 'flashcards.newCount.other', { count: stats.new })}
                                        </span>
                                    )}
                                    {!hasDue && cardCount > 0 && (
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                                            {t('flashcards.upToDate')}
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>{t('flashcards.mastery')}</span>
                                        <span className={mastery > 0 ? "text-primary font-bold" : ""}>{mastery}%</span>
                                    </div>
                                    <div
                                        className="h-2 w-full bg-secondary rounded-full overflow-hidden"
                                        role="progressbar"
                                        aria-label={t('flashcards.mastery')}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={mastery}
                                    >
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${mastery}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-auto">
                                    <Link
                                        to={`/edu/flashcards/study/${set.id}`}
                                        className={cn(
                                            "flex-1 min-h-11 py-2 rounded-lg font-medium text-center transition-opacity flex items-center justify-center gap-2",
                                            hasDue
                                                ? "bg-primary text-primary-foreground hover:opacity-90"
                                                : "border hover:bg-muted"
                                        )}
                                    >
                                        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                                        {hasDue ? t('flashcards.review') : t('flashcards.practice')}
                                    </Link>
                                    <button
                                        onClick={() => handleExport(set)}
                                        disabled={exportingId === set.id}
                                        className="h-11 w-11 shrink-0 flex items-center justify-center border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                                        title={t('flashcards.exportAnki')}
                                        aria-label={`${t('flashcards.exportAnki')} — ${set.name}`}
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

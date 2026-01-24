import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flashcardQueries } from '@/lib/api/queries'
import { useState, useEffect, useRef } from 'react'
import { calculateNextReview, ReviewGrade } from '@/lib/flashcards/spaced-repetition'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
// import { AnalyticsService } from '@/lib/analytics/tracker' // Temporary disabled/Adapt to API

export function StudySession() {
    const { setId } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Fetch Set Info & Cards
    const { data: setInfo, isLoading: isSetLoading } = useQuery({
        queryKey: ['flashcards', setId],
        queryFn: () => flashcardQueries.getOne(setId!),
        enabled: !!setId
    })

    // Local state for session
    const [sessionCards, setSessionCards] = useState<any[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFlipped, setIsFlipped] = useState(false)
    const [sessionStats, setSessionStats] = useState({ correct: 0, studied: 0 })
    const [updatesQueue, setUpdatesQueue] = useState<any[]>([])

    // Initialize session cards when setInfo loaded
    useEffect(() => {
        if (setInfo && setInfo.flashcards && sessionCards.length === 0) {
            const now = new Date();
            // Filter due or new. API returns string dates.
            const due = setInfo.flashcards.filter((c: any) => new Date(c.nextReview) <= now || c.interval === 0)
                .sort((a: any, b: any) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
            setSessionCards(due);
        }
    }, [setInfo, sessionCards.length])

    const currentCard = sessionCards[currentIndex];
    const isFinished = setInfo && !isSetLoading && currentIndex >= sessionCards.length;

    // Mutation to update progress
    const updateProgressMutation = useMutation({
        mutationFn: (updates: any[]) => flashcardQueries.updateProgress(setId!, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flashcards', setId] })
        }
    })

    // Batch update on finish or every X queries?
    // Let's do batch on finish for simplicity or if queue gets large.
    // Actually, handling async updates per card is safer against crashes.
    // Let's queue updates and send them.
    useEffect(() => {
        if (updatesQueue.length > 0) {
            // Debounce or immediate?
            // For safety let's send immediately for now until optimization
            const batch = [...updatesQueue];
            setUpdatesQueue([]);
            updateProgressMutation.mutate(batch);
        }
    }, [updatesQueue])

    const handleRate = async (grade: ReviewGrade) => {
        if (!currentCard) return;
        const now = new Date();
        const { interval, easeFactor, nextReview } = calculateNextReview(
            currentCard.interval,
            currentCard.easeFactor,
            grade
        );

        const updatePayload = {
            cardId: currentCard.id,
            easeFactor,
            interval,
            nextReview
        };

        setUpdatesQueue(prev => [...prev, updatePayload]);

        // Move to next
        setSessionStats(prev => ({
            studied: prev.studied + 1,
            correct: grade !== 'again' ? prev.correct + 1 : prev.correct
        }));
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
    }

    if (isSetLoading) return <div className="p-10 text-center">Loading study session...</div>

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-6 shadow-xl">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold">Session Complete!</h1>
                    <p className="text-muted-foreground">You reviewed {sessionStats.studied} cards.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-xl">
                            <div className="text-2xl font-bold text-primary">{Math.round((sessionStats.correct / (sessionStats.studied || 1)) * 100)}%</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Accuracy</div>
                        </div>
                        <div className="bg-muted p-4 rounded-xl">
                            <div className="text-2xl font-bold">{sessionCards.length}</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Cards</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/edu/flashcards')}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90"
                        >
                            Return to Deck List
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (sessionCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">All caught up! 🎉</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">No cards due for review.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/edu/flashcards')} className="px-6 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
                        Return to list
                    </button>
                    <button
                        onClick={() => {
                            // Cram: Load all cards regardless of due date
                            setSessionCards(setInfo.flashcards || []);
                        }}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
                    >
                        Review All Anyway
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
                <button onClick={() => navigate('/edu/flashcards')} className="p-2 hover:bg-muted rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="font-semibold text-sm">
                    {setInfo.name} • {currentIndex + 1} / {sessionCards.length}
                </div>
                <div className="w-9" />
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-muted">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentIndex) / sessionCards.length) * 100}%` }}
                />
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-3xl mx-auto w-full">
                <div
                    className="relative w-full aspect-[4/3] md:aspect-[16/9] perspective-1000 cursor-pointer group"
                    onClick={() => !isFlipped && setIsFlipped(true)}
                >
                    <div className={cn(
                        "w-full h-full transition-all duration-500 preserve-3d relative bg-card border rounded-2xl shadow-xl flex items-center justify-center p-8 md:p-16 text-center",
                        isFlipped ? "rotate-y-180" : ""
                    )}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden bg-card flex flex-col items-center justify-center p-8 border rounded-2xl">
                            <h2 className="text-2xl md:text-3xl font-bold leading-tight select-none">{currentCard?.front}</h2>
                            <p className="mt-8 text-sm text-muted-foreground animate-pulse">[ Space to Show Answer ]</p>
                        </div>
                        {/* Back */}
                        <div
                            className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 rotate-y-180 bg-card border rounded-2xl"
                            style={{ transform: 'rotateY(180deg)' }}
                        >
                            <div className="prose dark:prose-invert prose-lg max-w-none select-none">
                                <p className="text-xl md:text-2xl font-medium leading-relaxed">{currentCard?.back}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="h-24 md:h-32 border-t bg-card p-4 md:p-6 flex items-center justify-center gap-4">
                {!isFlipped ? (
                    <button onClick={() => setIsFlipped(true)} className="w-full max-w-md bg-primary text-primary-foreground h-14 rounded-xl font-bold text-lg shadow-lg">
                        Show Answer
                    </button>
                ) : (
                    <div className="grid grid-cols-4 gap-2 md:gap-4 w-full max-w-2xl">
                        {['again', 'hard', 'good', 'easy'].map((r: any) => (
                            <button
                                key={r}
                                onClick={() => handleRate(r)}
                                className="flex flex-col items-center justify-center p-2 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors uppercase font-bold text-sm"
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}

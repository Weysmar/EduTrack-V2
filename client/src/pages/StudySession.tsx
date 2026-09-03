import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flashcardQueries } from '@/lib/api/queries'
import { useState, useEffect, useRef, useCallback } from 'react'
import { calculateNextReview, ReviewGrade } from '@/lib/flashcards/spaced-repetition'
import { ArrowLeft, CheckCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
// import { AnalyticsService } from '@/lib/analytics/tracker' // Temporary disabled/Adapt to API

// Helper to format flashcard content for clean spacing & lists
const formatCardContent = (text?: string) => {
    if (!text) return '';
    return text
        // Ensure inline numbers like "1. **foo** 2. **bar**" break into clean list lines
        .replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n\n$2')
        // Ensure paragraph breaks between ending bold tag and following sentence
        .replace(/(\*\*[^*]+\*\*)\s+([A-ZÀ-Ÿ][a-zà-ÿ])/g, '$1\n\n$2');
};

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

    // Initialize session cards when setInfo loaded
    useEffect(() => {
        if (setInfo && setInfo.flashcards && sessionCards.length === 0) {
            const now = new Date();
            // Filter due or new. API returns string dates.
            const due = setInfo.flashcards.filter((c: any) => new Date(c.nextReview) <= now || c.interval === 0)
                .sort((a: any, b: any) => new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime());
            // If none are strictly due (e.g. fresh cards or minor clock skew), load all cards so the user can study immediately
            setSessionCards(due.length > 0 ? due : setInfo.flashcards);
        }
    }, [setInfo, sessionCards.length])

    const currentCard = sessionCards[currentIndex];
    const isFinished = setInfo && !isSetLoading && sessionCards.length > 0 && currentIndex >= sessionCards.length;

    // Mutation to update progress
    const updateProgressMutation = useMutation({
        mutationFn: (updates: any[]) => flashcardQueries.updateProgress(setId!, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flashcards'] })
        }
    })

    const handleRate = useCallback(async (grade: ReviewGrade) => {
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

        // Immediately persist review progress to server
        updateProgressMutation.mutate([updatePayload]);

        // Move to next
        setSessionStats(prev => ({
            studied: prev.studied + 1,
            correct: grade !== 'again' ? prev.correct + 1 : prev.correct
        }));
        setIsFlipped(false);
        setCurrentIndex(prev => prev + 1);
    }, [currentCard, updateProgressMutation]);

    // Keyboard navigation (Space to flip, 1-4 to rate)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isFinished || isSetLoading || !currentCard) return;

            // Ignore if typing in an input/textarea
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

            if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (!isFlipped) {
                    setIsFlipped(true);
                }
            } else if (isFlipped) {
                if (e.key === '1' || e.code === 'Numpad1') {
                    e.preventDefault();
                    handleRate('again');
                } else if (e.key === '2' || e.code === 'Numpad2') {
                    e.preventDefault();
                    handleRate('hard');
                } else if (e.key === '3' || e.code === 'Numpad3') {
                    e.preventDefault();
                    handleRate('good');
                } else if (e.key === '4' || e.code === 'Numpad4') {
                    e.preventDefault();
                    handleRate('easy');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFlipped, currentCard, isFinished, isSetLoading, handleRate]);

    if (isSetLoading) return <div className="p-10 text-center text-muted-foreground">Chargement de la session d'étude...</div>

    if (isFinished) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-in fade-in">
                <div className="max-w-md w-full bg-card border rounded-2xl p-8 text-center space-y-6 shadow-xl">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-bold">Session terminée ! 🎉</h1>
                    <p className="text-muted-foreground">Vous avez révisé {sessionStats.studied} carte{sessionStats.studied > 1 ? 's' : ''}.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-xl">
                            <div className="text-2xl font-bold text-primary">{Math.round((sessionStats.correct / (sessionStats.studied || 1)) * 100)}%</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Précision</div>
                        </div>
                        <div className="bg-muted p-4 rounded-xl">
                            <div className="text-2xl font-bold">{sessionCards.length}</div>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total de cartes</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => navigate('/edu/flashcards')}
                            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity"
                        >
                            Retour aux paquets
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (sessionCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Vous êtes à jour ! 🎉</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">Aucune carte à réviser pour le moment.</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/edu/flashcards')} className="px-6 py-2 bg-muted rounded-lg font-medium hover:bg-muted/80 transition-colors">
                        Retour aux paquets
                    </button>
                    <button
                        onClick={() => {
                            // Cram: Load all cards regardless of due date
                            setSessionCards(setInfo.flashcards || []);
                        }}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-colors"
                    >
                        Tout réviser quand même
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full flex-1 bg-background text-foreground overflow-hidden">
            {/* Top Bar */}
            <div className="h-12 md:h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
                <button onClick={() => navigate('/edu/flashcards')} className="p-1.5 md:p-2 hover:bg-muted rounded-full transition-colors" title="Retour aux flashcards">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="font-semibold text-xs md:text-sm truncate max-w-xs md:max-w-md">
                    {setInfo.name} • {currentIndex + 1} / {sessionCards.length}
                </div>
                <div className="w-9" />
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-muted shrink-0">
                <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentIndex) / sessionCards.length) * 100}%` }}
                />
            </div>

            {/* Flashcard Area */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 md:p-6 max-w-3xl mx-auto w-full overflow-hidden">
                <div
                    className="relative w-full h-[260px] sm:h-[320px] md:h-[360px] max-h-[52vh] perspective-1000 cursor-pointer group"
                    onClick={() => !isFlipped && setIsFlipped(true)}
                >
                    <div className={cn(
                        "w-full h-full transition-all duration-500 preserve-3d relative bg-card border rounded-2xl shadow-lg flex items-center justify-center text-center",
                        isFlipped ? "rotate-y-180" : ""
                    )}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front */}
                        <div className="absolute inset-0 backface-hidden bg-card flex flex-col items-center justify-center p-6 md:p-10 border rounded-2xl overflow-y-auto">
                            <div className="max-w-none text-center select-none text-xl sm:text-2xl md:text-3xl font-bold leading-snug text-foreground">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-0 inline">{children}</p>,
                                        strong: ({ children }) => <strong className="font-extrabold text-amber-400 dark:text-amber-300">{children}</strong>,
                                        b: ({ children }) => <b className="font-extrabold text-amber-400 dark:text-amber-300">{children}</b>,
                                        em: ({ children }) => <em className="italic text-primary-400">{children}</em>
                                    }}
                                >
                                    {formatCardContent(currentCard?.front)}
                                </ReactMarkdown>
                            </div>
                            <p className="mt-6 text-xs md:text-sm text-muted-foreground animate-pulse">[ Appuyez sur Espace ou cliquez pour révéler ]</p>
                        </div>
                        {/* Back */}
                        <div
                            className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 md:p-10 rotate-y-180 bg-card border rounded-2xl overflow-y-auto"
                            style={{ transform: 'rotateY(180deg)' }}
                        >
                            <div className="w-full text-left select-none text-base sm:text-lg md:text-xl font-normal leading-relaxed text-foreground">
                                <ReactMarkdown
                                    components={{
                                        p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-foreground">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold text-amber-400 dark:text-amber-300">{children}</strong>,
                                        b: ({ children }) => <b className="font-bold text-amber-400 dark:text-amber-300">{children}</b>,
                                        em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
                                        ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 my-3 text-foreground">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 my-3 text-foreground">{children}</ol>,
                                        li: ({ children }) => <li className="leading-relaxed text-foreground pl-1">{children}</li>
                                    }}
                                >
                                    {formatCardContent(currentCard?.back)}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="h-20 md:h-24 border-t bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-center gap-4 shrink-0 shadow-sm">
                {!isFlipped ? (
                    <button
                        onClick={() => setIsFlipped(true)}
                        className="w-full max-w-md bg-primary text-primary-foreground h-12 md:h-14 rounded-xl font-bold text-base md:text-lg shadow-md hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center"
                    >
                        Afficher la réponse <span className="text-xs font-normal opacity-80 ml-2">(Espace)</span>
                    </button>
                ) : (
                    <div className="grid grid-cols-4 gap-2 md:gap-3 w-full max-w-xl">
                        {[
                            { key: 'again', label: 'À revoir', shortcut: '1', color: 'hover:border-red-500 hover:text-red-500 text-red-500 border-red-500/20' },
                            { key: 'hard', label: 'Difficile', shortcut: '2', color: 'hover:border-amber-500 hover:text-amber-500 text-amber-500 border-amber-500/20' },
                            { key: 'good', label: 'Bon', shortcut: '3', color: 'hover:border-blue-500 hover:text-blue-500 text-blue-500 border-blue-500/20' },
                            { key: 'easy', label: 'Facile', shortcut: '4', color: 'hover:border-green-500 hover:text-green-500 text-green-500 border-green-500/20' }
                        ].map((r: any) => (
                            <button
                                key={r.key}
                                onClick={() => handleRate(r.key)}
                                className={cn(
                                    "flex flex-col items-center justify-center h-12 md:h-14 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-all uppercase font-bold text-[11px] md:text-xs relative group active:scale-[0.97]",
                                    r.color
                                )}
                            >
                                <span>{r.label}</span>
                                <span className="text-[9px] md:text-[10px] opacity-70 mt-0.5">({r.shortcut})</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}

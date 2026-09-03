import { Link } from 'react-router-dom'
import { Plus, Play, MoreVertical, Trash2, Download } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flashcardQueries } from '@/lib/api/queries'
import { useProfileStore } from '@/store/profileStore'

export function Flashcards() {
    const { t } = useLanguage()
    const { activeProfile } = useProfileStore()
    const queryClient = useQueryClient()

    const { data: sets, isLoading } = useQuery({
        queryKey: ['flashcards'],
        queryFn: flashcardQueries.getAll,
        enabled: !!activeProfile
    })

    const deleteSetMutation = useMutation({
        mutationFn: flashcardQueries.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['flashcards'] })
        }
    })

    // Helper to calculate progressive mastery percentage
    const calculateCardMastery = (card: any) => {
        if (!card.lastReviewed) return 0;
        const interval = card.interval || 0;
        if (interval <= 0) return 0;
        if (interval >= 14) return 100;
        if (interval >= 7) return 80;
        if (interval >= 3) return 55;
        if (interval >= 1) return 35;
        return 20;
    }

    const getProgress = (set: any) => {
        if (set.flashcards && set.flashcards.length > 0) {
            const total = set.flashcards.reduce((acc: number, c: any) => acc + calculateCardMastery(c), 0);
            return Math.round(total / set.flashcards.length);
        }
        if (!set.count || set.count === 0) return 0;
        return Math.min(100, Math.round(((set.mastered || 0) / set.count) * 100));
    }

    if (isLoading) return <div className="p-10 text-center text-muted-foreground">Chargement des paquets de flashcards...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Flashcards</h1>
                    <p className="text-muted-foreground text-lg">Révision par répétition espacée</p>
                </div>
            </header>

            {!sets || sets.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <h2 className="text-2xl font-bold text-muted-foreground mb-2">Aucun paquet de flashcards</h2>
                    <p className="text-muted-foreground mb-6">Générez des flashcards à partir de vos documents pour commencer à mémoriser.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sets.map((set: any) => {
                        const mastery = getProgress(set);
                        return (
                            <div key={set.id} className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-xl line-clamp-1">{set.name}</h3>
                                        <p className="text-sm text-muted-foreground">{set.count} carte{set.count > 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (confirm('Voulez-vous vraiment supprimer ce paquet de flashcards ?')) deleteSetMutation.mutate(set.id)
                                            }}
                                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                            title="Supprimer le paquet"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span>Maîtrise</span>
                                        <span className={mastery > 0 ? "text-primary font-bold" : ""}>{mastery}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${mastery}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Link
                                        to={`/edu/flashcards/study/${set.id}`}
                                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                    >
                                        <Play className="h-4 w-4 fill-current" />
                                        Réviser
                                    </Link>
                                    <button className="p-2 border rounded-lg hover:bg-muted transition-colors" title="Exporter vers Anki">
                                        <Download className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    )
}

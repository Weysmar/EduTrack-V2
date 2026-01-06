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

    // Helper to calculate progress percentage
    const getProgress = (mastered: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((mastered / total) * 100);
    }

    if (isLoading) return <div className="p-10 text-center">Loading sets...</div>

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Flashcards</h1>
                    <p className="text-muted-foreground text-lg">Spaced repetition reviews</p>
                </div>
            </header>

            {!sets || sets.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                    <h2 className="text-2xl font-bold text-muted-foreground mb-2">No flashcards yet</h2>
                    <p className="text-muted-foreground mb-6">Create flashcards from your notes to start learning.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sets.map((set: any) => (
                        <div key={set.id} className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-xl line-clamp-1">{set.name}</h3>
                                    <p className="text-sm text-muted-foreground">{set.count} cards</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (confirm('Delete set?')) deleteSetMutation.mutate(set.id)
                                        }}
                                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2 mb-6">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Mastery</span>
                                    <span>{getProgress(set.mastered, set.count)}%</span>
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${getProgress(set.mastered, set.count)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <Link
                                    to={`/flashcards/study/${set.id}`}
                                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <Play className="h-4 w-4 fill-current" />
                                    Study
                                </Link>
                                <button className="p-2 border rounded-lg hover:bg-muted transition-colors" title="Export Anki">
                                    <Download className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

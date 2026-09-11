import { useState, useEffect } from 'react'
import { WifiOff, ChevronRight, X, BookOpen, HardDriveDownload } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { getOfflineCourses, OfflineCourseData } from '@/lib/offlineManager'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function OfflineStatusBar() {
    const { isOffline } = useNetworkStatus()
    const [isDismissed, setIsDismissed] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [offlineCourses, setOfflineCourses] = useState<OfflineCourseData[]>([])

    // Reload list of offline courses whenever modal is opened or offline status changes
    useEffect(() => {
        if (isOffline) {
            getOfflineCourses().then(setOfflineCourses)
            setIsDismissed(false)
        }
    }, [isOffline])

    if (!isOffline || isDismissed) return null

    return (
        <>
            {/* Top Offline Notification Strip */}
            <div className="fixed top-0 left-0 right-0 z-[70] bg-amber-500/95 text-white dark:bg-amber-600/95 shadow-md px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2 font-medium overflow-hidden">
                    <WifiOff className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-100" />
                    <span className="truncate">
                        Mode Hors-Ligne activé
                    </span>
                    <span className="hidden sm:inline text-amber-100 text-[11px] opacity-90">
                        • Vos cours sauvegardés restent accessibles
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            getOfflineCourses().then(setOfflineCourses)
                            setIsModalOpen(true)
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors text-[11px]"
                    >
                        <BookOpen className="h-3 w-3" />
                        <span>Cours hors-ligne ({offlineCourses.length})</span>
                    </button>
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="p-1 rounded hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                        title="Masquer le bandeau"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Modal for Saved Offline Courses */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                    <HardDriveDownload className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base leading-tight">Cours disponibles hors-ligne</h3>
                                    <p className="text-xs text-muted-foreground">Prêts pour réviser sans connexion</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {offlineCourses.length === 0 ? (
                            <div className="py-8 text-center space-y-2">
                                <div className="text-3xl">📭</div>
                                <p className="text-sm font-semibold">Aucun cours sauvegardé pour l'instant</p>
                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                    Lorsque vous avez du réseau, ouvrez un cours et cliquez sur « Disponible hors-ligne » pour l'enregistrer.
                                </p>
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                {offlineCourses.map((c) => (
                                    <Link
                                        key={c.id}
                                        to={`/edu/course/${c.id}`}
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex items-center justify-between p-3 rounded-xl border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-3 h-8 rounded-full shrink-0"
                                                style={{ backgroundColor: c.color || '#3b82f6' }}
                                            />
                                            <div className="min-w-0">
                                                <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                                    {c.title}
                                                </div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {c.code && <span className="font-mono">{c.code}</span>}
                                                    <span>• {c.itemsCount} éléments</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                                    </Link>
                                ))}
                            </div>
                        )}

                        <div className="border-t pt-3 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

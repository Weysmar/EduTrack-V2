import { History, X } from 'lucide-react'
import { changelogs } from '@/data/changelog'
import { useLanguage } from '@/components/language-provider'
import { cn } from '@/lib/utils'

interface ChangelogModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
    const { t } = useLanguage()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-card rounded-xl shadow-2xl border max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        {t('changelog.title')}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">
                    {changelogs.map((log) => (
                        <div key={log.version} className="relative pl-4 border-l-2 border-muted space-y-2">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary" />

                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-lg">{log.version} - {log.title}</h3>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{log.date}</span>
                            </div>

                            <ul className="space-y-2">
                                {log.changes.map((change, i) => (
                                    <li key={i} className="text-sm flex gap-2 items-start">
                                        <span className={cn(
                                            "uppercase text-[10px] font-bold px-1.5 py-0.5 rounded h-fit mt-0.5 flex-shrink-0 whitespace-nowrap",
                                            change.type === 'new' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                                            change.type === 'fix' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                            change.type === 'improvement' && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                                        )}>
                                            {change.type}
                                        </span>
                                        <span className="text-muted-foreground flex-1">{change.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t bg-muted/10 text-center text-xs text-muted-foreground">
                    EduTrack v{changelogs[0].version}
                </div>
            </div>
        </div>
    )
}


import { SummaryResult } from '@/lib/summary/types'
import { Copy, RefreshCw, Settings, Check, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import ReactMarkdown from 'react-markdown'

interface SummaryPanelProps {
    summary: SummaryResult | null
    onRegenerate: () => void
    onConfigure: () => void
    onMaximize?: () => void
    onClose?: () => void
    isLoading?: boolean
    error?: string | null
}

export function SummaryPanel({ summary, onRegenerate, onConfigure, onMaximize, onClose, isLoading, error }: SummaryPanelProps) {
    const [copied, setCopied] = useState(false)
    const { t } = useLanguage()

    if (isLoading) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 animate-pulse flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="space-y-3 w-full max-w-[80%]">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-4/6 mx-auto"></div>
                </div>
                <p className="mt-6 text-sm text-muted-foreground animate-pulse font-medium">
                    {t('summary.generating') || "Génération du résumé en cours..."}
                </p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] border-destructive/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
                <p className="text-destructive font-semibold mb-2 flex items-center gap-2">
                    ⚠️ {t('error.generic') || "Erreur"}
                </p>
                <p className="text-sm text-muted-foreground mb-4 max-w-[250px] mx-auto">
                    {t('error.ai_missing') || "L'IA Chrome n'est pas activée sur ce navigateur."}
                </p>

                <button
                    onClick={onRegenerate}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 z-10"
                >
                    {t('action.retry') || "Réessayer"}
                </button>
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mb-4 opacity-50"></div>
                <p className="text-sm text-muted-foreground">En attente de génération...</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">L'IA locale peut prendre quelques secondes.</p>
            </div>
        )
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(typeof summary.content === 'string' ? summary.content : JSON.stringify(summary.content))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleKeyFact = (label: string, value: string | number) => (
        <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{label}</span>
            <span className="text-xs font-mono">{value}</span>
        </div>
    )

    return (
        <div className="bg-card/50 border rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Header */}
            <div className="bg-muted/30 p-3 flex items-center justify-between border-b">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold flex items-center gap-1">
                        📌 {t('summary.generated')}
                    </span>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                        {summary.options.compression * 100}%
                    </span>
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium uppercase">
                        {summary.options.format}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onRegenerate()}
                        disabled={isLoading}
                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        title={t('summary.regenerate')}
                    >
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="w-px h-4 bg-border mx-1 hidden sm:block" />
                    <button
                        onClick={handleCopy}
                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title={t('summary.copy')}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                    {onMaximize && (
                        <button
                            onClick={onMaximize}
                            className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            title={t('action.expand')}
                        >
                            <Maximize2 className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={onConfigure}
                        className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                        title={t('summary.configure')}
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                    {onClose && (
                        <>
                            <div className="w-px h-4 bg-border mx-1" />
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-md transition-colors"
                                title={t('action.close')}
                            >
                                <span className="text-lg leading-none">×</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 font-sans text-sm leading-relaxed">
                {typeof summary.content === 'string' ? (
                    // We can simple use a less styled version here, or just whitespace-pre-line if we want to keep it simple or use ReactMarkdown but with smaller headers
                    <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-headins:text-sm prose-p:my-1">
                        <ReactMarkdown>
                            {summary.content}
                        </ReactMarkdown>
                    </div>
                ) : "Complex format visualization not yet supported"}
            </div>

            {/* Footer Stats */}
            <div className="bg-muted/10 p-2 px-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex gap-4">
                    {handleKeyFact(t('summary.stats.words'), summary.stats.summaryWordCount)}
                    {handleKeyFact(t('summary.stats.ratio'), `${Math.round((summary.stats.summaryWordCount / summary.stats.originalWordCount) * 100)}% `)}
                    {handleKeyFact(t('summary.stats.time'), `${Math.round(summary.stats.processingTimeMs)} ms`)}
                </div>
                <div className="text-[10px] opacity-50">
                    {new Date(summary.createdAt).toLocaleString()}
                </div>
            </div>
        </div>
    )
}

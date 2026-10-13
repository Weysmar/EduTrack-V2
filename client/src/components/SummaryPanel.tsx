
import { SummaryResult } from '@/lib/summary/types'
import { Copy, RefreshCw, Settings, Check, Maximize2, Sparkles, FileText, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useAIText } from '@/components/ai/useAIText'
import { MissingApiKeyNotice } from '@/components/ai/MissingApiKeyNotice'
import { GenerationProgress } from '@/components/ai/GenerationProgress'
import { useProviderKeys } from '@/hooks/useProviderKeys'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { formatSummaryMarkdown } from '@/lib/summary/formatSummary'

interface SummaryPanelProps {
    summary: SummaryResult | null
    onRegenerate: () => void
    onConfigure: () => void
    onMaximize?: () => void
    onClose?: () => void
    /** Génération IA en cours */
    isLoading?: boolean
    error?: string | null
    /** Chargement du résumé existant (≠ génération) — optionnel, cf. useSummary().isFetching */
    isFetching?: boolean
    /** Début de la génération en cours (affiche le temps écoulé) — optionnel, cf. useSummary().generationStartedAt */
    generationStartedAt?: number | null
    /** Action du bouton "Générer un résumé" quand aucun résumé n'existe (défaut : onRegenerate) */
    onGenerate?: () => void
}

const formatDuration = (ms: number): string => {
    if (!ms || ms <= 0) return '—'
    if (ms < 1000) return `${Math.round(ms)} ms`
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)} s`
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return `${m} min ${String(s).padStart(2, '0')} s`
}

export function SummaryPanel({ summary, onRegenerate, onConfigure, onMaximize, onClose, isLoading, error, isFetching, generationStartedAt, onGenerate }: SummaryPanelProps) {
    const [copied, setCopied] = useState(false)
    const { t } = useAIText()
    // Réactif : re-rendu automatique quand une clé est ajoutée
    const providerKeys = useProviderKeys()
    const hasAnyKey = Object.values(providerKeys).some(Boolean)

    if (isLoading) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] gap-4">
                <div className="space-y-3 w-full max-w-[80%] animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-4/6 mx-auto"></div>
                </div>
                {generationStartedAt ? (
                    <GenerationProgress startedAt={generationStartedAt} className="w-full max-w-sm text-left" />
                ) : (
                    <p className="text-sm text-muted-foreground animate-pulse font-medium">
                        {t('summary.generating')}
                    </p>
                )}
            </div>
        )
    }

    if (isFetching && !summary) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 animate-pulse flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                <div className="space-y-3 w-full max-w-[80%]">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-5/6 mx-auto"></div>
                </div>
                <p className="mt-6 text-sm text-muted-foreground">{t('ai.summary.loading')}</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] border-destructive/20 relative overflow-hidden gap-3">
                <div className="absolute inset-0 bg-destructive/5 pointer-events-none" />
                {hasAnyKey ? (
                    <>
                        <p className="text-destructive font-semibold flex items-center gap-2 z-10">
                            <AlertCircle className="h-4 w-4" />
                            {t('ai.summary.errorTitle')}
                        </p>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto z-10 break-words">
                            {error}
                        </p>
                        <button
                            onClick={onRegenerate}
                            className="px-4 py-2 min-h-[40px] bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 z-10"
                        >
                            {t('action.retry')}
                        </button>
                    </>
                ) : (
                    <MissingApiKeyNotice className="z-10 w-full max-w-sm" />
                )}
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="bg-card/50 border rounded-xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px] gap-3">
                {hasAnyKey ? (
                    <>
                        <div className="p-3 bg-muted text-muted-foreground rounded-full">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-medium text-foreground">{t('ai.summary.empty')}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t('ai.summary.emptyHint')}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onGenerate ?? onRegenerate}
                            className="mt-1 inline-flex items-center gap-2 px-4 py-2 min-h-[40px] text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span>{t('ai.summary.generateCta')}</span>
                        </button>
                    </>
                ) : (
                    <MissingApiKeyNotice className="w-full max-w-sm" />
                )}
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
                    <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-headings:text-sm prose-p:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul_ul]:list-[circle] [&_ul_ul]:pl-5 [&_li]:my-1">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatSummaryMarkdown(summary.content)}
                        </ReactMarkdown>
                    </div>
                ) : t('ai.summary.unsupportedFormat')}
            </div>

            {/* Footer Stats */}
            <div className="bg-muted/10 p-2 px-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                <div className="flex gap-4">
                    {handleKeyFact(t('summary.stats.words'), summary.stats.summaryWordCount)}
                    {handleKeyFact(t('summary.stats.ratio'), `${Math.round((summary.stats.summaryWordCount / summary.stats.originalWordCount) * 100)}% `)}
                    {handleKeyFact(t('summary.stats.time'), formatDuration(summary.stats?.processingTimeMs ?? 0))}
                </div>
                <div className="text-[10px] opacity-50">
                    {new Date(summary.createdAt).toLocaleString()}
                </div>
            </div>
        </div>
    )
}

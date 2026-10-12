import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIText } from './useAIText'

/** Secondes écoulées depuis `startedAt` (null = inactif), rafraîchies chaque seconde. */
export function useElapsedSeconds(startedAt: number | null): number {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        if (startedAt == null) return
        setNow(Date.now())
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [startedAt])

    return startedAt == null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

export const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds} s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

/** Seuil à partir duquel on rassure l'utilisateur sur la durée */
const LONG_GENERATION_SECONDS = 60
/** Durée de l'étape "Analyse du contenu…" */
const ANALYZING_SECONDS = 5

interface GenerationProgressProps {
    /** Timestamp (ms) de début de génération ; null = rien à afficher */
    startedAt: number | null
    /** Force une étape (ex: 'saving' une fois la réponse IA reçue) */
    stage?: 'analyzing' | 'writing' | 'saving'
    /** Affiche le rappel "gardez cette fenêtre ouverte / Annuler" */
    showKeepOpenHint?: boolean
    className?: string
}

/**
 * Retour visuel des générations longues (jusqu'à 5 min) :
 * temps écoulé + messages par étapes + message rassurant après ~60 s.
 */
export function GenerationProgress({ startedAt, stage, showKeepOpenHint = false, className }: GenerationProgressProps) {
    const { t } = useAIText()
    const elapsed = useElapsedSeconds(startedAt)

    if (startedAt == null) return null

    const currentStage = stage ?? (elapsed < ANALYZING_SECONDS ? 'analyzing' : 'writing')
    const label = currentStage === 'saving'
        ? t('ai.progress.saving')
        : currentStage === 'analyzing'
            ? t('ai.progress.analyzing')
            : t('ai.progress.writing')

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn('rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4 text-sm animate-in fade-in', className)}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    <span className="font-medium truncate">{label}</span>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                    {t('ai.progress.elapsed', { time: formatElapsed(elapsed) })}
                </span>
            </div>
            {elapsed >= LONG_GENERATION_SECONDS && (
                <p className="mt-2 text-xs text-muted-foreground animate-in fade-in">{t('ai.progress.longHint')}</p>
            )}
            {showKeepOpenHint && (
                <p className="mt-1 text-[11px] text-muted-foreground/80">{t('ai.progress.keepOpen')}</p>
            )}
        </div>
    )
}

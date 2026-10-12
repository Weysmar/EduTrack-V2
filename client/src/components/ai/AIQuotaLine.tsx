import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfileStore } from '@/store/profileStore'
import { AI_DAILY_LIMIT } from '@/lib/ai/constants'
import { useAIText } from './useAIText'

/** Nombre de générations IA du jour, lu depuis le profil actif (mis à jour en temps réel via socket). */
export function useAIGenerationsCount(): number {
    return useProfileStore(state => {
        const profile = state.activeProfile
        return Number(profile?.aiGenerationsCount ?? profile?.settings?.aiGenerationCount ?? 0) || 0
    })
}

/** Ligne discrète "n/100 générations aujourd'hui". */
export function AIQuotaLine({ className }: { className?: string }) {
    const { t } = useAIText()
    const used = useAIGenerationsCount()
    const ratio = used / AI_DAILY_LIMIT

    return (
        <p
            className={cn(
                'flex items-center gap-1.5 text-[11px] text-muted-foreground',
                ratio >= 1 ? 'text-destructive font-medium' : ratio >= 0.8 ? 'text-amber-600 dark:text-amber-400' : '',
                className
            )}
        >
            <Gauge className="h-3 w-3 shrink-0" />
            {t('ai.quota.today', { used: Math.min(used, AI_DAILY_LIMIT), limit: AI_DAILY_LIMIT })}
        </p>
    )
}

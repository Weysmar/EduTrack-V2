import { KeyRound, ExternalLink, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { AI_SETTINGS_ROUTE, CLAUDE_KEY_URL, GEMINI_KEY_URL, PERPLEXITY_KEY_URL, providerLabel } from '@/lib/ai/constants'
import type { AIProvider } from '@/config/aiModels'
import { useAIText } from './useAIText'

interface MissingApiKeyNoticeProps {
    /** Provider sélectionné (sinon message générique "ajoutez une clé") */
    provider?: AIProvider | null
    /** Appelé avant la navigation vers les Paramètres (ex: fermer le modal parent) */
    onNavigate?: () => void
    /** Variante plus compacte (sans l'explication détaillée) */
    compact?: boolean
    className?: string
}

/**
 * Message guidé lorsqu'aucune clé API n'est disponible :
 * ce qu'est une clé, où l'obtenir, et un bouton vers Paramètres › Clés API.
 */
export function MissingApiKeyNotice({ provider, onNavigate, compact = false, className }: MissingApiKeyNoticeProps) {
    const { t } = useAIText()
    const navigate = useNavigate()

    const goToSettings = () => {
        onNavigate?.()
        navigate(AI_SETTINGS_ROUTE)
    }

    // Lien du provider sélectionné en premier, puis les autres
    const allLinks: { provider: AIProvider; href: string; label: string }[] = [
        { provider: 'google', href: GEMINI_KEY_URL, label: t('ai.key.getGemini') },
        { provider: 'perplexity', href: PERPLEXITY_KEY_URL, label: t('ai.key.getPerplexity') },
        { provider: 'anthropic', href: CLAUDE_KEY_URL, label: t('ai.key.getClaude') },
    ]
    const links = [...allLinks.filter(l => l.provider === provider), ...allLinks.filter(l => l.provider !== provider)]

    return (
        <div
            role="status"
            className={cn(
                'rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 p-3 sm:p-4 text-left animate-in fade-in',
                className
            )}
        >
            <div className="flex items-start gap-2.5">
                <KeyRound className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                <div className="min-w-0 space-y-2">
                    <p className="text-sm font-semibold">
                        {provider ? t('ai.key.missingTitle', { provider: providerLabel(provider) }) : t('ai.key.missingTitleAny')}
                    </p>
                    {!compact && (
                        <p className="text-xs leading-relaxed opacity-90">{t('ai.key.what')}</p>
                    )}
                    <ul className="space-y-1">
                        {links.map(link => (
                            <li key={link.href}>
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:text-amber-950 dark:hover:text-amber-100"
                                >
                                    {link.label}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </li>
                        ))}
                    </ul>
                    {!compact && (
                        <p className="text-[11px] opacity-80">{t('ai.key.howTo')}</p>
                    )}
                    <button
                        type="button"
                        onClick={goToSettings}
                        className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors touch-manipulation"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        {t('ai.key.openSettings')}
                    </button>
                </div>
            </div>
        </div>
    )
}

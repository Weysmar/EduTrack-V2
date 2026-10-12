import { useCallback } from 'react'
import { useLanguage } from '@/components/language-provider'
import { aiMessage } from '@/lib/ai/messages'

/**
 * useAIText — `t()` de LanguageProvider avec repli sur les textes par défaut
 * des clés `ai.*` (lib/ai/messages.ts) tant qu'elles ne sont pas déclarées
 * dans language-provider.tsx. Toute autre clé est résolue normalement.
 */
export function useAIText() {
    const { t, language } = useLanguage()

    const tr = useCallback((key: string, variables?: Record<string, string | number>): string => {
        const value = t(key, variables)
        if (value && value !== key) return value
        return aiMessage(key, variables, language)
    }, [t, language])

    return { t: tr, language }
}

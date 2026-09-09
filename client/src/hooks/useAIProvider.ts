/**
 * useAIProvider — Hook qui encapsule le couplage provider ↔ modèle.
 *
 * GARANTIT l'invariant : le modèle actif appartient TOUJOURS au provider actif.
 *
 * Problème résolu :
 *   Avant ce hook, `provider` et `model` étaient deux états indépendants
 *   dans chaque modal. Si l'initialisation ratait ou si on ajoutait un nouveau
 *   provider, on pouvait se retrouver avec model='gemini-3.7-flash' et
 *   provider='perplexity' — incohérence silencieuse envoyée au serveur.
 *
 * Usage :
 *   const { provider, model, setProvider, setModel, reset } = useAIProvider({ geminiKey, perplexityKey })
 *
 *   - setProvider(p)  : change le provider ET remet le modèle au défaut du nouveau provider
 *   - setModel(m)     : refuse silencieusement si m n'appartient pas au provider courant
 *   - reset()         : réinitialise en recalculant le provider depuis les clés disponibles
 */

import { useState, useCallback } from 'react'
import { getDefaultModel, getModelsForProvider, type AIProvider } from '@/config/aiModels'

interface UseAIProviderOptions {
    geminiKey?: string | null
    perplexityKey?: string | null
    /** Provider initial forcé (ignore les clés disponibles) */
    initialProvider?: AIProvider
    /** Modèle initial forcé */
    initialModel?: string
}

interface AIProviderState {
    provider: AIProvider
    model: string
    /** Change le provider ET remet automatiquement le modèle au recommandé du nouveau provider */
    setProvider: (p: AIProvider) => void
    /** Change le modèle — ignoré si m n'appartient pas au provider courant */
    setModel: (m: string) => void
    /** Réinitialise provider+modèle en recalculant depuis les clés disponibles */
    reset: () => void
    /** Indique si une clé est disponible pour le provider courant */
    hasKeyForProvider: boolean
}

/** Calcule le provider par défaut en fonction des clés disponibles */
const resolveDefaultProvider = (
    geminiKey?: string | null,
    perplexityKey?: string | null,
    preferred?: AIProvider
): AIProvider => {
    if (preferred) return preferred
    // Si on a Gemini mais pas Perplexity, utiliser Gemini
    if (!perplexityKey && geminiKey) return 'google'
    // Par défaut Perplexity
    return 'perplexity'
}

export function useAIProvider({
    geminiKey,
    perplexityKey,
    initialProvider,
    initialModel,
}: UseAIProviderOptions): AIProviderState {
    const defaultProvider = resolveDefaultProvider(geminiKey, perplexityKey, initialProvider)

    const [provider, setProviderRaw] = useState<AIProvider>(defaultProvider)
    const [model, setModelRaw] = useState<string>(
        initialModel ?? getDefaultModel(defaultProvider)
    )

    /**
     * Changer de provider : remet automatiquement le modèle au recommandé
     * si le modèle courant n'appartient pas au nouveau provider.
     */
    const setProvider = useCallback((p: AIProvider) => {
        setProviderRaw(p)
        setModelRaw(current => {
            const belongsToNewProvider = getModelsForProvider(p).some(m => m.id === current)
            return belongsToNewProvider ? current : getDefaultModel(p)
        })
    }, [])

    /**
     * Changer de modèle : refuse silencieusement si le modèle
     * n'appartient pas au provider courant (cohérence garantie).
     */
    const setModel = useCallback((m: string) => {
        setProviderRaw(currentProvider => {
            const belongsToProvider = getModelsForProvider(currentProvider).some(entry => entry.id === m)
            if (belongsToProvider) {
                setModelRaw(m)
            }
            return currentProvider
        })
    }, [])

    /**
     * Réinitialise le provider et le modèle depuis les clés disponibles.
     * Appelé typiquement dans le useEffect d'ouverture du modal.
     */
    const reset = useCallback(() => {
        const p = resolveDefaultProvider(geminiKey, perplexityKey, initialProvider)
        setProviderRaw(p)
        setModelRaw(initialModel ?? getDefaultModel(p))
    }, [geminiKey, perplexityKey, initialProvider, initialModel])

    const hasKeyForProvider = provider === 'google' ? !!geminiKey : !!perplexityKey

    return { provider, model, setProvider, setModel, reset, hasKeyForProvider }
}

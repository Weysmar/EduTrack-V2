/**
 * useAIProvider — Hook qui encapsule le couplage provider ↔ modèle.
 *
 * GARANTIT l'invariant : le modèle actif appartient TOUJOURS au provider actif.
 *
 * Problème résolu :
 *   Avant ce hook, `provider` et `model` étaient deux états indépendants
 *   dans chaque modal. Si l'initialisation ratait ou si on ajoutait un nouveau
 *   provider, on pouvait se retrouver avec model='gemini-3.8-flash' et
 *   provider='perplexity' — incohérence silencieuse envoyée au serveur.
 *
 * Usage :
 *   const keys = useProviderKeys()
 *   const { provider, model, setProvider, setModel, reset } = useAIProvider({ keys })
 *
 *   - setProvider(p)  : change le provider ET remet le modèle au défaut du nouveau provider
 *   - setModel(m)     : refuse silencieusement si m n'appartient pas au provider courant
 *   - reset()         : réinitialise en recalculant le provider depuis les clés disponibles
 */

import { useState, useCallback } from 'react'
import { getDefaultModel, getModelsForProvider, normalizeModelId, type AIProvider } from '@/config/aiModels'
import { firstProviderWithKey } from '@/lib/ai/apiKeys'

export type ProviderKeys = Partial<Record<AIProvider, string | null | undefined>>

interface UseAIProviderOptions {
    /** Clés disponibles par provider (voir useProviderKeys) */
    keys: ProviderKeys
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

/**
 * Calcule le provider par défaut en fonction des clés disponibles :
 * Perplexity, puis Gemini, puis Claude (premier provider disposant d'une clé), Perplexity sinon.
 */
export const resolveDefaultProvider = (keys: ProviderKeys, preferred?: AIProvider): AIProvider => {
    if (preferred) return preferred
    return firstProviderWithKey({ google: keys.google ?? null, perplexity: keys.perplexity ?? null, anthropic: keys.anthropic ?? null }) ?? 'perplexity'
}

/** Modèle initial s'il appartient bien au provider, sinon le modèle recommandé du provider */
const resolveModel = (provider: AIProvider, savedModel?: string): string => {
    // Saved settings may hold a deprecated id (e.g. gemini-3.7-flash): map it to the current model first
    const preferredModel = normalizeModelId(savedModel)
    return preferredModel && getModelsForProvider(provider).some(m => m.id === preferredModel)
        ? preferredModel
        : getDefaultModel(provider)
}

export function useAIProvider({
    keys,
    initialProvider,
    initialModel,
}: UseAIProviderOptions): AIProviderState {
    const defaultProvider = resolveDefaultProvider(keys, initialProvider)

    const [provider, setProviderRaw] = useState<AIProvider>(defaultProvider)
    const [model, setModelRaw] = useState<string>(
        () => resolveModel(defaultProvider, initialModel)
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
    const setModel = useCallback((requested: string) => {
        const m = normalizeModelId(requested) ?? requested
        setProviderRaw(currentProvider => {
            const belongsToProvider = getModelsForProvider(currentProvider).some(entry => entry.id === m)
            if (belongsToProvider) {
                setModelRaw(m)
            }
            return currentProvider
        })
    }, [])

    const { google: googleKey, perplexity: perplexityKey, anthropic: anthropicKey } = keys

    /**
     * Réinitialise le provider et le modèle depuis les clés disponibles.
     * Appelé typiquement dans le useEffect d'ouverture du modal.
     */
    const reset = useCallback(() => {
        const p = resolveDefaultProvider({ google: googleKey, perplexity: perplexityKey, anthropic: anthropicKey }, initialProvider)
        setProviderRaw(p)
        setModelRaw(resolveModel(p, initialModel))
    }, [googleKey, perplexityKey, anthropicKey, initialProvider, initialModel])

    const hasKeyForProvider = !!keys[provider]

    return { provider, model, setProvider, setModel, reset, hasKeyForProvider }
}

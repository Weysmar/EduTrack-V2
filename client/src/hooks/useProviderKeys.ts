import { useMemo } from 'react'
import { useProfileStore } from '@/store/profileStore'
import { resolveProviderKeys } from '@/lib/ai/apiKeys'
import type { AIProvider } from '@/config/aiModels'

/**
 * Clés API disponibles par fournisseur (Google, Perplexity, Claude).
 * Réactif : le composant se met à jour dès qu'une clé est ajoutée dans les paramètres.
 */
export function useProviderKeys(): Record<AIProvider, string | null> {
    const apiKeys = useProfileStore(state => state.apiKeys)
    const settings = useProfileStore(state => state.activeProfile?.settings)
    return useMemo(() => resolveProviderKeys(apiKeys, settings), [apiKeys, settings])
}

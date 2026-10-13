/**
 * apiKeys.ts — Un seul emplacement de clé API par fournisseur IA.
 *
 * Avant 2026-10, chaque fournisseur avait deux emplacements (résumés / exercices).
 * Les anciens champs restent lus en repli pour les comptes qui n'ont pas encore
 * réenregistré leurs paramètres, puis sont vidés à la prochaine sauvegarde.
 * Miroir de PROVIDER_KEY_FIELDS côté serveur (server/src/services/apiKeyService.ts).
 */

import { AI_PROVIDERS, type AIProvider } from '@/config/aiModels'

export const PROVIDER_KEY_FIELDS = {
    google: 'google_gemini_api_key',
    perplexity: 'perplexity_api_key',
    anthropic: 'anthropic_api_key',
} as const satisfies Record<AIProvider, string>

export type ProviderKeyField = typeof PROVIDER_KEY_FIELDS[AIProvider]

export const LEGACY_KEY_FIELDS: Record<AIProvider, string[]> = {
    google: ['google_gemini_summaries', 'google_gemini_exercises', 'google_gemini_categorization'],
    perplexity: ['perplexity_summaries', 'perplexity_exercises'],
    anthropic: [],
}

// Toute source d'objet (état local ApiKeyMap, Profile.settings…)
type KeySource = object | null | undefined

const readKey = (source: KeySource, field: string): string | null => {
    const value = (source as Record<string, unknown> | null | undefined)?.[field]
    return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Clé d'un fournisseur : emplacement unique d'abord (dans toutes les sources),
 * puis anciens emplacements. Les sources sont lues dans l'ordre (ex : état local, puis réglages du profil).
 */
export function resolveProviderKey(provider: AIProvider, ...sources: KeySource[]): string | null {
    for (const field of [PROVIDER_KEY_FIELDS[provider], ...LEGACY_KEY_FIELDS[provider]]) {
        for (const source of sources) {
            const key = readKey(source, field)
            if (key) return key
        }
    }
    return null
}

/** Clés de tous les fournisseurs */
export function resolveProviderKeys(...sources: KeySource[]): Record<AIProvider, string | null> {
    return Object.fromEntries(
        AI_PROVIDERS.map(provider => [provider, resolveProviderKey(provider, ...sources)])
    ) as Record<AIProvider, string | null>
}

/** Champs à envoyer lors d'une sauvegarde pour supprimer les anciens emplacements */
export function clearedLegacyKeyFields(): Record<string, null> {
    return Object.fromEntries(
        Object.values(LEGACY_KEY_FIELDS).flat().map(field => [field, null])
    )
}

/** Premier fournisseur disposant d'une clé, selon un ordre de préférence */
export function firstProviderWithKey(
    keys: Record<AIProvider, string | null | undefined>,
    order: AIProvider[] = ['perplexity', 'google', 'anthropic']
): AIProvider | null {
    return order.find(provider => !!keys[provider]) ?? null
}

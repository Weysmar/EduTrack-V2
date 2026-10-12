/**
 * language.ts — Aides pour faire générer le contenu dans la langue de l'interface,
 * et pour signaler la troncature du contenu source envoyé à l'IA.
 */

import type { UILanguage } from './messages'

export type OutputLanguage = UILanguage

/** Nom de la langue tel qu'il est injecté dans les prompts (rédigés en français). */
export const outputLanguageName = (lang: OutputLanguage = 'fr'): string =>
    lang === 'en' ? 'EN ANGLAIS (English)' : 'EN FRANÇAIS'

/**
 * Consigne explicite de langue de sortie, à ajouter à la fin du prompt système.
 * Les prompts sont rédigés en français : sans cette consigne, l'IA répond en français
 * même quand l'interface est en anglais.
 */
export const outputLanguageInstruction = (lang: OutputLanguage = 'fr'): string =>
    lang === 'en'
        ? `\nLANGUE DE SORTIE (PRIORITAIRE) : rédige TOUT le contenu généré (questions, réponses, options, explications, titres) en ANGLAIS. Les clés JSON restent inchangées.\nOUTPUT LANGUAGE (MANDATORY): write ALL generated content in ENGLISH. Keep JSON keys unchanged.\n`
        : `\nLANGUE DE SORTIE : rédige tout le contenu généré en FRANÇAIS. Les clés JSON restent inchangées.\n`

/** Tronque le contenu à `limit` caractères et indique si une troncature a eu lieu. */
export function truncateContent(content: string, limit: number): { text: string; truncated: boolean } {
    const safe = content || ''
    if (safe.length <= limit) return { text: safe, truncated: false }
    return { text: safe.substring(0, limit), truncated: true }
}

/** Vrai si un contenu dépasse la limite d'un générateur (pour avertir l'utilisateur avant génération). */
export const isContentTruncated = (content: string | undefined | null, limit: number): boolean =>
    (content?.length ?? 0) > limit

/**
 * Constantes partagées de l'expérience de génération IA.
 */

/** Page Paramètres, onglet "Clés API" */
export const AI_SETTINGS_ROUTE = '/edu/settings?tab=api'

/** Page Calendrier */
export const CALENDAR_ROUTE = '/edu/calendar'

/** Où obtenir une clé API Google Gemini (gratuite) */
export const GEMINI_KEY_URL = 'https://aistudio.google.com/app/apikey'

/** Où obtenir une clé API Perplexity */
export const PERPLEXITY_KEY_URL = 'https://www.perplexity.ai/settings/api'

/** Où obtenir une clé API Anthropic (Claude) */
export const CLAUDE_KEY_URL = 'https://platform.claude.com/settings/keys'

/** Limite quotidienne de générations (miroir de server/src/middleware/aiRateLimit.ts) */
export const AI_DAILY_LIMIT = 100

/** Délai max d'une requête de génération (5 minutes) */
export const AI_REQUEST_TIMEOUT_MS = 300000

export const providerLabel = (provider?: string | null): string =>
    provider === 'google' ? 'Google Gemini' : provider === 'anthropic' ? 'Claude' : 'Perplexity'

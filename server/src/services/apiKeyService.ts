import { prisma } from '../lib/prisma';
import {
    resolveModelId,
    detectProvider,
    modelForProvider,
    AI_PROVIDERS,
    DEFAULT_MODELS,
    AIProvider,
} from '../config/aiModels';
import { decryptSecret } from '../utils/crypto';

export type { AIProvider };

export interface ApiKeyConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
    source: 'request' | 'profile_settings' | 'environment';
}

// resolveModelId and detectProvider are imported from ../config/aiModels.ts
// which is the single source of truth for all model definitions.
export { resolveModelId, detectProvider };

/**
 * Un seul emplacement de clé par provider dans Profile.settings.
 * Les anciens emplacements (une clé par usage : résumés, exercices…) restent lus en repli
 * tant que l'utilisateur n'a pas réenregistré ses paramètres.
 */
export const PROVIDER_KEY_FIELDS: Record<AIProvider, { field: string; legacy: string[] }> = {
    google: {
        field: 'google_gemini_api_key',
        legacy: ['google_gemini_summaries', 'google_gemini_exercises', 'google_gemini_categorization'],
    },
    perplexity: {
        field: 'perplexity_api_key',
        legacy: ['perplexity_summaries', 'perplexity_exercises'],
    },
    anthropic: {
        field: 'anthropic_api_key',
        legacy: [],
    },
};

const ENV_KEYS: Record<AIProvider, string> = {
    google: 'GEMINI_API_KEY',
    perplexity: 'PERPLEXITY_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
};

const PROVIDER_NAMES: Record<AIProvider, string> = {
    google: 'Gemini',
    perplexity: 'Perplexity',
    anthropic: 'Claude (Anthropic)',
};

// Validate API key format
// Vérifie le préfixe attendu quand il est présent (signal fort) ; sinon repli sur une
// vérification de longueur permissive (pour ne pas rejeter des clés valides passant par
// un proxy/une gateway d'entreprise dont le format diffère du standard grand public).
export const validateApiKey = (key: string, provider: AIProvider): boolean => {
    if (!key || key.trim().length === 0) return false;
    const trimmed = key.trim();

    if (provider === 'google') {
        // Les clés Google API (Gemini AI Studio) commencent par "AIza" et font ~39 caractères
        if (trimmed.startsWith('AIza')) return trimmed.length >= 30;
        return trimmed.length > 20;
    } else if (provider === 'perplexity') {
        // Les clés Perplexity commencent par "pplx-"
        if (trimmed.startsWith('pplx-')) return trimmed.length >= 15;
        return trimmed.length > 10;
    } else if (provider === 'anthropic') {
        // Les clés Anthropic commencent par "sk-ant-"
        if (trimmed.startsWith('sk-ant-')) return trimmed.length >= 30;
        return trimmed.length > 20;
    }
    return false;
};

/** Clé enregistrée pour un provider : emplacement unique d'abord, puis anciens emplacements (déchiffrés). */
export const getStoredProviderKey = (settings: Record<string, any> | null | undefined, provider: AIProvider): string | null => {
    if (!settings) return null;
    const { field, legacy } = PROVIDER_KEY_FIELDS[provider];
    for (const name of [field, ...legacy]) {
        const raw = settings[name];
        if (!raw) continue;
        const key = decryptSecret(raw);
        if (key && validateApiKey(key, provider)) return key.trim();
    }
    return null;
};

/**
 * Get API key with standardized priority:
 * 1. Key from request (if provided)
 * 2. Key from profile settings
 * 3. Key from environment variables
 */
export const getApiKey = async (
    profileId: string,
    provider: AIProvider,
    options?: {
        requestApiKey?: string;
        /** Conservé pour compatibilité : une seule clé par provider désormais */
        purpose?: 'summaries' | 'exercises' | 'categorization' | 'audit';
    }
): Promise<ApiKeyConfig> => {
    const { requestApiKey } = options || {};
    const model = DEFAULT_MODELS[provider];

    // Priority 1: Request-provided key
    if (requestApiKey && validateApiKey(requestApiKey, provider)) {
        return { provider, apiKey: requestApiKey.trim(), model, source: 'request' };
    }

    // Priority 2: Profile settings (déchiffrement : les clés sont chiffrées au repos)
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { settings: true }
    });
    const storedKey = getStoredProviderKey(profile?.settings as Record<string, any> | null, provider);
    if (storedKey) {
        return { provider, apiKey: storedKey, model, source: 'profile_settings' };
    }

    // Priority 3: Environment variables
    const envKey = process.env[ENV_KEYS[provider]];
    if (envKey && validateApiKey(envKey, provider)) {
        return { provider, apiKey: envKey.trim(), model, source: 'environment' };
    }

    // No valid key found
    throw new Error(
        `No valid ${PROVIDER_NAMES[provider]} API key found. ` +
        `Please configure your API key in Settings > API.`
    );
};

/**
 * Get API key specifically for FinanceTrack features.
 * Essaie le provider préféré, puis les autres providers configurés. Le modèle choisi dans
 * les réglages (finance_audit_model) n'est utilisé que s'il appartient au provider retenu.
 */
export const getFinanceApiKey = async (
    profileId: string,
    options?: {
        requestApiKey?: string;
        preferredProvider?: AIProvider;
    }
): Promise<ApiKeyConfig> => {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { settings: true }
    });

    const settings = (profile?.settings as any) || {};
    const savedProvider = AI_PROVIDERS.includes(settings.finance_audit_provider) ? settings.finance_audit_provider as AIProvider : undefined;
    const preferred: AIProvider = options?.preferredProvider || savedProvider || 'google';
    const candidates = [preferred, ...AI_PROVIDERS.filter(p => p !== preferred)];

    let lastError: unknown;
    for (const provider of candidates) {
        try {
            const config = await getApiKey(profileId, provider, {
                requestApiKey: options?.requestApiKey,
                purpose: 'categorization'
            });
            return { ...config, model: modelForProvider(provider, settings.finance_audit_model) };
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};

/**
 * Get the appropriate model for the provider
 */
export const getDefaultModel = (provider: AIProvider, preferredModel?: string): string => {
    if (preferredModel) {
        return resolveModelId(preferredModel);
    }
    return DEFAULT_MODELS[provider];
};

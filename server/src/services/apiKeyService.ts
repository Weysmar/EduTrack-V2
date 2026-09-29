import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { resolveModelId, detectProvider } from '../config/aiModels';
import { decryptSecret } from '../utils/crypto';

export type AIProvider = 'google' | 'perplexity';

export interface ApiKeyConfig {
    provider: AIProvider;
    apiKey: string;
    model: string;
    source: 'request' | 'profile_settings' | 'environment';
}

// resolveModelId and detectProvider are imported from ../config/aiModels.ts
// which is the single source of truth for all model definitions.
export { resolveModelId, detectProvider };

// Validate API key format
// Vérifie le préfixe attendu quand il est présent (signal fort) ; sinon repli sur une
// vérification de longueur permissive (pour ne pas rejeter des clés valides passant par
// un proxy/une gateway d'entreprise dont le format diffère du standard grand public).
const validateApiKey = (key: string, provider: AIProvider): boolean => {
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
    }
    return false;
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
        purpose?: 'summaries' | 'exercises' | 'categorization' | 'audit';
    }
): Promise<ApiKeyConfig> => {
    const { requestApiKey, purpose = 'summaries' } = options || {};
    
    // Priority 1: Request-provided key
    if (requestApiKey && validateApiKey(requestApiKey, provider)) {
        return {
            provider,
            apiKey: requestApiKey,
            model: provider === 'google' ? 'gemini-3.7-flash' : 'sonar',
            source: 'request'
        };
    }
    
    // Priority 2: Profile settings
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        select: { settings: true }
    });
    
    if (profile?.settings) {
        const settings = profile.settings as any;
        
        if (provider === 'google') {
            // Try purpose-specific key first, then fallbacks (déchiffrement : les clés sont chiffrées au repos)
            const possibleKeys = [
                settings.google_gemini_summaries,
                settings.google_gemini_exercises,
                settings.google_gemini_categorization,
            ].filter(Boolean).map(decryptSecret);

            for (const key of possibleKeys) {
                if (key && validateApiKey(key, 'google')) {
                    return {
                        provider: 'google',
                        apiKey: key,
                        model: settings.finance_audit_model || 'gemini-3.7-flash',
                        source: 'profile_settings'
                    };
                }
            }
        } else if (provider === 'perplexity') {
            const possibleKeys = [
                settings.perplexity_summaries,
                settings.perplexity_exercises,
            ].filter(Boolean).map(decryptSecret);

            for (const key of possibleKeys) {
                if (key && validateApiKey(key, 'perplexity')) {
                    return {
                        provider: 'perplexity',
                        apiKey: key,
                        model: settings.finance_audit_model || 'sonar',
                        source: 'profile_settings'
                    };
                }
            }
        }
    }
    
    // Priority 3: Environment variables
    if (provider === 'google') {
        const envKey = process.env.GEMINI_API_KEY;
        if (envKey && validateApiKey(envKey, 'google')) {
            return {
                provider: 'google',
                apiKey: envKey,
                model: 'gemini-3.7-flash',
                source: 'environment'
            };
        }
    } else if (provider === 'perplexity') {
        const envKey = process.env.PERPLEXITY_API_KEY;
        if (envKey && validateApiKey(envKey, 'perplexity')) {
            return {
                provider: 'perplexity',
                apiKey: envKey,
                model: 'sonar',
                source: 'environment'
            };
        }
    }
    
    // No valid key found
    throw new Error(
        `No valid ${provider === 'google' ? 'Gemini' : 'Perplexity'} API key found. ` +
        `Please configure your API key in Settings > API.`
    );
};

/**
 * Get API key specifically for FinanceTrack features
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
    const provider = options?.preferredProvider || 
                     settings.finance_audit_provider || 
                     'google';
    
    // Try to get key for the preferred provider
    try {
        return await getApiKey(profileId, provider, {
            requestApiKey: options?.requestApiKey,
            purpose: 'categorization'
        });
    } catch (error) {
        // If preferred provider fails, try the other one
        const fallbackProvider = provider === 'google' ? 'perplexity' : 'google';
        return await getApiKey(profileId, fallbackProvider, {
            requestApiKey: options?.requestApiKey,
            purpose: 'categorization'
        });
    }
};

/**
 * Get the appropriate model for the provider
 */
export const getDefaultModel = (provider: AIProvider, preferredModel?: string): string => {
    if (preferredModel) {
        return resolveModelId(preferredModel);
    }
    return provider === 'google' ? 'gemini-3.7-flash' : 'sonar';
};

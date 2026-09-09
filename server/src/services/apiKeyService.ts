import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { prisma } from '../lib/prisma';
import { resolveModelId, detectProvider } from '../config/aiModels';

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

// Validate API key format (basic checks)
const validateApiKey = (key: string, provider: AIProvider): boolean => {
    if (!key || key.trim().length === 0) return false;
    
    if (provider === 'google') {
        // Gemini keys typically start with specific prefixes
        return key.length > 20; // Basic length check
    } else if (provider === 'perplexity') {
        // Perplexity keys are typically pplx-* or longer tokens
        return key.length > 10;
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
            // Try purpose-specific key first, then fallbacks
            const possibleKeys = [
                settings.google_gemini_summaries,
                settings.google_gemini_exercises,
                settings.google_gemini_categorization,
            ].filter(Boolean);
            
            for (const key of possibleKeys) {
                if (validateApiKey(key, 'google')) {
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
            ].filter(Boolean);
            
            for (const key of possibleKeys) {
                if (validateApiKey(key, 'perplexity')) {
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

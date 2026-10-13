
import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";
import { apiClient } from "@/lib/api/client";
import { AIRequestError, toAIError } from "./errors";
import { aiMessage } from "./messages";
import { AI_REQUEST_TIMEOUT_MS } from "./constants";
import { DEFAULT_GEMINI_MODEL } from "@/config/aiModels";
import { buildSummarySystemPrompt, type CompressionLevel } from "./summaryPrompt";

const missingGeminiKeyError = () =>
    new AIRequestError(aiMessage('ai.error.missingKey', { provider: 'Google Gemini' }), 'missing_key');

export interface GoogleGeminiOptions {
    compressionLevel: CompressionLevel;
    model?: string;
}

export class GoogleGeminiService {

    static async generateSummary(text: string, options: SummaryOptions, geminiOptions: GoogleGeminiOptions, signal?: AbortSignal): Promise<string> {
        const API_KEY = useProfileStore.getState().getProviderKey('google');

        if (!API_KEY) {
            throw missingGeminiKeyError();
        }

        const systemPrompt = buildSummarySystemPrompt(geminiOptions.compressionLevel, options.format);

        const model = geminiOptions.model || DEFAULT_GEMINI_MODEL;

        try {
            const { data } = await apiClient.post('/ai/generate', {
                prompt: text,
                systemPrompt: systemPrompt,
                provider: 'google',
                model: model,
                apiKey: API_KEY
            }, {
                timeout: AI_REQUEST_TIMEOUT_MS,
                signal
            });

            return data.text;

        } catch (error: unknown) {
            // Message actionnable : limite quotidienne, quota, timeout, réseau, clé invalide…
            throw toAIError(error, { provider: 'google' });
        }
    }
}

export async function generateWithGoogle(prompt: string, systemPrompt?: string, model?: string, signal?: AbortSignal): Promise<string> {
    const API_KEY = useProfileStore.getState().getProviderKey('google');

    if (!API_KEY) {
        throw missingGeminiKeyError();
    }

    try {
        const { data } = await apiClient.post('/ai/generate', {
            prompt: prompt,
            systemPrompt: systemPrompt,
            provider: 'google',
            model: model || DEFAULT_GEMINI_MODEL,
            apiKey: API_KEY
        }, {
            timeout: AI_REQUEST_TIMEOUT_MS,
            signal
        });
        return data.text;
    } catch (error: unknown) {
        throw toAIError(error, { provider: 'google' });
    }
}

/**
 * anthropic.ts — Intégration Claude (Anthropic) côté client.
 *
 * Comme Gemini et Perplexity, toutes les requêtes passent par le backend Express
 * (/api/ai/generate) : aucun appel direct à api.anthropic.com depuis le navigateur.
 */

import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";
import { apiClient } from "@/lib/api/client";
import { AIRequestError, toAIError } from "./errors";
import { aiMessage } from "./messages";
import { AI_REQUEST_TIMEOUT_MS } from "./constants";
import { DEFAULT_CLAUDE_MODEL } from "@/config/aiModels";
import { buildSummarySystemPrompt, type CompressionLevel } from "./summaryPrompt";

const missingClaudeKeyError = () =>
    new AIRequestError(aiMessage('ai.error.missingKey', { provider: 'Claude' }), 'missing_key');

export interface ClaudeOptions {
    compressionLevel: CompressionLevel;
    model?: string;
}

export class ClaudeService {
    static async generateSummary(text: string, options: SummaryOptions, claudeOptions: ClaudeOptions, signal?: AbortSignal): Promise<string> {
        return generateWithClaude(
            text,
            buildSummarySystemPrompt(claudeOptions.compressionLevel, options.format),
            claudeOptions.model,
            signal
        );
    }
}

export async function generateWithClaude(prompt: string, systemPrompt?: string, model?: string, signal?: AbortSignal): Promise<string> {
    const API_KEY = useProfileStore.getState().getProviderKey('anthropic');

    if (!API_KEY) {
        throw missingClaudeKeyError();
    }

    try {
        const { data } = await apiClient.post('/ai/generate', {
            prompt,
            systemPrompt,
            provider: 'anthropic',
            model: model || DEFAULT_CLAUDE_MODEL,
            apiKey: API_KEY
        }, {
            timeout: AI_REQUEST_TIMEOUT_MS,
            signal
        });
        return data.text;
    } catch (error: unknown) {
        // Message actionnable : limite quotidienne, quota, timeout, réseau, clé invalide…
        throw toAIError(error, { provider: 'anthropic' });
    }
}

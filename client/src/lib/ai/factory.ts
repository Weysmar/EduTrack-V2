import { PerplexityService, generateWithPerplexity } from "./perplexity";
import { GoogleGeminiService, generateWithGoogle } from "./google";
import { SummaryOptions } from "../summary/types";

/** Options transverses d'une requête IA (annulation, etc.) */
export interface AIRequestOptions {
    /** Signal d'annulation (AbortController) : annule la requête HTTP en cours */
    signal?: AbortSignal;
}

export class AIServiceFactory {

    static async generateSummary(text: string, options: SummaryOptions, request: AIRequestOptions = {}): Promise<string> {
        const provider = options.provider;
        const compressionStr = (options.compression * 100).toString() as any;

        if (provider === 'google') {
            return GoogleGeminiService.generateSummary(text, options, {
                compressionLevel: compressionStr,
                model: options.model
            }, request.signal);
        } else {
            return PerplexityService.generateSummary(text, options, {
                compressionLevel: compressionStr,
                useWebSearch: options.useWebSearch,
                model: options.model
            }, request.signal);
        }
    }

    static async generateGeneric(
        prompt: string,
        systemPrompt: string = "You are a helpful AI assistant",
        provider: 'google' | 'perplexity' = 'perplexity',
        model?: string,
        request: AIRequestOptions = {}
    ): Promise<string> {
        if (provider === 'google') {
            return generateWithGoogle(prompt, systemPrompt, model, request.signal);
        } else {
            return generateWithPerplexity(prompt, systemPrompt, model, request.signal);
        }
    }
}

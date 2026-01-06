

import { PerplexityService, generateWithPerplexity } from "./perplexity";
import { GoogleGeminiService, generateWithGoogle } from "./google";
import { SummaryOptions } from "../summary/types";

export class AIServiceFactory {

    static async generateSummary(text: string, options: SummaryOptions): Promise<string> {
        const provider = options.provider;
        const compressionStr = (options.compression * 100).toString() as any;

        if (provider === 'google') {
            return GoogleGeminiService.generateSummary(text, options, {
                compressionLevel: compressionStr,
                model: options.model
            });
        } else {
            return PerplexityService.generateSummary(text, options, {
                compressionLevel: compressionStr,
                useWebSearch: options.useWebSearch,
                model: options.model
            });
        }
    }

    static async generateGeneric(prompt: string, systemPrompt: string = "You are a helpful AI assistant", provider: 'google' | 'perplexity' = 'perplexity', model?: string): Promise<string> {
        if (provider === 'google') {
            return generateWithGoogle(prompt, systemPrompt, model);
        } else {
            return generateWithPerplexity(prompt, systemPrompt, model);
        }
    }
}

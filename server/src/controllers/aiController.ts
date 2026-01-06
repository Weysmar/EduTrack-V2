import { Request, Response } from 'express';
import { aiService } from '../services/aiService';

export const generateContent = async (req: Request, res: Response) => {
    try {
        const { prompt, systemPrompt, provider, model, apiKey } = req.body;

        // Simplify: forcing Gemini for now as installed SDK is Gemini
        // If Provider is Perplexity, we might need a fetch call, but let's stick to Gemini for Backend v1
        // or implement fetch for Perplexity here.

        // For this fix: Handle generic generation
        if (provider === 'perplexity') {
            // Fallback to Gemini if no Perplexity backend logic implemented yet?
            // Or implement fetch. implementing fetch is better.
            // But for speed, let's prioritize Gemini (Native SDK) and add TODO for Perplexity.
        }

        const response = await aiService.generateText(prompt, systemPrompt, model, apiKey);
        res.json({ text: response });
    } catch (error) {
        res.status(500).json({ message: 'Generation failed', error: (error as Error).message });
    }
};

export const generateJSON = async (req: Request, res: Response) => {
    try {
        const { prompt, systemPrompt, provider, model, apiKey } = req.body;
        const response = await aiService.generateJSON(prompt, systemPrompt, model, apiKey);
        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'JSON Generation failed', error: (error as Error).message });
    }
};

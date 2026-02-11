import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { aiService } from '../services/aiService';
import { logErrorToFile } from '../utils/fileLogger';
import { incrementAIGeneration } from './profileController';

export const generateContent = async (req: AuthRequest, res: Response) => {
    try {
        console.log('=== AI Generate Request ===');
        console.log('Body:', JSON.stringify(req.body, null, 2));

        const { prompt, systemPrompt, provider, model, apiKey } = req.body;

        // Validate required fields
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required' });
        }

        console.log('Provider:', provider);
        console.log('Model:', model);
        console.log('Has API Key:', !!apiKey);
        console.log('Prompt length:', prompt?.length);

        // Simplify: forcing Gemini for now as installed SDK is Gemini
        if (provider === 'perplexity') {
            console.warn('Perplexity provider not yet implemented, using Gemini fallback');
        }

        console.log('Calling aiService.generateText...');
        const response = await aiService.generateText(prompt, systemPrompt, model, apiKey);
        console.log('Generation successful, response length:', response?.length);

        // Increment AI generation counter if user is authenticated
        if (req.user?.id) {
            await incrementAIGeneration(req.user.id);
        }

        res.json({ text: response });
    } catch (error: any) {
        console.error('=== AI Generate Error ===');
        // Prevent circular structure limit
        const safeError = {
            message: error?.message || 'Unknown error',
            name: error?.name || 'Error',
            stack: error?.stack,
            ...error // Spread any other properties like 'response' or 'status'
        };
        console.error('Error detail:', JSON.stringify(safeError, null, 2));
        logErrorToFile(safeError);

        // Attempt to extract specific Google API error details
        const details = error?.response?.data || error?.message || 'Unknown';

        res.status(500).json({
            message: 'Generation failed',
            error: safeError.message,
            details: details
        });
    }
};

export const generateJSON = async (req: AuthRequest, res: Response) => {
    try {
        const { prompt, systemPrompt, provider, model, apiKey } = req.body;
        const response = await aiService.generateJSON(prompt, systemPrompt, model, apiKey);

        // Increment AI generation counter if user is authenticated
        if (req.user?.id) {
            await incrementAIGeneration(req.user.id);
        }

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'JSON Generation failed', error: (error as Error).message });
    }
};

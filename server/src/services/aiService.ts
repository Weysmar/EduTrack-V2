import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
// Note: In a real app, you might want to instantiate this per request if using User's Key
// For now, we use server env key OR pass key from request
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const aiService = {
    async generateText(prompt: string, systemPrompt?: string, model: string = 'gemini-1.5-flash', apiKey?: string): Promise<string> {
        try {
            // Validate API key
            const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
            if (!effectiveKey) {
                throw new Error('No API key provided. Please configure your Google Gemini API key in Settings.');
            }

            const client = new GoogleGenerativeAI(effectiveKey);
            const modelInstance = client.getGenerativeModel({ model });

            // Combine system prompt if model doesn't support it directly (Gemini 1.5 supports systemInstruction)
            // But for simple compat:
            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Request:\n${prompt}` : prompt;

            const result = await modelInstance.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error('AI Generation Error:', error);
            // Return more helpful error message
            const message = error.message || 'Failed to generate content from AI';
            throw new Error(message);
        }
    },

    async generateJSON(prompt: string, systemPrompt?: string, model: string = 'gemini-1.5-flash', apiKey?: string): Promise<any> {
        try {
            const text = await this.generateText(prompt, systemPrompt + "\nIMPORTANT: Output valid JSON only.", model, apiKey);
            // Clean markdown code blocks if present
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonStart = cleanText.indexOf('{');
            const jsonEnd = cleanText.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");

            return JSON.parse(cleanText.substring(jsonStart, jsonEnd + 1));
        } catch (error) {
            console.error('AI JSON Generation Error:', error);
            throw new Error('Failed to generate JSON from AI');
        }
    }
};

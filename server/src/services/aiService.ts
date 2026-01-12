import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
// Note: In a real app, you might want to instantiate this per request if using User's Key
// For now, we use server env key OR pass key from request
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const aiService = {
    async generateText(prompt: string, systemPrompt?: string, model: string = 'gemini-1.5-flash', apiKey?: string, provider: 'google' | 'perplexity' = 'google'): Promise<string> {
        if (provider === 'perplexity') {
            const effectiveKey = apiKey || process.env.PERPLEXITY_API_KEY;
            if (!effectiveKey) throw new Error('No Perplexity API key provided.');

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${effectiveKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model.includes('gemini') ? 'llama-3.1-sonar-small-128k-online' : model,
                    messages: [
                        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Perplexity API Error: ${response.status} - ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        }

        try {
            // Validate API key
            const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
            if (!effectiveKey) {
                throw new Error('No API key provided. Please configure your Google Gemini API key in Settings.');
            }

            // Combine system prompt if model doesn't support it directly (Gemini 1.5 supports systemInstruction)
            // But for simple compat:
            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Request:\n${prompt}` : prompt;

            // Perform basic validation
            if (!fullPrompt || fullPrompt.length === 0) {
                throw new Error('Prompt is empty');
            }
            console.log(`[AI Service] Generating text with model ${model}. Prompt length: ${fullPrompt.length} chars. Key contents: ${effectiveKey.substring(0, 4)}...`);

            const client = new GoogleGenerativeAI(effectiveKey);
            // Use specific model version for stability or catch 404
            const modelInstance = client.getGenerativeModel({
                model
            }, {
                timeout: 120000 // 2 minutes timeout for large PDFs
            });

            // Combine system prompt if model doesn't support it directly (Gemini 1.5 supports systemInstruction)
            // But for simple compat:
            // MOVED UP

            const result = await modelInstance.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            console.error('AI Generation Error Service:', error);
            // Return more helpful error message
            let message = error.message || 'Failed to generate content from AI';
            if (message.includes('404') && message.includes('find')) {
                message = `Modèle IA introuvable ou indisponible (${model}). Vérifiez votre clé API ou changez de modèle.`;
            }
            if (message.includes('401') || message.includes('API key')) {
                message = `Clé API Gemini invalide.`;
            }
            throw new Error(message);
        }
    },

    async generateJSON(prompt: string, systemPrompt?: string, model: string = 'gemini-1.5-flash', apiKey?: string, provider: 'google' | 'perplexity' = 'google'): Promise<any> {
        if (provider === 'perplexity') {
            const text = await this.generateText(prompt, systemPrompt + " Output strictly valid JSON.", model, apiKey, 'perplexity');
            // Clean markdown json blocks if present
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText);
        }

        try {
            const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
            if (!effectiveKey) {
                throw new Error('No API key provided. Please configure your Google Gemini API key in Settings.');
            }

            const client = new GoogleGenerativeAI(effectiveKey);
            const modelInstance = client.getGenerativeModel({
                model,
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Request:\n${prompt}` : prompt;
            const result = await modelInstance.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text);
        } catch (error: any) {
            console.error('AI JSON Generation Error Stack:', error);

            // Try to extract a useful message
            let message = error.message || 'Failed to generate JSON from AI';
            if (message.includes('404')) message = `Modèle IA indisponible (${model})`;
            if (message.includes('401')) message = `Clé API Gemini invalide`;
            if (message.includes('Safety')) message = `L'IA a bloqué la réponse pour des raisons de sécurité.`;

            throw new Error(`AI JSON Error: ${message}`);
        }
    }
};

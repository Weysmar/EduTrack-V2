import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini
// Note: In a real app, you might want to instantiate this per request if using User's Key
// For now, we use server env key OR pass key from request
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Map friendly model names to their actual API versions
const mapModelName = (model: string): string => {
    const modelMap: Record<string, string> = {
        // Stable models (2026)
        'gemini-1.5-flash': 'gemini-2.5-flash',
        'gemini-1.5-pro': 'gemini-2.5-pro',
        'gemini-2.0-flash': 'gemini-2.5-flash',
        'gemini-2.5-flash': 'gemini-2.5-flash',
        'gemini-2.5-pro': 'gemini-2.5-pro',

        // Perplexity mappings
        'sonar-pro': 'sonar-pro',
        'sonar': 'sonar',
        'sonar-reasoning': 'sonar-reasoning'
    };
    return modelMap[model] || model;
};

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
                    model: model.includes('gemini') ? 'llama-3.1-sonar-large-128k-online' : model,
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
            const apiModel = mapModelName(model);
            console.log(`[AI Service] Generating text with model ${model} (API: ${apiModel}). Prompt length: ${fullPrompt.length} chars. Key contents: ${effectiveKey.substring(0, 4)}...`);

            const client = new GoogleGenerativeAI(effectiveKey);
            // Use specific model version for stability or catch 404
            const modelInstance = client.getGenerativeModel({
                model: apiModel,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
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

            // Map model name
            const apiModel = mapModelName(model);
            console.log(`[AI JSON] Generating with model ${model} -> ${apiModel}`);

            const client = new GoogleGenerativeAI(effectiveKey);
            const modelInstance = client.getGenerativeModel({
                model: apiModel,
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            // For JSON mode, we don't strictly need system prompt in the way text mode does, 
            // but Gemini 1.5 supports systemInstruction. 
            // We'll combine it for compatibility.
            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nIMPORTANT: Output strictly JSON.\n\nUser Request:\n${prompt}` : `${prompt}\n\nOutput strictly JSON.`;

            const result = await modelInstance.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            try {
                return JSON.parse(text);
            } catch (jsonError) {
                console.error("JSON Parse Error on raw text:", text);
                // Fallback: try to extract JSON markdown block
                const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleanText);
            }
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

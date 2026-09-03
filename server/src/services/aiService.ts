import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Multi-user architecture: Each user provides their own API key (BYOK)
// Keys are passed per-request from the user's saved profile settings.

// Map friendly model names to their actual API versions
const mapModelName = (model: string): string => {
    const modelMap: Record<string, string> = {
        // Google Gemini 3 series official API model IDs
        'gemini-3.8-flash': 'gemini-3.8-flash',
        'gemini-3.8': 'gemini-3.8-flash',
        'gemini-3.7-flash': 'gemini-3.7-flash',
        'gemini-3.7': 'gemini-3.7-flash',
        'gemini-3.7-thinking': 'gemini-3.7-flash',
        'gemini-3.1-pro': 'gemini-3.1-pro',
        'gemini-3.8-pro': 'gemini-3.1-pro', // Safe alias to premier reasoning model
        'gemini-3.7-pro': 'gemini-3.1-pro', // Safe alias to premier reasoning model

        // Perplexity mappings
        'sonar-pro': 'sonar-pro',
        'sonar': 'sonar',
        'sonar-reasoning': 'sonar-reasoning',
        'sonar-reasoning-pro': 'sonar-reasoning-pro',
        'sonar-deep-research': 'sonar-deep-research',
        'llama-3.1-sonar-small-128k-online': 'sonar',
        'llama-3.1-sonar-large-128k-online': 'sonar-pro',
        'llama-3.1-sonar-huge-128k-online': 'sonar-reasoning'
    };
    return modelMap[model] || model || 'gemini-3.7-flash';
};

export const aiService = {
    async generateText(prompt: string, systemPrompt?: string, model: string = 'gemini-3.8-flash', apiKey?: string, provider: 'google' | 'perplexity' = 'google'): Promise<string> {
        const effectiveKey = apiKey ? apiKey.trim() : undefined;

        if (provider === 'perplexity') {
            if (!effectiveKey) throw new Error('Aucune clé API Perplexity fournie. Veuillez configurer votre clé dans Profil > Paramètres > Clés API.');

            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${effectiveKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: mapModelName(model),
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
            // Validate per-user API key (BYOK architecture)
            if (!effectiveKey) {
                throw new Error('Aucune clé API Google Gemini fournie. Veuillez renseigner votre clé personnelle dans Profil > Paramètres > Clés API.');
            }

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Request:\n${prompt}` : prompt;

            if (!fullPrompt || fullPrompt.length === 0) {
                throw new Error('Prompt is empty');
            }

            const MAX_PROMPT_LENGTH = 50000;
            if (fullPrompt.length > MAX_PROMPT_LENGTH) {
                throw new Error(
                    `Le contenu est trop volumineux (${fullPrompt.length} caractères). ` +
                    `Limite: ${MAX_PROMPT_LENGTH} caractères. ` +
                    `Veuillez réduire la taille du document ou sélectionner moins de contenu.`
                );
            }
            const apiModel = mapModelName(model);
            console.log(`[AI Service] Generating text with model ${model} (API: ${apiModel}). Prompt length: ${fullPrompt.length} chars.`);

            const client = new GoogleGenerativeAI(effectiveKey);

            // Cascading candidate models: prioritize requested model, then stable 3.7-flash, 3.8-flash, 3.1-pro
            const candidateModels = [apiModel, 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.1-pro'].filter((m, i, arr) => arr.indexOf(m) === i);
            let response;
            let lastErr: any;

            for (const tryModel of candidateModels) {
                try {
                    const modelInstance = client.getGenerativeModel({
                        model: tryModel,
                        safetySettings: [
                            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
                        ]
                    }, {
                        timeout: 90000 // 90 seconds timeout for comprehensive summaries
                    });

                    const result = await modelInstance.generateContent(fullPrompt);
                    response = await result.response;
                    if (tryModel !== apiModel) {
                        console.log(`[AI Service] Fallback succeeded with model: ${tryModel}`);
                    }
                    break;
                } catch (modelErr: any) {
                    lastErr = modelErr;
                    const msg = modelErr.message || '';
                    const isTransientOrUnavailable = 
                        msg.includes('404') || msg.includes('not found') || msg.includes('no longer available') ||
                        msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded') ||
                        msg.includes('504') || msg.includes('timeout') || msg.includes('TIMEDOUT') ||
                        msg.includes('aborted') || msg.includes('Abort') ||
                        msg.includes('429') || msg.includes('Resource has been exhausted');

                    if (isTransientOrUnavailable) {
                        console.warn(`[AI Service] Model ${tryModel} unavailable or overloaded (${msg.substring(0, 120)}), switching immediately to next candidate...`);
                        continue;
                    }
                    throw modelErr;
                }
            }

            if (!response) throw lastErr;
            return response.text();
        } catch (error: any) {
            console.error('AI Generation Error Service:', error);
            let message = error.message || 'Failed to generate content from AI';
            if (message.includes('aborted') || message.includes('Abort') || message.includes('timeout') || message.includes('TIMEDOUT')) {
                message = `Le modèle IA a mis trop de temps à répondre (délai dépassé). Veuillez réessayer avec Gemini 3.7 Flash ou réduire la sélection.`;
            }
            if (message.includes('404') && message.includes('find')) {
                message = `Modèle IA introuvable ou indisponible (${model}). Vérifiez votre clé API ou changez de modèle.`;
            }
            if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || (message.includes('401') && message.includes('API key'))) {
                message = `Clé API Gemini invalide. Veuillez vérifier votre clé personnelle dans Profil > Paramètres > Clés API.`;
            }
            if (message.includes('503') || message.includes('high demand') || message.includes('overloaded')) {
                message = `Modèle IA temporairement surchargé chez Google. Veuillez réessayer avec Gemini 3.7 Flash.`;
            }
            if (message.includes('429') || message.includes('Quota')) {
                message = `Quota d'IA dépassé. Veuillez patienter une minute ou changer de modèle.`;
            }
            throw new Error(message);
        }
    },

    async generateJSON(prompt: string, systemPrompt?: string, model: string = 'gemini-3.7-flash', apiKey?: string, provider: 'google' | 'perplexity' = 'google'): Promise<any> {
        const effectiveKey = apiKey ? apiKey.trim() : undefined;

        if (provider === 'perplexity') {
            const text = await this.generateText(prompt, systemPrompt + " Output strictly valid JSON.", model, effectiveKey, 'perplexity');
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText);
        }

        try {
            if (!effectiveKey) {
                throw new Error('Aucune clé API Google Gemini fournie. Veuillez renseigner votre clé personnelle dans Profil > Paramètres > Clés API.');
            }

            const apiModel = mapModelName(model);
            console.log(`[AI JSON] Generating with model ${model} -> ${apiModel}`);

            const client = new GoogleGenerativeAI(effectiveKey);
            const candidateModels = [apiModel, 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.1-pro'].filter((m, i, arr) => arr.indexOf(m) === i);

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nIMPORTANT: Output strictly JSON.\n\nUser Request:\n${prompt}` : `${prompt}\n\nOutput strictly JSON.`;

            const MAX_PROMPT_LENGTH = 50000;
            if (fullPrompt.length > MAX_PROMPT_LENGTH) {
                throw new Error(
                    `Le contenu est trop volumineux (${fullPrompt.length} caractères). ` +
                    `Limite: ${MAX_PROMPT_LENGTH} caractères. ` +
                    `Veuillez réduire la taille du document ou sélectionner moins de contenu.`
                );
            }

            let text = "";
            let lastError: any;

            for (const tryModel of candidateModels) {
                const modelInstance = client.getGenerativeModel({
                    model: tryModel,
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                }, {
                    timeout: 90000 // 90s per model for large inputs
                });

                try {
                    const result = await modelInstance.generateContent(fullPrompt);
                    const response = await result.response;
                    text = response.text();
                    if (tryModel !== apiModel) {
                        console.log(`[AI JSON] Fallback succeeded with model: ${tryModel}`);
                    }
                    break;
                } catch (error: any) {
                    lastError = error;
                    const msg = error.message || '';
                    const isTransientOrUnavailable = 
                        msg.includes('404') || msg.includes('not found') || 
                        msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded') ||
                        msg.includes('504') || msg.includes('timeout') || msg.includes('TIMEDOUT') ||
                        msg.includes('aborted') || msg.includes('Abort') ||
                        msg.includes('429') || msg.includes('Resource has been exhausted');

                    if (isTransientOrUnavailable) {
                        console.warn(`[AI JSON] Model ${tryModel} error (${msg.substring(0, 120)}), switching immediately to next candidate...`);
                        continue; // Immediately try next model in candidateModels
                    }
                    throw error;
                }
            }

            if (!text && lastError) throw lastError;

            try {
                return JSON.parse(text);
            } catch (jsonError) {
                console.error("JSON Parse Error on raw text:", text);
                const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleanText);
            }
        } catch (error: any) {
            console.error('AI JSON Generation Error Stack:', error);

            let message = error.message || 'Failed to generate JSON from AI';
            if (message.includes('404')) message = `Modèle IA indisponible (${model})`;
            if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || (message.includes('401') && message.includes('API key'))) {
                message = `Clé API Gemini invalide. Veuillez vérifier votre clé personnelle dans Profil > Paramètres > Clés API.`;
            }
            if (message.includes('Safety')) message = `L'IA a bloqué la réponse pour des raisons de sécurité.`;
            if (message.includes('429') || message.includes('Quota')) message = `Quota d'IA dépassé. Veuillez patienter une minute.`;

            throw new Error(`AI JSON Error: ${message}`);
        }
    }
};

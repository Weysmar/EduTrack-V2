import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { resolveModelId, getFallbackChain, checkContextFit, validateFileModelCompatibility, FileCategory } from '../config/aiModels';

// Multi-user architecture: Each user provides their own API key (BYOK)
// Keys are passed per-request from the user's saved profile settings.
// Model name resolution and fallback chains are managed by ../config/aiModels.ts.

const PERPLEXITY_TIMEOUT_MS = 120000;
const PERPLEXITY_MAX_ATTEMPTS = 3;

/**
 * Appelle l'API Perplexity (/chat/completions) avec timeout et retry sur erreurs transitoires.
 *
 * Note : cet endpoint est en cours de dépréciation douce par Perplexity au profit d'une
 * nouvelle "Agent API" (POST /v1/agent, schéma requête/réponse différent : preset au lieu
 * de model, input au lieu de messages, sortie dans output[].content[].text). Au 2026-09,
 * Perplexity confirme que les requêtes synchrones/streaming existantes continuent de
 * fonctionner (réécrites en interne vers l'Agent API), donc on garde ce chemin — un
 * changement d'endpoint à l'aveugle risquerait de casser la génération pour un gain nul
 * tant que le mapping exact modèle→preset et le mode JSON strict de la nouvelle API ne sont
 * pas confirmés pour nos besoins (generateJSON).
 */
async function callPerplexity(
    apiKey: string,
    apiModel: string,
    systemPrompt: string | undefined,
    userPrompt: string
): Promise<any> {
    let lastError: any;

    for (let attempt = 1; attempt <= PERPLEXITY_MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PERPLEXITY_TIMEOUT_MS);

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: apiModel,
                    messages: [
                        { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
                        { role: 'user', content: userPrompt }
                    ]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                const isTransient = response.status === 429 || response.status === 503 || response.status >= 500;
                lastError = new Error(`Perplexity API Error: ${response.status} - ${errorText}`);
                if (isTransient && attempt < PERPLEXITY_MAX_ATTEMPTS) {
                    const delayMs = attempt * 1200;
                    console.warn(`[AI Service] Perplexity ${response.status} (attempt ${attempt}/${PERPLEXITY_MAX_ATTEMPTS}). Retrying in ${delayMs}ms...`);
                    await new Promise(res => setTimeout(res, delayMs));
                    continue;
                }
                throw lastError;
            }

            return await response.json();
        } catch (err: any) {
            clearTimeout(timeoutId);
            const isAbort = err.name === 'AbortError';
            lastError = isAbort ? new Error('Perplexity API Error: timeout - La requête a dépassé le délai imparti.') : err;

            if (isAbort && attempt < PERPLEXITY_MAX_ATTEMPTS) {
                const delayMs = attempt * 1200;
                console.warn(`[AI Service] Perplexity timeout (attempt ${attempt}/${PERPLEXITY_MAX_ATTEMPTS}). Retrying in ${delayMs}ms...`);
                await new Promise(res => setTimeout(res, delayMs));
                continue;
            }
            throw lastError;
        }
    }

    throw lastError;
}

export const aiService = {
    async generateText(
        prompt: string,
        systemPrompt?: string,
        model: string = 'gemini-3.7-flash',
        apiKey?: string,
        provider: 'google' | 'perplexity' = 'google',
        fileCategory?: FileCategory
    ): Promise<string> {
        const effectiveKey = apiKey ? apiKey.trim() : undefined;
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\nUser Request:\n${prompt}` : prompt;

        if (!fullPrompt || fullPrompt.trim().length === 0) {
            throw new Error('Prompt is empty');
        }

        const apiModel = resolveModelId(model);

        // Validation de la compatibilité fichier ↔ modèle
        if (fileCategory) {
            const compat = validateFileModelCompatibility(fileCategory, apiModel);
            if (!compat.compatible && compat.warning) {
                console.warn(`[AI Service] File compatibility notice: ${compat.warning}`);
            }
        }

        // Vérification de la capacité de contexte basée sur les tokens estimés du registre (couvre Google et Perplexity)
        const contextCheck = checkContextFit(fullPrompt.length, apiModel);
        if (!contextCheck.fits) {
            throw new Error(contextCheck.warning!);
        }

        try {
            if (provider === 'perplexity') {
                if (!effectiveKey) throw new Error('Aucune clé API Perplexity fournie. Veuillez configurer votre clé dans Profil > Paramètres > Clés API.');

                console.log(`[AI Service] Generating text with Perplexity model ${model} (API: ${apiModel}). Prompt length: ${fullPrompt.length} chars (~${contextCheck.estimatedTokens} tokens).`);

                const data = await callPerplexity(effectiveKey, apiModel, systemPrompt, prompt);
                return data.choices[0].message.content;
            }
            // Validate per-user API key (BYOK architecture)
            if (!effectiveKey) {
                throw new Error('Aucune clé API Google Gemini fournie. Veuillez renseigner votre clé personnelle dans Profil > Paramètres > Clés API.');
            }

            console.log(`[AI Service] Generating text with model ${model} (API: ${apiModel}). Prompt length: ${fullPrompt.length} chars (~${contextCheck.estimatedTokens} tokens).`);

            const client = new GoogleGenerativeAI(effectiveKey);

            const candidateModels = getFallbackChain(apiModel);
            let response;
            let lastErr: any;

            for (const tryModel of candidateModels) {
                const modelInstance = client.getGenerativeModel({
                    model: tryModel,
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE }
                    ]
                }, {
                    timeout: 240000 // 240 seconds timeout for comprehensive summaries / exercises
                });

                const MAX_ATTEMPTS = 3;
                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                    try {
                        const result = await modelInstance.generateContent(fullPrompt);
                        response = await result.response;
                        if (tryModel !== apiModel) {
                            console.log(`[AI Service] Fallback succeeded with model: ${tryModel}`);
                        }
                        break;
                    } catch (modelErr: any) {
                        lastErr = modelErr;
                        const msg = modelErr.message || '';
                        const isOverloaded = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded');

                        if (isOverloaded && attempt < MAX_ATTEMPTS) {
                            const delayMs = attempt * 1200;
                            console.warn(`[AI Service] Model ${tryModel} overloaded (503). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})...`);
                            await new Promise(res => setTimeout(res, delayMs));
                            continue;
                        }

                        const isTransientOrUnavailable = 
                            msg.includes('404') || msg.includes('not found') || msg.includes('no longer available') ||
                            isOverloaded ||
                            msg.includes('504') || msg.includes('timeout') || msg.includes('TIMEDOUT') ||
                            msg.includes('aborted') || msg.includes('Abort') ||
                            msg.includes('429') || msg.includes('Resource has been exhausted');

                        if (isTransientOrUnavailable) {
                            console.warn(`[AI Service] Model ${tryModel} unavailable or overloaded (${msg.substring(0, 100)}), switching immediately to next candidate...`);
                            break;
                        }
                        throw modelErr;
                    }
                }
                if (response) break;
            }

            if (!response) throw lastErr;
            return response.text();
        } catch (error: any) {
            console.error('AI Generation Error Service:', error);
            let message = error.message || 'Failed to generate content from AI';
            if (message.includes('aborted') || message.includes('Abort') || message.includes('timeout') || message.includes('TIMEDOUT')) {
                message = `Le modèle IA a mis trop de temps à répondre (délai dépassé). Veuillez réessayer ou réduire la sélection.`;
            }
            if (message.includes('404') && message.includes('find')) {
                message = `Modèle IA temporairement indisponible. Veuillez réessayer dans un instant ou changer de modèle dans les paramètres.`;
            }
            if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || (message.includes('401') && message.includes('API key'))) {
                message = `Clé API invalide. Veuillez vérifier votre clé personnelle dans Profil > Paramètres > Clés API.`;
            }
            if (message.includes('503') || message.includes('high demand') || message.includes('overloaded')) {
                message = `Les serveurs IA sont temporairement surchargés (503). Veuillez réessayer dans quelques instants.`;
            }
            if (message.includes('429') || message.includes('Quota')) {
                message = `Quota IA dépassé. Veuillez patienter une minute ou changer de clé/fournisseur dans les paramètres.`;
            }
            throw new Error(message);
        }
    },

    async generateJSON(
        prompt: string,
        systemPrompt?: string,
        model: string = 'gemini-3.7-flash',
        apiKey?: string,
        provider: 'google' | 'perplexity' = 'google',
        fileCategory?: FileCategory
    ): Promise<any> {
        const effectiveKey = apiKey ? apiKey.trim() : undefined;

        if (provider === 'perplexity') {
            const text = await this.generateText(prompt, (systemPrompt || '') + " Output strictly valid JSON.", model, effectiveKey, 'perplexity', fileCategory);
            const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanText);
        }

        try {
            if (!effectiveKey) {
                throw new Error('Aucune clé API Google Gemini fournie. Veuillez renseigner votre clé personnelle dans Profil > Paramètres > Clés API.');
            }

            const apiModel = resolveModelId(model);
            console.log(`[AI JSON] Generating with model ${model} -> ${apiModel}`);

            // Validation de la compatibilité fichier ↔ modèle
            if (fileCategory) {
                const compat = validateFileModelCompatibility(fileCategory, apiModel);
                if (!compat.compatible && compat.warning) {
                    console.warn(`[AI JSON] File compatibility notice: ${compat.warning}`);
                }
            }

            const client = new GoogleGenerativeAI(effectiveKey);
            const candidateModels = getFallbackChain(apiModel);

            const fullPrompt = systemPrompt ? `${systemPrompt}\n\nIMPORTANT: Output strictly JSON.\n\nUser Request:\n${prompt}` : `${prompt}\n\nOutput strictly JSON.`;

            // Vérification de la capacité de contexte basée sur les tokens estimés du registre
            const contextCheck = checkContextFit(fullPrompt.length, apiModel);
            if (!contextCheck.fits) {
                throw new Error(contextCheck.warning!);
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
                    timeout: 240000 // 240s per model for large inputs and complex schemas
                });

                const MAX_ATTEMPTS = 3;
                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
                        const isOverloaded = msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand') || msg.includes('overloaded');

                        if (isOverloaded && attempt < MAX_ATTEMPTS) {
                            const delayMs = attempt * 1200;
                            console.warn(`[AI JSON] Model ${tryModel} overloaded (503). Retrying in ${delayMs}ms (attempt ${attempt}/${MAX_ATTEMPTS})...`);
                            await new Promise(res => setTimeout(res, delayMs));
                            continue;
                        }

                        const isTransientOrUnavailable = 
                            msg.includes('404') || msg.includes('not found') || 
                            isOverloaded ||
                            msg.includes('504') || msg.includes('timeout') || msg.includes('TIMEDOUT') ||
                            msg.includes('aborted') || msg.includes('Abort') ||
                            msg.includes('429') || msg.includes('Resource has been exhausted');

                        if (isTransientOrUnavailable) {
                            console.warn(`[AI JSON] Model ${tryModel} error (${msg.substring(0, 100)}), switching immediately to next candidate...`);
                            break;
                        }
                        throw error;
                    }
                }
                if (text) break;
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
            if (message.includes('404')) message = `Modèle IA temporairement indisponible. Veuillez réessayer dans un instant ou changer de modèle dans les paramètres.`;
            if (message.includes('API_KEY_INVALID') || message.includes('API key not valid') || (message.includes('401') && message.includes('API key'))) {
                message = `Clé API invalide. Veuillez vérifier votre clé personnelle dans Profil > Paramètres > Clés API.`;
            }
            if (message.includes('Safety')) message = `L'IA a bloqué la réponse pour des raisons de sécurité.`;
            if (message.includes('503') || message.includes('high demand') || message.includes('overloaded')) {
                message = `Les serveurs IA sont temporairement surchargés (503). Veuillez réessayer dans quelques instants.`;
            }
            if (message.includes('429') || message.includes('Quota')) message = `Quota IA dépassé. Veuillez patienter une minute.`;

            throw new Error(`AI JSON Error: ${message}`);
        }
    }
};

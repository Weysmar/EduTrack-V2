
import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";

export interface GoogleGeminiOptions {
    compressionLevel: '20' | '30' | '40' | '50';
    model?: string;
}

export class GoogleGeminiService {

    private static getCompressionInstruction(level: string): string {
        switch (level) {
            case '20': return "VOLUME CIBLE : 15-20% du texte original. CONCISION EXTRÊME (Style synthèse VIP).";
            case '30': return "VOLUME CIBLE : 30% du texte original. COURT (Focus concepts majeurs).";
            case '40': return "VOLUME CIBLE : 40-45% du texte original. ÉQUILIBRÉ (Recommandé).";
            case '50': return "VOLUME CIBLE : 55-60% du texte original. DÉTAILLÉ (Exhaustif).";
            default: return "VOLUME CIBLE : 40%.";
        }
    }

    private static getFormatInstruction(format: string): string {
        switch (format) {
            case 'bullets': return "Format: Points clés hiérarchisés.";
            case 'paragraph': return "Format: Paragraphes fluides et narratifs.";
            case 'timeline': return "Format: Chronologie avec dates extraites.";
            case 'outline': return "Format: Structure arborescente indentée (Outline).";
            case 'mindmap': return "Format: JSON pur compatible MindMap pour export.";
            default: return "Format: Points clés.";
        }
    }

    static async generateSummary(text: string, options: SummaryOptions, geminiOptions: GoogleGeminiOptions): Promise<string> {
        // GET KEY FROM STORE
        const API_KEY = useProfileStore.getState().getApiKey('google_gemini_summaries');

        if (!API_KEY) {
            throw new Error("Clé API Google Gemini (Résumés) manquante. Veuillez l'ajouter dans les paramètres du profil.");
        }

        const systemPrompt = `Tu es un expert en synthèse académique structurée et pédagogique.
Ton objectif est de produire des résumés PROFESSIONNELS, LISIBLES et PRÊTS À L'EMPLOI pour des étudiants.

RÈGLES DE FORMATAGE STRICTES (Respecter scrupuleusement pur Export Word/PDF) :

1.  **HIÉRARCHIE VISUELLE CLAIRE** :
    -   Utilise uniquement les niveaux de titre Markdown : # (Titre Principal), ## (Sections), ### (Sous-sections).
    -   Ne jamais dépasser 3 niveaux de profondeur.
    -   Ajoute des sauts de ligne clairs entre les sections.

2.  **STRUCTURE PAR BULLET POINTS** :
    -   Privilégie les listes à puces (•) pour la lisibilité.
    -   Chaque point doit être concis (1-2 lignes max).
    -   Évite les blocs de texte denses (> 3 lignes).
    -   Utilise l'indentation pour les sous-détails (◦).

3.  **FORMULES & DONNÉES (CRITIQUE)** :
    -   Les formules mathématiques DOIVENT être **encadrées** par des doubles dollars : $$ E = mc^2 $$ (pour un affichage centré).
    -   Les nombres, dates et pourcentages doivent être préservés exactement et mis en valeur (ex: **24 heures**, **60%**, **2024-2026**).

4.  **STYLE & TON** :
    -   Français académique impeccable.
    -   Neutre, objectif, synthétique.
    -   Verbes d'action.
    
5.  **CONTRAINTE DE VOLUME (CRITIQUE)** :
    -   Tu dois respecter STRICTEMENT le volume cible demandé ci-dessous.
    -   Si on demande 20%, le résumé final ne doit pas dépasser 25% de la taille du texte source.
    -   Ne rallonge JAMAIS pour 'faire joli'. Chaque mot doit être utile.

INSTRUCTIONS DE CONTENU :
-   Compression : ${this.getCompressionInstruction(geminiOptions.compressionLevel)}
-   ${this.getFormatInstruction(options.format)}
-   Vérifie qu'aucun caractère Markdown brut (#, *) ne reste visible s'il n'est pas interprété par le rendu final.
`;

        const modelsToTry = geminiOptions.model
            ? [geminiOptions.model]
            : [
                'gemini-2.0-flash',
                'gemini-2.5-flash',
                'gemini-flash-latest',
                'gemini-pro-latest',
                'gemini-2.0-flash-lite'
            ];

        let errors: string[] = [];

        for (const model of modelsToTry) {
            let attempt = 0;
            const maxAttempts = 3;

            while (attempt < maxAttempts) {
                try {
                    const apiVersion = 'v1';
                    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${API_KEY}`;

                    if (attempt === 0) console.log(`[Gemini-AutoFix] Fetching: ${url}`);
                    else console.log(`[Gemini-AutoFix] Retry attempt ${attempt}/${maxAttempts} for ${model}...`);

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            contents: [
                                {
                                    parts: [
                                        { text: systemPrompt + "\n\nVoici le texte à résumer :\n" + text }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 8192,
                            }
                        })
                    });

                    if (response.status === 429) {
                        attempt++;
                        const errorData = await response.json().catch(() => ({}));
                        const errorMessage = errorData.error?.message || await response.text();
                        console.warn(`[Gemini-AutoFix] Quota exceeded for ${model} (Attempt ${attempt}). Details: ${errorMessage}`);

                        if (attempt >= maxAttempts) {
                            errors.push(`${model}: Quota exceeded after ${maxAttempts} retries`);
                            break; // Exit retry loop, try next model
                        }

                        // Extract wait time OR default to 10s
                        let waitTime = 10;
                        const match = errorMessage.match(/retry in\s+([0-9.]+)\s*s/);
                        if (match && match[1]) {
                            waitTime = Math.ceil(parseFloat(match[1]));
                        }

                        // Safety cap for wait time (e.g. don't wait more than 120s automatically)
                        if (waitTime > 120) waitTime = 120;

                        console.log(`[Gemini-AutoFix] Waiting ${waitTime}s before retry...`);
                        await new Promise(resolve => setTimeout(resolve, (waitTime + 2) * 1000));
                        continue; // Retry loop
                    }

                    if (!response.ok) {
                        const errorData = await response.json();
                        const errorMessage = errorData.error?.message || response.statusText;
                        console.warn(`[Gemini-AutoFix] Model ${model} failed: ${errorMessage}`);
                        errors.push(`${model}: ${errorMessage}`);
                        break; // Fatal error for this model, try next model
                    }

                    const data = await response.json();
                    const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (result) {
                        console.log(`[Gemini-AutoFix] Success with model: ${model}`);
                        return result;
                    }

                    errors.push(`${model}: No content returned`);
                    break; // No content, try next model

                } catch (error: any) {
                    console.error(`[Gemini-AutoFix] Critical error with ${model}:`, error);
                    errors.push(`${model}: ${error.message}`);
                    break; // Exception, try next model
                }
            }
        }

        // Final breakdown
        throw new Error(`[FINAL_TRY_FAILED] All models rejected the request. Details: ${errors.join(' | ')}`);
    }
}

export async function generateWithGoogle(prompt: string, systemPrompt?: string, model?: string): Promise<string> {
    const API_KEY = useProfileStore.getState().getApiKey('google_gemini_exercises');

    if (!API_KEY) {
        throw new Error("Clé API Google Gemini (Exercices) manquante.");
    }

    const finalPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const modelsToTry = model
        ? [model]
        : [
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-pro-latest'
        ];

    let errors: string[] = [];

    for (const model of modelsToTry) {
        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
            try {
                const apiVersion = 'v1';
                const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${API_KEY}`;

                if (attempt === 0) console.log(`[Gemini-AutoFix] Fetching (Exercise): ${url}`);
                else console.log(`[Gemini-AutoFix] Retry attempt ${attempt}/${maxAttempts} (Exercise) for ${model}...`);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { text: finalPrompt }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 8192,
                        }
                    })
                });

                if (response.status === 429) {
                    attempt++;
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error?.message || await response.text();
                    console.warn(`[Gemini-AutoFix] Quota exceeded for ${model}. Details: ${errorMessage}`);

                    if (attempt >= maxAttempts) {
                        errors.push(`${model}: Quota exceeded after ${maxAttempts} retries`);
                        break;
                    }

                    // Extract wait time OR default to 10s
                    let waitTime = 10;
                    const match = errorMessage.match(/retry in\s+([0-9.]+)\s*s/);
                    if (match && match[1]) {
                        waitTime = Math.ceil(parseFloat(match[1]));
                    }

                    if (waitTime > 120) waitTime = 120; // Cap at 2 mins

                    console.log(`[Gemini-AutoFix] Waiting ${waitTime}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, (waitTime + 2) * 1000)); // +2s buffer
                    continue;
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMessage = errorData.error?.message || response.statusText;
                    console.warn(`[Gemini-AutoFix] Model ${model} failed (Exercise): ${errorMessage}`);
                    errors.push(`${model}: ${errorMessage}`);
                    break;
                }

                const data = await response.json();
                const result = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (result) {
                    console.log(`[Gemini-AutoFix] Success (Exercise) with model: ${model}`);
                    return result;
                }

                errors.push(`${model}: No content returned`);
                break;

            } catch (error: any) {
                console.error(`[Gemini-AutoFix] Critical error (Exercise) with ${model}:`, error);
                errors.push(`${model}: ${error.message}`);
                break;
            }
        }
    }

    throw new Error(`[FINAL_TRY_FAILED] All models rejected the request. Details: ${errors.join(' | ')}`);
}

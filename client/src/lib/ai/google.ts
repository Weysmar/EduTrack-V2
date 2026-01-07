
import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";
import { useAuthStore } from "@/store/authStore";
import { apiClient } from "@/lib/api/client";

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
        const API_KEY = useProfileStore.getState().getApiKey('google_gemini_summaries');

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

        const model = geminiOptions.model || 'gemini-1.5-flash';

        try {
            const { data } = await apiClient.post('/ai/generate', {
                prompt: text,
                systemPrompt: systemPrompt,
                provider: 'google',
                model: model,
                apiKey: API_KEY
            });

            return data.text;

        } catch (error: any) {
            console.error("Gemini Backend Error:", error);

            // Handle Axios error structure
            const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";

            if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('Too Many Requests')) {
                throw new Error("Quota Google AI dépassé. Veuillez changer de modèle (utilisez Gemini 1.5 Flash) ou réessayer plus tard.");
            }

            throw error;
        }
    }
}

export async function generateWithGoogle(prompt: string, systemPrompt?: string, model?: string): Promise<string> {
    const API_KEY = useProfileStore.getState().getApiKey('google_gemini_exercises');

    try {
        const { data } = await apiClient.post('/ai/generate', {
            prompt: prompt,
            systemPrompt: systemPrompt,
            provider: 'google',
            model: model || 'gemini-1.5-flash',
            apiKey: API_KEY
        });
        return data.text;
    } catch (error: any) {
        console.error("AI Error", error);

        // Handle Axios error structure
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";

        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('Too Many Requests')) {
            throw new Error("Quota Google AI dépassé. Veuillez changer de modèle (utilisez Gemini 1.5 Flash) ou réessayer plus tard.");
        }

        throw error;
    }
}

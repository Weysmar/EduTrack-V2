
import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";
import { useAuthStore } from "@/store/authStore"; // Auth token
import { API_URL } from "@/config";

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

        // Optional: If no key, maybe backend has one? For now, proceed.
        // if (!API_KEY) throw new Error("Key missing...");

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
            const token = useAuthStore.getState().token;
            // Use the /api URL, checking if it ends in /api or not. Config usually returns base URL.
            // If API_URL is http://localhost:3000/api, then just /ai/generate.
            // If API_URL is http://localhost:3000, then /api/ai/generate.
            // Wait, import says getApiUrl() returns location.origin or VITE_API_URL.
            // Usually VITE_API_URL includes /api suffix? Or not?
            // "edutrack.../api/items" suggested /api is NOT in the domain root but mounted.
            // config.ts says window.location.origin.
            // I should use `/api/ai/generate` relative if same origin, or construct it.
            // Assuming API_URL does NOT contain /api suffix based on typical usage, BUT `ItemView.tsx` uses `${API_URL}/storage/proxy`.
            // Check `config.ts` again... It returns `window.location.origin`.
            // So `API_URL` is `http://...`.
            // So I need `${API_URL}/api/ai/generate`.

            const response = await fetch(`${API_URL}/api/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: text,
                    systemPrompt: systemPrompt,
                    provider: 'google',
                    model: model,
                    apiKey: API_KEY
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || response.statusText);
            }

            const data = await response.json();
            return data.text;

        } catch (error: any) {
            console.error("Gemini Backend Error:", error);
            throw error;
        }
    }
}

export async function generateWithGoogle(prompt: string, systemPrompt?: string, model?: string): Promise<string> {
    const API_KEY = useProfileStore.getState().getApiKey('google_gemini_exercises');
    const token = useAuthStore.getState().token;

    const response = await fetch(`${API_URL}/api/ai/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            prompt: prompt,
            systemPrompt: systemPrompt,
            provider: 'google',
            model: model || 'gemini-1.5-flash',
            apiKey: API_KEY
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Failed to generate content via Backend");
    }

    const data = await response.json();
    return data.text;
}

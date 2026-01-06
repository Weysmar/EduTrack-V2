import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";

export interface PerplexityOptions {
    compressionLevel: '20' | '30' | '40' | '50';
    useWebSearch: boolean;
    model?: string;
}

export class PerplexityService {

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

    static async generateSummary(text: string, options: SummaryOptions, perplexityOptions: PerplexityOptions): Promise<string> {
        // GET KEY FROM STORE
        const API_KEY = useProfileStore.getState().getApiKey('perplexity_summaries');

        if (!API_KEY) {
            throw new Error("Clé API Perplexity manquante. Veuillez l'ajouter dans les paramètres du profil.");
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

4.  **SOURCES INTÉGRÉES** :
    -   ${perplexityOptions.useWebSearch ? "INTÈGRE les sources [1] directement APRES le fait cité (ex: 'Selon l'étude [1], le marché...')." : ""}
    -   Ne regroupe pas toutes les sources à la fin, disperse-les pour justifier les points.
    -   Si web search actif : Ajoute une section compacte "## Sources" à la fin avec [1] Titre - URL.

5.  **STYLE & TON** :
    -   Français académique impeccable.
    -   Neutre, objectif, synthétique.
    -   Verbes d'action.

6.  **CONTRAINTE DE VOLUME (CRITIQUE)** :
    -   Tu dois respecter STRICTEMENT le volume cible demandé ci-dessous.
    -   Si on demande 20%, le résumé final ne doit pas dépasser 25% de la taille du texte source.
    -   Ne rallonge JAMAIS pour 'faire joli'. Chaque mot doit être utile.

INSTRUCTIONS DE CONTENU :
-   Compression : ${this.getCompressionInstruction(perplexityOptions.compressionLevel)}
-   ${this.getFormatInstruction(options.format)}
-   Vérifie qu'aucun caractère Markdown brut (#, *) ne reste visible s'il n'est pas interprété par le rendu final.
`

        try {
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: perplexityOptions.model || 'sonar-pro',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Voici le texte à résumer :\n\n${text}` }
                    ],
                    max_tokens: 4096, // Large window for detailed summaries
                    temperature: 0.1, // High precision
                    top_p: 0.9,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Perplexity API Error: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "Aucun résumé généré.";

        } catch (error: any) {
            console.error("Perplexity Service Error:", error);
            throw error;
        }
    }
}

export async function generateWithPerplexity(prompt: string, systemPrompt: string = "You are a helpful AI assistant.", model?: string): Promise<string> {
    const API_KEY = useProfileStore.getState().getApiKey('perplexity_exercises'); // Uses exercises key for generic gen

    if (!API_KEY) {
        // Fallback to summary key if exercises missing, or throw error?
        // Let's try summary key as fallback or just error.
        const fallback = useProfileStore.getState().getApiKey('perplexity_summaries');
        if (!fallback) throw new Error("Clé API Perplexity manquante (Exercises).");
    }

    // We use the found key (re-fetch to be clean)
    const validKey = API_KEY || useProfileStore.getState().getApiKey('perplexity_summaries');

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${validKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'sonar-pro',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 8000,
                temperature: 0.1,
                stream: false
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Perplexity API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";

    } catch (error: any) {
        console.error("Perplexity Generator Error:", error);
        throw error;
    }
}

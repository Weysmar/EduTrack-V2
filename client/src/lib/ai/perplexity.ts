/**
 * perplexity.ts — Intégration Perplexity côté client.
 *
 * ⚠️  CHEMIN UNIQUE : toutes les requêtes passent par le backend Express
 * (/api/ai/generate) qui gère le logging, les limites de taux et la sécurité des clés.
 * Plus d'appel direct à api.perplexity.ai depuis le navigateur.
 */

import { SummaryOptions } from "../summary/types";
import { useProfileStore } from "@/store/profileStore";
import { apiClient } from "@/lib/api/client";

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
        const API_KEY = useProfileStore.getState().getApiKey('perplexity_summaries')
            || useProfileStore.getState().getApiKey('perplexity_exercises');

        if (!API_KEY) {
            throw new Error("Clé API Perplexity manquante. Veuillez la configurer dans Profil > Paramètres > Clés API.");
        }

        const systemPrompt = `Tu es un expert en synthèse académique structurée et pédagogique.
Ton objectif est de produire des résumés PROFESSIONNELS, LISIBLES et PRÊTS À L'EMPLOI pour des étudiants.

RÈGLES DE FORMATAGE STRICTES (Respecter scrupuleusement pur Export Word/PDF) :

1.  **HIÉRARCHIE VISUELLE CLAIRE** :
    -   Utilise uniquement les niveaux de titre Markdown : # (Titre Principal), ## (Sections), ### (Sous-sections).
    -   Ne jamais dépasser 3 niveaux de profondeur.
    -   Ajoute des sauts de ligne clairs entre les sections.

2.  **STRUCTURE PAR LISTES À PUCES MULTI-NIVEAUX (SAUT DE LIGNE OBLIGATOIRE)** :
    -   Chaque puce principale DOIT obligatoirement être sur sa propre ligne et commencer par "- ".
    -   Chaque sous-puce (détail, sous-point, exemple, citation) DOIT OBLIGATOIREMENT être sur une NOUVELLE LIGNE avec une indentation de 2 espaces ("  - ").
    -   Exemple de structure stricte attendue :
        - Concept ou Auteur :
          - Idée clé ou principe fondamental
          - Conséquence ou application concrète
          - Exemple concret (Dates, chiffres)
    -   INTERDICTION ABSOLUE d'écrire des puces ou des sous-puces les unes à la suite des autres sur la même ligne.
    -   N'utilise JAMAIS de symboles Unicode bruts dans le texte comme ▫, ◦, ▪, • : utilise UNIQUEMENT la syntaxe Markdown standard ("- " et "  - ").
    -   Chaque idée ou sous-point commence sur une NOUVELLE LIGNE.

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
`;

        // Routage via le backend unifié — plus d'appel direct à l'API Perplexity
        const { data } = await apiClient.post('/ai/generate', {
            prompt: `Voici le texte à résumer :\n\n${text}`,
            systemPrompt,
            provider: 'perplexity',
            model: perplexityOptions.model || 'sonar-pro',
            apiKey: API_KEY
        }, { timeout: 120000 });

        return data.text;
    }
}

/**
 * Génération générique avec Perplexity — routée via le backend.
 */
export async function generateWithPerplexity(
    prompt: string,
    systemPrompt: string = "You are a helpful AI assistant.",
    model?: string
): Promise<string> {
    const API_KEY = useProfileStore.getState().getApiKey('perplexity_exercises')
        || useProfileStore.getState().getApiKey('perplexity_summaries');

    if (!API_KEY) {
        throw new Error("Clé API Perplexity manquante. Veuillez la configurer dans Profil > Paramètres > Clés API.");
    }

    try {
        const { data } = await apiClient.post('/ai/generate', {
            prompt,
            systemPrompt,
            provider: 'perplexity',
            // Résolution du modèle : utilise sonar-pro par défaut (l'ancien alias llama est géré par le registre serveur)
            model: model || 'sonar-pro',
            apiKey: API_KEY
        });

        return data.text;
    } catch (error: any) {
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Erreur de génération Perplexity";
        throw new Error(errorMessage);
    }
}

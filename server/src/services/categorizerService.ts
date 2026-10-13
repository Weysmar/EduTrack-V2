import { aiService } from './aiService';

import { prisma } from '../lib/prisma';
import { FAST_MODELS, AIProvider } from '../config/aiModels';

// Predefined categories to guide the AI
const DEFAULT_CATEGORIES = [
    "Alimentation", "Logement", "Transport", "Loisirs", "Santé",
    "Shopping", "Services", "Restaurants", "Salaires", "Virements", "Autre"
];

export const categorizerService = {
    /**
     * Categorizes a batch of transactions using AI
     * @param transactions List of transactions { description, amount }
     * @param apiKey User's API Key
     * @param provider Provider of the API key (fast model of this provider is used)
     */
    async categorizeBatch(transactions: { description: string, amount: number, id?: string }[], apiKey?: string, provider: AIProvider = 'google'): Promise<Record<string, string>> {
        if (transactions.length === 0) return {};

        // Prepare prompt
        const txList = transactions.map((t, index) => `${index + 1}. [${t.amount}€] ${t.description}`).join('\n');

        const prompt = `
        Tu es un assistant comptable expert. Classe les transactions suivantes dans une de ces catégories : 
        [${DEFAULT_CATEGORIES.join(', ')}].
        
        Si aucune catégorie ne correspond parfaitement, choisis la plus logique ou "Autre".
        Réponds UNIQUEMENT via un objet JSON où la clé est l'index (1, 2...) et la valeur est la catégorie exacte.
        
        Transactions:
        ${txList}
        `;

        try {
            const result = await aiService.generateJSON(prompt, "Expert comptable rigoureux.", FAST_MODELS[provider], apiKey, provider);

            // Map back to IDs or Indexes
            // Result ex: { "1": "Alimentation", "2": "Transport" }
            const categorized: Record<string, string> = {};

            Object.entries(result).forEach(([indexStr, category]) => {
                const index = parseInt(indexStr) - 1;
                if (transactions[index]) {
                    // Use ID if available, otherwise just handle index mapping in caller
                    // We'll return a map of "Description+Amount" or just an array? 
                    // Better: Return map of Index -> Category for the caller to apply
                    categorized[index] = String(category);
                }
            });

            return categorized;
        } catch (error) {
            console.error("AI Categorization Failed:", error);
            return {};
        }
    },

    /**
     * Predict category for a single transaction (fallback)
     */
    async predictCategory(description: string, amount: number, apiKey?: string, provider: AIProvider = 'google'): Promise<string> {
        const prompt = `Catégorise cette dépense : "${description}" (${amount}€). Catégories possibles : ${DEFAULT_CATEGORIES.join(', ')}. Réponds juste par la catégorie.`;
        try {
            const text = await aiService.generateText(prompt, undefined, FAST_MODELS[provider], apiKey, provider);
            const category = text.trim().replace(/['"]/g, '');
            return DEFAULT_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || "Autre";
        } catch (e) {
            return "Autre";
        }
    }
};

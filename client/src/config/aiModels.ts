/**
 * aiModels.ts — Registre client des modèles IA d'EduTrack
 *
 * Source de vérité unique côté client.
 * Pour ajouter un modèle ou un provider, modifier UNIQUEMENT ce fichier.
 * Tous les modaux et sélecteurs se mettent à jour automatiquement.
 *
 * Note : les champs maxTokens et capabilities sont volontairement inclus
 * pour permettre la validation fichier ↔ modèle côté client
 * (ex : avertir si image envoyée à un modèle sans vision).
 */

export type AIProvider = 'google' | 'perplexity';

/** Capacités du modèle utilisées pour valider la compatibilité fichier ↔ modèle. */
export interface ModelCapabilities {
    /** Le modèle accepte des images (vision multimodale) */
    vision: boolean;
    /** Le modèle accède au web pour enrichir les réponses */
    webSearch: boolean;
    /** Le modèle utilise une chaîne de réflexion étape par étape */
    reasoning: boolean;
}

export interface AIModelEntry {
    /** ID envoyé au serveur / à l'API */
    id: string;
    /** Nom affiché dans les listes déroulantes */
    displayName: string;
    provider: AIProvider;
    /**
     * Limite de fenêtre de contexte en TOKENS (valeur officielle de l'API).
     * Utilisé pour estimer si le contenu peut tenir dans le contexte.
     */
    maxTokens: number;
    /** Capacités du modèle (vision, web search, raisonnement) */
    capabilities: ModelCapabilities;
    recommended?: boolean;
    deprecated?: boolean;
}

export const AI_MODELS: AIModelEntry[] = [
    // ── Google Gemini ─────────────────────────────────────────────────────────
    {
        id: 'gemini-3.7-flash',
        displayName: '⚡ Gemini 3.7 Flash — Rapide & Performant',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
        recommended: true,
    },
    {
        id: 'gemini-3.7-thinking',
        displayName: '🧠 Gemini 3.7 Thinking — Raisonnement étape par étape',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
    },
    {
        id: 'gemini-2.5-flash',
        displayName: '🛡️ Gemini 2.5 Flash — Secours haute disponibilité',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
    },

    // ── Perplexity Sonar ──────────────────────────────────────────────────────
    {
        id: 'sonar-pro',
        displayName: 'Sonar Pro — Recommandé',
        provider: 'perplexity',
        maxTokens: 200_000,
        capabilities: { vision: false, webSearch: true, reasoning: false },
        recommended: true,
    },
    {
        id: 'sonar',
        displayName: 'Sonar — Rapide',
        provider: 'perplexity',
        maxTokens: 200_000,
        capabilities: { vision: false, webSearch: true, reasoning: false },
    },
    {
        id: 'sonar-reasoning',
        displayName: 'Sonar Reasoning — Expert',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true },
    },
    {
        id: 'sonar-reasoning-pro',
        displayName: 'Sonar Reasoning Pro',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true },
    },
    {
        id: 'sonar-deep-research',
        displayName: 'Sonar Deep Research — Recherche approfondie',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true },
    },
];

/** Retourne les modèles disponibles pour un provider donné (non dépréciés). */
export const getModelsForProvider = (provider: AIProvider): AIModelEntry[] =>
    AI_MODELS.filter(m => m.provider === provider && !m.deprecated);

/** Retourne le modèle recommandé par défaut pour un provider. */
export const getDefaultModel = (provider: AIProvider): string => {
    const recommended = AI_MODELS.find(m => m.provider === provider && m.recommended && !m.deprecated);
    return recommended?.id ?? (provider === 'google' ? 'gemini-3.7-flash' : 'sonar-pro');
};

export const getModelById = (id: string): AIModelEntry | undefined =>
    AI_MODELS.find(m => m.id === id);

/** Catégorie de fichier */
export type FileCategory = 'text' | 'image' | 'mixed';

/** Résultat de validation du contexte */
export interface ContextFitResult {
    fits: boolean;
    estimatedTokens: number;
    modelMaxTokens: number;
    fillRatio: number;
    warning?: string;
}

/**
 * Estime le nombre de tokens d'un texte basé sur sa longueur en caractères.
 * Ratio réaliste : 1 token ≈ 3.5 caractères en français / multilingue.
 */
export const estimateTokens = (charCount: number, charsPerToken = 3.5): number =>
    Math.ceil(charCount / charsPerToken);

/**
 * Vérifie si un texte d'une longueur donnée rentre dans la fenêtre de contexte du modèle.
 *
 * @param promptChars   Nombre de caractères du prompt complet
 * @param modelId       ID du modèle
 * @param safetyMargin  Marge de sécurité pour la réponse (défaut 15%)
 */
export const checkContextFit = (
    promptChars: number,
    modelId: string,
    safetyMargin = 0.15
): ContextFitResult => {
    const entry = AI_MODELS.find(m => m.id === modelId);
    const maxTokens = entry?.maxTokens ?? 200_000;

    const estimatedTokens = estimateTokens(promptChars);
    const usableTokens = Math.floor(maxTokens * (1 - safetyMargin));
    const fits = estimatedTokens <= usableTokens;
    const fillRatio = estimatedTokens / usableTokens;

    return {
        fits,
        estimatedTokens,
        modelMaxTokens: maxTokens,
        fillRatio,
        warning: fits ? undefined :
            `Le contenu est volumineux pour ${entry?.displayName ?? modelId} ` +
            `(~${(estimatedTokens / 1000).toFixed(0)}k tokens estimés, limite conseillée : ${(usableTokens / 1000).toFixed(0)}k). ` +
            `Pour éviter une coupure, choisissez un modèle avec une fenêtre plus large (ex : Gemini 1M tokens).`
    };
};

/**
 * Vérifie qu'un type de fichier est compatible avec les capacités du modèle.
 * Retourne un avertissement si le modèle ne supporte pas nativement le type de fichier.
 *
 * @param fileCategory 'text' | 'image' | 'mixed'
 * @param modelId      ID du modèle actif
 */
export const validateFileModelCompatibility = (
    fileCategory: FileCategory,
    modelId: string
): { compatible: boolean; warning?: string } => {
    if (fileCategory === 'text') return { compatible: true };

    const entry = AI_MODELS.find(m => m.id === modelId);
    if (!entry) return { compatible: true };

    if (fileCategory === 'image' && !entry.capabilities.vision) {
        return {
            compatible: false,
            warning:
                `${entry.displayName} ne supporte pas les images nativement. ` +
                `Le texte extrait par OCR sera utilisé — la qualité dépend de la lisibilité de l'image. ` +
                `Pour de meilleurs résultats avec des graphiques ou formules, utilisez un modèle Google Gemini (vision native).`
        };
    }

    return { compatible: true };
};

/**
 * Détecte le provider à partir du nom de modèle.
 * 1. Recherche dans le registre client AI_MODELS
 * 2. Reconnaissance des préfixes de famille (sonar, pplx, gemini)
 */
export const detectProvider = (model?: string): AIProvider => {
    if (!model || typeof model !== 'string') return 'google';

    const normalized = model.trim();
    const entry = AI_MODELS.find(m => m.id === normalized);
    if (entry) return entry.provider;

    const lower = normalized.toLowerCase();
    if (lower.startsWith('sonar') || lower.includes('perplexity') || lower.startsWith('pplx')) {
        return 'perplexity';
    }
    return 'google';
};



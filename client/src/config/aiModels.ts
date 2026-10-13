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

export type AIProvider = 'google' | 'perplexity' | 'anthropic';

/** Providers proposés dans l'interface (ordre d'affichage) */
export const AI_PROVIDERS: AIProvider[] = ['google', 'perplexity', 'anthropic'];

export const isAIProvider = (value: unknown): value is AIProvider =>
    typeof value === 'string' && (AI_PROVIDERS as string[]).includes(value);

/** Nom affiché de chaque provider */
export const PROVIDER_LABELS: Record<AIProvider, string> = {
    google: 'Google Gemini',
    perplexity: 'Perplexity',
    anthropic: 'Claude',
};

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
    /** Modèle en preview : sélectionnable, mais susceptible d'évoluer ou d'être retiré par le fournisseur */
    preview?: boolean;
    /** Caractères par token pour l'estimation du contexte (défaut 3.5) */
    charsPerToken?: number;
}

/** Modèle Gemini par défaut : à changer ici uniquement (miroir de DEFAULT_GEMINI_MODEL côté serveur) */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
/** Modèle Claude par défaut (miroir de DEFAULT_CLAUDE_MODEL côté serveur) */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';

/** Modèle par défaut de chaque provider */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
    google: DEFAULT_GEMINI_MODEL,
    perplexity: 'sonar-pro',
    anthropic: DEFAULT_CLAUDE_MODEL,
};

/**
 * Anciens identifiants encore présents dans les réglages enregistrés → modèle actuel.
 * gemini-3.7-flash est déprécié depuis le 2026-10-08 (Google redirige vers 3.8 Flash),
 * gemini-3.5-flash est redirigé vers 3.6 Flash.
 */
const LEGACY_MODEL_IDS: Record<string, string> = {
    'gemini-3.7-flash': DEFAULT_GEMINI_MODEL,
    'gemini-3.7': DEFAULT_GEMINI_MODEL,
    'gemini-3.7-pro': DEFAULT_GEMINI_MODEL,
    'gemini-3.7-thinking': DEFAULT_GEMINI_MODEL,
    'gemini-3.8': DEFAULT_GEMINI_MODEL,
    'gemini-3.8-pro': DEFAULT_GEMINI_MODEL,
    'gemini-3.5-flash': 'gemini-3.6-flash',
};

/** Convertit un identifiant enregistré (éventuellement déprécié) vers le modèle actuel */
export const normalizeModelId = (id?: string | null): string | undefined =>
    id ? (LEGACY_MODEL_IDS[id] ?? id) : undefined;

export const AI_MODELS: AIModelEntry[] = [
    // ── Google Gemini ─────────────────────────────────────────────────────────
    {
        id: 'gemini-3.8-flash',
        displayName: '⚡ Gemini 3.8 Flash — Rapide & Performant',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
        recommended: true,
    },
    {
        id: 'gemini-3.6-flash',
        displayName: 'Gemini 3.6 Flash — Alternative',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
    },
    {
        id: 'gemini-3.5-flash-lite',
        displayName: 'Gemini 3.5 Flash-Lite — Très rapide & économique',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
    },
    {
        id: 'gemini-3.1-pro-preview',
        displayName: 'Gemini 3.1 Pro (preview) — Raisonnement poussé',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        preview: true,
    },
    {
        // NOTE (2026-09) : accès restreint chez Google aux clés API l'ayant déjà utilisée ;
        // plus garanti disponible pour une clé toute neuve — voir le registre serveur.
        id: 'gemini-2.5-flash',
        displayName: '🛡️ Gemini 2.5 Flash — Repli (accès parfois restreint)',
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

    // ── Anthropic Claude ──────────────────────────────────────────────────────
    // Tokenizer Claude : ~2.5 caractères par token (1M tokens ≈ 2.5M caractères)
    {
        id: 'claude-sonnet-5-5',
        displayName: 'Claude Sonnet 5.5 — Recommandé',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        recommended: true,
        charsPerToken: 2.5,
    },
    {
        id: 'claude-haiku-5-5',
        displayName: 'Claude Haiku 5.5 — Rapide & économique',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        charsPerToken: 2.5,
    },
    {
        id: 'claude-opus-5-5',
        displayName: 'Claude Opus 5.5 — Le plus puissant',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        charsPerToken: 2.5,
    },
];

/** Retourne les modèles disponibles pour un provider donné (non dépréciés). */
export const getModelsForProvider = (provider: AIProvider): AIModelEntry[] =>
    AI_MODELS.filter(m => m.provider === provider && !m.deprecated);

/** Retourne le modèle recommandé par défaut pour un provider. */
export const getDefaultModel = (provider: AIProvider): string => {
    const recommended = AI_MODELS.find(m => m.provider === provider && m.recommended && !m.deprecated);
    return recommended?.id ?? DEFAULT_MODELS[provider];
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

    const estimatedTokens = estimateTokens(promptChars, entry?.charsPerToken);
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
    if (lower.startsWith('claude') || lower.includes('anthropic')) {
        return 'anthropic';
    }
    return 'google';
};



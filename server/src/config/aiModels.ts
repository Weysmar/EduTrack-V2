/**
 * aiModels.ts — Registre centralisé des modèles IA d'EduTrack
 *
 * C'est la SEULE source de vérité pour :
 *   - Les ID API réels de chaque modèle
 *   - Les alias de compatibilité (anciens réglages sauvegardés)
 *   - Les chaînes de fallback par provider
 *   - Les capacités (vision, raisonnement) de chaque modèle
 *   - Les limites de contexte réelles en TOKENS (pas en caractères)
 *
 * Pour ajouter un modèle : ajouter une entrée dans AI_MODELS.
 * Pour ajouter un provider : ajouter un bloc dans AIProvider.
 * Aucune autre modification n'est nécessaire.
 */

export type AIProvider = 'google' | 'perplexity' | 'anthropic';

/** Liste des providers pris en charge (ordre d'affichage / de repli) */
export const AI_PROVIDERS: AIProvider[] = ['google', 'perplexity', 'anthropic'];

export const isAIProvider = (value: unknown): value is AIProvider =>
    typeof value === 'string' && (AI_PROVIDERS as string[]).includes(value);

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
    /** ID envoyé à l'API */
    id: string;
    /** Nom affiché dans l'interface utilisateur */
    displayName: string;
    provider: AIProvider;
    /** Anciens noms ou variantes acceptées pour la rétrocompatibilité */
    aliases?: string[];
    /**
     * Limite réelle de fenêtre de contexte en TOKENS (valeur officielle de l'API).
     * Utilisé pour détecter les dépassements avant l'envoi.
     * Règle d'estimation : ~3.5 caractères par token (texte français/anglais mélangé).
     */
    maxTokens: number;
    /** Capacités du modèle (vision, web search, raisonnement) */
    capabilities: ModelCapabilities;
    recommended?: boolean;
    deprecated?: boolean;
    /** Modèle en preview : sélectionnable, mais exclu des chaînes de repli automatiques */
    preview?: boolean;
    /** Caractères par token pour l'estimation du contexte (défaut 3.5 ; plus bas = tokenizer plus "gourmand") */
    charsPerToken?: number;
}

/** Modèle Gemini par défaut (réglages vides, appels internes) : à changer ici uniquement */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';
/** Modèle Gemini rapide et économique pour les tâches de fond (catégorisation…) */
export const DEFAULT_GEMINI_LITE_MODEL = 'gemini-3.5-flash-lite';
/** Modèle Claude par défaut : meilleur compromis vitesse / qualité */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';

/** Modèle par défaut de chaque provider (réglages vides, repli entre providers) */
export const DEFAULT_MODELS: Record<AIProvider, string> = {
    google: DEFAULT_GEMINI_MODEL,
    perplexity: 'sonar-pro',
    anthropic: DEFAULT_CLAUDE_MODEL,
};

/** Modèle rapide/économique de chaque provider pour les tâches de fond courtes */
export const FAST_MODELS: Record<AIProvider, string> = {
    google: DEFAULT_GEMINI_LITE_MODEL,
    perplexity: 'sonar',
    anthropic: 'claude-haiku-5-5',
};

export const AI_MODELS: AIModelEntry[] = [
    // ── Google Gemini ───────────────────────────────────────────────────────────────────────────
    {
        id: 'gemini-3.8-flash',
        displayName: '⚡ Gemini 3.8 Flash',
        provider: 'google',
        maxTokens: 1_000_000,      // Fenêtre d'entrée officielle : 1M tokens
        capabilities: { vision: true, webSearch: false, reasoning: false },
        recommended: true,
        // gemini-3.7-flash est déprécié depuis le 2026-10-08 (Google redirige ses appels vers 3.8 Flash) :
        // les réglages enregistrés et anciens défauts sont résolus ici. Il n'existe ni 3.8 Pro ni
        // 3.8 Flash-Lite texte dans l'API (vérifié sur ai.google.dev/gemini-api/docs/deprecations).
        aliases: ['gemini-3.7-flash', 'gemini-3.7', 'gemini-3.7-pro', 'gemini-3.8', 'gemini-3.8-pro']
    },
    {
        // Modèle courant non déprécié (2026-07) : premier repli si 3.8 Flash est indisponible ou saturé.
        // gemini-3.5-flash (déprécié, redirigé par Google vers 3.6 Flash) est résolu ici.
        id: 'gemini-3.6-flash',
        displayName: 'Gemini 3.6 Flash',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
        aliases: ['gemini-3.5-flash', 'gemini-3.6']
    },
    {
        // Stable, le plus rapide et le moins cher de la famille 3.5 : utilisé pour les tâches de fond
        id: 'gemini-3.5-flash-lite',
        displayName: 'Gemini 3.5 Flash-Lite',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
        aliases: ['gemini-3.5-lite']
    },
    {
        // Preview (2026-10) : raisonnement poussé (maths, sciences). Google peut le modifier ou le retirer :
        // jamais utilisé en repli automatique, et un échec bascule vers les modèles Flash stables.
        id: 'gemini-3.1-pro-preview',
        displayName: 'Gemini 3.1 Pro (preview)',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        preview: true,
        aliases: ['gemini-3.1-pro']
    },
    {
        // NOTE (2026-09) : Google restreint désormais l'accès à la famille 2.5 aux clés API
        // l'ayant déjà utilisée par le passé ; ce n'est plus le choix recommandé pour une
        // clé toute neuve. On le garde comme dernier repli (pas comme filet universel) —
        // si l'appel échoue avec un modèle/accès non trouvé, c'est attendu pour les
        // nouvelles clés API, qui passent d'abord par gemini-3.8-flash puis gemini-3.6-flash.
        id: 'gemini-2.5-flash',
        displayName: '🛡️ Gemini 2.5 Flash',
        provider: 'google',
        maxTokens: 1_000_000,      // 1M tokens input window
        capabilities: { vision: true, webSearch: false, reasoning: false }
    },
    {
        id: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: false },
        deprecated: true
    },

    // ── Perplexity Sonar ──────────────────────────────────────────────────────────────────────────
    {
        id: 'sonar-pro',
        displayName: 'Sonar Pro',
        provider: 'perplexity',
        maxTokens: 200_000,        // 200k tokens context window
        capabilities: { vision: false, webSearch: true, reasoning: false },
        recommended: true,
        // Anciens noms Llama-branded
        aliases: ['llama-3.1-sonar-large-128k-online']
    },
    {
        id: 'sonar',
        displayName: 'Sonar',
        provider: 'perplexity',
        maxTokens: 200_000,
        capabilities: { vision: false, webSearch: true, reasoning: false },
        aliases: ['llama-3.1-sonar-small-128k-online']
    },
    {
        id: 'sonar-reasoning',
        displayName: 'Sonar Reasoning',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true },
        aliases: ['llama-3.1-sonar-huge-128k-online']
    },
    {
        id: 'sonar-reasoning-pro',
        displayName: 'Sonar Reasoning Pro',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true }
    },
    {
        id: 'sonar-deep-research',
        displayName: 'Sonar Deep Research',
        provider: 'perplexity',
        maxTokens: 128_000,
        capabilities: { vision: false, webSearch: true, reasoning: true }
    },

    // ── Anthropic Claude ──────────────────────────────────────────────────────────────────────────
    // Génération 5.5 (2026-10) : fenêtre 1M tokens, vision, réflexion adaptative.
    // Le tokenizer Claude compte ~2.5 caractères par token (1M tokens ≈ 2.5M caractères).
    {
        id: 'claude-sonnet-5-5',
        displayName: 'Claude Sonnet 5.5',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        recommended: true,
        charsPerToken: 2.5,
        aliases: ['claude-sonnet', 'sonnet']
    },
    {
        id: 'claude-haiku-5-5',
        displayName: 'Claude Haiku 5.5',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        charsPerToken: 2.5,
        aliases: ['claude-haiku', 'haiku']
    },
    {
        id: 'claude-opus-5-5',
        displayName: 'Claude Opus 5.5',
        provider: 'anthropic',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        charsPerToken: 2.5,
        aliases: ['claude-opus', 'opus']
    }
];

// ── Utilitaires ───────────────────────────────────────────────────────────────────────────────

/**
 * Estimation du nombre de tokens à partir d'une longueur de texte.
 *
 * Règle empirique : ~3.5 caractères par token (texte français/anglais mélangé).
 * C'est une approximation confortable — les APIs comptent elles-mêmes les tokens,
 * mais cet estimateur nous évite d'envoyer des requêtes qui vont clairement déborder.
 *
 * @param chars Nombre de caractères du texte brut
 */
export const estimateTokens = (chars: number, charsPerToken = 3.5): number =>
    Math.ceil(chars / charsPerToken);

/** Résultat de vérification d'adéquation du contexte */
export interface ContextFitResult {
    fits: boolean;
    estimatedTokens: number;
    modelMaxTokens: number;
    /** Ratio de remplissage [0..1+]. >1 = dépassement. */
    fillRatio: number;
    /** Si !fits, message d'avertissement lisible par l'utilisateur */
    warning?: string;
}

/**
 * Vérifie si un texte d'une longueur donnée rentre dans la fenêtre de contexte du modèle.
 *
 * @param promptChars Nombre de caractères du prompt complet
 * @param modelId     ID du modèle (résolu via le registre)
 * @param safetyMargin Fraction de la fenête max à réserver pour la réponse (défaut 0.15 = 15%)
 */
export const checkContextFit = (
    promptChars: number,
    modelId: string,
    safetyMargin = 0.15
): ContextFitResult => {
    const resolved = resolveModelId(modelId);
    const entry = AI_MODELS.find(m => m.id === resolved);
    const maxTokens = entry?.maxTokens ?? 200_000; // Limite conservative par défaut

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
            `Le contenu est trop volumineux pour ${entry?.displayName ?? resolved} ` +
            `(~${(estimatedTokens / 1000).toFixed(0)}k tokens estimés, limite : ${(usableTokens / 1000).toFixed(0)}k). ` +
            `Veuillez réduire la sélection ou choisir un modèle avec une fenêtre plus large.`
    };
};

/** Catégorie de fichier utilisée pour la validation de compatibilité */
export type FileCategory = 'text' | 'image' | 'mixed';

/** Résultat de validation fichier ↔ modèle */
export interface FileModelCompatibility {
    compatible: boolean;
    /** Message d'avertissement si le modèle ne supporte pas le type de fichier */
    warning?: string;
}

/**
 * Vérifie qu'un type de fichier est compatible avec les capacités du modèle.
 *
 * Cas détecté : fichier image envoyé à un modèle sans vision.
 * (Les PDFs/DOCX sont traités côté client : le texte extrait est envoyé, donc toujours compatible.)
 *
 * @param fileCategory  'text' | 'image' | 'mixed'
 * @param modelId       ID du modèle actif
 */
export const validateFileModelCompatibility = (
    fileCategory: FileCategory,
    modelId: string
): FileModelCompatibility => {
    if (fileCategory === 'text') return { compatible: true };

    const resolved = resolveModelId(modelId);
    const entry = AI_MODELS.find(m => m.id === resolved);

    if (!entry) return { compatible: true }; // Inconnu → on laisse passer

    if (fileCategory === 'image' && !entry.capabilities.vision) {
        return {
            compatible: false,
            warning:
                `${entry.displayName} ne supporte pas les images. ` +
                `Le texte extrait par OCR sera utilisé, mais la qualité peut varier. ` +
                `Pour de meilleurs résultats sur les images, utilisez un modèle Gemini (vision native).`
        };
    }

    return { compatible: true };
};

/**
 * Résout un nom de modèle (y compris les alias) vers son ID API réel.
 * Remplace les deux anciennes fonctions `mapModelName` dupliquées.
 *
 * @example
 * resolveModelId('gemini-3.7-flash') // → 'gemini-3.8-flash' (déprécié, alias)
 * resolveModelId('sonar-pro')      // → 'sonar-pro'
 * resolveModelId('unknown')        // → 'unknown' (pass-through)
 */
export const resolveModelId = (model: string): string => {
    if (!model) return DEFAULT_GEMINI_MODEL;
    const entry = AI_MODELS.find(
        m => m.id === model || m.aliases?.includes(model)
    );
    return entry?.id ?? model;
};

/**
 * Détecte le provider à partir du nom de modèle de manière robuste et futureproof.
 *
 * Ordre de résolution :
 *   1. Recherche exacte ou via alias dans le registre AI_MODELS (source de vérité)
 *   2. Reconnaissance des préfixes/familles normalisés connus (ex: sonar, pplx, gemini)
 *   3. Avertissement explicite en log si le modèle est inconnu pour faciliter le diagnostic
 */
export const detectProvider = (model?: string): AIProvider => {
    if (!model || typeof model !== 'string') return 'google';

    const normalized = model.trim();

    // 1. Recherche dans le registre centralisé (ID officiel ou alias répertorié)
    const resolved = resolveModelId(normalized);
    const entry = AI_MODELS.find(
        m => m.id === resolved || m.id === normalized || m.aliases?.includes(normalized)
    );
    if (entry) {
        return entry.provider;
    }

    // 2. Reconnaissance de famille par préfixe/mot-clé pour les variantes non encore listées
    const lower = normalized.toLowerCase();
    if (lower.startsWith('sonar') || lower.includes('perplexity') || lower.startsWith('pplx')) {
        return 'perplexity';
    }
    if (lower.startsWith('gemini') || lower.includes('google')) {
        return 'google';
    }
    if (lower.startsWith('claude') || lower.includes('anthropic')) {
        return 'anthropic';
    }

    // 3. Modèle non reconnu : warning explicite pour éviter les bugs silencieux
    console.warn(`[AI Registry] detectProvider: Modèle "${model}" non reconnu dans le registre ni par famille connue. Repli sur le provider par défaut 'google'.`);
    return 'google';
};

/**
 * Retourne la chaîne de fallback pour un modèle donné.
 *
 * La liste est dérivée DYNAMIQUEMENT du registre AI_MODELS :
 *   1. Le modèle primaire demandé (résolu via alias)
 *   2. Les autres modèles recommandés du même provider (non dépréciés, hors preview)
 *   3. Tous les autres modèles du même provider (non dépréciés, hors preview)
 *
 * ⚠️  Aucune liste hardcodée ici. Ajouter un modèle dans AI_MODELS suffit
 *     pour qu'il entre automatiquement dans la rotation de fallback.
 */
export const getFallbackChain = (primaryModel: string): string[] => {
    const primaryId = resolveModelId(primaryModel);
    const entry = AI_MODELS.find(m => m.id === primaryId);
    const provider = entry?.provider ?? detectProvider(primaryId);

    // Modèles du même provider, non dépréciés ni preview, ordonnés : recommandés d'abord
    const peers = AI_MODELS
        .filter(m => m.provider === provider && !m.deprecated && !m.preview)
        .sort((a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0))
        .map(m => m.id);

    // Le modèle primaire en tête, puis les autres (dédoublonnés)
    const chain = [primaryId, ...peers];
    return chain.filter((m, i) => chain.indexOf(m) === i);
};

/**
 * Retourne les modèles disponibles pour un provider donné (non dépréciés).
 */
export const getModelsForProvider = (provider: AIProvider): AIModelEntry[] =>
    AI_MODELS.filter(m => m.provider === provider && !m.deprecated);

/**
 * Modèle à utiliser pour un provider : le modèle demandé s'il appartient bien à ce provider
 * (alias résolus), sinon le modèle par défaut du provider. Évite d'envoyer un modèle Gemini à Claude.
 */
export const modelForProvider = (provider: AIProvider, requested?: string | null): string => {
    if (requested) {
        const resolved = resolveModelId(requested);
        if (detectProvider(resolved) === provider) return resolved;
    }
    return DEFAULT_MODELS[provider];
};

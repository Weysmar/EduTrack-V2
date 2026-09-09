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
}

export const AI_MODELS: AIModelEntry[] = [
    // ── Google Gemini ───────────────────────────────────────────────────────────────────────────
    {
        id: 'gemini-3.7-flash',
        displayName: '⚡ Gemini 3.7 Flash',
        provider: 'google',
        maxTokens: 1_000_000,      // Fenêtre d'entrée officielle : 1M tokens
        capabilities: { vision: true, webSearch: false, reasoning: false },
        recommended: true,
        // Anciens réglages utilisateurs → redirigés ici
        aliases: ['gemini-3.7', 'gemini-3.7-pro', 'gemini-3.8', 'gemini-3.8-flash', 'gemini-3.8-pro']
    },
    {
        id: 'gemini-3.7-thinking',
        displayName: '🧠 Gemini 3.7 Flash Thinking',
        provider: 'google',
        maxTokens: 1_000_000,
        capabilities: { vision: true, webSearch: false, reasoning: true },
        aliases: ['gemini-3.7-thinking']
    },
    {
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
export const estimateTokens = (chars: number): number =>
    Math.ceil(chars / 3.5);

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
 * resolveModelId('gemini-3.8-pro') // → 'gemini-3.7-flash'
 * resolveModelId('sonar-pro')      // → 'sonar-pro'
 * resolveModelId('unknown')        // → 'unknown' (pass-through)
 */
export const resolveModelId = (model: string): string => {
    if (!model) return 'gemini-3.7-flash';
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

    // 3. Modèle non reconnu : warning explicite pour éviter les bugs silencieux
    console.warn(`[AI Registry] detectProvider: Modèle "${model}" non reconnu dans le registre ni par famille connue. Repli sur le provider par défaut 'google'.`);
    return 'google';
};

/**
 * Retourne la chaîne de fallback pour un modèle donné.
 *
 * La liste est dérivée DYNAMIQUEMENT du registre AI_MODELS :
 *   1. Le modèle primaire demandé (résolu via alias)
 *   2. Les autres modèles recommandés du même provider (non dépréciés)
 *   3. Tous les autres modèles du même provider (non dépréciés)
 *
 * ⚠️  Aucune liste hardcodée ici. Ajouter un modèle dans AI_MODELS suffit
 *     pour qu'il entre automatiquement dans la rotation de fallback.
 */
export const getFallbackChain = (primaryModel: string): string[] => {
    const primaryId = resolveModelId(primaryModel);
    const entry = AI_MODELS.find(m => m.id === primaryId);
    const provider = entry?.provider ?? 'google';

    // Modèles du même provider, non dépréciés, ordonnés : recommandés d'abord
    const peers = AI_MODELS
        .filter(m => m.provider === provider && !m.deprecated)
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

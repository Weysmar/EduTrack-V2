/**
 * messages.ts — Textes FR/EN de l'expérience de génération IA (clés `ai.*`).
 *
 * Ces clés sont destinées à être ajoutées dans `language-provider.tsx`.
 * En attendant (ou si une clé manque), `useAIText()` et `aiMessage()` utilisent
 * ces valeurs par défaut, ce qui évite d'afficher une clé brute à l'utilisateur.
 *
 * Utilisable hors React (ex: messages d'erreur dans lib/ai/*) via `aiMessage()`.
 */

export type UILanguage = 'fr' | 'en'

/** Même clé de stockage que LanguageProvider (language-provider.tsx) */
const LANGUAGE_STORAGE_KEY = 'vite-ui-language'

export const AI_MESSAGES: Record<UILanguage, Record<string, string>> = {
    fr: {
        // Clé API manquante
        'ai.key.missingTitle': 'Clé API {provider} requise',
        'ai.key.missingTitleAny': "Ajoutez une clé API pour utiliser l'IA",
        'ai.key.what': "Une clé API est un code personnel qui permet à EduTrack d'utiliser l'IA en votre nom. Google Gemini en propose une gratuite, créée en une minute.",
        'ai.key.howTo': 'Créez la clé, copiez-la, puis collez-la dans Paramètres › Clés API.',
        'ai.key.getGemini': 'Obtenir une clé Gemini (gratuit)',
        'ai.key.getPerplexity': 'Obtenir une clé Perplexity',
        'ai.key.getClaude': "Obtenir une clé Claude (payant à l'usage)",
        'ai.key.openSettings': 'Ajouter ma clé dans les Paramètres',
        'ai.key.missingShort': 'clé manquante',

        // Sélecteur de modèle
        'ai.model.engine': 'Moteur IA',
        'ai.model.version': 'Version du modèle',
        'ai.model.preview': 'Preview',
        'ai.model.vision': 'Vision native',
        'ai.model.ocr': 'OCR texte',
        'ai.model.reasoning': 'Raisonnement',
        'ai.model.web': 'Web',

        // Quota
        'ai.quota.today': "{used}/{limit} générations aujourd'hui",

        // Progression
        'ai.progress.generating': 'Génération en cours…',
        'ai.progress.analyzing': 'Analyse du contenu…',
        'ai.progress.writing': 'Rédaction…',
        'ai.progress.saving': 'Enregistrement…',
        'ai.progress.longHint': 'Les gros documents peuvent prendre quelques minutes…',
        'ai.progress.elapsed': 'Temps écoulé : {time}',
        'ai.progress.keepOpen': 'Gardez cette fenêtre ouverte. « Annuler » arrête la génération.',

        // Actions
        'ai.action.cancel': 'Annuler',
        'ai.action.cancelGeneration': 'Annuler la génération',
        'ai.cancelled': 'Génération annulée',

        // Erreurs
        'ai.error.aborted': 'Génération annulée.',
        'ai.error.rateLimit': 'Limite quotidienne atteinte ({used}/{limit}) — réinitialisation à {time}.',
        'ai.error.rateLimitTomorrow': 'Limite quotidienne atteinte ({used}/{limit}) — réinitialisation demain à {time}.',
        'ai.error.rateLimitNoTime': 'Limite quotidienne atteinte ({used}/{limit}) — réessayez demain.',
        'ai.error.providerQuota': 'Le quota de votre clé {provider} est épuisé. Patientez quelques minutes ou choisissez un autre modèle (ex. une version Flash).',
        'ai.error.timeout': 'La génération a dépassé 5 minutes. Essayez avec un extrait plus court ou un modèle plus rapide (ex. Flash).',
        'ai.error.network': 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.',
        'ai.error.missingKey': 'Clé API {provider} manquante. Ajoutez-la dans Paramètres › Clés API.',
        'ai.error.invalidKey': 'Votre clé API {provider} a été refusée. Vérifiez-la (ou recréez-la) dans Paramètres › Clés API.',
        'ai.error.overloaded': 'Le service {provider} est surchargé pour le moment. Réessayez dans une minute ou changez de modèle.',
        'ai.error.contextTooLong': 'Le document est trop long pour ce modèle. Choisissez un modèle avec une plus grande fenêtre de contexte ou réduisez le contenu.',
        'ai.error.modelNotFound': "Ce modèle n'est pas disponible avec votre clé {provider}. Choisissez-en un autre dans la liste.",
        'ai.error.invalidResponse': "La réponse de l'IA était mal formée. Réessayez ou changez de modèle.",
        'ai.error.server': 'Le service IA a rencontré une erreur. Réessayez dans un instant.',
        'ai.error.generic': 'Échec de la génération. Vérifiez votre clé API ou votre connexion puis réessayez.',
        'ai.error.withDetail': 'Échec de la génération : {detail}',
        'ai.error.noContent': 'Aucun contenu à analyser. Vérifiez que le document contient du texte.',
        'ai.error.noResult': "L'IA n'a renvoyé aucun résultat exploitable. Réessayez ou changez de modèle.",

        // Choix du cours de destination
        'ai.course.label': 'Cours de destination',
        'ai.course.placeholder': 'Choisir un cours…',
        'ai.course.none': 'Aucun cours (facultatif)',
        'ai.course.required': 'Choisissez un cours : les exercices à trous et les fiches de révision sont enregistrés dans un cours.',
        'ai.course.optionalHint': 'Facultatif : rattacher le contenu généré à un cours.',
        'ai.course.empty': "Aucun cours disponible. Créez d'abord un cours.",
        'ai.course.loading': 'Chargement des cours…',

        // Troncature
        'ai.truncated.notice': 'Document long : seuls les {limit} premiers caractères (sur {total}) seront utilisés pour ce format.',

        // Panneau de résumé
        'ai.summary.empty': 'Aucun résumé pour le moment',
        'ai.summary.emptyHint': 'Générez une synthèse de ce contenu en un clic.',
        'ai.summary.generateCta': 'Générer un résumé',
        'ai.summary.loading': 'Chargement du résumé…',
        'ai.summary.errorTitle': 'La génération a échoué',
        'ai.summary.unsupportedFormat': 'Ce format de résumé ne peut pas encore être affiché.',

        // Programme de révision
        'ai.plan.thinking': "L'IA construit votre planning…",
        'ai.plan.ready': 'Votre plan est prêt !',
        'ai.plan.readySubtitle': "Voici votre parcours optimisé jusqu'à l'examen.",
        'ai.plan.courses': 'Cours',
        'ai.plan.folders': 'Dossiers (matières)',
        'ai.plan.date': 'Date',
        'ai.plan.calendarLinked': 'Calendrier lié',
        'ai.plan.hoursPerDay': 'Heures par jour',
        'ai.plan.daysPerWeek': 'Jours par semaine',
        'ai.plan.daysShort': '{n} j',
        'ai.plan.weeklyEffort': 'Effort hebdomadaire total :',
        'ai.plan.hoursPerWeek': '~{hours} h / semaine',
        'ai.plan.provider': 'Moteur IA',
        'ai.plan.day': 'Jour {n}',
        'ai.plan.highPriority': 'Priorité haute',
        'ai.plan.examDay': "Jour de l'examen",
        'ai.plan.start': "C'est parti !",
        'ai.plan.next': 'Suivant',
        'ai.plan.type.practice': 'Pratique',
        'ai.plan.type.review': 'Révision',
        'ai.plan.type.study': 'Apprentissage',
        'ai.plan.error': 'Impossible de générer le programme.',
    },
    en: {
        'ai.key.missingTitle': '{provider} API key required',
        'ai.key.missingTitleAny': 'Add an API key to use AI',
        'ai.key.what': 'An API key is a personal code that lets EduTrack use AI on your behalf. Google Gemini offers a free one that takes a minute to create.',
        'ai.key.howTo': 'Create the key, copy it, then paste it into Settings › API keys.',
        'ai.key.getGemini': 'Get a Gemini key (free)',
        'ai.key.getPerplexity': 'Get a Perplexity key',
        'ai.key.getClaude': 'Get a Claude key (pay as you go)',
        'ai.key.openSettings': 'Add my key in Settings',
        'ai.key.missingShort': 'key missing',

        'ai.model.engine': 'AI engine',
        'ai.model.version': 'Model version',
        'ai.model.preview': 'Preview',
        'ai.model.vision': 'Native vision',
        'ai.model.ocr': 'Text OCR',
        'ai.model.reasoning': 'Reasoning',
        'ai.model.web': 'Web',

        'ai.quota.today': '{used}/{limit} generations today',

        'ai.progress.generating': 'Generating…',
        'ai.progress.analyzing': 'Analyzing content…',
        'ai.progress.writing': 'Writing…',
        'ai.progress.saving': 'Saving…',
        'ai.progress.longHint': 'Large documents can take a few minutes…',
        'ai.progress.elapsed': 'Elapsed: {time}',
        'ai.progress.keepOpen': 'Keep this window open. “Cancel” stops the generation.',

        'ai.action.cancel': 'Cancel',
        'ai.action.cancelGeneration': 'Cancel generation',
        'ai.cancelled': 'Generation cancelled',

        'ai.error.aborted': 'Generation cancelled.',
        'ai.error.rateLimit': 'Daily limit reached ({used}/{limit}) — resets at {time}.',
        'ai.error.rateLimitTomorrow': 'Daily limit reached ({used}/{limit}) — resets tomorrow at {time}.',
        'ai.error.rateLimitNoTime': 'Daily limit reached ({used}/{limit}) — try again tomorrow.',
        'ai.error.providerQuota': 'Your {provider} key quota is used up. Wait a few minutes or pick another model (e.g. a Flash version).',
        'ai.error.timeout': 'Generation took more than 5 minutes. Try a shorter excerpt or a faster model (e.g. Flash).',
        'ai.error.network': "Can't reach the server. Check your internet connection and try again.",
        'ai.error.missingKey': '{provider} API key missing. Add it in Settings › API keys.',
        'ai.error.invalidKey': 'Your {provider} API key was rejected. Check it (or create a new one) in Settings › API keys.',
        'ai.error.overloaded': '{provider} is overloaded right now. Try again in a minute or switch models.',
        'ai.error.contextTooLong': 'This document is too long for this model. Pick a model with a larger context window or shorten the content.',
        'ai.error.modelNotFound': "This model isn't available with your {provider} key. Pick another one from the list.",
        'ai.error.invalidResponse': 'The AI returned a malformed answer. Try again or switch models.',
        'ai.error.server': 'The AI service hit an error. Please try again in a moment.',
        'ai.error.generic': 'Generation failed. Check your API key or your connection and try again.',
        'ai.error.withDetail': 'Generation failed: {detail}',
        'ai.error.noContent': 'Nothing to analyze. Make sure the document contains text.',
        'ai.error.noResult': 'The AI returned no usable result. Try again or switch models.',

        'ai.course.label': 'Destination course',
        'ai.course.placeholder': 'Choose a course…',
        'ai.course.none': 'No course (optional)',
        'ai.course.required': 'Choose a course: cloze exercises and revision sheets are saved inside a course.',
        'ai.course.optionalHint': 'Optional: attach the generated content to a course.',
        'ai.course.empty': 'No course available. Create a course first.',
        'ai.course.loading': 'Loading courses…',

        'ai.truncated.notice': 'Long document: only the first {limit} characters (of {total}) will be used for this format.',

        'ai.summary.empty': 'No summary yet',
        'ai.summary.emptyHint': 'Generate a summary of this content in one click.',
        'ai.summary.generateCta': 'Generate a summary',
        'ai.summary.loading': 'Loading summary…',
        'ai.summary.errorTitle': 'Generation failed',
        'ai.summary.unsupportedFormat': "This summary format can't be displayed yet.",

        'ai.plan.thinking': 'AI is building your schedule…',
        'ai.plan.ready': 'Your plan is ready!',
        'ai.plan.readySubtitle': 'Here is your optimized path to the exam.',
        'ai.plan.courses': 'Courses',
        'ai.plan.folders': 'Folders (subjects)',
        'ai.plan.date': 'Date',
        'ai.plan.calendarLinked': 'Calendar linked',
        'ai.plan.hoursPerDay': 'Hours per day',
        'ai.plan.daysPerWeek': 'Days per week',
        'ai.plan.daysShort': '{n}d',
        'ai.plan.weeklyEffort': 'Total weekly effort:',
        'ai.plan.hoursPerWeek': '~{hours} hours / week',
        'ai.plan.provider': 'AI provider',
        'ai.plan.day': 'Day {n}',
        'ai.plan.highPriority': 'High priority',
        'ai.plan.examDay': 'Exam day',
        'ai.plan.start': "Let's go!",
        'ai.plan.next': 'Next',
        'ai.plan.type.practice': 'Practice',
        'ai.plan.type.review': 'Review',
        'ai.plan.type.study': 'Study',
        'ai.plan.error': 'Could not generate the program.',
    },
}

/** Langue de l'interface, lue hors React (même source que LanguageProvider). */
export function getUILanguage(): UILanguage {
    try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null
        if (stored === 'en' || stored === 'fr') return stored
    } catch {
        // localStorage indisponible (mode privé, SSR…)
    }
    return 'fr'
}

export function interpolate(text: string, variables?: Record<string, string | number>): string {
    if (!variables) return text
    return Object.entries(variables).reduce(
        (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
        text
    )
}

/** Texte par défaut d'une clé `ai.*` (FR en repli). Renvoie la clé si inconnue. */
export function aiMessage(key: string, variables?: Record<string, string | number>, lang: UILanguage = getUILanguage()): string {
    const text = AI_MESSAGES[lang]?.[key] ?? AI_MESSAGES.fr[key] ?? key
    return interpolate(text, variables)
}

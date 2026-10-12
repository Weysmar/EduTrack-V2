import { useCallback } from 'react'
import { useLanguage } from '@/components/language-provider'

/**
 * Fallback texts for the navigation / dashboard / command palette keys.
 * The source of truth is language-provider.tsx: once a key exists there, it wins.
 * These fallbacks only avoid displaying raw keys until the translations are added.
 */
export const NAV_FALLBACKS: Record<string, { fr: string; en: string }> = {
    'nav.home': { fr: 'Accueil', en: 'Home' },
    'nav.flashcards': { fr: 'Flashcards', en: 'Flashcards' },
    'nav.calendar': { fr: 'Agenda', en: 'Calendar' },
    'nav.focus': { fr: 'Focus', en: 'Focus' },
    'nav.knowledgeMap': { fr: 'Carte des connaissances', en: 'Knowledge map' },
    'nav.hub': { fr: 'Hub', en: 'Hub' },
    'nav.menu': { fr: 'Menu', en: 'Menu' },
    'nav.mainNav': { fr: 'Navigation principale', en: 'Main navigation' },
    'nav.toggleSidebar': { fr: 'Afficher / masquer le menu', en: 'Show / hide menu' },
    'nav.collapse': { fr: 'Réduire la barre latérale', en: 'Collapse sidebar' },
    'nav.expand': { fr: 'Agrandir la barre latérale', en: 'Expand sidebar' },

    'cmd.label': { fr: 'Menu de commandes', en: 'Command menu' },
    'cmd.placeholder': { fr: 'Rechercher un cours, un document ou une commande…', en: 'Search courses, documents or commands…' },
    'cmd.noResults': { fr: 'Aucun résultat.', en: 'No results found.' },
    'cmd.group.navigation': { fr: 'Navigation', en: 'Navigation' },
    'cmd.group.actions': { fr: 'Actions', en: 'Actions' },
    'cmd.group.recent': { fr: 'Récents', en: 'Recent' },
    'cmd.group.preferences': { fr: 'Préférences', en: 'Preferences' },
    'cmd.focusStart': { fr: 'Démarrer le minuteur Focus', en: 'Start focus timer' },
    'cmd.focusPause': { fr: 'Mettre en pause le minuteur Focus', en: 'Pause focus timer' },
    'cmd.themeLight': { fr: 'Thème clair', en: 'Light theme' },
    'cmd.themeDark': { fr: 'Thème sombre', en: 'Dark theme' },
    'cmd.themeSystem': { fr: 'Thème du système', en: 'System theme' },
    'cmd.switchLanguage': { fr: 'Switch to English', en: 'Passer en français' },
    'cmd.moreResults': { fr: '{count} autres résultats, affinez votre recherche', en: '{count} more results, refine your search' },

    'dashboard.continue': { fr: 'Continuer', en: 'Continue' },
    'dashboard.continue.empty': { fr: 'Ouvrez un document : il apparaîtra ici pour y revenir en un clic.', en: 'Open a document and it will show up here so you can jump back in.' },
    'dashboard.resume': { fr: 'Reprendre', en: 'Resume' },
    'dashboard.hero.ready': { fr: 'Prêt à continuer votre progression ?', en: 'Ready to continue your progress?' },
    'dashboard.hero.recentlyOn': { fr: 'Dernier document ouvert :', en: 'Last opened document:' },
    'dashboard.hero.pickCourse': { fr: 'Choisissez un cours pour reprendre là où vous en étiez.', en: 'Pick a course to pick up where you left off.' },
    'dashboard.hero.newUser': { fr: 'Bienvenue ! Créez votre premier cours pour organiser vos notes, documents et révisions.', en: 'Welcome! Create your first course to organize your notes, documents and revision.' },
    'dashboard.createFirstCourse': { fr: 'Créer mon premier cours', en: 'Create my first course' },
    'dashboard.error.title': { fr: 'Impossible de charger vos données', en: "Couldn't load your data" },
    'dashboard.error.desc': { fr: 'Vérifiez votre connexion puis réessayez.', en: 'Check your connection and try again.' },
    'common.retry': { fr: 'Réessayer', en: 'Retry' },
    'common.close': { fr: 'Fermer', en: 'Close' },
}

/**
 * Like `t()` from useLanguage, but falls back to NAV_FALLBACKS when the key
 * is not (yet) present in language-provider.tsx.
 */
export function useNavT() {
    const { t, language } = useLanguage()
    return useCallback(
        (key: string, vars?: Record<string, string | number>) => {
            const value = t(key, vars)
            if (value !== key) return value
            const fallback = NAV_FALLBACKS[key]
            if (!fallback) return key
            let text = language === 'en' ? fallback.en : fallback.fr
            if (vars) {
                Object.entries(vars).forEach(([k, v]) => {
                    text = text.split(`{${k}}`).join(String(v))
                })
            }
            return text
        },
        [t, language]
    )
}

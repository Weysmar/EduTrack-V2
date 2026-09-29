import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * Neutralise le HTML d'une page web externe avant de le stocker comme snapshot
 * "lecture intégrée" (item.type === 'link').
 *
 * Défense en profondeur : le rendu de ce HTML dans l'iframe est de toute façon
 * fait sans allow-scripts/allow-forms côté client (ItemView.tsx), donc un script
 * injecté ne s'exécuterait déjà pas. Mais si le fichier est téléchargé et ouvert
 * localement par l'utilisateur ("Télécharger HTML (Hors ligne)"), il n'y a plus
 * aucun sandbox — d'où l'intérêt de retirer le code actif à la source.
 */

let purifyInstance: ReturnType<typeof DOMPurify> | null = null;

const getPurify = () => {
    if (!purifyInstance) {
        const { window } = new JSDOM('');
        purifyInstance = DOMPurify(window as any);
    }
    return purifyInstance;
};

export const sanitizeHtmlSnapshot = (html: string): string => {
    try {
        const purify = getPurify();
        return purify.sanitize(html, {
            WHOLE_DOCUMENT: true,
            FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'applet', 'form'],
            FORBID_ATTR: ['srcdoc'],
            ADD_URI_SAFE_ATTR: [],
        });
    } catch (err) {
        console.error('[sanitizeHtml] Failed to sanitize snapshot, storing empty document as a safe fallback:', err);
        return '<!doctype html><html><body></body></html>';
    }
};

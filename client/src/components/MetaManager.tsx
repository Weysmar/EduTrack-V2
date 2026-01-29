import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function MetaManager() {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        let title = 'HubTrack';
        let favicon = '/logo.svg';

        if (path.startsWith('/finance')) {
            title = 'FinanceTrack - Gestion de Portefeuille';
            favicon = '/finance.svg';
        } else if (path.startsWith('/hub')) {
            title = 'HubTrack - Hub';
            favicon = '/logo.svg';
        } else if (path.startsWith('/edu')) {
            title = 'EduTrack - Espace Étudiant';
            favicon = '/logo.svg';

            // Sub-routes specific titles
            if (path.includes('/dashboard')) title = 'EduTrack - Tableau de bord';
            if (path.includes('/library')) title = 'EduTrack - Bibliothèque';
            if (path.includes('/calendar')) title = 'EduTrack - Calendrier';
        } else if (path === '/') {
            title = 'HubTrack - Hub central pour votre vie';
            favicon = '/logo.svg';
        }

        // Update Title
        document.title = title;

        // Update Favicon
        const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (link) {
            link.type = 'image/svg+xml';
            link.href = favicon;
        } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = favicon;
            document.head.appendChild(newLink);
        }

    }, [location]);

    return null;
}

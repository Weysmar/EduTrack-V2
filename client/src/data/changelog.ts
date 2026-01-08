export interface ChangelogEntry {
    version: string
    date: string
    title: string
    changes: {
        type: 'new' | 'fix' | 'improvement'
        description: string
    }[]
}

export const changelogs: ChangelogEntry[] = [
    {
        version: "0.5.1",
        date: "2026-01-08",
        title: "Mobilité & Stabilité 📱⚡",
        changes: [
            { type: 'improvement', description: "Optimisation Mobile : Refonte de la vue cours pour smartphone avec des cartes plus compactes et un en-tête intelligent." },
            { type: 'improvement', description: "Navigation Fluide : Les dossiers sont désormais ouverts par défaut pour un accès direct à vos cours." },
            { type: 'new', description: "Lecteur Office Hybride : Transition vers Google Viewer pour une ouverture fiable des PPT et Excel sur tous supports." },
            { type: 'fix', description: "Intercepteur API : Détection automatique des sessions expirées et reconnexion intelligente." },
            { type: 'fix', description: "Dépendances : Réparation des erreurs de compilation liées aux modules Word (docx-preview) et HEIC (heic2any)." },
            { type: 'fix', description: "Synchro Prisma : Mise à jour du moteur de base de données pour une cohérence parfaite des types serveur." }
        ]
    },
    {
        version: "0.5.0",
        date: "2026-01-07",
        title: "Stabilité & Intelligence 🧠",
        changes: [
            { type: 'fix', description: "Persistance Clés API : Correction d'un bug critique où les clés disparaissaient. Elles sont désormais stockées de manière sécurisée." },
            { type: 'fix', description: "Déconnexion Propre : Le bouton 'Déconnexion' nettoie maintenant correctement la session et le token." },
            { type: 'fix', description: "Fiabilité IA : Correction des erreurs 404/500 lors de la génération de flashcards et meilleure gestion des quotas Gemini." },
            { type: 'improvement', description: "Polissage Localisation : Traductions françaises corrigées et assurance que le thème 'Minecraft' s'applique partout." }
        ]
    },
    {
        version: "0.4.1",
        date: "2026-01-06",
        title: "Hub de Ressources 📂",
        changes: [
            { type: 'new', description: "Visionneuse Multi-Format : Support natif des PDF, documents Office (Word, Excel, PowerPoint) et images directement dans l'app." },
            { type: 'improvement', description: "Métadonnées : Cartes de ressources plus claires affichant format, date et nom complet." },
            { type: 'fix', description: "Suppression Sécurisée : Correction des erreurs 'Fichier non trouvé' et ajout de feedback visuel." },
            { type: 'fix', description: "Détection Doc : Détection robuste du type de fichier assurant l'ouverture dans la bonne visionneuse." }
        ]
    },
    {
        version: "0.4.0",
        date: "2026-01-04",
        title: "Refonte Synchro Cloud 🔄",
        changes: [
            { type: 'fix', description: "Infrastructure Sync : Backend de synchronisation entièrement refait pour corriger authentification et routage." },
            { type: 'fix', description: "Upload Fichiers : Résolution des erreurs 404 (Nginx)." },
            { type: 'fix', description: "Schéma Base de Données : Correction génération UUID pour dossiers et cours." },
            { type: 'improvement', description: "Vitesse Sync : Intervalle réduit de 30s à 3s pour des mises à jour quasi-instantanées." },
            { type: 'improvement', description: "Nettoyage Intelligent : Suppression auto des vieux enregistrements (>7 jours)." },
            { type: 'improvement', description: "Optimisation Tombstone : Synchro des suppressions sur 24h seulement." },
            { type: 'fix', description: "Config Nginx : Correction du routage API (/api/, /auth/, /sync)." }
        ]
    },
    {
        version: "0.3.0",
        date: "2026-01-01",
        title: "Focus & Localisation 🌍",
        changes: [
            { type: 'new', description: "Mode Focus : Résumés en plein écran sans distraction." },
            { type: 'new', description: "Multi-Langue : Disponible en Anglais, Français et... Minecraft ?" },
            { type: 'new', description: "Résumés IA 2.0 : Utilise Gemini pour des résumés plus pertinents." },
            { type: 'improvement', description: "Export Amélioré : Téléchargement en PDF et Word (.docx)." }
        ]
    },
    {
        version: "0.2.0",
        date: "2026-01-01",
        title: "Export PDF & Recherche",
        changes: [
            { type: 'new', description: "Export PDF : Génération de PDF professionnels pour vos résumés." },
            { type: 'new', description: "Centre de Commande : `Cmd+K` pour tout rechercher instantanément." },
            { type: 'improvement', description: "Analytics : Timeline d'activité." },
            { type: 'fix', description: "Optimisation gros fichiers." }
        ]
    },
    {
        version: "0.1.5",
        date: "2025-12-31",
        title: "Structure & Organisation",
        changes: [
            { type: 'new', description: "Dossiers Récursifs : Arborescence infinie." },
            { type: 'new', description: "Favoris Rapides : Épinglez vos cours importants." },
            { type: 'improvement', description: "Drag & Drop : Réorganisation intuitive." }
        ]
    },
    {
        version: "0.1.0",
        date: "2025-12-30",
        title: "Genèse",
        changes: [
            { type: 'new', description: "Moteur d'Apprentissage : Cours, Notes, Exercices." },
            { type: 'new', description: "Graphe de Connaissances : Visualisation interactive." }
        ]
    }
]

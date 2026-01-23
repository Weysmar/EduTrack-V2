import { ChangelogEntry } from './changelog';

export const financeChangelogs: ChangelogEntry[] = [
    {
        version: "2.0.0",
        date: "2026-01-23",
        title: "Lancement de FinanceTrack V2 & Hub Unifié",
        changes: [
            { type: "new", description: "Introduction du Hub Central : Accès unifié à EduTrack et FinanceTrack." },
            { type: "new", description: "Architecture Cloud-First : Synchronisation temps réel et sécurisée des données financières." },
            { type: "new", description: "Système d'Import Universel : Support natif des fichiers bancaires CSV, OFX et QIF." },
            { type: "new", description: "Moteur de Déduplication Stricte : Protection contre les doublons de transactions lors des imports multiples." },
            { type: "improvement", description: "Précision Financière : Migration du moteur de calcul vers une logique décimale pour une exactitude comptable parfaite." },
            { type: "improvement", description: "Interface Dédiée : Nouvelle Sidebar financière et thème 'Nature' vert émeraude." },
            { type: "new", description: "Gestion des Paramètres : Page de configuration centralisée (Clés API IA, Apparence, Changelog)." },
            { type: "improvement", description: "Expérience Utilisateur : Animations fluides (Login Shake) et navigation optimisée." }
        ]
    },
    {
        version: "1.5.0",
        date: "2026-01-20",
        title: "Préparation de l'infrastructure Finance",
        changes: [
            { type: "new", description: "Création des modèles de base (Transaction, Budget, Compte)." },
            { type: "fix", description: "Isolement des contextes éducatifs et financiers." }
        ]
    }
];

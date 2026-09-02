  import { Shield, ArrowLeft, Lock, Database, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="border-b pb-6">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour à l'accueil
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Politique de Confidentialité</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Introduction */}
                <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                    <p>
                        La présente Politique de Confidentialité décrit la manière dont <strong>HubTrack / EduTrack</strong> (« nous », « notre » ou « l'application ») collecte, utilise et protège vos données lorsque vous utilisez nos services via le domaine <code>https://hubtrack.vpdeploy.com</code>.
                    </p>
                    <p>
                        Nous accordons une importance primordiale au respect de votre vie privée et à la sécurité de vos informations personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
                    </p>
                </section>

                {/* Google User Data Policy */}
                <section className="bg-card border rounded-2xl p-6 space-y-4 shadow-xs">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <Lock className="h-5 w-5 text-primary" />
                        <h2>Utilisation des données Google & Services OAuth (Google Drive / Calendar)</h2>
                    </div>
                    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>
                            Lorsque vous connectez votre compte Google pour utiliser <strong>Google Drive</strong> ou <strong>Google Calendar</strong> dans EduTrack :
                        </p>
                        <ul className="list-disc list-inside space-y-2 pl-2">
                            <li>
                                <strong>Google Drive :</strong> L'accès est strictement limité aux fichiers que vous choisissez explicitement via le sélecteur Google Picker (documents, feuilles de calcul, PDF, images). Les fichiers importés sont stockés dans votre espace de travail EduTrack uniquement pour vous permettre de les consulter, réviser et générer des résumés ou exercices.
                            </li>
                            <li>
                                <strong>Google Calendar :</strong> L'accès est utilisé exclusivement pour afficher votre planning de révision et détecter les dates d'examens.
                            </li>
                            <li>
                                <strong>Pas de vente ni partage :</strong> Vos données et jetons Google ne sont jamais vendus, loués ou partagés avec des tiers à des fins publicitaires ou de traçage.
                            </li>
                            <li>
                                <strong>Conformité Google API :</strong> L'utilisation par EduTrack des informations reçues des API Google respecte la <em>Politique relative aux données utilisateur des services API Google</em> (Google API Services User Data Policy).
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Data Collection */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <Database className="h-5 w-5 text-primary" />
                        <h2>Données collectées</h2>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                        <p>Nous pouvons collecter et traiter les catégories de données suivantes :</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Informations de compte :</strong> Nom, adresse email et identifiants de session.</li>
                            <li><strong>Contenus d'apprentissage :</strong> Cours, notes, résumés, exercices et fichiers téléversés.</li>
                            <li><strong>Données de configuration :</strong> Préférences d'interface, paramètres linguistiques et clés d'API personnelles renseignées par l'utilisateur.</li>
                        </ul>
                    </div>
                </section>

                {/* AI Processing */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        <h2>Traitement par Intelligence Artificielle (IA)</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Lorsque vous demandez la génération d'un résumé, d'un quiz ou de flashcards, le contenu textuel extrait du document est envoyé de manière sécurisée aux fournisseurs d'IA configurés (ex: Google Gemini ou Perplexity) dans le seul but de générer la réponse demandée.
                    </p>
                </section>

                {/* User Rights */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <Eye className="h-5 w-5 text-primary" />
                        <h2>Vos droits & Suppression des données</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Vous disposez d'un droit d'accès, de rectification et de suppression de toutes vos données personnelles. Vous pouvez à tout moment déconnecter vos intégrations Google et supprimer vos documents ou comptes directement depuis l'application.
                    </p>
                </section>

                {/* Contact */}
                <section className="border-t pt-6 text-sm text-muted-foreground">
                    <p>
                        Pour toute question concernant cette politique de confidentialité, vous pouvez nous contacter à l'adresse support indiquée sur notre plateforme.
                    </p>
                </section>
            </div>
        </div>
    );
}

 import { FileText, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
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
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">Conditions Générales d'Utilisation</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Acceptance */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <h2>1. Acceptation des conditions</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        En accédant et en utilisant les services de <strong>HubTrack / EduTrack</strong> accessibles à l'adresse <code>https://hubtrack.vpdeploy.com</code>, vous acceptez sans réserve d'être lié par les présentes Conditions Générales d'Utilisation.
                    </p>
                </section>

                {/* Service Description */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <h2>2. Description du service</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        HubTrack est une plateforme tout-en-un proposant des modules d'apprentissage (EduTrack : cours, résumés, révisions, intégrations documentaires et IA) et de gestion de budget (FinanceTrack).
                    </p>
                </section>

                {/* Third Party Integrations */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <h2>3. Intégrations tierces & Services Google</h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        L'utilisateur a la possibilité de connecter des services tiers optionnels, notamment Google Drive et Google Calendar, pour synchroniser et importer ses propres documents ou emplois du temps. L'utilisateur demeure l'unique propriétaire de ses documents et contenus importés.
                    </p>
                </section>

                {/* User Obligations */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2.5 text-foreground font-semibold text-lg">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        <h2>4. Responsabilité de l'utilisateur</h2>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                        <p>En utilisant la plateforme, vous vous engagez à :</p>
                        <ul className="list-disc list-inside space-y-1 pl-2">
                            <li>Ne pas téléverser de contenus illégaux, diffamatoires ou portant atteinte aux droits de tiers.</li>
                            <li>Préserver la confidentialité de vos identifiants d'accès et clés d'API.</li>
                            <li>Utiliser les fonctionnalités d'IA dans le respect des règles des fournisseurs respectifs.</li>
                        </ul>
                    </div>
                </section>

                {/* Modifications */}
                <section className="border-t pt-6 text-sm text-muted-foreground">
                    <p>
                        Nous nous réservons le droit de modifier les présentes conditions à tout moment. La date de dernière mise à jour sera alors modifiée en conséquence.
                    </p>
                </section>
            </div>
        </div>
    );
}

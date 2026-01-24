import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Wallet, BrainCircuit } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { AuthPage } from './AuthPage';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

export function LandingPage() {
    const { isAuthenticated } = useAuthStore();
    const controls = useAnimation();

    useEffect(() => {
        controls.start({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: 0.2 } });
    }, []);

    // Trigger animation handler
    const handleAccessClick = () => {
        controls.start({
            x: [0, -10, 10, -10, 10, 0],
            borderColor: ["rgba(0,0,0,0)", "rgba(59, 130, 246, 0.5)", "rgba(0,0,0,0)"],
            transition: { duration: 0.6, ease: "easeInOut" }
        });
        // Optional: Focus the email input if possible, but visual cue is often enough
        document.querySelector('input[name="email"]')?.classList.add('ring-2', 'ring-primary');
        setTimeout(() => document.querySelector('input[name="email"]')?.classList.remove('ring-2', 'ring-primary'), 1000);
    };

    if (isAuthenticated) {
        return <Navigate to="/hub" replace />;
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navbar */}
            <nav className="border-b bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
                        <span className="font-bold text-xl tracking-tight">EduTrack Hub</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <button
                            onClick={handleAccessClick}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium hover:opacity-90 transition-all font-sans text-sm"
                        >
                            Accéder à mon espace
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative pt-20 pb-16 md:pt-32 md:pb-32 overflow-hidden">
                    {/* Background Gradients */}
                    <div className="absolute inset-0 z-0">
                        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]" />
                        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
                    </div>

                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
                        {/* Text Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                                Une Suite Complète pour <br />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-violet-500 dark:from-blue-400 dark:to-purple-400">
                                    Vos Études & Vos Finances
                                </span>
                            </h1>
                            <p className="text-lg text-muted-foreground mb-8 text-pretty">
                                Centralisez tout : Cours, Révisions, Flashcards et Gestion financière dans un Hub unique et sécurisé.
                                Boosté par l'IA pour vous faire gagner du temps.
                            </p>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                        <BrainCircuit className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-foreground">EduTrack</p>
                                        <p className="text-muted-foreground">Intelligence Éducative</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <Wallet className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-foreground">FinanceTrack</p>
                                        <p className="text-muted-foreground">Gestion Budgétaire Privée</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-foreground">Cloud Sync</p>
                                        <p className="text-muted-foreground">Données sécurisées & accessibles partout</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Login Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={controls}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            id="auth-section"
                            className="w-full max-w-md mx-auto"
                        >
                            <div className="bg-card border rounded-2xl shadow-2xl p-6 md:p-8">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold">Bienvenue</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Connectez-vous pour accéder au Hub</p>
                                </div>

                                {/* Reuse existing Auth logic via container or direct import if refactored */}
                                {/* For now, importing AuthPage might render full page style which is bad. */}
                                {/* Ideally extract logic. Here I will assume AuthPage handles layout or wrap it */}
                                {/* Since AuthPage in this project is full page, I should likely refactor AuthPage or just Frame it. */}

                                <div className="auth-widget-wrapper">
                                    <AuthPage isEmbedded={true} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t py-8 text-center text-sm text-muted-foreground bg-muted/20">
                <p>&copy; {new Date().getFullYear()} EduTrack Hub. Tous droits réservés.</p>
            </footer>
        </div>
    );
}

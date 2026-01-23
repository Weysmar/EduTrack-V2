import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Wallet, LogOut, Settings, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/mode-toggle';

export function HubPage() {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();
    const { activeProfile } = useProfileStore();

    const handleAppSelect = (app: 'edu' | 'finance') => {
        if (app === 'edu') navigate('/edu/dashboard');
        if (app === 'finance') navigate('/finance/dashboard');
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-4xl w-full relative z-10 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className="text-4xl font-bold tracking-tight">Bonjour, {user?.email?.split('@')[0] || 'Utilisateur'} 👋</h1>
                        <p className="text-muted-foreground text-lg">Choisissez votre espace de travail</p>
                    </motion.div>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* EduTrack Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAppSelect('edu')}
                        className="group relative h-[300px] rounded-3xl p-8 text-left bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-all shadow-lg hover:shadow-blue-500/10 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            <div className="h-16 w-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                                <BrainCircuit className="h-8 w-8" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">EduTrack</h2>
                            <p className="text-muted-foreground">Gestion de cours, révisions IA, Mindmaps et planification.</p>
                        </div>

                        <div className="relative z-10 flex items-center text-blue-600 font-medium group-hover:gap-2 transition-all">
                            Accéder <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                    </motion.button>

                    {/* FinanceTrack Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAppSelect('finance')}
                        className="group relative h-[300px] rounded-3xl p-8 text-left bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="relative z-10">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
                                <Wallet className="h-8 w-8" />
                            </div>
                            <h2 className="text-3xl font-bold mb-2">FinanceTrack</h2>
                            <p className="text-muted-foreground">Gestion de budget, transactions, analyses et audit.</p>
                        </div>

                        <div className="relative z-10 flex items-center text-emerald-600 font-medium group-hover:gap-2 transition-all">
                            Accéder <ArrowRight className="h-4 w-4 ml-1" />
                        </div>
                    </motion.button>
                </div>

                {/* Footer Actions */}
                <div className="flex justify-center gap-6 mt-12">
                    <button
                        onClick={() => navigate('/edu/settings')}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
                    >
                        <Settings className="h-4 w-4" /> Paramètres
                    </button>
                    <div className="w-px h-4 bg-border self-center" />
                    <button onClick={logout} className="text-muted-foreground hover:text-red-500 flex items-center gap-2 text-sm transition-colors">
                        <LogOut className="h-4 w-4" /> Déconnexion
                    </button>
                </div>

                <div className="absolute top-6 right-6">
                    <ModeToggle />
                </div>
            </div>
        </div>
    );
}

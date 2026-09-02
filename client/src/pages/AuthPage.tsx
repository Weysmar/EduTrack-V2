import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';


interface AuthPageProps {
    isEmbedded?: boolean;
}

export function AuthPage({ isEmbedded = false }: AuthPageProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuthStore();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const logoSrc = '/logo.svg';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/hub'); // Navigate to Hub after login
        } catch (err: any) {
            setError(err.message || t('auth.error.default'));
        } finally {
            setIsLoading(false);
        }
    };

    const Container = isEmbedded ? 'div' : 'main';
    const containerClasses = isEmbedded
        ? "w-full"
        : "flex min-h-screen items-center justify-center bg-background px-4";

    const cardClasses = isEmbedded
        ? "w-full space-y-6"
        : "w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg";

    return (
        <Container className={containerClasses}>
            <div className={cardClasses}>
                <div className="text-center">
                    {!isEmbedded && (
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-3">
                                <img src={logoSrc} alt="EduTrack Logo" className="h-10 w-10 object-contain" />
                                <span className="font-bold text-2xl tracking-tight text-foreground">EduTrack</span>
                            </div>
                        </div>
                    )}
                    <h2 className={`font-bold tracking-tight text-foreground ${isEmbedded ? 'text-xl' : 'text-3xl'}`}>
                        {t('auth.welcome.back')}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('auth.login.desc')}
                    </p>
                </div>

                <form className={`space-y-4 ${isEmbedded ? 'mt-4' : 'mt-8'}`} onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="auth-email" className="block text-sm font-medium text-foreground">{t('auth.email')}</label>
                            <input
                                id="auth-email"
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label htmlFor="auth-password" className="block text-sm font-medium text-foreground">{t('auth.password')}</label>
                            <input
                                id="auth-password"
                                type="password"
                                required
                                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive text-center">{error}</div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('auth.submit.login')}
                        </button>
                    </div>
                </form>
            </div>
        </Container>
    );
}

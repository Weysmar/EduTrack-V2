import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/language-provider';


export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login, register, user } = useAuthStore();
    const { loadProfile } = useProfileStore();
    const navigate = useNavigate();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password);
            }

            // Navigate
            // The authStore/profileStore should handle fetching the profile data
            // loadProfile(currentUser.profileId); // Handled in store or AppLayout

            navigate('/');
        } catch (err: any) {
            setError(err.message || t('auth.error.default'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8 rounded-lg border bg-card p-8 shadow-lg">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="EduTrack Logo" className="h-10 w-10 object-contain rounded-lg shadow-sm" />
                            <span className="font-bold text-2xl tracking-tight text-white">EduTrack</span>
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">
                        {isLogin ? t('auth.welcome.back') : t('auth.create.account')}
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {isLogin
                            ? t('auth.login.desc')
                            : t('auth.register.desc')}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        {!isLogin && (
                            <div>
                                <label htmlFor="auth-name" className="block text-sm font-medium text-foreground">{t('auth.name')}</label>
                                <input
                                    id="auth-name"
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        )}
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
                            {isLogin ? t('auth.submit.login') : t('auth.submit.register')}
                        </button>
                    </div>
                </form>

                <div className="text-center text-sm">
                    <button
                        className="font-medium text-primary hover:text-primary/80"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin
                            ? t('auth.switch.toRegister')
                            : t('auth.switch.toLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
}

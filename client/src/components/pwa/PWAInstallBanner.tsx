import { Download, X, Sparkles } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export function PWAInstallBanner() {
    const { isInstallable, isInstalled, isDismissed, promptInstall, dismissBanner } = usePWAInstall()

    if (!isInstallable || isInstalled || isDismissed) {
        return null
    }

    return (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-card/95 backdrop-blur-xl border border-primary/20 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <img src="/logo.svg" alt="EduTrack" className="h-6 w-6 object-contain filter brightness-0 invert" onError={(e) => {
                        // fallback to icon if SVG error
                        (e.target as HTMLElement).style.display = 'none';
                    }} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                        <span>Installer EduTrack</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">PWA</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Accédez à vos cours en 1 clic sur votre écran d'accueil, profitez du plein écran et révisez même hors-ligne.
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={() => promptInstall()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Installer</span>
                        </button>

                        <button
                            onClick={() => dismissBanner(7)}
                            className="px-3 py-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                        >
                            Plus tard
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => dismissBanner(7)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors -mr-1 -mt-1"
                    title="Fermer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

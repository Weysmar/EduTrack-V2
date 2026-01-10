import { useFocusStore } from '@/store/focusStore';
import { Play, Pause, RotateCcw, Brain, Coffee, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function FocusPage() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const {
        timeLeft,
        isActive,
        mode,
        start,
        pause,
        reset,
        setMode
    } = useFocusStore();

    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Progress percentage
    const totalTime = mode === 'work' ? 25 * 60 : (mode === 'break' ? 5 * 60 : 15 * 60);
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    // Listen for Escape to exit fullscreen
    useEffect(() => {
        const handleEsc = () => {
            if (!document.fullscreenElement) setIsFullscreen(false);
        };
        document.addEventListener('fullscreenchange', handleEsc);
        return () => document.removeEventListener('fullscreenchange', handleEsc);
    }, []);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-500 relative overflow-hidden">

            {/* Background Ambience */}
            <div className={cn(
                "absolute inset-0 transition-colors duration-1000 -z-10",
                mode === 'work' ? "bg-background" : "bg-green-50/10 dark:bg-green-950/20"
            )} />

            {/* Ambient Pulse Circle */}
            {isActive && (
                <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20 -z-10 animate-pulse",
                    mode === 'work' ? "bg-primary" : "bg-green-500"
                )} />
            )}

            {/* Back Button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                {t('common.back') || "Retour"}
            </button>

            {/* Fullscreen Toggle */}
            <button
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle Fullscreen"
            >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            {/* Main Timer Container */}
            <div className="flex flex-col items-center gap-8 w-full max-w-md z-1">

                {/* Mode Selector pills */}
                <div className="flex bg-muted/50 p-1.5 rounded-full border">
                    <button
                        onClick={() => setMode('work')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all",
                            mode === 'work' ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Focus
                    </button>
                    <button
                        onClick={() => setMode('break')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all",
                            mode === 'break' ? "bg-background shadow text-green-600" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Pause courte
                    </button>
                    <button
                        onClick={() => setMode('longBreak')}
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all",
                            mode === 'longBreak' ? "bg-background shadow text-green-600" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Pause longue
                    </button>
                </div>

                {/* Big Timer Display */}
                <div className="relative">
                    {/* SVG Ring */}
                    <svg className="w-72 h-72 md:w-96 md:h-96 -rotate-90 transform drop-shadow-2xl">
                        <circle
                            cx="50%" cy="50%" r="48%"
                            className="stroke-muted fill-none"
                            strokeWidth="8"
                        />
                        <circle
                            cx="50%" cy="50%" r="48%"
                            className={cn(
                                "fill-none transition-all duration-1000 ease-linear",
                                mode === 'work' ? "stroke-primary" : "stroke-green-500"
                            )}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="300%"
                            strokeDashoffset={`${300 - (progress * 3)}%`} // Approximate circumference logic
                        />
                    </svg>

                    {/* Time Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={cn(
                            "text-7xl md:text-8xl font-bold tracking-tighter tabular-nums transition-colors",
                            isActive ? "opacity-100" : "opacity-80",
                            mode === 'break' || mode === 'longBreak' ? "text-green-500" : "text-foreground"
                        )}>
                            {timeDisplay}
                        </div>
                        <div className="flex items-center gap-2 mt-4 text-muted-foreground uppercase tracking-widest text-sm font-semibold">
                            {isActive ? (
                                <span className="flex items-center gap-2 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                    En cours
                                </span>
                            ) : "Prêt"}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={reset}
                        className="p-4 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all border hover:border-border"
                        title="Réinitialiser"
                    >
                        <RotateCcw className="w-6 h-6" />
                    </button>

                    <button
                        onClick={isActive ? pause : start}
                        className={cn(
                            "p-8 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center",
                            mode === 'work'
                                ? "bg-primary text-primary-foreground shadow-primary/25"
                                : "bg-green-500 text-white shadow-green-500/25"
                        )}
                        title={isActive ? "Pause" : "Démarrer"}
                    >
                        {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                    </button>

                    {/* Placeholder for Sound Toggle later */}
                    <div className="w-14" />
                </div>

                {/* Task Context (Optional Enhancement) */}
                {mode === 'work' && (
                    <div className="mt-8 text-center max-w-sm">
                        <h3 className="text-muted-foreground text-sm uppercase tracking-wider mb-2">Focus actuel</h3>
                        <div className="bg-card border px-6 py-4 rounded-xl shadow-sm">
                            <p className="font-medium text-lg">Révision Générale</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

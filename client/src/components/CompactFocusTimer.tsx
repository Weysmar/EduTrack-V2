import { useFocusStore } from '@/store/focusStore';
import { Play, Pause, Brain, Coffee, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/language-provider';
import { useNavigate } from 'react-router-dom';

export function CompactFocusTimer() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const {
        timeLeft,
        isActive,
        mode,
        start,
        pause,
        reset // We might use reset or just stop logic
    } = useFocusStore();

    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isActive) {
            pause();
        } else {
            start();
        }
    };

    return (
        <div
            onClick={() => navigate('/focus')}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors cursor-pointer hover:bg-muted/50",
                mode === 'work'
                    ? (isActive ? "bg-primary/10 border-primary text-primary" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80")
                    : (isActive ? "bg-green-500/10 border-green-500 text-green-600" : "bg-muted border-transparent text-muted-foreground hover:bg-muted/80")
            )}>
            <div className="flex items-center gap-2">
                {mode === 'work' ? (
                    <Brain className="w-3.5 h-3.5" />
                ) : (
                    <Coffee className="w-3.5 h-3.5" />
                )}
                <span className="font-mono font-bold text-sm tabular-nums">
                    {timeDisplay}
                </span>
            </div>

            <div className="h-4 w-px bg-border/50 mx-1" />

            <button
                onClick={handleToggle}
                className="hover:scale-110 transition-transform focus:outline-none"
                title={isActive ? t('action.pause') || "Pause" : t('action.start') || "Start"}
            >
                {isActive ? (
                    <Pause className="w-3.5 h-3.5" />
                ) : (
                    <Play className="w-3.5 h-3.5" />
                )}
            </button>
        </div>
    );
}

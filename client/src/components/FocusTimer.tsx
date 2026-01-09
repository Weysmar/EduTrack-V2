import { useFocusStore } from '@/store/focusStore';
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export function FocusTimer() {
    const {
        timeLeft,
        isActive,
        mode,
        start,
        pause,
        reset
    } = useFocusStore();

    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Progress percentage for visual ring (optional, MVP includes text)
    const totalTime = mode === 'work' ? 25 * 60 : (mode === 'break' ? 5 * 60 : 15 * 60);
    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    return (
        <div className="w-full px-4 py-2">
            <div className={cn(
                "bg-card border rounded-lg p-3 flex flex-col items-center gap-2 transition-colors",
                mode === 'work' ? "border-primary/20" : "border-green-500/20 bg-green-50/5 dark:bg-green-900/10"
            )}>
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        {mode === 'work' ? (
                            <><Brain className="w-3 h-3" /> Focus</>
                        ) : (
                            <><Coffee className="w-3 h-3 text-green-500" /> Break</>
                        )}
                    </div>

                    {/* Tiny reset button */}
                    <button onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors" title="Reset Timer">
                        <RotateCcw className="w-3 h-3" />
                    </button>
                </div>

                <div className="text-3xl font-mono font-bold tracking-widest tabular-nums text-foreground">
                    {timeDisplay}
                </div>

                <div className="w-full flex gap-2">
                    <button
                        onClick={isActive ? pause : start}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all",
                            isActive
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        )}
                    >
                        {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        {isActive ? "Pause" : "Start"}
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mt-1">
                    <div
                        className={cn("h-full transition-all duration-1000 ease-linear", mode === 'work' ? "bg-primary" : "bg-green-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

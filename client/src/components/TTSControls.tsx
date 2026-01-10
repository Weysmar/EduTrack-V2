import React from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, Mic } from 'lucide-react';
import { useTTSStore } from '@/store/ttsStore';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { cn } from '@/lib/utils';
import { useLanguage } from './language-provider';

interface TTSControlsProps {
    text: string;
    lang?: string;
    className?: string;
}

export function TTSControls({ text, lang = 'en-US', className }: TTSControlsProps) {
    const { t } = useLanguage();
    const { rate, pitch, volume, setRate } = useTTSStore();

    const { isPlaying, isPaused, isSupported, speak, pause, resume, stop } = useSpeechSynthesis(text, {
        rate,
        pitch,
        volume,
        lang
    });

    if (!isSupported) {
        return (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded" title={t('tts.unsupported')}>
                TTS N/A
            </div>
        );
    }

    const handlePlayPause = () => {
        if (isPlaying) {
            if (isPaused) resume();
            else pause();
        } else {
            speak();
        }
    };

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
        <div className={cn("flex items-center gap-1 bg-muted/30 border rounded-lg p-1 animate-in fade-in", className)}>
            <button
                onClick={handlePlayPause}
                className={cn(
                    "p-1.5 rounded-md hover:bg-background transition-colors",
                    isPlaying && !isPaused ? "text-primary bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                title={isPlaying ? (isPaused ? t('tts.resume') : t('tts.pause')) : t('tts.play')}
            >
                {isPlaying && !isPaused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            {isPlaying && (
                <button
                    onClick={stop}
                    className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-destructive transition-colors"
                    title={t('tts.stop')}
                >
                    <Square className="h-3 w-3 fill-current" />
                </button>
            )}

            <div className="h-4 w-px bg-border mx-1" />

            <div className="relative group">
                <button
                    className="text-[10px] font-medium text-muted-foreground hover:text-foreground px-1 py-1 rounded min-w-[3ch] text-center"
                    title={t('tts.speed')}
                >
                    {rate}x
                </button>
                {/* Custom plain dropdown for speed to avoid complex Select usage inside a toolbar */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-popover border shadow-md rounded-md py-1 hidden group-hover:block z-50 min-w-[50px]">
                    {speeds.map(s => (
                        <button
                            key={s}
                            onClick={() => setRate(s)}
                            className={cn(
                                "w-full text-center text-xs py-1 hover:bg-muted transition-colors",
                                rate === s && "bg-primary/10 text-primary font-bold"
                            )}
                        >
                            {s}x
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

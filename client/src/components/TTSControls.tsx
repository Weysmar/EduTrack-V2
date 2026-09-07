import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import { useTTSStore } from '@/store/ttsStore';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { cn } from '@/lib/utils';
import { useLanguage } from './language-provider';

/**
 * Strips HTML tags, decodes HTML entities, and formats block elements with natural punctuation
 * so text-to-speech synthesizers speak fluently without stuttering over markup.
 */
export function extractPlainText(content: string): string {
    if (!content) return '';

    // If it doesn't contain HTML-like tags, clean whitespace and return
    if (!/<[a-z][\s\S]*>/i.test(content)) {
        return content.trim();
    }

    try {
        // Add spacing & period after block-level tags so adjacent paragraphs don't run together
        const formatted = content
            .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '. ')
            .replace(/<br\s*\/?>/gi, '. ');

        const parser = new DOMParser();
        const doc = parser.parseFromString(formatted, 'text/html');
        const text = doc.body.textContent || '';

        // Clean up redundant punctuation and whitespace
        return text
            .replace(/\s+/g, ' ')
            .replace(/\s*\.\s*\./g, '.')
            .replace(/\s+([.,!?;:])/g, '$1')
            .trim();
    } catch {
        return content
            .replace(/<[^>]*>?/gm, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}

interface TTSControlsProps {
    text: string;
    lang?: string;
    className?: string;
}

export function TTSControls({ text, lang = 'fr-FR', className }: TTSControlsProps) {
    const { t } = useLanguage();
    const { rate, pitch, volume, setRate } = useTTSStore();
    const [isSpeedOpen, setIsSpeedOpen] = useState(false);
    const speedMenuRef = useRef<HTMLDivElement>(null);

    // Clean plain text derived from input (HTML or markdown)
    const cleanText = useMemo(() => extractPlainText(text), [text]);
    const hasText = cleanText.length > 0;

    const { isPlaying, isPaused, isSupported, speak, pause, resume, stop } = useSpeechSynthesis(cleanText, {
        rate,
        pitch,
        volume,
        lang
    });

    // Close speed dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
                setIsSpeedOpen(false);
            }
        };
        if (isSpeedOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSpeedOpen]);

    if (!isSupported) {
        return (
            <div className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded" title={t('tts.unsupported') || "Synthèse vocale non supportée"}>
                TTS N/A
            </div>
        );
    }

    const handlePlayPause = () => {
        if (!hasText) return;
        if (isPlaying) {
            if (isPaused) resume();
            else pause();
        } else {
            speak();
        }
    };

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    return (
        <div className={cn("flex items-center gap-1 bg-muted/40 border rounded-lg p-1 animate-in fade-in select-none", className)}>
            <button
                type="button"
                onClick={handlePlayPause}
                disabled={!hasText}
                className={cn(
                    "p-1.5 rounded-md transition-all touch-manipulation flex items-center justify-center",
                    !hasText
                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                        : isPlaying && !isPaused
                            ? "text-primary bg-background shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/80 active:scale-95"
                )}
                title={!hasText ? (t('tts.empty') || "Aucun texte à lire") : isPlaying ? (isPaused ? (t('tts.resume') || "Reprendre") : (t('tts.pause') || "Pause")) : (t('tts.play') || "Lire à voix haute")}
                aria-label={isPlaying ? (isPaused ? "Reprendre la lecture" : "Mettre en pause") : "Lire à voix haute"}
            >
                {isPlaying && !isPaused ? (
                    <Pause className="h-4 w-4 fill-current text-primary" />
                ) : (
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                )}
            </button>

            {isPlaying && (
                <button
                    type="button"
                    onClick={stop}
                    className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-destructive transition-colors touch-manipulation active:scale-95"
                    title={t('tts.stop') || "Arrêter"}
                    aria-label="Arrêter la lecture"
                >
                    <Square className="h-3 w-3 fill-current" />
                </button>
            )}

            <div className="h-4 w-px bg-border mx-0.5" />

            <div className="relative" ref={speedMenuRef}>
                <button
                    type="button"
                    onClick={() => setIsSpeedOpen(prev => !prev)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-background/80 transition-colors min-w-[3.5ch] text-center touch-manipulation"
                    title={t('tts.speed') || "Vitesse de lecture"}
                    aria-label="Changer la vitesse de lecture"
                >
                    {rate}x
                </button>

                {isSpeedOpen && (
                    <div className="absolute top-full right-0 sm:left-1/2 sm:-translate-x-1/2 mt-1.5 bg-popover border shadow-lg rounded-md py-1 z-50 min-w-[56px] animate-in fade-in zoom-in-95">
                        {speeds.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => {
                                    setRate(s);
                                    setIsSpeedOpen(false);
                                }}
                                className={cn(
                                    "w-full text-center text-xs py-1.5 px-2 hover:bg-muted transition-colors font-medium touch-manipulation",
                                    rate === s && "bg-primary/10 text-primary font-bold"
                                )}
                            >
                                {s}x
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


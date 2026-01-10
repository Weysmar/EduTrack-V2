import { useState, useEffect, useRef, useCallback } from 'react';

export interface TTSOptions {
    rate: number;
    pitch: number;
    volume: number;
    lang?: string;
}

export interface SpeechState {
    isPlaying: boolean;
    isPaused: boolean;
    isSupported: boolean;
    lang: string;
}

export function useSpeechSynthesis(text: string, options: TTSOptions) {
    const [state, setState] = useState<SpeechState>({
        isPlaying: false,
        isPaused: false,
        isSupported: 'speechSynthesis' in window,
        lang: options.lang || 'en-US'
    });

    const synthesisRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (state.isSupported) {
            synthesisRef.current = window.speechSynthesis;
        }
    }, [state.isSupported]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (synthesisRef.current) {
                synthesisRef.current.cancel();
            }
        };
    }, []);

    const getVoice = useCallback((lang: string) => {
        if (!synthesisRef.current) return null;
        const voices = synthesisRef.current.getVoices();

        // 1. Exact match (e.g. fr-FR)
        let voice = voices.find(v => v.lang === lang);

        // 2. Base lang match (e.g. fr for fr-CA)
        if (!voice) {
            const baseLang = lang.split('-')[0];
            voice = voices.find(v => v.lang.startsWith(baseLang));
        }

        // 3. Default
        if (!voice) {
            voice = voices.find(v => v.default) || voices[0];
        }

        return voice;
    }, []);

    const speak = useCallback(() => {
        if (!synthesisRef.current || !text) return;

        // Cancel previous
        synthesisRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        const voice = getVoice(options.lang || 'en-US');
        if (voice) utterance.voice = voice;

        utterance.rate = options.rate;
        utterance.pitch = options.pitch;
        utterance.volume = options.volume;
        utterance.lang = options.lang || 'en-US';

        utterance.onstart = () => setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
        utterance.onend = () => setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        };
        utterance.onpause = () => setState(prev => ({ ...prev, isPaused: true }));
        utterance.onresume = () => setState(prev => ({ ...prev, isPaused: false }));

        synthesisRef.current.speak(utterance);
    }, [text, options, getVoice]);

    const pause = useCallback(() => {
        if (synthesisRef.current) {
            synthesisRef.current.pause();
        }
    }, []);

    const resume = useCallback(() => {
        if (synthesisRef.current) {
            synthesisRef.current.resume();
        }
    }, []);

    const stop = useCallback(() => {
        if (synthesisRef.current) {
            synthesisRef.current.cancel();
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        }
    }, []);

    return {
        ...state,
        speak,
        pause,
        resume,
        stop
    };
}

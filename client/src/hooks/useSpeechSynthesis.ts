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
    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    const [state, setState] = useState<SpeechState>({
        isPlaying: false,
        isPaused: false,
        isSupported,
        lang: options.lang || 'fr-FR'
    });

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const synthesisRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initialize synthesis and load voices with async support (Chromium)
    useEffect(() => {
        if (!isSupported) return;

        synthesisRef.current = window.speechSynthesis;

        const updateVoices = () => {
            if (!synthesisRef.current) return;
            const available = synthesisRef.current.getVoices();
            if (available && available.length > 0) {
                setVoices(available);
            }
        };

        updateVoices();

        if (typeof window.speechSynthesis !== 'undefined' && 'onvoiceschanged' in window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = updateVoices;
        }

        return () => {
            if (typeof window.speechSynthesis !== 'undefined') {
                window.speechSynthesis.onvoiceschanged = null;
            }
        };
    }, [isSupported]);

    // Chromium keep-alive: prevent speech from stopping after ~15s
    useEffect(() => {
        let pingInterval: any;
        if (state.isPlaying && !state.isPaused) {
            pingInterval = setInterval(() => {
                if (synthesisRef.current && synthesisRef.current.speaking && !synthesisRef.current.paused) {
                    synthesisRef.current.pause();
                    synthesisRef.current.resume();
                }
            }, 10000);
        }
        return () => {
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [state.isPlaying, state.isPaused]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (synthesisRef.current) {
                synthesisRef.current.cancel();
            }
        };
    }, []);

    const getVoice = useCallback((targetLang: string) => {
        if (!synthesisRef.current) return null;
        const voiceList = voices.length > 0 ? voices : synthesisRef.current.getVoices();
        if (!voiceList || voiceList.length === 0) return null;

        const normalizedTarget = targetLang.replace('_', '-').toLowerCase();
        const baseLang = normalizedTarget.split('-')[0];

        // 1. Exact match (e.g. fr-FR, en-US)
        let matched = voiceList.find(v => v.lang.replace('_', '-').toLowerCase() === normalizedTarget);

        // 2. Base language match (e.g. any fr-* for fr-FR)
        if (!matched) {
            matched = voiceList.find(v => v.lang.replace('_', '-').toLowerCase().startsWith(baseLang));
        }

        // 3. Fallback to default voice or first available
        if (!matched) {
            matched = voiceList.find(v => v.default) || voiceList[0];
        }

        return matched;
    }, [voices]);

    const speak = useCallback(() => {
        if (!synthesisRef.current || !text) return;

        // Cancel any active utterance
        synthesisRef.current.cancel();

        const cleanTargetLang = options.lang || 'fr-FR';
        const utterance = new SpeechSynthesisUtterance(text);
        utteranceRef.current = utterance;

        const voice = getVoice(cleanTargetLang);
        if (voice) {
            utterance.voice = voice;
        }

        utterance.rate = Math.max(0.5, Math.min(options.rate || 1, 2));
        utterance.pitch = Math.max(0.5, Math.min(options.pitch || 1, 2));
        utterance.volume = Math.max(0, Math.min(options.volume ?? 1, 1));
        utterance.lang = cleanTargetLang;

        utterance.onstart = () => {
            setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
        };

        utterance.onend = () => {
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        };

        utterance.onerror = (e) => {
            // "canceled" and "interrupted" are normal when user pauses, cancels or restarts
            if (e.error !== 'canceled' && e.error !== 'interrupted') {
                console.error("TTS SpeechSynthesis Error:", e);
            }
            setState(prev => ({ ...prev, isPlaying: false, isPaused: false }));
        };

        utterance.onpause = () => {
            setState(prev => ({ ...prev, isPaused: true }));
        };

        utterance.onresume = () => {
            setState(prev => ({ ...prev, isPaused: false }));
        };

        synthesisRef.current.speak(utterance);
    }, [text, options.lang, options.rate, options.pitch, options.volume, getVoice]);

    // If rate changes while actively playing, smoothly restart with the new rate
    const prevRateRef = useRef(options.rate);
    useEffect(() => {
        if (prevRateRef.current !== options.rate) {
            prevRateRef.current = options.rate;
            if (state.isPlaying && !state.isPaused) {
                speak();
            }
        }
    }, [options.rate, state.isPlaying, state.isPaused, speak]);

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


import { useState, useEffect, useCallback, useRef } from 'react';

export interface SpeechRecognitionState {
    isListening: boolean;
    transcript: string;
    isSupported: boolean;
    error: string | null;
}

export function useSpeechRecognition(lang: string = 'fr-FR') {
    const [state, setState] = useState<SpeechRecognitionState>({
        isListening: false,
        transcript: '',
        isSupported: false,
        error: null
    });

    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setState(prev => ({ ...prev, isSupported: true }));

            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = lang;

            recognitionRef.current.onstart = () => {
                setState(prev => ({ ...prev, isListening: true, error: null }));
            };

            recognitionRef.current.onend = () => {
                setState(prev => ({ ...prev, isListening: false }));
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech Recognition Error", event);
                setState(prev => ({ ...prev, isListening: false, error: event.error }));
            };

            // We handle onresult in the startListening callback or let the consumer handle it via a callback if needed
            // But typically, we might want to expose the transcript stream here
        }
    }, [lang]);

    const startListening = useCallback((onResult: (text: string, isFinal: boolean) => void) => {
        if (!recognitionRef.current) return;

        try {
            recognitionRef.current.lang = lang;
            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                if (finalTranscript || interimTranscript) {
                    onResult(finalTranscript || interimTranscript, !!finalTranscript);
                }
            };
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    }, [lang]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    return {
        ...state,
        startListening,
        stopListening
    };
}

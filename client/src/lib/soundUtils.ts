/**
 * Sound Utilities using Web Audio API
 * Generates pleasant notification sounds without external files
 */

class SoundGenerator {
    private audioContext: AudioContext | null = null;

    private getContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    /**
     * Play a pleasant "ding" sound for session completion
     */
    playSessionComplete() {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Create oscillator for the fundamental tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            // Pleasant bell-like tone (C6 note)
            osc.frequency.setValueAtTime(1046.5, now);

            // Smooth attack and decay for pleasant sound
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.01); // Quick attack
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8); // Gentle decay

            osc.start(now);
            osc.stop(now + 0.8);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }

    /**
     * Play a softer "chime" sound for break end
     */
    playBreakEnd() {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Two-tone chime (lower pitch, softer)
            [784, 1046.5].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.frequency.setValueAtTime(freq, now + i * 0.15);

                gain.gain.setValueAtTime(0, now + i * 0.15);
                gain.gain.linearRampToValueAtTime(0.2, now + i * 0.15 + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.6);

                osc.start(now + i * 0.15);
                osc.stop(now + i * 0.15 + 0.6);
            });
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }
}

export const soundUtils = new SoundGenerator();

/**
 * Simple Web Audio API based audio engine for stylized synth sounds.
 */
class AudioEngine {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTone(freq, type, duration, volume = 0.1) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playStart() {
        this.playTone(440, 'sine', 0.2);
        setTimeout(() => this.playTone(880, 'sine', 0.4), 100);
    }

    playTag() {
        this.playTone(220, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(110, 'square', 0.2, 0.05), 50);
    }

    playVictory() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.5), i * 150);
        });
    }

    playDefeat() {
        const notes = [392.00, 349.23, 329.63, 261.63]; // G4, F4, E4, C4
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.6, 0.05), i * 200);
        });
    }
}

export const audio = new AudioEngine();

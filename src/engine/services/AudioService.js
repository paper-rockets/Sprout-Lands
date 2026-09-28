/**
 * AudioService: Web Audio API sound generator for retro chimes, footsteps,
 * dialogue pings, quest fanfares, and area transitions.
 * Zero-dependency, reliable, works offline and across all devices.
 */

export class AudioService {
  constructor({ session } = {}) {
    this.session = session;
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.5;
    this.lastStepTime = 0;

    // Load volume and mute preference from session if available
    if (this.session) {
      const state = this.session.getState();
      if (state?.settings) {
        if (state.settings.sfxEnabled !== undefined) {
          this.enabled = state.settings.sfxEnabled;
        }
        if (state.settings.sfxVolume !== undefined) {
          this.volume = state.settings.sfxVolume;
        }
      }
    }
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playStep() {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastStepTime < 240) return; // limit step rate
    this.lastStepTime = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110 + Math.random() * 20, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Audio errors should never crash the game
    }
  }

  playDialoguePing() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.04); // E5

      gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch (e) {}
  }

  playClueCollect() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const notes = [587.33, 739.99, 880.00]; // D5, F#5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.14 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.19);
      });
    } catch (e) {}
  }

  playDucklingQuack() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.09);
      osc.frequency.linearRampToValueAtTime(360, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.19);
    } catch (e) {}
  }

  playQuestFanfare() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      // Ascending triumphant melody: C5 -> E5 -> G5 -> C6
      const melody = [
        { f: 523.25, t: 0.0, d: 0.12 },
        { f: 659.25, t: 0.12, d: 0.12 },
        { f: 783.99, t: 0.24, d: 0.14 },
        { f: 1046.50, t: 0.40, d: 0.45 }
      ];

      melody.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + t;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);

        gain.gain.setValueAtTime(0.18 * this.volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + d);
      });
    } catch (e) {}
  }

  playPortalSwoosh() {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12 * this.volume, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.33);
    } catch (e) {}
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.session) {
      const state = this.session.getState();
      state.settings = state.settings || {};
      state.settings.sfxEnabled = this.enabled;
    }
    return this.enabled;
  }
}

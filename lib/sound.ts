// Web Audio API Synthesizer for Barney's 3D Monopoly
class SoundEffects {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private masterGain: GainNode | null = null;
  private ambientInterval: ReturnType<typeof setInterval> | null = null;
  private isAmbientActive: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
  }

  private getDestination(): AudioNode {
    return this.masterGain || (this.ctx ? this.ctx.destination : null) as unknown as AudioNode;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
    if (muted && this.isAmbientActive) {
      this.stopAmbientPorch();
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  getMuted(): boolean {
    return this.isMuted;
  }

  getVolume(): number {
    return this.volume;
  }

  playTestChime() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const dest = this.getDestination();
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.18, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  startAmbientPorch() {
    if (this.isAmbientActive || this.isMuted) return;
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.isAmbientActive = true;

    // Gentle random porch cricket chirps and evening harmonics every few seconds
    const playChirp = () => {
      if (!this.ctx || !this.isAmbientActive || this.isMuted) return;
      const now = this.ctx.currentTime;
      const dest = this.getDestination();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4500 + Math.random() * 800, now);
      gain.gain.setValueAtTime(0.015, now);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.08);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.08);
    };

    this.ambientInterval = setInterval(() => {
      if (Math.random() < 0.6) playChirp();
    }, 2400);
  }

  stopAmbientPorch() {
    this.isAmbientActive = false;
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  playFootstep() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180 + Math.random() * 40, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playChaChing() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [1046.50, 1318.51, 1567.98, 2093.00];
    freqs.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.2, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.25);
    });
  }

  playUnownedLanding() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25];
    notes.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.15);
    });
  }

  playOwnedLanding() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.25);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playGo() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.3);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.3);
    });
  }

  playDiceRoll() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140 + Math.random() * 220, now + i * 0.05);
      gain.gain.setValueAtTime(0.12, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.04);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.05);
    }
  }

  playDiceImpact(speed: number, isWall = false) {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const normSpeed = Math.min(1.0, Math.max(0.1, speed / 3.5));
    const volume = Math.min(0.28, 0.04 + normSpeed * 0.24);

    // Primary acrylic body thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isWall ? 'triangle' : 'sine';
    const baseFreq = isWall ? (260 + Math.random() * 80) : (180 + Math.random() * 60 + normSpeed * 100);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.045);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.05);

    // Crisp high-frequency acrylic clack transient
    if (speed > 0.4) {
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sawtooth';
      const clickFreq = 750 + Math.random() * 400 + normSpeed * 300;
      clickOsc.frequency.setValueAtTime(clickFreq, now);
      clickOsc.frequency.exponentialRampToValueAtTime(clickFreq * 0.3, now + 0.025);
      clickGain.gain.setValueAtTime(volume * 0.65, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(now);
      clickOsc.stop(now + 0.03);
    }
  }

  playCash() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Two high metallic chimes
    [987.77, 1318.51].forEach((freq, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.2, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.3);
    });
  }

  playBuyProperty() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const freqs = [440, 554.37, 659.25, 880];
    freqs.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.15, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.2);
    });
  }

  playJail() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playCopSiren() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Dual oscillating siren whoops
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1150, now + 0.18);
    osc.frequency.linearRampToValueAtTime(600, now + 0.36);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.54);
    osc.frequency.linearRampToValueAtTime(550, now + 0.75);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.80);

    // Low pass filter for authentic police siren horn resonance
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getDestination());

    osc.start(now);
    osc.stop(now + 0.80);
  }

  playJailYoink() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Upward high-speed yoink whoosh
    const yoinkOsc = this.ctx.createOscillator();
    const yoinkGain = this.ctx.createGain();
    yoinkOsc.type = 'sine';
    yoinkOsc.frequency.setValueAtTime(180, now);
    yoinkOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.35);
    yoinkGain.gain.setValueAtTime(0.28, now);
    yoinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
    yoinkOsc.connect(yoinkGain);
    yoinkGain.connect(this.ctx.destination);
    yoinkOsc.start(now);
    yoinkOsc.stop(now + 0.40);

    // Heavy metallic jail cell iron gate slam impact
    const slamTime = now + 0.45;
    const slamOsc = this.ctx.createOscillator();
    const slamGain = this.ctx.createGain();
    slamOsc.type = 'triangle';
    slamOsc.frequency.setValueAtTime(120, slamTime);
    slamOsc.frequency.exponentialRampToValueAtTime(30, slamTime + 0.35);
    slamGain.gain.setValueAtTime(0.35, slamTime);
    slamGain.gain.exponentialRampToValueAtTime(0.001, slamTime + 0.35);
    slamOsc.connect(slamGain);
    slamGain.connect(this.ctx.destination);
    slamOsc.start(slamTime);
    slamOsc.stop(slamTime + 0.35);
  }

  playCrowdCheer() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Cheering chord harmonies + whistles
    const cheerFreqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    cheerFreqs.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 20, now + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(f * 1.08, now + 0.6);
      gain.gain.setValueAtTime(0.12, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.04);
      osc.stop(now + 0.85);
    });

    // Whistle transient
    const whistleOsc = this.ctx.createOscillator();
    const whistleGain = this.ctx.createGain();
    whistleOsc.type = 'sine';
    whistleOsc.frequency.setValueAtTime(1600, now + 0.08);
    whistleOsc.frequency.linearRampToValueAtTime(2400, now + 0.22);
    whistleOsc.frequency.linearRampToValueAtTime(1800, now + 0.45);
    whistleGain.gain.setValueAtTime(0.15, now + 0.08);
    whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    whistleOsc.connect(whistleGain);
    whistleGain.connect(this.ctx.destination);
    whistleOsc.start(now + 0.08);
    whistleOsc.stop(now + 0.50);
  }

  playCardDraw() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playTimerTick() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.getDestination());
    osc.start(now);
    osc.stop(now + 0.04);
  }

  playTimerWarning() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [880, 880].forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.12);
      gain.gain.setValueAtTime(0.18, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.1);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.1);
    });
  }

  playFanfare() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, idx) => {
      if (!this.ctx || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.15);
      gain.gain.setValueAtTime(0.25, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.4);
    });
  }

  playTrainHorn() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Classic dual-tone locomotive whistle chord
    [311.13, 392.00, 466.16].forEach((freq) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(this.getDestination());
      osc.start(now);
      osc.stop(now + 0.9);
    });
  }
}

export const soundFx = new SoundEffects();

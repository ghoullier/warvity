import type Phaser from "phaser";

/** Pentatonic scale frequencies (C4 base, two octaves) */
const PENTATONIC: number[] = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0,
];

/**
 * Generates all game sounds procedurally via the Web Audio API.
 * No external audio files are used.
 */
export class AudioManager {
  readonly #ctx: AudioContext;
  readonly #master: GainNode;
  #muted = false;
  #musicTimeout: ReturnType<typeof setTimeout> | null = null;
  #musicRunning = false;

  constructor(scene: Phaser.Scene) {
    const soundManager = scene.sound as Phaser.Sound.WebAudioSoundManager;
    this.#ctx = soundManager.context;

    this.#master = this.#ctx.createGain();
    this.#master.gain.value = 0.6;
    this.#master.connect(this.#ctx.destination);
  }

  // ──────────────────────────────── public API ──────────────────────────────────

  /** Short white-noise burst simulating an explosion. */
  playExplosion(): void {
    if (this.#muted) return;
    const duration = 0.3;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * duration);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    // Low-pass filter for a boomier feel
    const filter = this.#ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 0.02); // attack
    gain.gain.linearRampToValueAtTime(0.6, now + 0.05); // decay to sustain
    gain.gain.linearRampToValueAtTime(0, now + duration); // release

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#master);
    source.start(now);
    source.stop(now + duration);
  }

  /** Rising sine oscillator sweep: 200→500 Hz over 0.15 s. */
  playJump(): void {
    if (this.#muted) return;
    const duration = 0.15;
    const osc = this.#ctx.createOscillator();
    osc.type = "sine";

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;

    osc.frequency.setValueAtTime(200, now);
    osc.frequency.linearRampToValueAtTime(500, now + duration);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.#master);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** High-pass filtered white noise whoosh (firing a projectile). */
  playFire(): void {
    if (this.#muted) return;
    const duration = 0.2;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * duration);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.#ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 2000;

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#master);
    source.start(now);
    source.stop(now + duration);
  }

  /** Falling oscillator: 500→0 Hz over 0.5 s (worm death). */
  playDeath(): void {
    if (this.#muted) return;
    const duration = 0.5;
    const osc = this.#ctx.createOscillator();
    osc.type = "sawtooth";

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;

    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(20, now + duration);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.#master);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Short bandpass-filtered noise burst (jetpack thrust). */
  playJetpackThrust(): void {
    if (this.#muted) return;
    const duration = 0.12;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * duration);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass centred around 800 Hz for a mid-range whoosh
    const filter = this.#ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 1.5;

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#master);
    source.start(now);
    source.stop(now + duration);
  }

  /** Sputtering engine-stop sound (jetpack fuel exhausted). */
  playJetpackEnd(): void {
    if (this.#muted) return;
    const duration = 0.4;
    const now = this.#ctx.currentTime;

    // Two descending oscillators that fade and sputter
    for (const [startHz, endHz] of [
      [600, 80],
      [400, 40],
    ] as [number, number][]) {
      const osc = this.#ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.linearRampToValueAtTime(endHz, now + duration);

      const gain = this.#ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.15, now + duration * 0.5);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(this.#master);
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  /** Two harmonically rising oscillators (teleport / turn start). */
  playTeleport(): void {
    if (this.#muted) return;
    const duration = 0.3;
    const now = this.#ctx.currentTime;

    for (const [startHz, endHz] of [
      [300, 600],
      [400, 800],
    ] as [number, number][]) {
      const osc = this.#ctx.createOscillator();
      osc.type = "sine";

      const gain = this.#ctx.createGain();
      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.linearRampToValueAtTime(endHz, now + duration);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(this.#master);
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  /** High-frequency pop + short whoosh: cluster bomb splitting into sub-munitions. */
  playClusterSplit(): void {
    if (this.#muted) return;
    const now = this.#ctx.currentTime;

    // Whoosh: bandpass filtered noise sweep
    const dur = 0.18;
    const bufSize = Math.ceil(this.#ctx.sampleRate * dur);
    const buf = this.#ctx.createBuffer(1, bufSize, this.#ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.#ctx.createBufferSource();
    noise.buffer = buf;
    const bp = this.#ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1800;
    bp.Q.value = 1.5;
    const whooshGain = this.#ctx.createGain();
    whooshGain.gain.setValueAtTime(0.45, now);
    whooshGain.gain.linearRampToValueAtTime(0, now + dur);
    noise.connect(bp);
    bp.connect(whooshGain);
    whooshGain.connect(this.#master);
    noise.start(now);
    noise.stop(now + dur);

    // Pop: short triangle burst
    const osc = this.#ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.06);
    const popGain = this.#ctx.createGain();
    popGain.gain.setValueAtTime(0.35, now);
    popGain.gain.linearRampToValueAtTime(0, now + 0.06);
    osc.connect(popGain);
    popGain.connect(this.#master);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** Smaller explosion sound for each sub-munition detonation (lower gain). */
  playSubExplosion(): void {
    if (this.#muted) return;
    const duration = 0.18;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * duration);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.#ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#master);
    source.start(now);
    source.stop(now + duration);
  }

  /**
   * Start the procedural background music loop.
   * Plays random notes from a pentatonic scale with 1–3 s gaps.
   */
  startMusic(): void {
    if (this.#musicRunning) return;
    this.#musicRunning = true;
    this.#scheduleNextNote();
  }

  /** Stop the background music. */
  stopMusic(): void {
    this.#musicRunning = false;
    if (this.#musicTimeout !== null) {
      clearTimeout(this.#musicTimeout);
      this.#musicTimeout = null;
    }
  }

  /**
   * Crackling fire sound for the flamethrower — ~1.5 s of noise filtered
   * through a band-pass to simulate hissing/crackling flames.
   */
  playFlamethrower(): void {
    if (this.#muted) return;
    const duration = 1.5;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * duration);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    // Band-pass centred on ~800 Hz gives a hissing crackle
    const bandPass = this.#ctx.createBiquadFilter();
    bandPass.type = "bandpass";
    bandPass.frequency.value = 800;
    bandPass.Q.value = 0.8;

    // Low-pass layer for warmth
    const lowPass = this.#ctx.createBiquadFilter();
    lowPass.type = "lowpass";
    lowPass.frequency.value = 1800;

    const gain = this.#ctx.createGain();
    const now = this.#ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.05); // quick attack
    gain.gain.linearRampToValueAtTime(0.5, now + 0.8); // sustain
    gain.gain.linearRampToValueAtTime(0, now + duration); // fade out

    source.connect(bandPass);
    bandPass.connect(lowPass);
    lowPass.connect(gain);
    gain.connect(this.#master);
    source.start(now);
    source.stop(now + duration);
  }

  /** Rising hum-chime: 300→900 Hz over 0.5 s (shield activation). */
  playShieldActivate(): void {
    if (this.#muted) return;
    const duration = 0.5;
    const now = this.#ctx.currentTime;

    for (const [startHz, endHz] of [
      [300, 900],
      [450, 1200],
    ] as [number, number][]) {
      const osc = this.#ctx.createOscillator();
      osc.type = "sine";

      const gain = this.#ctx.createGain();
      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.linearRampToValueAtTime(endHz, now + duration);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.15, now + duration * 0.7);
      gain.gain.linearRampToValueAtTime(0, now + duration);

      osc.connect(gain);
      gain.connect(this.#master);
      osc.start(now);
      osc.stop(now + duration);
    }
  }

  /** Short metallic clank (damage blocked by shield). */
  playShieldBlock(): void {
    if (this.#muted) return;
    const duration = 0.18;
    const now = this.#ctx.currentTime;

    const osc = this.#ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.linearRampToValueAtTime(800, now + duration);

    const gain = this.#ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.#master);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Toggle global mute on/off. Returns the new muted state. */
  toggleMute(): boolean {
    this.#muted = !this.#muted;
    this.#master.gain.value = this.#muted ? 0 : 0.6;
    return this.#muted;
  }

  get isMuted(): boolean {
    return this.#muted;
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #scheduleNextNote(): void {
    if (!this.#musicRunning) return;

    const delayMs = 1000 + Math.random() * 2000;
    this.#musicTimeout = setTimeout(() => {
      if (!this.#musicRunning) return;
      this.#playMusicNote();
      this.#scheduleNextNote();
    }, delayMs);
  }

  #playMusicNote(): void {
    if (this.#muted) return;

    // biome-ignore lint/style/noNonNullAssertion: index is bounded by PENTATONIC.length
    const freq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]!;
    const duration = 0.4 + Math.random() * 0.3;
    const now = this.#ctx.currentTime;

    const osc = this.#ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;

    const gain = this.#ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, now + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(this.#master);
    osc.start(now);
    osc.stop(now + duration);
  }
}

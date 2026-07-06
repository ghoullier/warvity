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
    this.#playNoise(
      "lowpass",
      600,
      (gain, now) => {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.9, now + 0.02); // attack
        gain.gain.linearRampToValueAtTime(0.6, now + 0.05); // decay to sustain
        gain.gain.linearRampToValueAtTime(0, now + 0.3); // release
      },
      300,
    );
  }

  /** Rising sine oscillator sweep: 200→500 Hz over 0.15 s. */
  playJump(): void {
    if (this.#muted) return;
    this.#playOsc(
      "sine",
      (osc, now) => {
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.15);
      },
      (gain, now) => {
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);
      },
      150,
    );
  }

  /** High-pass filtered white noise whoosh (firing a projectile). */
  playFire(): void {
    if (this.#muted) return;
    this.#playNoise(
      "highpass",
      2000,
      (gain, now) => {
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
      },
      200,
    );
  }

  /** Falling oscillator: 500→0 Hz over 0.5 s (worm death). */
  playDeath(): void {
    if (this.#muted) return;
    this.#playOsc(
      "sawtooth",
      (osc, now) => {
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.5);
      },
      (gain, now) => {
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
      },
      500,
    );
  }

  /** Short bandpass-filtered noise burst (jetpack thrust). */
  playJetpackThrust(): void {
    if (this.#muted) return;
    // Bandpass centred around 800 Hz for a mid-range whoosh
    this.#playNoise(
      "bandpass",
      800,
      (gain, now) => {
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
      },
      120,
      1.5,
    );
  }

  /** Sputtering engine-stop sound (jetpack fuel exhausted). */
  playJetpackEnd(): void {
    if (this.#muted) return;
    // Two descending oscillators that fade and sputter
    for (const [startHz, endHz] of [
      [600, 80],
      [400, 40],
    ] as [number, number][]) {
      this.#playOsc(
        "sawtooth",
        (osc, now) => {
          osc.frequency.setValueAtTime(startHz, now);
          osc.frequency.linearRampToValueAtTime(endHz, now + 0.4);
        },
        (gain, now) => {
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
          gain.gain.linearRampToValueAtTime(0, now + 0.4);
        },
        400,
      );
    }
  }

  /** Two harmonically rising oscillators (teleport / turn start). */
  playTeleport(): void {
    if (this.#muted) return;
    for (const [startHz, endHz] of [
      [300, 600],
      [400, 800],
    ] as [number, number][]) {
      this.#playOsc(
        "sine",
        (osc, now) => {
          osc.frequency.setValueAtTime(startHz, now);
          osc.frequency.linearRampToValueAtTime(endHz, now + 0.3);
        },
        (gain, now) => {
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
        },
        300,
      );
    }
  }

  /** High-frequency pop + short whoosh: cluster bomb splitting into sub-munitions. */
  playClusterSplit(): void {
    if (this.#muted) return;
    // Whoosh: bandpass filtered noise sweep
    this.#playNoise(
      "bandpass",
      1800,
      (gain, now) => {
        gain.gain.setValueAtTime(0.45, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.18);
      },
      180,
      1.5,
    );
    // Pop: short triangle burst
    this.#playOsc(
      "triangle",
      (osc, now) => {
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.06);
      },
      (gain, now) => {
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.06);
      },
      60,
    );
  }

  /** Smaller explosion sound for each sub-munition detonation (lower gain). */
  playSubExplosion(): void {
    if (this.#muted) return;
    this.#playNoise(
      "lowpass",
      900,
      (gain, now) => {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
        gain.gain.linearRampToValueAtTime(0, now + 0.18);
      },
      180,
    );
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
    // Band-pass centred on ~800 Hz gives a hissing crackle; low-pass layer adds warmth
    this.#playNoise(
      "bandpass",
      800,
      (gain, now) => {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.7, now + 0.05); // quick attack
        gain.gain.linearRampToValueAtTime(0.5, now + 0.8); // sustain
        gain.gain.linearRampToValueAtTime(0, now + 1.5); // fade out
      },
      1500,
      0.8,
      { type: "lowpass", freq: 1800 },
    );
  }

  /** Rising hum-chime: 300→900 Hz over 0.5 s (shield activation). */
  playShieldActivate(): void {
    if (this.#muted) return;
    for (const [startHz, endHz] of [
      [300, 900],
      [450, 1200],
    ] as [number, number][]) {
      this.#playOsc(
        "sine",
        (osc, now) => {
          osc.frequency.setValueAtTime(startHz, now);
          osc.frequency.linearRampToValueAtTime(endHz, now + 0.5);
        },
        (gain, now) => {
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.5 * 0.7);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
        },
        500,
      );
    }
  }

  /** Short metallic clank (damage blocked by shield). */
  playShieldBlock(): void {
    if (this.#muted) return;
    this.#playOsc(
      "square",
      (osc, now) => {
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.18);
      },
      (gain, now) => {
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.18);
      },
      180,
    );
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

  /** Soft click: mine has been placed on the terrain. */
  playMinePlaced(): void {
    if (this.#muted) return;
    this.#playOsc(
      "square",
      (osc, now) => {
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.08);
      },
      (gain, now) => {
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
      },
      80,
    );
  }

  /** Short high-pitched beep: mine is detecting a nearby worm. */
  playMineBeep(): void {
    if (this.#muted) return;
    this.#playOsc(
      "sine",
      1200,
      (gain, now) => {
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);
      },
      50,
    );
  }

  /** Sharper explosion (mine detonation — higher frequencies than a regular blast). */
  playMineExplosion(): void {
    if (this.#muted) return;
    // Bandpass filter for a sharper crack
    this.#playNoise(
      "bandpass",
      1200,
      (gain, now) => {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1.0, now + 0.01);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.25);
      },
      250,
      0.5,
    );
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  /** Disconnect all given nodes `durationMs + 100` ms after they were started. */
  #scheduleDisconnect(durationMs: number, ...nodes: AudioNode[]): void {
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.disconnect();
        } catch {}
      }
    }, durationMs + 100);
  }

  /**
   * Create an oscillator → gain chain connected to master, play it for
   * `durationMs`, then auto-disconnect via `#scheduleDisconnect`.
   *
   * `freq` may be a fixed Hz value or a callback that configures the
   * oscillator's frequency (e.g. for sweeps / ramps).
   */
  #playOsc(
    type: OscillatorType,
    freq: number | ((osc: OscillatorNode, now: number) => void),
    gainEnvelope: (gain: GainNode, now: number) => void,
    durationMs: number,
  ): void {
    const now = this.#ctx.currentTime;
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.connect(gain);
    gain.connect(this.#master);
    osc.type = type;
    if (typeof freq === "number") osc.frequency.setValueAtTime(freq, now);
    else freq(osc, now);
    gainEnvelope(gain, now);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    this.#scheduleDisconnect(durationMs, osc, gain);
  }

  /**
   * Fill a white-noise buffer, run it through a biquad filter (and an
   * optional second filter in series), apply a gain envelope, then
   * auto-disconnect via `#scheduleDisconnect`.
   */
  #playNoise(
    filterType: BiquadFilterType,
    filterFreq: number,
    gainEnvelope: (gain: GainNode, now: number) => void,
    durationMs: number,
    filterQ?: number,
    extraFilter?: { type: BiquadFilterType; freq: number; q?: number },
  ): void {
    const now = this.#ctx.currentTime;
    const durationSec = durationMs / 1000;
    const bufferSize = Math.ceil(this.#ctx.sampleRate * durationSec);
    const buffer = this.#ctx.createBuffer(1, bufferSize, this.#ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.#ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.#ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    if (filterQ !== undefined) filter.Q.value = filterQ;

    const gain = this.#ctx.createGain();
    gainEnvelope(gain, now);

    const nodes: AudioNode[] = [source, filter];
    source.connect(filter);

    if (extraFilter) {
      const extra = this.#ctx.createBiquadFilter();
      extra.type = extraFilter.type;
      extra.frequency.value = extraFilter.freq;
      if (extraFilter.q !== undefined) extra.Q.value = extraFilter.q;
      filter.connect(extra);
      extra.connect(gain);
      nodes.push(extra);
    } else {
      filter.connect(gain);
    }

    gain.connect(this.#master);
    nodes.push(gain);
    source.start(now);
    source.stop(now + durationSec);
    this.#scheduleDisconnect(durationMs, ...nodes);
  }

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
    this.#playOsc(
      "triangle",
      freq,
      (gain, now) => {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.1, now + duration * 0.6);
        gain.gain.linearRampToValueAtTime(0, now + duration);
      },
      duration * 1000,
    );
  }
}

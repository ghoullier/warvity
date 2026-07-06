import type Phaser from "phaser";
import type { PlanetStyle } from "../config/PlanetStyles";

// ── Per-planet pentatonic scales (Hz) ─────────────────────────────────────────
const EARTH_SCALE = [261, 294, 329, 392, 440] as const; // C major pent – upbeat
const MOON_SCALE = [293, 329, 370, 440, 493] as const; // D minor pent – sparse
const LAVA_TONES = [196, 277] as const; // tritone pair – aggressive
const ICE_SCALE = [523, 587, 659, 784, 880] as const; // high-register pent – crystalline

const MUSIC_GAIN_VALUE = 0.08; // quiet background level

/**
 * Generates all game sounds procedurally via the Web Audio API.
 * No external audio files are used.
 */
export class AudioManager {
  readonly #ctx: AudioContext;
  readonly #master: GainNode;
  readonly #musicGain: GainNode; // separate gain for music vs SFX
  #muted = false;
  #musicNodes: AudioNode[] = [];
  #musicInterval: ReturnType<typeof setInterval> | null = null;
  #musicMuted = false;

  constructor(scene: Phaser.Scene) {
    const soundManager = scene.sound as Phaser.Sound.WebAudioSoundManager;
    this.#ctx = soundManager.context;

    this.#master = this.#ctx.createGain();
    this.#master.gain.value = 0.6;
    this.#master.connect(this.#ctx.destination);

    this.#musicGain = this.#ctx.createGain();
    this.#musicGain.gain.value = MUSIC_GAIN_VALUE;
    this.#musicGain.connect(this.#master);
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
   * Start the looping per-planet music theme.
   * Calling while music is already playing stops the previous theme first.
   */
  startMusic(style: PlanetStyle): void {
    this.stopMusic();
    switch (style.id) {
      case "earth":
        this.#startEarthTheme();
        break;
      case "moon":
        this.#startMoonTheme();
        break;
      case "lava":
        this.#startLavaTheme();
        break;
      case "ice":
        this.#startIceTheme();
        break;
      default:
        this.#startEarthTheme();
    }
  }

  /** Stop the background music and clean up all music nodes. */
  stopMusic(): void {
    if (this.#musicInterval !== null) {
      clearInterval(this.#musicInterval);
      this.#musicInterval = null;
    }
    for (const node of this.#musicNodes) {
      try {
        node.disconnect();
      } catch {}
    }
    this.#musicNodes = [];
  }

  /**
   * Toggle music mute on/off with a smooth gain fade.
   * Returns the new muted state (true = muted).
   */
  toggleMusicMute(): boolean {
    this.#musicMuted = !this.#musicMuted;
    const now = this.#ctx.currentTime;
    this.#musicGain.gain.cancelScheduledValues(now);
    this.#musicGain.gain.setValueAtTime(this.#musicGain.gain.value, now);
    this.#musicGain.gain.linearRampToValueAtTime(
      this.#musicMuted ? 0 : MUSIC_GAIN_VALUE,
      now + 0.3,
    );
    return this.#musicMuted;
  }

  get isMusicMuted(): boolean {
    return this.#musicMuted;
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

  /**
   * 4-note ascending victory jingle (C4 → E4 → G4 → C5).
   * Each note is a short sine burst staggered in time.
   */
  playVictory(): void {
    if (this.#muted) return;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const delayMs = i * 180;
      setTimeout(() => {
        this.#playOsc(
          "sine",
          (osc, now) => {
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.25);
          },
          (gain, now) => {
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
            gain.gain.linearRampToValueAtTime(0, now + 0.35);
          },
          350,
        );
      }, delayMs);
    });
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

  // ── Music themes ──────────────────────────────────────────────────────────────

  /** Earth: upbeat C-major pentatonic random walk, triangle, 280 ms steps. */
  #startEarthTheme(): void {
    let noteIdx = Math.floor(EARTH_SCALE.length / 2);
    this.#musicInterval = setInterval(() => {
      if (this.#musicMuted) return;
      const step = Math.random() < 0.5 ? -1 : 1;
      noteIdx = Math.max(0, Math.min(EARTH_SCALE.length - 1, noteIdx + step));
      // biome-ignore lint/style/noNonNullAssertion: index bounded by EARTH_SCALE.length
      const freq = EARTH_SCALE[noteIdx]!;
      this.#playMusicOsc(
        "triangle",
        freq,
        (gain, now) => {
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.9, now + 0.02);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
        },
        220,
      );
    }, 280);
  }

  /** Moon: sparse D-minor pentatonic, sine, slow attack, 40% beat skip. */
  #startMoonTheme(): void {
    this.#musicInterval = setInterval(() => {
      if (this.#musicMuted) return;
      if (Math.random() < 0.4) return;
      // biome-ignore lint/style/noNonNullAssertion: index bounded by MOON_SCALE.length
      const freq = MOON_SCALE[Math.floor(Math.random() * MOON_SCALE.length)]!;
      this.#playMusicOsc(
        "sine",
        freq,
        (gain, now) => {
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.9, now + 0.3); // slow attack
          gain.gain.linearRampToValueAtTime(0, now + 0.55); // release
        },
        580,
      );
    }, 600);
  }

  /** Lava: aggressive tritone alternation, sawtooth through WaveShaper distortion. */
  #startLavaTheme(): void {
    const shaper = this.#makeDistortion(200);
    shaper.connect(this.#musicGain);
    this.#musicNodes.push(shaper);

    let toneIdx = 0;
    this.#musicInterval = setInterval(() => {
      if (this.#musicMuted) return;
      // biome-ignore lint/style/noNonNullAssertion: index is 0 or 1, both valid
      const freq = LAVA_TONES[toneIdx]!;
      toneIdx = 1 - toneIdx;
      this.#playMusicOsc(
        "sawtooth",
        freq,
        (gain, now) => {
          gain.gain.setValueAtTime(0.9, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.14);
        },
        160,
        shaper,
      );
    }, 180);
  }

  /** Ice: high-register pentatonic, triangle with long delay-feedback reverb tail. */
  #startIceTheme(): void {
    const delay = this.#ctx.createDelay(1.0);
    delay.delayTime.value = 0.3;
    const feedbackGain = this.#ctx.createGain();
    feedbackGain.gain.value = 0.45;
    const wetGain = this.#ctx.createGain();
    wetGain.gain.value = 0.5;

    delay.connect(feedbackGain);
    feedbackGain.connect(delay); // feedback loop
    delay.connect(wetGain);
    wetGain.connect(this.#musicGain);
    this.#musicNodes.push(delay, feedbackGain, wetGain);

    this.#musicInterval = setInterval(() => {
      if (this.#musicMuted) return;
      // biome-ignore lint/style/noNonNullAssertion: index bounded by ICE_SCALE.length
      const freq = ICE_SCALE[Math.floor(Math.random() * ICE_SCALE.length)]!;
      const now = this.#ctx.currentTime;
      const osc = this.#ctx.createOscillator();
      const noteGain = this.#ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      noteGain.gain.setValueAtTime(0, now);
      noteGain.gain.linearRampToValueAtTime(0.9, now + 0.05);
      noteGain.gain.linearRampToValueAtTime(0, now + 0.35);
      osc.connect(noteGain);
      noteGain.connect(this.#musicGain); // dry path
      noteGain.connect(delay); // wet path into reverb
      osc.start(now);
      osc.stop(now + 0.4);
      this.#scheduleDisconnect(400, osc, noteGain);
    }, 400);
  }

  /**
   * Build a soft-clipping WaveShaper curve.
   * `amount` controls the drive (higher = more distortion).
   */
  #makeDistortion(amount: number): WaveShaperNode {
    const ws = this.#ctx.createWaveShaper();
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    ws.curve = curve;
    return ws;
  }

  /**
   * Play a single music note through `#musicGain` (or an alternate destination).
   * Auto-disconnects after `durationMs`.
   */
  #playMusicOsc(
    type: OscillatorType,
    freq: number,
    gainEnvelope: (gain: GainNode, now: number) => void,
    durationMs: number,
    destination: AudioNode = this.#musicGain,
  ): void {
    const now = this.#ctx.currentTime;
    const osc = this.#ctx.createOscillator();
    const gain = this.#ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gainEnvelope(gain, now);
    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000);
    this.#scheduleDisconnect(durationMs, osc, gain);
  }

  // ── SFX / shared helpers ───────────────────────────────────────────────────

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
}

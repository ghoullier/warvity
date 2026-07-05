import type Phaser from "phaser";
import "../audio/index";
import { getSound } from "../audio/SoundRegistry";

/** Pentatonic scale frequencies (C4 base, two octaves) */
const PENTATONIC: number[] = [
  261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0,
];

/**
 * Thin dispatcher over the sound registry.
 * All synthesis logic lives in `src/audio/sounds/`.
 * To add a new sound: create a file in that folder and add a delegate below.
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

  // ──────────────────────────────── sound delegates ─────────────────────────────

  playExplosion(): void {
    this.#play("explosion");
  }
  playJump(): void {
    this.#play("jump");
  }
  playFire(): void {
    this.#play("fire");
  }
  playDeath(): void {
    this.#play("death");
  }
  playJetpackThrust(): void {
    this.#play("jetpack-thrust");
  }
  playJetpackEnd(): void {
    this.#play("jetpack-end");
  }
  playTeleport(): void {
    this.#play("teleport");
  }
  playClusterSplit(): void {
    this.#play("cluster-split");
  }
  playSubExplosion(): void {
    this.#play("sub-explosion");
  }
  playFlamethrower(): void {
    this.#play("flamethrower");
  }
  playShieldActivate(): void {
    this.#play("shield-activate");
  }
  playShieldBlock(): void {
    this.#play("shield-block");
  }
  playMinePlaced(): void {
    this.#play("mine-placed");
  }
  playMineBeep(): void {
    this.#play("mine-beep");
  }
  playMineExplosion(): void {
    this.#play("mine-explosion");
  }

  // ──────────────────────────────── music ───────────────────────────────────────

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

  // ──────────────────────────────── mute ────────────────────────────────────────

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

  #play(id: string): void {
    if (this.#muted) return;
    getSound(id)?.play(this.#ctx, this.#master);
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

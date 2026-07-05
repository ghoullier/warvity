import type Phaser from "phaser";

export type GravityMode = "2x" | "0.5x" | "reverse";

const MODES: GravityMode[] = ["2x", "0.5x", "reverse"];
const BOOST_DURATION = 5; // seconds

export function multiplierForMode(mode: GravityMode): number {
  switch (mode) {
    case "2x":
      return 2;
    case "0.5x":
      return 0.5;
    case "reverse":
      return -1;
  }
}

/**
 * Instantaneous weapon that alters global gravity for BOOST_DURATION seconds.
 *
 * Modes cycle through '2x' → '0.5x' → 'reverse' on each activation.
 * Emits 'gravity-changed' on the scene with { mode, remaining } once per second.
 * After BOOST_DURATION seconds: resets the multiplier and invokes onEnd().
 */
export class GravityBoost {
  static #modeIndex = 0;

  /** Reset the mode cycle back to '2x' — call from GameScene.shutdown(). */
  static resetModeIndex(): void {
    GravityBoost.#modeIndex = 0;
  }

  /** Peek at the mode that will be used on the next activation. */
  static get nextMode(): GravityMode {
    // biome-ignore lint/style/noNonNullAssertion: modeIndex is always clamped within MODES bounds
    return MODES[GravityBoost.#modeIndex % MODES.length]!;
  }

  readonly #scene: Phaser.Scene;
  readonly #onMultiplierChange: (m: number) => void;
  readonly #onEnd: () => void;
  #timer: Phaser.Time.TimerEvent | null = null;
  #remaining = BOOST_DURATION;
  #active = false;

  constructor(
    scene: Phaser.Scene,
    onMultiplierChange: (m: number) => void,
    onEnd: () => void,
  ) {
    this.#scene = scene;
    this.#onMultiplierChange = onMultiplierChange;
    this.#onEnd = onEnd;
  }

  /**
   * Activates the boost using the next mode in the cycle, then advances
   * the cycle index so the following activation uses the next mode.
   */
  activate(): void {
    if (this.#active) return;
    this.#active = true;
    this.#remaining = BOOST_DURATION;

    // biome-ignore lint/style/noNonNullAssertion: modeIndex is always clamped within MODES bounds
    const mode = MODES[GravityBoost.#modeIndex % MODES.length]!;
    GravityBoost.#modeIndex = (GravityBoost.#modeIndex + 1) % MODES.length;

    this.#onMultiplierChange(multiplierForMode(mode));
    this.#scene.events.emit("gravity-changed", {
      mode,
      remaining: this.#remaining,
    });

    this.#timer = this.#scene.time.addEvent({
      delay: 1000,
      repeat: BOOST_DURATION - 1,
      callback: () => {
        this.#remaining--;
        if (this.#remaining <= 0) {
          this.#active = false;
          this.#onMultiplierChange(1);
          this.#scene.events.emit("gravity-changed", {
            mode: null as unknown as GravityMode,
            remaining: 0,
          });
          this.#onEnd();
        } else {
          this.#scene.events.emit("gravity-changed", {
            mode,
            remaining: this.#remaining,
          });
        }
      },
    });
  }

  isActive(): boolean {
    return this.#active;
  }

  /** Cancel the boost early (e.g. on game over). Resets the multiplier. */
  cancel(): void {
    if (!this.#active) return;
    this.#timer?.remove(false);
    this.#timer = null;
    this.#active = false;
    this.#onMultiplierChange(1);
  }
}

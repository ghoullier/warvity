import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";
import { EVENTS } from "../events/GameEvents";
import type { AudioManager } from "../systems/AudioManager";
import type { Character } from "./Character";

const THRUST_FORCE = 0.005;
const EXHAUST_LIFE_MS = 300;
// Height of the character sprite — feet are half this below the body centre
const CHAR_HEIGHT = 26;

/**
 * Equips the active worm with a jetpack for a fixed duration.
 *
 * Controls (while active):
 *   ↑  — thrust radially outward (away from planet)
 *   ↓  — thrust radially inward
 *   ← → — thrust tangentially around the planet surface
 *
 * Emits:
 *   'jetpack-tick' (remainingSeconds: number) — once per second while active
 *   'jetpack-end'                              — when the duration expires
 */
export class Jetpack {
  readonly #scene: Phaser.Scene;
  readonly #worm: Character;
  readonly #duration: number;
  readonly #audioManager: AudioManager | null;

  #active = false;
  #remaining: number;
  #timer: Phaser.Time.TimerEvent | null = null;
  #lastSoundTime = 0;

  constructor(
    scene: Phaser.Scene,
    worm: Character,
    audioManager: AudioManager | null = null,
    duration = 3000,
  ) {
    this.#scene = scene;
    this.#worm = worm;
    this.#audioManager = audioManager;
    this.#duration = duration;
    this.#remaining = duration;
  }

  /** Start the jetpack. Begins the countdown and enables update(). */
  activate(): void {
    if (this.#active) return;
    this.#active = true;
    this.#remaining = this.#duration;

    const totalSeconds = Math.ceil(this.#duration / 1000);
    this.#scene.events.emit(EVENTS.JETPACK_TICK, totalSeconds);

    // Fire a countdown tick every second; end when remaining hits zero.
    this.#timer = this.#scene.time.addEvent({
      delay: 1000,
      repeat: totalSeconds - 1,
      callback: () => {
        this.#remaining = Math.max(0, this.#remaining - 1000);
        const secs = Math.ceil(this.#remaining / 1000);
        this.#scene.events.emit(EVENTS.JETPACK_TICK, secs);
        if (this.#remaining <= 0) {
          this.#end();
        }
      },
    });
  }

  /** Stop the jetpack early (e.g. worm died, game over). */
  deactivate(): void {
    if (!this.#active) return;
    this.#timer?.remove(false);
    this.#timer = null;
    this.#active = false;
  }

  isActive(): boolean {
    return this.#active;
  }

  /**
   * Called every frame while active.
   * Applies thrust forces and spawns exhaust particles.
   */
  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined): void {
    if (!this.#active || !cursors) return;

    const { x, y } = this.#worm.body.position;
    // Angle from planet centre to worm (radially outward direction)
    const theta = Math.atan2(y - PLANET_CENTER.y, x - PLANET_CENTER.x);

    let fx = 0;
    let fy = 0;

    if (cursors.up?.isDown) {
      // Radial outward (away from planet)
      fx += Math.cos(theta) * THRUST_FORCE;
      fy += Math.sin(theta) * THRUST_FORCE;
    }
    if (cursors.down?.isDown) {
      // Radial inward (toward planet)
      fx -= Math.cos(theta) * THRUST_FORCE;
      fy -= Math.sin(theta) * THRUST_FORCE;
    }
    if (cursors.left?.isDown) {
      // Tangential counter-clockwise
      fx -= Math.sin(theta) * THRUST_FORCE;
      fy += Math.cos(theta) * THRUST_FORCE;
    }
    if (cursors.right?.isDown) {
      // Tangential clockwise
      fx += Math.sin(theta) * THRUST_FORCE;
      fy -= Math.cos(theta) * THRUST_FORCE;
    }

    const thrusting = fx !== 0 || fy !== 0;

    if (thrusting) {
      Matter.Body.applyForce(
        this.#worm.body as unknown as Matter.Body,
        this.#worm.body.position,
        { x: fx, y: fy },
      );
      this.#spawnExhaust(x, y, theta);

      // Play thrust sound at most once every 200 ms
      const now = this.#scene.time.now;
      if (now - this.#lastSoundTime > 200) {
        this.#audioManager?.playJetpackThrust();
        this.#lastSoundTime = now;
      }
    }
  }

  // ── private ────────────────────────────────────────────────────────────────

  /** Spawn 2–3 small orange/yellow exhaust circles at the worm's feet. */
  #spawnExhaust(wx: number, wy: number, theta: number): void {
    // Feet sit half a character height below the body centre (inward direction)
    const feetX = wx - Math.cos(theta) * (CHAR_HEIGHT / 2);
    const feetY = wy - Math.sin(theta) * (CHAR_HEIGHT / 2);

    // Exhaust shoots toward the planet centre with some angular spread
    const inwardAngle = Math.atan2(PLANET_CENTER.y - wy, PLANET_CENTER.x - wx);

    const count = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      const speed = 0.5 + Math.random() * 1.5;
      const angle = inwardAngle + spread;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = Math.random() > 0.5 ? 0xff8800 : 0xffdd00;
      const size = 2 + Math.random() * 2;

      const gfx = this.#scene.add.graphics();
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, size);
      gfx.setPosition(feetX, feetY);
      gfx.setDepth(5);

      let life = EXHAUST_LIFE_MS;

      const onUpdate = (_t: number, delta: number) => {
        life -= delta;
        if (life <= 0) {
          gfx.destroy();
          this.#scene.events.off("update", onUpdate);
          return;
        }
        gfx.x += vx;
        gfx.y += vy;
        gfx.setAlpha(life / EXHAUST_LIFE_MS);
      };

      this.#scene.events.on("update", onUpdate);
    }
  }

  /** Natural end of the jetpack duration. */
  #end(): void {
    this.#active = false;
    this.#timer?.remove(false);
    this.#timer = null;
    this.#audioManager?.playJetpackEnd();
    this.#scene.events.emit(EVENTS.JETPACK_END);
  }
}

import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";
import { EVENTS } from "../events/GameEvents";
import type { Character } from "./Character";

const MINE_RADIUS = 8;
const TRIGGER_RADIUS = 28;
const EXPLOSION_VISUAL_RADIUS = 60;
const EXPLOSION_DURATION = 450;
const BLINK_DOT_RADIUS = 3;
const BLINK_INTERVAL_FAR = 800; // ms when worm is >100 px away
const BLINK_INTERVAL_CLOSE = 200; // ms when worm is <30 px away
const DIST_FAR = 100;
const DIST_CLOSE = 30;

/**
 * A land mine placed on the terrain surface oriented radially toward the
 * planet centre. Persists across turns and triggers when any worm body
 * centre comes within TRIGGER_RADIUS px.
 *
 * On detonation emits 'mine-exploded' with { x, y } for GameScene to handle
 * terrain destruction, damage and turn advancement.
 * On each blink toggle emits 'mine-beep' for GameScene to play audio.
 */
export class LandMine {
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #blinkDot: Phaser.GameObjects.Graphics;
  readonly #scene: Phaser.Scene;
  readonly #x: number;
  readonly #y: number;
  #active = true;
  #blinkVisible = true;
  #lastBlinkTime: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.#scene = scene;
    this.#x = x;
    this.#y = y;
    this.#lastBlinkTime = scene.time.now;

    this.#graphics = scene.add.graphics().setDepth(3);
    this.#blinkDot = scene.add.graphics().setDepth(4);

    this.#drawMine();
    this.#drawBlinkDot(true);
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /**
   * Called every frame. Checks proximity to each worm and triggers if any
   * worm is within TRIGGER_RADIUS. Also drives the blinking indicator.
   */
  update(worms: Character[]): void {
    if (!this.#active) return;

    let minDist = Number.POSITIVE_INFINITY;
    for (const worm of worms) {
      if (!worm.isAlive()) continue;
      const dx = worm.body.position.x - this.#x;
      const dy = worm.body.position.y - this.#y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
      if (dist < TRIGGER_RADIUS) {
        this.#explode();
        return;
      }
    }

    // Blink interval: interpolate between FAR and CLOSE based on nearest worm
    let interval: number;
    if (minDist >= DIST_FAR) {
      interval = BLINK_INTERVAL_FAR;
    } else if (minDist <= DIST_CLOSE) {
      interval = BLINK_INTERVAL_CLOSE;
    } else {
      const t = (minDist - DIST_CLOSE) / (DIST_FAR - DIST_CLOSE);
      interval =
        BLINK_INTERVAL_CLOSE + t * (BLINK_INTERVAL_FAR - BLINK_INTERVAL_CLOSE);
    }

    const now = this.#scene.time.now;
    if (now - this.#lastBlinkTime >= interval) {
      this.#lastBlinkTime = now;
      this.#blinkVisible = !this.#blinkVisible;
      this.#drawBlinkDot(this.#blinkVisible);
      this.#scene.events.emit(EVENTS.MINE_BEEP);
    }
  }

  destroy(): void {
    this.#graphics.destroy();
    this.#blinkDot.destroy();
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  /** Draw the mine body: red circle with white outline and white X. */
  #drawMine(): void {
    const g = this.#graphics;
    g.clear();

    // Red filled circle
    g.fillStyle(0xcc0000, 1);
    g.fillCircle(this.#x, this.#y, MINE_RADIUS);

    // White outline
    g.lineStyle(1.5, 0xffffff, 1);
    g.strokeCircle(this.#x, this.#y, MINE_RADIUS);

    // White X — two diagonals, rotated to align radially
    const radialAngle = Math.atan2(
      this.#y - PLANET_CENTER.y,
      this.#x - PLANET_CENTER.x,
    );
    const s = MINE_RADIUS * 0.55;
    g.lineStyle(2, 0xffffff, 1);

    for (const offset of [Math.PI / 4, -Math.PI / 4]) {
      const a = radialAngle + offset;
      const cx = Math.cos(a) * s;
      const cy = Math.sin(a) * s;
      g.beginPath();
      g.moveTo(this.#x - cx, this.#y - cy);
      g.lineTo(this.#x + cx, this.#y + cy);
      g.strokePath();
    }
  }

  /** Draw (or hide) the small blinking indicator dot above the mine. */
  #drawBlinkDot(visible: boolean): void {
    this.#blinkDot.clear();
    if (!visible) return;

    // Position outward from planet centre, just above the mine circle
    const dx = this.#x - PLANET_CENTER.x;
    const dy = this.#y - PLANET_CENTER.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : -1;

    const dotX = this.#x + nx * (MINE_RADIUS + 5);
    const dotY = this.#y + ny * (MINE_RADIUS + 5);
    this.#blinkDot.fillStyle(0xff3333, 1);
    this.#blinkDot.fillCircle(dotX, dotY, BLINK_DOT_RADIUS);
  }

  /** Trigger explosion: visuals + event emission. Terrain/damage in GameScene. */
  #explode(): void {
    if (!this.#active) return;
    this.#active = false;

    const x = this.#x;
    const y = this.#y;

    this.#graphics.destroy();
    this.#blinkDot.destroy();

    this.#scene.cameras.main.shake(200, 0.01);

    // Outer orange ring
    const outer = this.#scene.add.graphics();
    outer.fillStyle(0xff6600, 0.9);
    outer.fillCircle(0, 0, EXPLOSION_VISUAL_RADIUS);
    outer.setPosition(x, y);
    outer.setScale(0.2);

    // Inner yellow core
    const inner = this.#scene.add.graphics();
    inner.fillStyle(0xffdd00, 1);
    inner.fillCircle(0, 0, EXPLOSION_VISUAL_RADIUS * 0.55);
    inner.setPosition(x, y);
    inner.setScale(0.2);

    this.#scene.tweens.add({
      targets: [outer, inner],
      scale: 1.1,
      alpha: 0,
      duration: EXPLOSION_DURATION,
      ease: "Power2",
      onComplete: () => {
        outer.destroy();
        inner.destroy();
      },
    });

    this.#scene.events.emit(EVENTS.MINE_EXPLODED, { x, y });
  }
}

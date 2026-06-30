import Phaser from "phaser";
import { GRAVITY_STRENGTH, PLANET_CENTER } from "../config";
import type { Character } from "../entities/Character";

const ARROW_LENGTH = 55;
const ARROW_HEAD_SIZE = 10;
const ROTATE_SPEED = (2 * Math.PI) / 180; // 2° per frame in radians
const POWER_CHARGE_RATE = 0.02; // 0→1 over 50 frames
const TRAJECTORY_STEPS = 10;
const TRAJECTORY_SIM_STEPS = 6; // physics ticks between preview dots
const MAX_FIRE_SPEED = 12;
const FIRE_OFFSET = 40; // px from character centre to projectile spawn

const POWER_BAR_WIDTH = 40;
const POWER_BAR_HEIGHT = 6;
const POWER_BAR_OFFSET_Y = 44; // below the character in local space

/**
 * Manages the aiming UI for the currently active worm.
 *
 * - Arrow/line that rotates around the worm, controlled with ← →
 * - Power bar charged by holding Space, fired on release
 * - Dashed trajectory preview (10 dots) simulating radial gravity
 *
 * Events emitted on the Phaser scene:
 *   'fire'  — { angle: number, power: number, worm: Character }
 */
export class AimingSystem {
  readonly #scene: Phaser.Scene;
  readonly #aimGfx: Phaser.GameObjects.Graphics;
  readonly #barGfx: Phaser.GameObjects.Graphics;
  readonly #trajectoryGfx: Phaser.GameObjects.Graphics;

  #worm: Character | null = null;
  #active = false;

  /** Offset from the radial-outward direction (radians). 0 = straight up. */
  #aimOffset = 0;
  #power = 0;
  #charging = false;

  #keyLeft: Phaser.Input.Keyboard.Key | null = null;
  #keyRight: Phaser.Input.Keyboard.Key | null = null;
  #spaceDownHandler: (() => void) | null = null;
  #spaceUpHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;
    this.#aimGfx = scene.add.graphics().setDepth(5);
    this.#barGfx = scene.add.graphics().setDepth(6);
    this.#trajectoryGfx = scene.add.graphics().setDepth(4);
    this.#setVisible(false);
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  /** Bind the aiming system to `worm` and show the UI. */
  activate(worm: Character): void {
    this.#worm = worm;
    this.#aimOffset = 0;
    this.#power = 0;
    this.#charging = false;
    this.#active = true;

    this.#keyLeft =
      this.#scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT) ??
      null;
    this.#keyRight =
      this.#scene.input.keyboard?.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ) ?? null;

    this.#spaceDownHandler = () => {
      if (this.#active) this.#charging = true;
    };
    this.#spaceUpHandler = () => {
      if (this.#active && this.#charging) {
        this.#fire();
      }
    };

    this.#scene.input.keyboard?.on("keydown-SPACE", this.#spaceDownHandler);
    this.#scene.input.keyboard?.on("keyup-SPACE", this.#spaceUpHandler);

    this.#setVisible(true);
  }

  /** Hide the UI and unbind input. */
  deactivate(): void {
    this.#active = false;
    this.#worm = null;
    this.#charging = false;
    this.#power = 0;

    if (this.#spaceDownHandler) {
      this.#scene.input.keyboard?.off("keydown-SPACE", this.#spaceDownHandler);
      this.#spaceDownHandler = null;
    }
    if (this.#spaceUpHandler) {
      this.#scene.input.keyboard?.off("keyup-SPACE", this.#spaceUpHandler);
      this.#spaceUpHandler = null;
    }

    this.#keyLeft = null;
    this.#keyRight = null;

    this.#setVisible(false);
  }

  /** Aim direction in world-space radians. */
  getAimAngle(): number {
    if (!this.#worm) return 0;
    return this.#radialAngle(this.#worm) + this.#aimOffset;
  }

  /** Current charge level, 0–1. */
  getAimPower(): number {
    return this.#power;
  }

  /**
   * Call every frame from the scene's update().
   * Handles rotation input, power charging, and redraws the UI.
   */
  update(): void {
    if (!this.#active || !this.#worm?.isAlive()) return;

    // Rotation via cursor keys
    if (this.#keyLeft?.isDown) {
      this.#aimOffset -= ROTATE_SPEED;
    } else if (this.#keyRight?.isDown) {
      this.#aimOffset += ROTATE_SPEED;
    }

    // Clamp to ±170° so you can't aim straight down at yourself
    const limit = (170 * Math.PI) / 180;
    this.#aimOffset = Math.max(-limit, Math.min(limit, this.#aimOffset));

    // Power charging
    if (this.#charging) {
      this.#power = Math.min(1, this.#power + POWER_CHARGE_RATE);
    }

    this.#redraw();
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #setVisible(v: boolean): void {
    this.#aimGfx.setVisible(v);
    this.#barGfx.setVisible(v);
    this.#trajectoryGfx.setVisible(v);
    if (!v) {
      this.#aimGfx.clear();
      this.#barGfx.clear();
      this.#trajectoryGfx.clear();
    }
  }

  #radialAngle(worm: Character): number {
    return Math.atan2(
      worm.body.position.y - PLANET_CENTER.y,
      worm.body.position.x - PLANET_CENTER.x,
    );
  }

  #redraw(): void {
    const worm = this.#worm;
    if (!worm) return;
    const wx = worm.body.position.x;
    const wy = worm.body.position.y;
    const worldAngle = this.getAimAngle();

    // ── Aim arrow ────────────────────────────────────────────────────────────
    this.#aimGfx.clear();
    this.#aimGfx.setPosition(wx, wy);
    this.#aimGfx.lineStyle(2, 0xffff00, 0.9);

    const ex = Math.cos(worldAngle) * ARROW_LENGTH;
    const ey = Math.sin(worldAngle) * ARROW_LENGTH;
    this.#aimGfx.strokeLineShape(new Phaser.Geom.Line(0, 0, ex, ey));

    // Arrow head (small filled triangle at the tip)
    const headAngle = worldAngle;
    const leftAngle = headAngle + (140 * Math.PI) / 180;
    const rightAngle = headAngle - (140 * Math.PI) / 180;
    this.#aimGfx.fillStyle(0xffff00, 0.9);
    this.#aimGfx.fillTriangle(
      ex,
      ey,
      ex + Math.cos(leftAngle) * ARROW_HEAD_SIZE,
      ey + Math.sin(leftAngle) * ARROW_HEAD_SIZE,
      ex + Math.cos(rightAngle) * ARROW_HEAD_SIZE,
      ey + Math.sin(rightAngle) * ARROW_HEAD_SIZE,
    );

    // ── Power bar (rotated with character) ───────────────────────────────────
    this.#barGfx.clear();
    this.#barGfx.setPosition(wx, wy);
    const radial = this.#radialAngle(worm);
    this.#barGfx.setRotation(radial + Math.PI / 2);

    const fillW = Math.round(POWER_BAR_WIDTH * this.#power);
    const barX = -POWER_BAR_WIDTH / 2;

    this.#barGfx.fillStyle(0x222222);
    this.#barGfx.fillRect(
      barX,
      POWER_BAR_OFFSET_Y,
      POWER_BAR_WIDTH,
      POWER_BAR_HEIGHT,
    );

    if (fillW > 0) {
      // Colour shifts from green (low) to red (full)
      const r = Math.round(255 * this.#power);
      const g = Math.round(255 * (1 - this.#power));
      const barColor = (r << 16) | (g << 8);
      this.#barGfx.fillStyle(barColor);
      this.#barGfx.fillRect(barX, POWER_BAR_OFFSET_Y, fillW, POWER_BAR_HEIGHT);
    }

    // ── Trajectory preview (dashed dots) ─────────────────────────────────────
    this.#trajectoryGfx.clear();

    // Compute initial velocity for preview
    const speed = this.#power * MAX_FIRE_SPEED;
    let px = wx + Math.cos(worldAngle) * FIRE_OFFSET;
    let py = wy + Math.sin(worldAngle) * FIRE_OFFSET;
    let vx = Math.cos(worldAngle) * speed;
    let vy = Math.sin(worldAngle) * speed;

    for (let i = 0; i < TRAJECTORY_STEPS; i++) {
      // Advance TRAJECTORY_SIM_STEPS physics ticks
      for (let s = 0; s < TRAJECTORY_SIM_STEPS; s++) {
        const ddx = PLANET_CENTER.x - px;
        const ddy = PLANET_CENTER.y - py;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist > 0) {
          vx += (ddx / dist) * GRAVITY_STRENGTH * 60;
          vy += (ddy / dist) * GRAVITY_STRENGTH * 60;
        }
        px += vx;
        py += vy;
      }

      // Alternate opacity for dash effect
      const alpha = i % 2 === 0 ? 0.8 : 0.3;
      this.#trajectoryGfx.fillStyle(0xffffff, alpha);
      this.#trajectoryGfx.fillCircle(px, py, 2);
    }
  }

  #fire(): void {
    if (!this.#worm) return;

    const angle = this.getAimAngle();
    const power = this.#power;
    const worm = this.#worm;

    this.#charging = false;
    this.#power = 0;

    this.#scene.events.emit("fire", { angle, power, worm });

    // Deactivate aiming after firing; the TurnManager will re-activate on next turn
    this.deactivate();
  }
}

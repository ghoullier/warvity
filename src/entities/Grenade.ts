import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER, PLANET_RADIUS } from "../config";
import { GameEvents } from "../systems/GameEvents";
import { toMatterBody } from "../utils/matterUtils";

const GRENADE_RADIUS = 5;
const GRENADE_TRAIL_COLOR = 0x66ff44;
const TRAIL_MAX = 6;
const MAX_BOUNCES = 3;
const FUSE_DURATION = 3; // seconds
const EXPLOSION_VISUAL_RADIUS = 50;
const EXPLOSION_DURATION = 450;
export const MAX_GRENADE_SPEED = 10;

/**
 * Maximum depth below the surface at which a grenade is allowed to travel.
 * If the grenade drops below this radius it has either tunnelled through a
 * sector body or fallen into a very deep crater — force-explode immediately
 * to prevent it reaching the planet core.
 * 0.85 × 280 = 238 px from centre ≈ 42 px below the surface.
 */
const DEPTH_GUARD_RADIUS = PLANET_RADIUS * 0.85;

type CollisionEvent = {
  pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }>;
};

/**
 * A grenade that bounces off terrain up to MAX_BOUNCES times, then detonates
 * after a FUSE_DURATION-second fuse. Displays a countdown above the grenade.
 * On explosion emits 'grenade-exploded' with { x, y } for GameScene to handle.
 */
export class Grenade {
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #scene: Phaser.Scene;
  #active = true;
  #bounceCount = 0;
  #collisionHandler: ((event: CollisionEvent) => void) | null = null;
  #fuseCount = FUSE_DURATION;
  #countdownText: Phaser.GameObjects.Text | null = null;
  #fuseTimer: Phaser.Time.TimerEvent | null = null;
  #trail: Array<{ x: number; y: number }> = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    this.#scene = scene;

    this.body = scene.matter.add.circle(x, y, GRENADE_RADIUS, {
      label: "grenade",
      frictionAir: 0.01,
      restitution: 0.6,
    });

    Matter.Body.setVelocity(toMatterBody(this.body), {
      x: vx,
      y: vy,
    });

    this.#graphics = scene.add.graphics();
    this.#redraw(x, y);

    this.#countdownText = scene.add
      .text(x, y - GRENADE_RADIUS - 10, `${FUSE_DURATION}`, {
        fontSize: "14px",
        color: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1)
      .setDepth(10);

    this.#fuseTimer = scene.time.addEvent({
      delay: 1000,
      repeat: FUSE_DURATION - 1,
      callback: () => {
        this.#fuseCount--;
        if (this.#fuseCount <= 0) {
          this.explode();
        } else {
          this.#countdownText?.setText(`${this.#fuseCount}`);
        }
      },
    });

    this.#collisionHandler = (event) => {
      if (!this.#active) return;

      for (const pair of event.pairs) {
        const hitThis = pair.bodyA === this.body || pair.bodyB === this.body;
        if (!hitThis) continue;

        const other = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;

        if (!other.isStatic) break;

        // Grenade reached the bedrock — explode immediately rather than
        // bouncing at the planet core.
        if (other.label === "terrain-core") {
          this.explode();
          return;
        }

        this.#bounceCount++;
        if (this.#bounceCount >= MAX_BOUNCES) {
          Matter.Body.set(toMatterBody(this.body), {
            restitution: 0,
            friction: 1,
            frictionAir: 0.3,
          });
        }
        break;
      }
    };

    scene.matter.world.on("collisionstart", this.#collisionHandler);
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /** Called every frame to sync visuals with the physics body. */
  update(): void {
    if (!this.#active) return;
    const { x, y } = this.body.position;

    // Depth guard: if the grenade has tunnelled through a sector body or
    // fallen into a very deep crater, explode immediately rather than let it
    // travel to the planet core.
    const dist = Math.hypot(x - PLANET_CENTER.x, y - PLANET_CENTER.y);
    if (dist < DEPTH_GUARD_RADIUS) {
      this.explode();
      return;
    }

    // Record position for trail
    this.#trail.push({ x, y });
    if (this.#trail.length > TRAIL_MAX) this.#trail.shift();

    this.#graphics.setPosition(x, y);
    this.#redraw(x, y);
    this.#countdownText?.setPosition(x, y - GRENADE_RADIUS - 10);
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #redraw(cx: number, cy: number): void {
    this.#graphics.clear();

    // Draw trail (oldest = most transparent, smallest)
    for (let i = 0; i < this.#trail.length; i++) {
      const t = this.#trail[i];
      const alpha = (i / this.#trail.length) * 0.4;
      const radius = 2 * (i / this.#trail.length) + 1;
      this.#graphics.fillStyle(GRENADE_TRAIL_COLOR, alpha);
      this.#graphics.fillCircle(t.x - cx, t.y - cy, radius);
    }

    // Main grenade dot
    this.#graphics.fillStyle(0x33cc33, 1);
    this.#graphics.fillCircle(0, 0, GRENADE_RADIUS);
  }

  /** Explosion visual, camera shake, and event emission. Terrain and damage are handled by GameScene. */
  explode(): void {
    if (!this.#active) return;
    this.#active = false;

    if (this.#fuseTimer) {
      this.#fuseTimer.remove(false);
      this.#fuseTimer = null;
    }
    this.#countdownText?.destroy();
    this.#countdownText = null;

    if (this.#collisionHandler) {
      this.#scene.matter.world.off("collisionstart", this.#collisionHandler);
      this.#collisionHandler = null;
    }

    const { x, y } = this.body.position;

    // Camera shake
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

    this.#scene.matter.world.remove(this.body, false);
    this.#graphics.destroy();

    this.#scene.events.emit(GameEvents.GRENADE_EXPLODED, { x, y });
  }
}

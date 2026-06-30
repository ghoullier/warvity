import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER, PLANET_RADIUS } from "../config";

const SINGULARITY_RADIUS = 8;
const RING_RADIUS = 14;
const RING_SEGMENTS = 3;
const RING_GAP = 0.4;
const FLIGHT_TIMEOUT = 1000; // ms before auto-freeze
const ACTIVE_DURATION = 3000; // ms of attraction phase
const ATTRACTION_FORCE = 0.005;
const EXPLOSION_VISUAL_RADIUS = 80;
const EXPLOSION_DURATION = 500;

type CollisionEvent = {
  pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }>;
};

/**
 * Singularity black hole weapon.
 *
 * Launched as a projectile; freezes on terrain/character impact or after 1 s of flight.
 * Once frozen, applies a strong attractive force to all nearby dynamic bodies for 3 s,
 * then detonates with a large explosion.
 * Emits 'singularity-exploded' with { x, y } for GameScene to handle damage.
 */
export class Singularity {
  readonly body: MatterJS.BodyType;
  readonly #scene: Phaser.Scene;
  #active = true;
  #frozen = false;

  readonly #coreGfx: Phaser.GameObjects.Graphics;
  readonly #ringGfx: Phaser.GameObjects.Graphics;
  readonly #tweens: Phaser.Tweens.Tween[] = [];

  #flightTimer: Phaser.Time.TimerEvent | null = null;
  #activeTimer: Phaser.Time.TimerEvent | null = null;
  #collisionHandler: ((event: CollisionEvent) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    this.#scene = scene;

    this.body = scene.matter.add.circle(x, y, SINGULARITY_RADIUS, {
      label: "singularity",
      frictionAir: 0.005,
      restitution: 0,
    });

    Matter.Body.setVelocity(this.body as unknown as Matter.Body, {
      x: vx,
      y: vy,
    });

    // Deep black core
    this.#coreGfx = scene.add.graphics().setDepth(6);
    this.#coreGfx.fillStyle(0x050005);
    this.#coreGfx.fillCircle(0, 0, SINGULARITY_RADIUS);

    // Segmented purple ring (3 arcs with gaps so rotation is visible)
    this.#ringGfx = scene.add.graphics().setDepth(6);
    this.#drawRingSegments();

    // Auto-freeze after FLIGHT_TIMEOUT ms if no impact occurs
    this.#flightTimer = scene.time.addEvent({
      delay: FLIGHT_TIMEOUT,
      callback: () => this.#freeze(),
    });

    // Freeze on contact with static terrain or a character
    this.#collisionHandler = (event: CollisionEvent) => {
      if (!this.#active || this.#frozen) return;
      for (const pair of event.pairs) {
        const hitThis = pair.bodyA === this.body || pair.bodyB === this.body;
        if (!hitThis) continue;
        const other = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;
        if (other.isStatic || other.label === "character") {
          this.#freeze();
          return;
        }
      }
    };
    scene.matter.world.on("collisionstart", this.#collisionHandler);
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /** Called every frame to sync visuals and apply attraction when frozen. */
  update(): void {
    if (!this.#active) return;

    const { x, y } = this.body.position;
    this.#coreGfx.setPosition(x, y);
    this.#ringGfx.setPosition(x, y);

    if (this.#frozen) {
      this.#attractBodies(x, y);
    } else {
      // Freeze if projectile reaches the planet surface
      const dx = x - PLANET_CENTER.x;
      const dy = y - PLANET_CENTER.y;
      const distSq = dx * dx + dy * dy;
      const hitRadius = PLANET_RADIUS - SINGULARITY_RADIUS;
      if (distSq <= hitRadius * hitRadius) {
        this.#freeze();
      }
    }
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #drawRingSegments(): void {
    const sweep = (Math.PI * 2) / RING_SEGMENTS - RING_GAP;
    this.#ringGfx.clear();
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const start = i * ((Math.PI * 2) / RING_SEGMENTS);
      this.#ringGfx.lineStyle(3, 0xaa22ff, 1.0);
      this.#ringGfx.beginPath();
      this.#ringGfx.arc(0, 0, RING_RADIUS, start, start + sweep, false);
      this.#ringGfx.strokePath();
    }
    // Faint outer glow ring
    this.#ringGfx.lineStyle(1, 0xcc66ff, 0.35);
    this.#ringGfx.strokeCircle(0, 0, RING_RADIUS + 5);
  }

  #freeze(): void {
    if (this.#frozen || !this.#active) return;
    this.#frozen = true;

    this.#flightTimer?.remove(false);
    this.#flightTimer = null;

    Matter.Body.setStatic(this.body as unknown as Matter.Body, true);

    // Spin the segmented ring so the rotation is clearly visible
    this.#tweens.push(
      this.#scene.tweens.add({
        targets: this.#ringGfx,
        rotation: Math.PI * 2,
        duration: 1500,
        repeat: -1,
        ease: "Linear",
      }),
    );

    // Scale pulse on both graphics for a breathing black-hole feel
    this.#tweens.push(
      this.#scene.tweens.add({
        targets: [this.#coreGfx, this.#ringGfx],
        scaleX: { from: 0.85, to: 1.35 },
        scaleY: { from: 0.85, to: 1.35 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      }),
    );

    // Schedule the final explosion
    this.#activeTimer = this.#scene.time.addEvent({
      delay: ACTIVE_DURATION,
      callback: () => this.#explode(),
    });
  }

  /** Apply a strong attractive force toward the singularity on every dynamic body. */
  #attractBodies(sx: number, sy: number): void {
    const bodies = this.#scene.matter.world.getAllBodies();
    for (const body of bodies) {
      if (body === this.body || body.isStatic) continue;
      const dx = sx - body.position.x;
      const dy = sy - body.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < 1) continue;
      const dist = Math.sqrt(distSq);
      const force = ATTRACTION_FORCE * (body.mass ?? 1);
      Matter.Body.applyForce(
        body as unknown as Matter.Body,
        body.position as unknown as Matter.Vector,
        { x: (dx / dist) * force, y: (dy / dist) * force },
      );
    }
  }

  #explode(): void {
    if (!this.#active) return;
    this.#active = false;

    this.#flightTimer?.remove(false);
    this.#flightTimer = null;
    this.#activeTimer?.remove(false);
    this.#activeTimer = null;

    for (const t of this.#tweens) t.stop();
    this.#tweens.length = 0;

    if (this.#collisionHandler) {
      this.#scene.matter.world.off("collisionstart", this.#collisionHandler);
      this.#collisionHandler = null;
    }

    const { x, y } = this.body.position;

    this.#scene.cameras.main.shake(350, 0.018);

    // Dark purple burst expanding outward
    const outer = this.#scene.add.graphics();
    outer.fillStyle(0x6600cc, 0.9);
    outer.fillCircle(0, 0, EXPLOSION_VISUAL_RADIUS);
    outer.setPosition(x, y).setScale(0.2);

    // Black implosion core
    const inner = this.#scene.add.graphics();
    inner.fillStyle(0x000000, 1);
    inner.fillCircle(0, 0, EXPLOSION_VISUAL_RADIUS * 0.5);
    inner.setPosition(x, y).setScale(0.2);

    this.#scene.tweens.add({
      targets: [outer, inner],
      scale: 1.2,
      alpha: 0,
      duration: EXPLOSION_DURATION,
      ease: "Power2",
      onComplete: () => {
        outer.destroy();
        inner.destroy();
      },
    });

    this.#scene.matter.world.remove(this.body, false);
    this.#coreGfx.destroy();
    this.#ringGfx.destroy();

    this.#scene.events.emit("singularity-exploded", { x, y });
  }
}

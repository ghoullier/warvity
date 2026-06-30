import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER, PLANET_RADIUS } from "../config";
import type { CameraController } from "../systems/CameraController";
import type { TerrainManager } from "../systems/TerrainManager";

const PROJECTILE_RADIUS = 4;
const EXPLOSION_VISUAL_RADIUS = 60;
const EXPLOSION_DURATION = 450;

type CollisionHandler = Matter.ICollisionCallback;

/**
 * Bazooka projectile with radial gravity.
 *
 * - Circular body (radius 4) launched with the given velocity.
 * - Radial gravity is applied by the scene's GravitySystem each frame.
 * - Terrain hit detected via distance-to-center + TerrainManager bitmap.
 * - Worm hit detected via Matter.js collisionStart event.
 * - Camera follows the projectile in flight and returns to the active worm
 *   after explosion.
 *
 * Full explosion effects (blast radius, terrain crater, worm damage) land in #13.
 */
export class Projectile {
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #scene: Phaser.Scene;
  readonly #terrain: TerrainManager;
  readonly #camera: CameraController;
  #active = true;
  #collisionHandler: CollisionHandler | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    terrain: TerrainManager,
    camera: CameraController,
  ) {
    this.#scene = scene;
    this.#terrain = terrain;
    this.#camera = camera;

    this.body = scene.matter.add.circle(x, y, PROJECTILE_RADIUS, {
      label: "projectile",
      frictionAir: 0,
      restitution: 0.3,
    });

    Matter.Body.setVelocity(this.body as unknown as Matter.Body, {
      x: vx,
      y: vy,
    });

    this.#graphics = scene.add.graphics();
    this.#graphics.fillStyle(0xffdd00);
    this.#graphics.fillCircle(0, 0, PROJECTILE_RADIUS);

    this.#camera.followProjectile(this);
    this.#setupCollisionDetection();
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /** Called every frame. Syncs the visual and checks for terrain hits. */
  update(): void {
    if (!this.#active) return;

    this.#graphics.setPosition(this.body.position.x, this.body.position.y);

    const dx = this.body.position.x - PLANET_CENTER.x;
    const dy = this.body.position.y - PLANET_CENTER.y;
    const distSq = dx * dx + dy * dy;
    const hitRadius = PLANET_RADIUS - PROJECTILE_RADIUS;

    if (
      distSq <= hitRadius * hitRadius ||
      this.#terrain.isTerrainAt(this.body.position.x, this.body.position.y)
    ) {
      this.explode();
    }
  }

  /** Explosion visual, camera shake, and event emission. Terrain and damage are handled by GameScene. */
  explode(): void {
    if (!this.#active) return;
    this.#active = false;

    this.#tearDownCollisions();

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

    this.#scene.events.emit("projectile-exploded", { x, y });
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #setupCollisionDetection(): void {
    this.#collisionHandler = (event: Matter.IEventCollision<Matter.Engine>) => {
      if (!this.#active) return;

      for (const pair of event.pairs) {
        const a = pair.bodyA as unknown as MatterJS.BodyType;
        const b = pair.bodyB as unknown as MatterJS.BodyType;

        if (a === this.body || b === this.body) {
          const other = a === this.body ? b : a;
          if (other.label === "character") {
            this.explode();
            return;
          }
        }
      }
    };

    Matter.Events.on(
      this.#scene.matter.world.engine as unknown as Matter.Engine,
      "collisionStart",
      this.#collisionHandler,
    );
  }

  #tearDownCollisions(): void {
    if (!this.#collisionHandler) return;
    Matter.Events.off(
      this.#scene.matter.world.engine as unknown as Matter.Engine,
      "collisionStart",
      this.#collisionHandler,
    );
    this.#collisionHandler = null;
  }
}

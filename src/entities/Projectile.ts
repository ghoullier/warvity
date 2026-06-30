import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER, PLANET_RADIUS } from "../config";
import type { TerrainManager } from "../systems/TerrainManager";

const PROJECTILE_RADIUS = 5;
const EXPLOSION_RADIUS = 40;

/**
 * A projectile that follows radial gravity independently (the GravitySystem
 * in the scene applies gravity to all bodies; this class replicates the same
 * calculation so it can self-destruct when it hits the terrain).
 *
 * On collision with the terrain it triggers a TerrainManager explosion.
 */
export class Projectile {
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #terrain: TerrainManager;
  readonly #scene: Phaser.Scene;
  #active = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
    terrain: TerrainManager,
  ) {
    this.#scene = scene;
    this.#terrain = terrain;

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
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /** Called every frame. Returns false once the projectile has detonated. */
  update(): void {
    if (!this.#active) return;

    this.#graphics.setPosition(this.body.position.x, this.body.position.y);

    // Terrain hit: check if the projectile centre is inside solid terrain
    // or within the planet radius (catches tunnelling at high speed)
    const dx = this.body.position.x - PLANET_CENTER.x;
    const dy = this.body.position.y - PLANET_CENTER.y;
    const distSq = dx * dx + dy * dy;
    const hitRadius = PLANET_RADIUS - PROJECTILE_RADIUS;

    if (
      distSq <= hitRadius * hitRadius ||
      this.#terrain.isTerrainAt(this.body.position.x, this.body.position.y)
    ) {
      this.#detonate();
    }
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #detonate(): void {
    this.#active = false;

    this.#terrain.explode(
      this.body.position.x,
      this.body.position.y,
      EXPLOSION_RADIUS,
    );

    // Remove physics body from the world
    this.#scene.matter.world.remove(this.body, false);

    this.#graphics.destroy();
  }
}

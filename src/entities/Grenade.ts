import Matter from "matter-js";
import type Phaser from "phaser";

const GRENADE_RADIUS = 5;
const MAX_BOUNCES = 3;
export const MAX_GRENADE_SPEED = 10;

type CollisionEvent = {
  pairs: Array<{ bodyA: MatterJS.BodyType; bodyB: MatterJS.BodyType }>;
};

/**
 * A grenade that bounces off terrain up to MAX_BOUNCES times before coming
 * to rest. Actual explosion damage is handled by issue #15; this class only
 * manages the throw mechanics, surface bouncing, and the initial flash visual.
 */
export class Grenade {
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #scene: Phaser.Scene;
  #active = true;
  #bounceCount = 0;
  #collisionHandler: ((event: CollisionEvent) => void) | null = null;

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

    Matter.Body.setVelocity(this.body as unknown as Matter.Body, {
      x: vx,
      y: vy,
    });

    this.#graphics = scene.add.graphics();
    this.#graphics.fillStyle(0x33cc33);
    this.#graphics.fillCircle(0, 0, GRENADE_RADIUS);

    this.#collisionHandler = (event) => {
      if (!this.#active) return;

      for (const pair of event.pairs) {
        const hitThis = pair.bodyA === this.body || pair.bodyB === this.body;
        if (!hitThis) continue;

        const other = pair.bodyA === this.body ? pair.bodyB : pair.bodyA;

        // Only count collisions with static bodies (terrain)
        if (other.isStatic) {
          this.#bounceCount++;

          if (this.#bounceCount >= MAX_BOUNCES) {
            Matter.Body.set(this.body as unknown as Matter.Body, {
              restitution: 0,
              friction: 1,
              frictionAir: 0.3,
            });
          }
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

  /** Called every frame to sync the visual with the physics body. */
  update(): void {
    if (!this.#active) return;
    this.#graphics.setPosition(this.body.position.x, this.body.position.y);
  }

  /**
   * Triggers a flash visual and removes the physics body.
   * Full explosion damage will be implemented in issue #15.
   */
  explode(): void {
    if (!this.#active) return;
    this.#active = false;

    const flash = this.#scene.add.graphics();
    flash.fillStyle(0xffffff, 1);
    flash.fillCircle(this.body.position.x, this.body.position.y, 20);
    this.#scene.time.delayedCall(150, () => flash.destroy());

    if (this.#collisionHandler) {
      this.#scene.matter.world.off("collisionstart", this.#collisionHandler);
      this.#collisionHandler = null;
    }

    this.#scene.matter.world.remove(this.body, false);
    this.#graphics.destroy();
  }
}

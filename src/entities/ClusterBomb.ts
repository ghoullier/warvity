import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";
import { toMatterBody } from "../utils/matterUtils";

const CLUSTER_RADIUS = 10;
const SUB_RADIUS = 7;
const FUSE_DURATION = 2; // seconds
const SUB_FUSE_MS = 800; // ms
const SUB_COUNT = 6;
const EXPLOSION_VISUAL_RADIUS = 28; // visual radius for sub-munition burst

export const SUB_EXPLOSION_RADIUS = 35;
export const MAX_SUB_DAMAGE = 20;
export const MAX_CLUSTER_SPEED = 10;

/**
 * Cluster bomb weapon.
 *
 * Flies like a grenade (arc throw, radial gravity). After a 2-second fuse it
 * silently splits into 6 sub-munitions that scatter radially away from the
 * planet center (±60° spread, speed 4–7). Each sub-munition detonates after
 * 0.8 s with a small explosion (radius 35).
 *
 * Events emitted on scene:
 *   'cluster-split'          — main bomb splits (play whoosh+pop sound)
 *   'sub-munition-exploded'  — { x, y } one sub detonated (terrain + damage)
 *   'cluster-exploded'       — all subs gone (advance turn)
 */
export class ClusterBomb {
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #scene: Phaser.Scene;
  #active = true;
  #hasSplit = false;
  #fuseCount = FUSE_DURATION;
  #countdownText: Phaser.GameObjects.Text | null = null;
  #fuseTimer: Phaser.Time.TimerEvent | null = null;
  #subBodies: (MatterJS.BodyType | null)[] = [];
  #subGraphics: (Phaser.GameObjects.Graphics | null)[] = [];
  #pendingSubCount = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ) {
    this.#scene = scene;

    this.body = scene.matter.add.circle(x, y, CLUSTER_RADIUS, {
      label: "cluster-bomb",
      frictionAir: 0.01,
      restitution: 0.4,
    });

    Matter.Body.setVelocity(toMatterBody(this.body), {
      x: vx,
      y: vy,
    });

    this.#graphics = scene.add.graphics();
    this.#drawMainBomb();

    this.#countdownText = scene.add
      .text(x, y - CLUSTER_RADIUS - 10, `${FUSE_DURATION}`, {
        fontSize: "14px",
        color: "#ffff00",
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
          this.#split();
        } else {
          this.#countdownText?.setText(`${this.#fuseCount}`);
        }
      },
    });
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  isActive(): boolean {
    return this.#active;
  }

  /** Called every frame to sync visuals with physics bodies. */
  update(): void {
    if (!this.#active) return;

    if (!this.#hasSplit) {
      const { x, y } = this.body.position;
      this.#graphics.setPosition(x, y);
      this.#countdownText?.setPosition(x, y - CLUSTER_RADIUS - 10);
    }

    for (let i = 0; i < this.#subBodies.length; i++) {
      const sub = this.#subBodies[i];
      const gfx = this.#subGraphics[i];
      if (sub && gfx) {
        gfx.setPosition(sub.position.x, sub.position.y);
      }
    }
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #drawMainBomb(): void {
    // Yellow circle base
    this.#graphics.fillStyle(0xffdd00);
    this.#graphics.fillCircle(0, 0, CLUSTER_RADIUS);
    // Orange segmented ring overlay
    this.#graphics.lineStyle(2, 0xff8800, 1);
    this.#graphics.strokeCircle(0, 0, CLUSTER_RADIUS);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this.#graphics.lineBetween(
        Math.cos(angle) * 3,
        Math.sin(angle) * 3,
        Math.cos(angle) * CLUSTER_RADIUS,
        Math.sin(angle) * CLUSTER_RADIUS,
      );
    }
  }

  /** Detach the main body and scatter sub-munitions. No terrain explosion. */
  #split(): void {
    if (this.#hasSplit) return;
    this.#hasSplit = true;

    if (this.#fuseTimer) {
      this.#fuseTimer.remove(false);
      this.#fuseTimer = null;
    }
    this.#countdownText?.destroy();
    this.#countdownText = null;

    const { x, y } = this.body.position;
    this.#scene.matter.world.remove(this.body, false);
    this.#graphics.destroy();

    this.#scene.events.emit("cluster-split");

    // Direction away from planet center
    const dx = x - PLANET_CENTER.x;
    const dy = y - PLANET_CENTER.y;
    const baseAngle = Math.atan2(dy, dx);

    this.#pendingSubCount = SUB_COUNT;

    for (let i = 0; i < SUB_COUNT; i++) {
      // Spread sub-munitions evenly across ±60° (π/3 rad) from the base direction
      const spread = -Math.PI / 3 + (i / (SUB_COUNT - 1)) * ((2 * Math.PI) / 3);
      const jitter = (Math.random() - 0.5) * 0.15;
      const angle = baseAngle + spread + jitter;
      const speed = 4 + Math.random() * 3; // 4–7 px/frame

      const subBody = this.#scene.matter.add.circle(x, y, SUB_RADIUS, {
        label: "sub-munition",
        frictionAir: 0.01,
        restitution: 0.3,
      });
      Matter.Body.setVelocity(toMatterBody(subBody), {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      });

      const gfx = this.#scene.add.graphics();
      gfx.fillStyle(0xff6600);
      gfx.fillCircle(0, 0, SUB_RADIUS);
      gfx.setPosition(x, y);

      this.#subBodies.push(subBody);
      this.#subGraphics.push(gfx);

      const idx = i;
      this.#scene.time.addEvent({
        delay: SUB_FUSE_MS,
        callback: () => this.#detonateSubMunition(idx),
      });
    }
  }

  #detonateSubMunition(idx: number): void {
    const subBody = this.#subBodies[idx];
    const gfx = this.#subGraphics[idx];
    if (!subBody) return; // guard against double-fire

    const { x, y } = subBody.position;

    this.#scene.matter.world.remove(subBody, false);
    this.#subBodies[idx] = null;

    if (gfx) {
      this.#subGraphics[idx] = null;
      // Small orange burst
      gfx.clear();
      gfx.fillStyle(0xff8800, 0.85);
      gfx.fillCircle(0, 0, EXPLOSION_VISUAL_RADIUS);
      gfx.setPosition(x, y);
      gfx.setScale(0.2);
      this.#scene.tweens.add({
        targets: gfx,
        scale: 1.0,
        alpha: 0,
        duration: 300,
        ease: "Power2",
        onComplete: () => gfx.destroy(),
      });
    }

    this.#scene.cameras.main.shake(80, 0.005);
    this.#scene.events.emit("sub-munition-exploded", { x, y });

    this.#pendingSubCount--;
    if (this.#pendingSubCount <= 0) {
      this.#active = false;
      this.#scene.events.emit("cluster-exploded");
    }
  }
}

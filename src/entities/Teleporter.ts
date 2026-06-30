import Matter from "matter-js";
import Phaser from "phaser";
import { PLANET_CENTER, PLANET_RADIUS } from "../config";
import type { TerrainManager } from "../systems/TerrainManager";
import type { Character } from "./Character";

const CURSOR_OUTER_RADIUS = 18;
const CURSOR_INNER_RADIUS = 10;
const FLASH_RADIUS = 30;
const FLASH_DURATION = 220;
// Place worm just above the planet surface (same offset used when spawning)
const WORM_SURFACE_OFFSET = 20;
// Check terrain validity just inside the surface ring
const TERRAIN_CHECK_INSET = 10;
// Scale factor to map from the surface-offset ring to PLANET_RADIUS - TERRAIN_CHECK_INSET
const TERRAIN_CHECK_SCALE =
  (PLANET_RADIUS - TERRAIN_CHECK_INSET) / (PLANET_RADIUS + WORM_SURFACE_OFFSET);

/**
 * Two-step teleporter weapon.
 *
 * Step 1 — aiming: a circular crosshair cursor tracks the mouse along the
 *           planet surface. Cyan = valid (solid terrain), red = invalid.
 * Step 2 — firing: on click the active worm is teleported to the destination
 *           with a white flash at both source and target positions.
 *
 * Emits `'teleport-complete'` on the scene once the animation finishes.
 */
export class Teleporter {
  readonly #scene: Phaser.Scene;
  readonly #terrain: TerrainManager;
  readonly #cursorGfx: Phaser.GameObjects.Graphics;

  #worm: Character | null = null;
  #active = false;
  #cursorX = 0;
  #cursorY = 0;
  #isValidTarget = false;

  constructor(scene: Phaser.Scene, terrain: TerrainManager) {
    this.#scene = scene;
    this.#terrain = terrain;
    this.#cursorGfx = scene.add.graphics().setDepth(10);
    this.#cursorGfx.setVisible(false);
  }

  // ──────────────────────────────── public API ────────────────────────────────

  activate(worm: Character): void {
    this.#worm = worm;
    this.#active = true;
    this.#cursorGfx.setVisible(true);
  }

  deactivate(): void {
    this.#active = false;
    this.#worm = null;
    this.#cursorGfx.setVisible(false);
    this.#cursorGfx.clear();
  }

  isActive(): boolean {
    return this.#active;
  }

  /**
   * Called every frame from GameScene.update().
   * Moves the crosshair cursor to the projected surface point under the pointer.
   */
  update(pointer: Phaser.Input.Pointer): void {
    if (!this.#active) return;

    const dest = this.#surfacePoint(pointer.worldX, pointer.worldY);
    this.#cursorX = dest.x;
    this.#cursorY = dest.y;
    const check = this.#terrainCheckPoint(dest);
    this.#isValidTarget = this.#terrain.isTerrainAt(check.x, check.y);

    this.#redrawCursor();
  }

  /**
   * Attempt a teleport to the surface point nearest the given world-space click.
   * Does nothing and returns false when the target is invalid or teleporter is inactive.
   */
  handleClick(worldX: number, worldY: number): boolean {
    if (!this.#active || !this.#worm) return false;

    const dest = this.#surfacePoint(worldX, worldY);
    const check = this.#terrainCheckPoint(dest);
    const valid = this.#terrain.isTerrainAt(check.x, check.y);
    if (!valid) return false;

    this.#active = false;
    this.#cursorGfx.setVisible(false);
    this.#cursorGfx.clear();
    this.#teleportWorm(dest.x, dest.y);
    return true;
  }

  // ──────────────────────────────── private helpers ───────────────────────────

  /**
   * Returns a point along the same radial direction as `dest`, placed
   * `TERRAIN_CHECK_INSET` pixels inside the planet surface.
   */
  #terrainCheckPoint(dest: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    return {
      x: PLANET_CENTER.x + (dest.x - PLANET_CENTER.x) * TERRAIN_CHECK_SCALE,
      y: PLANET_CENTER.y + (dest.y - PLANET_CENTER.y) * TERRAIN_CHECK_SCALE,
    };
  }

  /** Project a world-space point onto the planet surface. */
  #surfacePoint(worldX: number, worldY: number): { x: number; y: number } {
    const angle = Math.atan2(
      worldY - PLANET_CENTER.y,
      worldX - PLANET_CENTER.x,
    );
    const r = PLANET_RADIUS + WORM_SURFACE_OFFSET;
    return {
      x: PLANET_CENTER.x + Math.cos(angle) * r,
      y: PLANET_CENTER.y + Math.sin(angle) * r,
    };
  }

  #redrawCursor(): void {
    this.#cursorGfx.clear();

    const color = this.#isValidTarget ? 0x00ffff : 0xff3333;
    const alpha = this.#isValidTarget ? 0.9 : 0.6;

    // Outer ring
    this.#cursorGfx.lineStyle(2, color, alpha);
    this.#cursorGfx.strokeCircle(
      this.#cursorX,
      this.#cursorY,
      CURSOR_OUTER_RADIUS,
    );

    // Inner ring
    this.#cursorGfx.lineStyle(1, color, alpha * 0.6);
    this.#cursorGfx.strokeCircle(
      this.#cursorX,
      this.#cursorY,
      CURSOR_INNER_RADIUS,
    );

    // Crosshair lines (horizontal + vertical)
    this.#cursorGfx.lineStyle(1, color, alpha);
    this.#cursorGfx.strokeLineShape(
      new Phaser.Geom.Line(
        this.#cursorX - CURSOR_OUTER_RADIUS,
        this.#cursorY,
        this.#cursorX + CURSOR_OUTER_RADIUS,
        this.#cursorY,
      ),
    );
    this.#cursorGfx.strokeLineShape(
      new Phaser.Geom.Line(
        this.#cursorX,
        this.#cursorY - CURSOR_OUTER_RADIUS,
        this.#cursorX,
        this.#cursorY + CURSOR_OUTER_RADIUS,
      ),
    );
  }

  #teleportWorm(destX: number, destY: number): void {
    const worm = this.#worm;
    if (!worm) return;

    const srcX = worm.body.position.x;
    const srcY = worm.body.position.y;

    // Flash at source, then move worm, then flash at destination
    this.#flashAt(srcX, srcY, () => {
      Matter.Body.setPosition(worm.body as unknown as Matter.Body, {
        x: destX,
        y: destY,
      });
      Matter.Body.setVelocity(worm.body as unknown as Matter.Body, {
        x: 0,
        y: 0,
      });

      this.#flashAt(destX, destY, () => {
        this.#scene.events.emit("teleport-complete");
      });
    });
  }

  /** Spawn a white flash circle at (x, y), then invoke `onComplete`. */
  #flashAt(x: number, y: number, onComplete: () => void): void {
    const flash = this.#scene.add.graphics().setDepth(15);
    flash.fillStyle(0xffffff, 1);
    flash.fillCircle(0, 0, FLASH_RADIUS);
    flash.setPosition(x, y);

    this.#scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: FLASH_DURATION,
      ease: "Power2",
      onComplete: () => {
        flash.destroy();
        onComplete();
      },
    });
  }
}

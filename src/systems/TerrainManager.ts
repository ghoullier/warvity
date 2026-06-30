import type Phaser from "phaser";
import { CANVAS_SIZE, PLANET_CENTER, PLANET_RADIUS } from "../config";

interface Hole {
  x: number;
  y: number;
  radius: number;
}

/**
 * Manages the circular planet terrain.
 *
 * Visual layer: a RenderTexture representing the planet surface with
 * explosion craters punched out as circular holes.
 *
 * Physics layer: a static circle body for the planet.
 * (For more accurate terrain physics, the bitmap could be fed into a
 * marching-squares algorithm — marchingsquares package is installed — to
 * regenerate a polygon compound body after each explosion.)
 *
 * The bitmap (Uint8Array) records which cells are still solid terrain,
 * allowing point-in-terrain queries without hitting the GPU.
 */
export class TerrainManager {
  readonly #bitmap: Uint8Array;
  readonly #bitmapSize: number;
  readonly #bitmapOriginX: number;
  readonly #bitmapOriginY: number;
  readonly #renderTexture: Phaser.GameObjects.RenderTexture;
  readonly #outlineGraphics: Phaser.GameObjects.Graphics;
  readonly #holes: Hole[] = [];
  readonly #scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.#scene = scene;

    // Bitmap covers the planet bounding square with 1-cell padding
    this.#bitmapSize = PLANET_RADIUS * 2 + 2;
    this.#bitmapOriginX = PLANET_CENTER.x - PLANET_RADIUS - 1;
    this.#bitmapOriginY = PLANET_CENTER.y - PLANET_RADIUS - 1;
    this.#bitmap = new Uint8Array(this.#bitmapSize * this.#bitmapSize);
    this.#fillBitmap();

    // Create the physics body (static circle representing the planet)
    scene.matter.add.circle(PLANET_CENTER.x, PLANET_CENTER.y, PLANET_RADIUS, {
      isStatic: true,
      label: "terrain",
      friction: 0.5,
      restitution: 0.1,
    });

    // Visual terrain drawn to a RenderTexture for efficient hole-punching
    this.#renderTexture = scene.add.renderTexture(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
    this.#drawInitialTerrain();

    // Static outline overlay drawn above the RenderTexture; stays visible
    // even after explosions punch holes in the terrain below.
    this.#outlineGraphics = scene.add.graphics();
    this.#outlineGraphics.lineStyle(3, 0x5a3e1b, 1);
    this.#outlineGraphics.strokeCircle(
      PLANET_CENTER.x,
      PLANET_CENTER.y,
      PLANET_RADIUS,
    );
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #fillBitmap(): void {
    const half = this.#bitmapSize / 2;
    const r2 = PLANET_RADIUS * PLANET_RADIUS;

    for (let row = 0; row < this.#bitmapSize; row++) {
      for (let col = 0; col < this.#bitmapSize; col++) {
        const dx = col - half;
        const dy = row - half;
        this.#bitmap[row * this.#bitmapSize + col] =
          dx * dx + dy * dy <= r2 ? 1 : 0;
      }
    }
  }

  #drawInitialTerrain(): void {
    const gfx = this.#scene.add.graphics();

    // Outer rock layer
    gfx.fillStyle(0x5a4a3a);
    gfx.fillCircle(PLANET_CENTER.x, PLANET_CENTER.y, PLANET_RADIUS);

    // Inner soil layer
    gfx.fillStyle(0x4a7c59);
    gfx.fillCircle(PLANET_CENTER.x, PLANET_CENTER.y, PLANET_RADIUS - 8);

    // Core highlight
    gfx.fillStyle(0x3d6e4e);
    gfx.fillCircle(PLANET_CENTER.x, PLANET_CENTER.y, PLANET_RADIUS * 0.6);

    this.#renderTexture.draw(gfx);
    gfx.destroy();
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  /**
   * Returns true when world-space point (x, y) is inside solid terrain.
   */
  isTerrainAt(x: number, y: number): boolean {
    const col = Math.round(x - this.#bitmapOriginX);
    const row = Math.round(y - this.#bitmapOriginY);
    if (
      col < 0 ||
      col >= this.#bitmapSize ||
      row < 0 ||
      row >= this.#bitmapSize
    ) {
      return false;
    }
    return this.#bitmap[row * this.#bitmapSize + col] === 1;
  }

  /**
   * Destroys terrain in a circle of the given radius at world-space (x, y).
   * Updates the bitmap and punches a visual hole in the RenderTexture.
   * The static physics body remains a circle (prototype simplification).
   */
  explode(x: number, y: number, radius: number): void {
    const r = Math.ceil(radius);
    const r2 = radius * radius;

    // Update bitmap
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const col = Math.round(x - this.#bitmapOriginX) + dx;
        const row = Math.round(y - this.#bitmapOriginY) + dy;
        if (
          col < 0 ||
          col >= this.#bitmapSize ||
          row < 0 ||
          row >= this.#bitmapSize
        )
          continue;
        this.#bitmap[row * this.#bitmapSize + col] = 0;
      }
    }

    this.#holes.push({ x, y, radius });

    // Erase the hole visually from the RenderTexture
    const gfx = this.#scene.add.graphics();
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(x, y, radius);
    this.#renderTexture.erase(gfx);
    gfx.destroy();
  }
}

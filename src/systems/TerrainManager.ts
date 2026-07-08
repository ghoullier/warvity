import Matter from "matter-js";
import type Phaser from "phaser";
import { CANVAS_SIZE, PLANET_CENTER, PLANET_RADIUS } from "../config";
import { DEFAULT_PLANET_STYLE, type PlanetStyle } from "../config/PlanetStyles";
import { toMatterBody } from "../utils/matterUtils";

interface Hole {
  x: number;
  y: number;
  radius: number;
}

/**
 * Number of angular sectors used to tile the planet surface with physics bodies.
 * Each sector covers 360/SECTOR_COUNT degrees of arc.
 * More sectors → finer crater resolution; fewer → lower body count.
 */
const SECTOR_COUNT = 64;

/**
 * Radial thickness (px) of each sector rectangle body.
 * Must be deep enough that a falling character never tunnels through in one step.
 */
const SECTOR_DEPTH = 14;

/**
 * Manages the circular planet terrain.
 *
 * Visual layer: a RenderTexture representing the planet surface with
 * explosion craters punched out as circular holes.
 *
 * Physics layer: the planet surface is divided into SECTOR_COUNT thin
 * rectangle bodies arranged tangentially around the circumference.
 * After each explosion the affected sector bodies are checked against the
 * bitmap; any sector whose entire surface strip has been cleared is removed
 * from the physics world so characters can fall into the crater.
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
  /** Static background layer: planet interior fill + gradient. Never erased. */
  readonly #planetFill: Phaser.GameObjects.Graphics;
  readonly #holes: Hole[] = [];
  readonly #scene: Phaser.Scene;
  readonly #style: PlanetStyle;
  readonly #sectorBodies: Array<MatterJS.BodyType | null>;
  #coreBody: MatterJS.BodyType;

  constructor(scene: Phaser.Scene, style: PlanetStyle = DEFAULT_PLANET_STYLE) {
    this.#scene = scene;
    this.#style = style;

    // Bitmap covers the planet bounding square with 1-cell padding
    this.#bitmapSize = PLANET_RADIUS * 2 + 2;
    this.#bitmapOriginX = PLANET_CENTER.x - PLANET_RADIUS - 1;
    this.#bitmapOriginY = PLANET_CENTER.y - PLANET_RADIUS - 1;
    this.#bitmap = new Uint8Array(this.#bitmapSize * this.#bitmapSize);
    this.#fillBitmap();

    // Replace the old single-circle body with per-sector rectangle bodies so
    // that removing a sector causes characters to fall into craters.
    this.#sectorBodies = new Array<MatterJS.BodyType | null>(SECTOR_COUNT).fill(
      null,
    );
    for (let i = 0; i < SECTOR_COUNT; i++) {
      this.#sectorBodies[i] = this.#createSectorBody(i);
    }

    // Inner bedrock — catches worms that fall into craters
    this.#coreBody = this.#scene.matter.add.circle(
      PLANET_CENTER.x,
      PLANET_CENTER.y,
      PLANET_RADIUS - SECTOR_DEPTH - 4,
      {
        isStatic: true,
        label: "terrain-core",
        friction: 0.5,
        restitution: 0.05,
        collisionFilter: { category: 0x0001, mask: 0xffff },
      },
    );

    // Visual terrain drawn to a RenderTexture for efficient hole-punching.
    // Only the surface ring is drawn here; the planet interior is on #planetFill.
    this.#renderTexture = scene.add.renderTexture(
      0,
      0,
      CANVAS_SIZE,
      CANVAS_SIZE,
    );
    this.#renderTexture.setDepth(-1);

    // Static planet interior fill — drawn as a separate Graphics layer
    // below the RenderTexture so erase() never removes it.
    this.#planetFill = scene.add.graphics();
    this.#planetFill.setDepth(-2);
    this.#drawPlanetInterior();

    this.#drawInitialTerrain();

    // Static outline overlay drawn above the RenderTexture; stays visible
    // even after explosions punch holes in the terrain below.
    this.#outlineGraphics = scene.add.graphics();

    // Atmosphere glow ring — soft halo 10px outside the planet surface
    this.#outlineGraphics.lineStyle(12, this.#style.atmosphereColor, 0.25);
    this.#outlineGraphics.strokeCircle(
      PLANET_CENTER.x,
      PLANET_CENTER.y,
      PLANET_RADIUS + 10,
    );

    // Hard terrain outline on top of the glow
    this.#outlineGraphics.lineStyle(3, this.#style.terrainOutline, 1);
    this.#outlineGraphics.strokeCircle(
      PLANET_CENTER.x,
      PLANET_CENTER.y,
      PLANET_RADIUS,
    );
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  /**
   * Build a static rectangle body that represents one angular sector of the
   * planet surface.  The body is placed tangentially at the circumference so
   * its outer face sits at ~PLANET_RADIUS from the planet centre.
   */
  #createSectorBody(i: number): MatterJS.BodyType {
    const midAngle = (2 * Math.PI * (i + 0.5)) / SECTOR_COUNT;

    // Centre the rectangle just inside the surface so the outer face is flush
    // with the planet radius.
    const r = PLANET_RADIUS - SECTOR_DEPTH / 2;
    const cx = PLANET_CENTER.x + Math.cos(midAngle) * r;
    const cy = PLANET_CENTER.y + Math.sin(midAngle) * r;

    // Chord width for this arc plus a small overlap to close inter-sector gaps.
    const w = 2 * PLANET_RADIUS * Math.sin(Math.PI / SECTOR_COUNT) + 4;

    const body = this.#scene.matter.add.rectangle(cx, cy, w, SECTOR_DEPTH, {
      isStatic: true,
      label: "terrain",
      friction: 0.5,
      restitution: 0.1,
    });

    // Rotate the body so its width axis runs tangentially along the surface.
    Matter.Body.setAngle(toMatterBody(body), midAngle + Math.PI / 2);

    return body;
  }

  /**
   * Returns true when the sector still has at least one solid bitmap pixel
   * along its surface strip (sampled at several angular positions).
   */
  #sectorHasTerrain(i: number): boolean {
    const startAngle = (2 * Math.PI * i) / SECTOR_COUNT;
    const endAngle = (2 * Math.PI * (i + 1)) / SECTOR_COUNT;
    const steps = 6;
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + ((endAngle - startAngle) * s) / steps;
      // Sample just inside the outer edge so we catch shallow craters.
      const px = PLANET_CENTER.x + Math.cos(a) * (PLANET_RADIUS - 2);
      const py = PLANET_CENTER.y + Math.sin(a) * (PLANET_RADIUS - 2);
      if (this.isTerrainAt(px, py)) return true;
    }
    return false;
  }

  /**
   * Returns the indices of all sectors whose surface arc overlaps the
   * explosion circle centred at (x, y) with the given radius.
   */
  #getAffectedSectors(x: number, y: number, radius: number): number[] {
    const dist = Math.hypot(x - PLANET_CENTER.x, y - PLANET_CENTER.y);
    const theta = Math.atan2(y - PLANET_CENTER.y, x - PLANET_CENTER.x);

    // Half the angular span that the explosion subtends at the planet centre.
    const angularHalfSpan = dist > radius ? Math.asin(radius / dist) : Math.PI;

    // Add one full sector half-width as margin so we never miss a border sector.
    const threshold = angularHalfSpan + Math.PI / SECTOR_COUNT + 0.05;

    const sectors: number[] = [];
    for (let i = 0; i < SECTOR_COUNT; i++) {
      const mid = (2 * Math.PI * (i + 0.5)) / SECTOR_COUNT;
      let diff = Math.abs(mid - theta);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff <= threshold) sectors.push(i);
    }
    return sectors;
  }

  /**
   * Re-evaluates sector `i` against the current bitmap.
   * Removes the physics body when the sector's terrain has been fully erased.
   */
  #updateSectorBody(i: number): void {
    const body = this.#sectorBodies[i];
    if (body !== null && !this.#sectorHasTerrain(i)) {
      this.#scene.matter.world.remove(body, false);
      this.#sectorBodies[i] = null;
    }
  }

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

  /** Draw the static planet interior (gradient fill + surface blobs). Never erased. */
  #drawPlanetInterior(): void {
    const gfx = this.#planetFill;
    const cx = PLANET_CENTER.x;
    const cy = PLANET_CENTER.y;
    // The surface ring in the RenderTexture covers the outer SECTOR_DEPTH * 3 px.
    // Everything outside this inner radius will be visible through craters.
    const innerR = PLANET_RADIUS * 0.87;

    // 1. Dark sub-surface rock — full disk; clearly visible through craters
    //    because it contrasts with the lighter terrainFill surface ring.
    gfx.fillStyle(0x1a0e06, 1);
    gfx.fillCircle(cx, cy, PLANET_RADIUS);

    // 2. Terrain fill — lighter interior (stops before the surface ring)
    gfx.fillStyle(this.#style.terrainFill, 1);
    gfx.fillCircle(cx, cy, innerR);

    // 3. Shadow overlay — darkens towards edges for a 3-D sphere look
    gfx.fillStyle(0x000000, 0.2);
    gfx.fillCircle(cx, cy, innerR * 0.9);

    // 4. Mid accent
    gfx.fillStyle(this.#style.surfaceAccent, 0.2);
    gfx.fillCircle(cx, cy, innerR * 0.65);

    // 5. Core glow
    gfx.fillStyle(this.#style.coreColor, 0.25);
    gfx.fillCircle(cx, cy, innerR * 0.4);

    // 6. Surface texture blobs (just inside the sub-surface boundary)
    for (let i = 0; i < 25; i++) {
      const angle = (Math.PI * 2 * i) / 25 + (Math.random() - 0.5) * 0.5;
      const dist = innerR * (0.82 + Math.random() * 0.12);
      const bx = cx + Math.cos(angle) * dist;
      const by = cy + Math.sin(angle) * dist;
      const br = 3 + Math.random() * 5;
      gfx.fillStyle(this.#style.terrainOutline, 0.3);
      gfx.fillCircle(bx, by, br);
    }
  }

  #drawInitialTerrain(): void {
    const cx = PLANET_CENTER.x;
    const cy = PLANET_CENTER.y;

    // Draw the full planet disk into the RenderTexture as the terrain surface.
    const surfaceGfx = this.#scene.add.graphics();
    surfaceGfx.fillStyle(this.#style.terrainFill, 1);
    surfaceGfx.fillCircle(cx, cy, PLANET_RADIUS);
    this.#renderTexture.draw(surfaceGfx);
    surfaceGfx.destroy();

    // Erase the interior, leaving only the surface ring in the RenderTexture.
    // The visible ring thickness is SECTOR_DEPTH * 3 ≈ 42 px — enough to show
    // craters clearly while keeping the gradient #planetFill layer visible below.
    const ringThickness = SECTOR_DEPTH * 3;
    const interiorGfx = this.#scene.add.graphics();
    interiorGfx.fillStyle(0xffffff, 1);
    interiorGfx.fillCircle(cx, cy, PLANET_RADIUS - ringThickness);
    this.#renderTexture.erase(interiorGfx);
    interiorGfx.destroy();
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

  /** Destroy all Phaser display objects owned by this manager. */
  destroy(): void {
    for (const body of this.#sectorBodies) {
      if (body !== null) {
        this.#scene.matter.world.remove(body, false);
      }
    }
    this.#scene.matter.world.remove(this.#coreBody, false);
    this.#renderTexture.destroy();
    this.#outlineGraphics.destroy();
    this.#planetFill.destroy();
  }

  /**
   * Destroys terrain in a circle of the given radius at world-space (x, y).
   * Updates the bitmap, punches a visual hole in the RenderTexture, and
   * removes the physics bodies for any sectors whose surface terrain has been
   * fully erased so that characters can fall into the resulting crater.
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

    // Remove physics bodies for sectors whose terrain has been fully cleared.
    for (const i of this.#getAffectedSectors(x, y, radius)) {
      this.#updateSectorBody(i);
    }
  }
}

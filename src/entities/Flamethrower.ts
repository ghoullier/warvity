import type Phaser from "phaser";
import { GRAVITY_STRENGTH, PLANET_CENTER, PLANET_RADIUS } from "../config";
import type { TerrainManager } from "../systems/TerrainManager";
import type { Character } from "./Character";

const PARTICLE_COUNT = 20;
const PARTICLE_LIFETIME = 1500; // ms
const PARTICLE_BASE_SPEED = 8;
const SPREAD_ANGLE = 0.25; // radians, half-width of spread cone
const DAMAGE_PER_PARTICLE = 3;
const DAMAGE_RADIUS = 20;
const TERRAIN_EXPLODE_RADIUS = 12;
const PARTICLE_VISUAL_RADIUS = 5;
const LAUNCH_STAGGER = 20; // ms between consecutive particle launches

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Elapsed time since launch in ms. */
  age: number;
  /** Delay in ms before this particle starts moving. */
  launchDelay: number;
  alive: boolean;
  graphic: Phaser.GameObjects.Graphics;
  /** Worm names already hit by this particle (one hit per worm per particle). */
  hitWorms: Set<string>;
}

/**
 * Flamethrower weapon — fires a stream of ~20 fire particles in the aimed
 * direction. Each particle follows radial gravity, deals 3 HP on worm contact
 * (once per worm), and creates a small terrain crater on landing.
 *
 * Emits `'flamethrower-done'` on the scene when all particles have finished.
 */
export class Flamethrower {
  readonly #scene: Phaser.Scene;
  readonly #terrain: TerrainManager;
  readonly #worms: Character[];
  readonly #particles: FireParticle[] = [];
  #activeCount: number;
  #done = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    terrain: TerrainManager,
    worms: Character[],
  ) {
    this.#scene = scene;
    this.#terrain = terrain;
    this.#worms = worms;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spread within a cone centred on `angle`
      const spread = (Math.random() - 0.5) * 2 * SPREAD_ANGLE;
      const a = angle + spread;
      const speed = PARTICLE_BASE_SPEED * (0.75 + Math.random() * 0.5);

      const graphic = scene.add.graphics();
      graphic.setDepth(5);
      graphic.setPosition(x, y);

      // Orange/yellow with slight scale variation for a natural flame look
      const warm = Math.random();
      const color = warm > 0.5 ? 0xff6600 : 0xffaa00;
      const scale = 0.7 + Math.random() * 0.6;
      graphic.fillStyle(color, 1);
      graphic.fillCircle(0, 0, PARTICLE_VISUAL_RADIUS * scale);

      this.#particles.push({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        age: 0,
        launchDelay: i * LAUNCH_STAGGER,
        alive: true,
        graphic,
        hitWorms: new Set(),
      });
    }

    this.#activeCount = PARTICLE_COUNT;
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  /**
   * Called every frame. `delta` is elapsed ms since the previous frame.
   * Returns `true` while particles are still in flight.
   */
  update(delta: number): boolean {
    if (this.#done) return false;

    for (const p of this.#particles) {
      if (!p.alive) continue;

      p.age += delta;

      // Particles wait for their stagger delay before launching
      if (p.age < p.launchDelay) continue;

      // Normalise delta to a 60 fps step so gravity feels consistent
      const step = delta / 16.667;

      // Radial gravity — identical formula to applyRadialGravity
      const dx = PLANET_CENTER.x - p.x;
      const dy = PLANET_CENTER.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        p.vx += (dx / dist) * GRAVITY_STRENGTH * step * 60;
        p.vy += (dy / dist) * GRAVITY_STRENGTH * step * 60;
      }

      // Integrate position
      p.x += p.vx * step;
      p.y += p.vy * step;

      // Terrain or planet-core hit
      const dxP = p.x - PLANET_CENTER.x;
      const dyP = p.y - PLANET_CENTER.y;
      const distToCenter = Math.sqrt(dxP * dxP + dyP * dyP);
      const hitTerrain =
        distToCenter <= PLANET_RADIUS - PARTICLE_VISUAL_RADIUS ||
        this.#terrain.isTerrainAt(p.x, p.y);

      if (hitTerrain || p.age - p.launchDelay >= PARTICLE_LIFETIME) {
        this.#killParticle(p, hitTerrain);
        continue;
      }

      // Worm proximity damage (capped at one hit per worm per particle)
      for (const worm of this.#worms) {
        if (!worm.isAlive()) continue;
        if (p.hitWorms.has(worm.name)) continue;
        const wx = worm.body.position.x;
        const wy = worm.body.position.y;
        const d2x = wx - p.x;
        const d2y = wy - p.y;
        if (d2x * d2x + d2y * d2y < DAMAGE_RADIUS * DAMAGE_RADIUS) {
          worm.takeDamage(DAMAGE_PER_PARTICLE);
          p.hitWorms.add(worm.name);
        }
      }

      // Visual: fade alpha as the particle ages
      const flightAge = p.age - p.launchDelay;
      const alpha = Math.max(0, 1 - flightAge / PARTICLE_LIFETIME);
      p.graphic.setAlpha(alpha);
      p.graphic.setPosition(p.x, p.y);
    }

    if (this.#activeCount === 0 && !this.#done) {
      this.#done = true;
      this.#scene.events.emit("flamethrower-done");
      return false;
    }

    return true;
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #killParticle(p: FireParticle, hitTerrain: boolean): void {
    p.alive = false;
    this.#activeCount--;
    p.graphic.destroy();

    if (hitTerrain) {
      this.#terrain.explode(p.x, p.y, TERRAIN_EXPLODE_RADIUS);
    }
  }
}

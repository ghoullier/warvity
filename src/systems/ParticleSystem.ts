import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";

// Acceleration in px/frame² (at 60 fps)
const FIRE_GRAVITY = 0.08;
const SMOKE_GRAVITY = 0.015;
const DEBRIS_GRAVITY = 0.1;

// 60 fps reference frame in ms
const FRAME_MS = 16.667;

const FIRE_COLORS = [0xff4400, 0xff8800, 0xffdd00, 0xff2200] as const;
const SMOKE_COLORS = [0x555555, 0x777777, 0x999999] as const;
const DEBRIS_COLORS = [0x8b4513, 0xa0522d, 0x654321, 0x7a5c3a] as const;

interface Particle {
  gfx: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  dead: boolean;
  spinRate: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

/**
 * Registers a per-frame update that moves particles with radial gravity and
 * fades them out. Unregisters itself once all particles have expired.
 */
function runParticles(
  scene: Phaser.Scene,
  particles: Particle[],
  planetCenter: Readonly<{ x: number; y: number }>,
  gravity: number,
): void {
  const handler = (_time: number, delta: number) => {
    const factor = delta / FRAME_MS;
    let anyAlive = false;

    for (const p of particles) {
      if (p.dead) continue;

      p.life -= delta;
      if (p.life <= 0) {
        p.dead = true;
        p.gfx.destroy();
        continue;
      }

      anyAlive = true;

      // Radial gravity toward planet center
      const dx = planetCenter.x - p.gfx.x;
      const dy = planetCenter.y - p.gfx.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        p.vx += (dx / dist) * gravity * factor;
        p.vy += (dy / dist) * gravity * factor;
      }

      p.gfx.x += p.vx * factor;
      p.gfx.y += p.vy * factor;
      p.gfx.rotation += p.spinRate * factor;
      p.gfx.setAlpha(p.life / p.maxLife);
    }

    if (!anyAlive) {
      scene.events.off("update", handler);
    }
  };

  scene.events.on("update", handler);
}

export function explode(
  scene: Phaser.Scene,
  x: number,
  y: number,
  planetCenter: Readonly<{ x: number; y: number }> = PLANET_CENTER,
): void {
  // ── Fire particles ──────────────────────────────────────────────────────
  const fireCount = Math.floor(rand(20, 31));
  const fireParticles: Particle[] = [];

  for (let i = 0; i < fireCount; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(2, 6);
    const color = pickRandom(FIRE_COLORS);
    const size = rand(2, 5);
    const maxLife = rand(1500, 2000);

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillCircle(0, 0, size);
    gfx.setPosition(x, y);
    gfx.setDepth(5);

    fireParticles.push({
      gfx,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      dead: false,
      spinRate: 0,
    });
  }

  runParticles(scene, fireParticles, planetCenter, FIRE_GRAVITY);

  // ── Smoke particles ─────────────────────────────────────────────────────
  // Compute the "up" direction (away from planet surface at the hit point)
  const awayDx = x - planetCenter.x;
  const awayDy = y - planetCenter.y;
  const awayLen = Math.sqrt(awayDx * awayDx + awayDy * awayDy) || 1;
  const awayNx = awayDx / awayLen;
  const awayNy = awayDy / awayLen;

  const smokeCount = Math.floor(rand(5, 11));
  const smokeParticles: Particle[] = [];

  for (let i = 0; i < smokeCount; i++) {
    // Spread ±60° around the surface-normal direction
    const spread = rand(-Math.PI / 3, Math.PI / 3);
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);
    const dirX = awayNx * cos - awayNy * sin;
    const dirY = awayNx * sin + awayNy * cos;

    const speed = rand(0.5, 2);
    const color = pickRandom(SMOKE_COLORS);
    const size = rand(5, 12);
    const maxLife = rand(1500, 2000);

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, 0.5);
    gfx.fillCircle(0, 0, size);
    gfx.setPosition(x, y);
    gfx.setDepth(4);

    smokeParticles.push({
      gfx,
      vx: dirX * speed,
      vy: dirY * speed,
      life: maxLife,
      maxLife,
      dead: false,
      spinRate: 0,
    });
  }

  runParticles(scene, smokeParticles, planetCenter, SMOKE_GRAVITY);
}

/**
 * Spawns terrain debris chunks that fly outward and arc back toward the
 * planet under radial gravity, then fade out after 2–3 s.
 */
export function debris(
  scene: Phaser.Scene,
  x: number,
  y: number,
  planetCenter: Readonly<{ x: number; y: number }> = PLANET_CENTER,
  count = 8,
): void {
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(3, 7);
    const w = rand(3, 8);
    const h = rand(2, 5);
    const color = pickRandom(DEBRIS_COLORS);
    const maxLife = rand(2000, 3000);

    const gfx = scene.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(-w / 2, -h / 2, w, h);
    gfx.setPosition(x, y);
    gfx.setRotation(rand(0, Math.PI * 2));
    gfx.setDepth(6);

    particles.push({
      gfx,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      dead: false,
      spinRate: rand(-0.1, 0.1),
    });
  }

  runParticles(scene, particles, planetCenter, DEBRIS_GRAVITY);
}

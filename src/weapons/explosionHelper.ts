import type { WeaponContext } from "./WeaponRegistry";

/**
 * Applies a radial explosion at (x, y): carves terrain and deals
 * fall-off damage to every living worm within `radius` px.
 */
export function applyExplosion(
  ctx: Pick<WeaponContext, "terrain" | "allWorms">,
  x: number,
  y: number,
  radius: number,
  maxDamage: number,
): void {
  ctx.terrain.explode(x, y, radius);
  for (const worm of ctx.allWorms) {
    if (!worm.isAlive()) continue;
    const dist = Math.hypot(worm.body.position.x - x, worm.body.position.y - y);
    if (dist < radius) worm.takeDamage(maxDamage * (1 - dist / radius));
  }
}

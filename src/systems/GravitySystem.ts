import Matter from "matter-js";
import { toMatterBody } from "../utils/matterUtils";

/**
 * Applies radial gravity toward the planet center on every dynamic body.
 * Call once per game tick before the physics step.
 *
 * @param multiplier  Scale factor for the gravitational force (default 1.0).
 *   Negative values invert the force direction (e.g. -1 for 'reverse' mode).
 */
export function applyRadialGravity(
  bodies: MatterJS.BodyType[],
  planetCenter: Readonly<{ x: number; y: number }>,
  G: number,
  multiplier = 1.0,
): void {
  for (const body of bodies) {
    if (body.isStatic) continue;

    const dx = planetCenter.x - body.position.x;
    const dy = planetCenter.y - body.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) continue;

    const mass = body.mass ?? 1;
    const forceMag = G * mass * multiplier;

    // Equivalent to Matter.Body.applyForce at centre of mass (no torque)
    Matter.Body.applyForce(toMatterBody(body), body.position, {
      x: (dx / dist) * forceMag,
      y: (dy / dist) * forceMag,
    });
  }
}

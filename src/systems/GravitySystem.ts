import Matter from "matter-js";

/**
 * Applies radial gravity toward the planet center on every dynamic body.
 * Call once per game tick before the physics step.
 */
export function applyRadialGravity(
  bodies: MatterJS.BodyType[],
  planetCenter: Readonly<{ x: number; y: number }>,
  G: number,
): void {
  for (const body of bodies) {
    if (body.isStatic) continue;

    const dx = planetCenter.x - body.position.x;
    const dy = planetCenter.y - body.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) continue;

    const mass = body.mass ?? 1;
    const forceMag = G * mass;

    // Equivalent to Matter.Body.applyForce at centre of mass (no torque)
    Matter.Body.applyForce(body as unknown as Matter.Body, body.position, {
      x: (dx / dist) * forceMag,
      y: (dy / dist) * forceMag,
    });
  }
}

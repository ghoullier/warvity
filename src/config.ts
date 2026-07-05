export const PLANET_CENTER = { x: 400, y: 400 } as const;
export const PLANET_RADIUS = 280;
export const GRAVITY_STRENGTH = 0.0005;
export const CANVAS_SIZE = 800;

export const WEAPON_CONFIG = {
  bazooka: { damage: 50, radius: 60, speed: 15 },
  grenade: { damage: 40, radius: 50, speed: 10, fuse: 3000 },
  singularity: {
    damage: 60,
    radius: 80,
    speed: 15,
    attractForce: 0.005,
    attractDuration: 3000,
  },
  landMine: { damage: 50, radius: 60, triggerDist: 28 },
  clusterBomb: {
    speed: 10,
    mainFuse: 2000,
    subFuse: 800,
    subCount: 6,
    subDamage: 20,
    subRadius: 35,
  },
  flamethrower: { damagePerTick: 3, duration: 1500 },
  jetpack: { duration: 3000, thrustForce: 0.005, gravityReduction: 0.2 },
  shield: {},
  teleporter: {},
  gravityBoost: {},
} as const;

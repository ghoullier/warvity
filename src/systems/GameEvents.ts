/**
 * Single source of truth for all Phaser EventEmitter event names used in Warvity.
 * Import `GameEvents.X` instead of bare string literals in `.on()` / `.once()` / `.emit()` / `.off()` calls.
 */
export const GameEvents = {
  // Turn management
  TURN_START: "turn-start",
  TURN_END: "turn-end",
  TIMER_TICK: "timer-tick",

  // Weapons / firing
  FIRE: "fire",
  WEAPON_CHANGED: "weapon-changed",

  // Projectiles & explosions
  PROJECTILE_EXPLODED: "projectile-exploded",
  GRENADE_EXPLODED: "grenade-exploded",
  FLAMETHROWER_DONE: "flamethrower-done",
  CLUSTER_SPLIT: "cluster-split",
  SUB_MUNITION_EXPLODED: "sub-munition-exploded",
  CLUSTER_EXPLODED: "cluster-exploded",
  SINGULARITY_EXPLODED: "singularity-exploded",

  // Jetpack
  JETPACK_TICK: "jetpack-tick",
  JETPACK_END: "jetpack-end",

  // Mines
  MINE_BEEP: "mine-beep",
  MINE_EXPLODED: "mine-exploded",

  // Gravity boost
  GRAVITY_CHANGED: "gravity-changed",

  // Teleporter
  TELEPORT_COMPLETE: "teleport-complete",

  // Characters
  WORM_DIED: "worm-died",
  HP_CHANGED: "hp-changed",
  SHIELD_BLOCKED: "shield-blocked",
} as const;

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents];

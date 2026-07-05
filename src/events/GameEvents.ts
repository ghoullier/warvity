/** Typed constants for every Phaser scene event used across the game. */
export const EVENTS = {
  // Character / health
  WORM_DIED: "worm-died",
  HP_CHANGED: "hp-changed",
  SHIELD_BLOCKED: "shield-blocked",

  // Turn management
  TURN_START: "turn-start",
  TURN_END: "turn-end",
  TIMER_TICK: "timer-tick",

  // HUD / UI
  WEAPON_CHANGED: "weapon-changed",
  GRAVITY_CHANGED: "gravity-changed",

  // Input / aiming
  FIRE: "fire",

  // Jetpack
  JETPACK_TICK: "jetpack-tick",
  JETPACK_END: "jetpack-end",

  // Teleporter
  TELEPORT_COMPLETE: "teleport-complete",

  // Projectiles / explosions
  PROJECTILE_EXPLODED: "projectile-exploded",
  GRENADE_EXPLODED: "grenade-exploded",
  CLUSTER_SPLIT: "cluster-split",
  CLUSTER_EXPLODED: "cluster-exploded",
  SUB_MUNITION_EXPLODED: "sub-munition-exploded",
  SINGULARITY_EXPLODED: "singularity-exploded",
  FLAMETHROWER_DONE: "flamethrower-done",

  // Mines
  MINE_BEEP: "mine-beep",
  MINE_EXPLODED: "mine-exploded",
} as const;

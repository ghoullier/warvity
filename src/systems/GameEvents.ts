/**
 * Single source of truth for all Phaser EventEmitter event names used in Warvity.
 * Import `GameEvents.X` instead of bare string literals in `.on()` / `.once()` / `.emit()` / `.off()` calls.
 */
import type { Character } from "../entities/Character";
import type { GravityMode } from "../entities/GravityBoost";

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

export type GameEventPayloads = {
  [GameEvents.TURN_START]: { worm: Character; teamName: string };
  [GameEvents.TURN_END]: undefined;
  [GameEvents.TIMER_TICK]: number;
  [GameEvents.FIRE]: { angle: number; power: number; worm: Character };
  [GameEvents.WEAPON_CHANGED]: string;
  [GameEvents.PROJECTILE_EXPLODED]: { x: number; y: number };
  [GameEvents.GRENADE_EXPLODED]: { x: number; y: number };
  [GameEvents.FLAMETHROWER_DONE]: undefined;
  [GameEvents.CLUSTER_SPLIT]: undefined;
  [GameEvents.SUB_MUNITION_EXPLODED]: { x: number; y: number };
  [GameEvents.CLUSTER_EXPLODED]: undefined;
  [GameEvents.SINGULARITY_EXPLODED]: { x: number; y: number };
  [GameEvents.JETPACK_TICK]: number;
  [GameEvents.JETPACK_END]: undefined;
  [GameEvents.MINE_BEEP]: undefined;
  [GameEvents.MINE_EXPLODED]: { x: number; y: number };
  [GameEvents.GRAVITY_CHANGED]: { mode: GravityMode | null; remaining: number };
  [GameEvents.TELEPORT_COMPLETE]: undefined;
  [GameEvents.WORM_DIED]: Character;
  [GameEvents.HP_CHANGED]: Character;
  [GameEvents.SHIELD_BLOCKED]: Character;
};

import type Phaser from "phaser";
import type { Character } from "../entities/Character";
import type { AudioManager } from "../systems/AudioManager";
import type { CameraController } from "../systems/CameraController";
import type { TerrainManager } from "../systems/TerrainManager";

/**
 * All the game-state a weapon implementation needs to do its job.
 * Built fresh each frame in GameScene and passed into every weapon hook.
 */
export interface WeaponContext {
  scene: Phaser.Scene;
  worm: Character;
  angle: number;
  power: number;
  delta: number;
  terrain: TerrainManager;
  allWorms: Character[];
  audioManager: AudioManager;
  gravityMultiplier: number;
  cameraController: CameraController;
  /** End the current turn and return the camera to the next active worm. */
  nextTurn(): void;
  /** Return the camera to the current worm without ending the turn. */
  returnCamera(): void;
  /** Let a weapon change the scene-wide gravity multiplier (used by GravityBoost). */
  setGravityMultiplier(m: number): void;
  /** Stop the turn countdown timer (used by time-consuming weapons). */
  stopTimer(): void;
  /** Deactivate the AimingSystem (used by weapons that take over input). */
  deactivateAiming(): void;
}

/**
 * Determines which trajectory preview the AimingSystem draws for this weapon.
 * - `'ballistic'` — parabolic arc simulating radial gravity (default for aim weapons).
 * - `'none'`      — no trajectory preview shown.
 * - `'line'`      — straight dotted line (e.g. teleporter-style indicator).
 */
export type TrajectoryType = "ballistic" | "none" | "line";

export interface WeaponDefinition {
  readonly id: string;
  readonly label: string;
  /**
   * How this weapon receives the player's fire input.
   * - `'aim'`     (default) — AimingSystem charges on Space; fires on release.
   * - `'pointer'` — fires on mouse click (e.g. Teleporter).
   * - `'space'`   — fires on bare Space-key press, no charge (e.g. Shield).
   */
  readonly inputMode?: "aim" | "pointer" | "space";
  /** Which trajectory preview to show while aiming. Defaults to `'ballistic'`. */
  readonly trajectoryType?: TrajectoryType;
  /** Called when the player fires. Returns true if the weapon ends the turn asynchronously. */
  fire(ctx: WeaponContext): boolean;
  /** Called every frame for all registered weapons (handles in-flight entities & mines). */
  update?(ctx: WeaponContext): void;
  /** Called at the start of each turn so weapons can configure input / visuals. */
  onTurnStart?(ctx: WeaponContext): void;
  /** Called once in GameScene.create() to install persistent scene-event listeners. */
  onSceneCreate?(scene: Phaser.Scene, buildCtx: () => WeaponContext): void;
  /** Called on game restart or game-over to cancel any active effects. */
  onReset?(): void;
}

/** Semantic type alias for weapon identifier strings. */
export type WeaponId = string;

const WEAPONS: WeaponDefinition[] = [];

export function registerWeapon(def: WeaponDefinition): void {
  WEAPONS.push(def);
}

export function getWeapons(): readonly WeaponDefinition[] {
  return WEAPONS;
}

export function getWeapon(id: string): WeaponDefinition | undefined {
  return WEAPONS.find((w) => w.id === id);
}

/** Install persistent scene-event listeners for every weapon. Call once in GameScene.create(). */
export function setupWeaponListeners(
  scene: Phaser.Scene,
  buildCtx: () => WeaponContext,
): void {
  for (const w of WEAPONS) {
    w.onSceneCreate?.(scene, buildCtx);
  }
}

/** Cancel all active weapon effects (call on game restart / game-over). */
export function resetAllWeapons(): void {
  for (const w of WEAPONS) w.onReset?.();
}

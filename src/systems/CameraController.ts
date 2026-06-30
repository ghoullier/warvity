import type Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import type { Character } from "../entities/Character";
import type { Projectile } from "../entities/Projectile";

const LERP = 0.05;
const ZOOM_NORMAL = 1.0;
const ZOOM_PROJECTILE = 0.6;
const ZOOM_DURATION = 500; // ms

/**
 * Manages camera tracking for the active character and projectiles.
 *
 * Smooth-follows the active worm at full zoom, and zooms out to follow
 * a projectile in flight before returning to the active worm.
 */
export class CameraController {
  readonly #camera: Phaser.Cameras.Scene2D.Camera;

  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    _planetCenter: { x: number; y: number },
  ) {
    this.#camera = camera;
    this.#camera.setBounds(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  /** Smoothly follow the active worm at normal zoom. */
  follow(target: Character): void {
    this.#camera.startFollow(
      target.body.position as unknown as Phaser.GameObjects.GameObject,
      false,
      LERP,
      LERP,
    );
  }

  /** Zoom out and follow a projectile in flight. */
  followProjectile(projectile: Projectile): void {
    this.#camera.zoomTo(ZOOM_PROJECTILE, ZOOM_DURATION);
    this.#camera.startFollow(
      projectile.body.position as unknown as Phaser.GameObjects.GameObject,
      false,
      LERP,
      LERP,
    );
  }

  /** Zoom back in and return to tracking the active worm. */
  returnToWorm(worm: Character): void {
    this.#camera.zoomTo(ZOOM_NORMAL, ZOOM_DURATION);
    this.#camera.startFollow(
      worm.body.position as unknown as Phaser.GameObjects.GameObject,
      false,
      LERP,
      LERP,
    );
  }
}

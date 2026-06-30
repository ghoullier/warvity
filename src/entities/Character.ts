import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";

const CHAR_WIDTH = 18;
const CHAR_HEIGHT = 26;
const MOVE_FORCE = 0.0012;
const JUMP_FORCE = 0.008;

/**
 * A player character standing on the planet surface.
 *
 * Physics: a Matter.js rectangle with infinite inertia so the engine never
 * rotates it autonomously. Orientation is set manually each tick so the
 * character always stands perpendicular to the radial gravity.
 *
 * Movement is expressed as tangential forces (left/right around the planet).
 * Jump adds a radial outward impulse.
 */
export class Character {
  readonly body: MatterJS.BodyType;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, color = 0xff6b35) {
    this.color = color;

    this.body = scene.matter.add.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, {
      label: "character",
      frictionAir: 0.12,
      friction: 0.5,
      restitution: 0.0,
    });

    // Prevent the physics engine from rotating the body independently
    Matter.Body.setInertia(
      this.body as unknown as Matter.Body,
      Number.POSITIVE_INFINITY,
    );

    this.graphics = scene.add.graphics();
    this.drawSprite();
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  private drawSprite(): void {
    const hw = CHAR_WIDTH / 2;
    const hh = CHAR_HEIGHT / 2;

    this.graphics.clear();

    // Body
    this.graphics.fillStyle(this.color);
    this.graphics.fillRect(-hw, -hh, CHAR_WIDTH, CHAR_HEIGHT);

    // Head
    this.graphics.fillStyle(0xffe4c4);
    this.graphics.fillCircle(0, -hh - 6, 7);

    // Eyes
    this.graphics.fillStyle(0x000000);
    this.graphics.fillRect(-3, -hh - 9, 2, 2);
    this.graphics.fillRect(2, -hh - 9, 2, 2);
  }

  /** Angle from planet centre to character (the outward radial direction). */
  private radialAngle(): number {
    return Math.atan2(
      this.body.position.y - PLANET_CENTER.y,
      this.body.position.x - PLANET_CENTER.x,
    );
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  /** Called every frame to sync the visual representation with the physics body. */
  update(): void {
    const theta = this.radialAngle();

    // Keep body upright relative to the planet surface
    Matter.Body.setAngle(
      this.body as unknown as Matter.Body,
      theta + Math.PI / 2,
    );

    this.graphics.setPosition(this.body.position.x, this.body.position.y);
    this.graphics.setRotation(theta + Math.PI / 2);
  }

  /** Move counterclockwise around the planet. */
  moveLeft(): void {
    const theta = this.radialAngle();
    Matter.Body.applyForce(
      this.body as unknown as Matter.Body,
      this.body.position,
      { x: -Math.sin(theta) * MOVE_FORCE, y: Math.cos(theta) * MOVE_FORCE },
    );
  }

  /** Move clockwise around the planet. */
  moveRight(): void {
    const theta = this.radialAngle();
    Matter.Body.applyForce(
      this.body as unknown as Matter.Body,
      this.body.position,
      { x: Math.sin(theta) * MOVE_FORCE, y: -Math.cos(theta) * MOVE_FORCE },
    );
  }

  /** Apply an outward radial impulse (jump away from planet surface). */
  jump(): void {
    const theta = this.radialAngle();
    Matter.Body.applyForce(
      this.body as unknown as Matter.Body,
      this.body.position,
      { x: Math.cos(theta) * JUMP_FORCE, y: Math.sin(theta) * JUMP_FORCE },
    );
  }
}

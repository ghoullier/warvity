import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";
import { toMatterBody } from "../utils/matterUtils";

const CHAR_WIDTH = 18;
export const CHAR_HEIGHT = 26;
const MOVE_FORCE = 0.0012;
const JUMP_FORCE = 0.008;
const HP_BAR_WIDTH = 24;
const HP_BAR_HEIGHT = 3;
const HP_BAR_OFFSET_Y = -CHAR_HEIGHT / 2 - 18;

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
  readonly name: string;
  readonly body: MatterJS.BodyType;
  readonly #graphics: Phaser.GameObjects.Graphics;
  readonly #hpBar: Phaser.GameObjects.Graphics;
  readonly #indicator: Phaser.GameObjects.Graphics;
  readonly #color: number;
  readonly #scene: Phaser.Scene;

  get color(): number {
    return this.#color;
  }

  #hp: number;
  #maxHp: number;
  #alive = true;
  #active = false;
  #shielded = false;
  #shieldAura: Phaser.GameObjects.Graphics | null = null;
  #shieldTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    color = 0xff6b35,
    maxHp = 100,
    name = "Worm",
  ) {
    this.name = name;
    this.#color = color;
    this.#scene = scene;
    this.#maxHp = maxHp;
    this.#hp = maxHp;

    this.body = scene.matter.add.rectangle(x, y, CHAR_WIDTH, CHAR_HEIGHT, {
      label: "character",
      frictionAir: 0.12,
      friction: 0.5,
      restitution: 0.0,
    });

    // Prevent the physics engine from rotating the body independently
    Matter.Body.setInertia(toMatterBody(this.body), Number.POSITIVE_INFINITY);

    this.#graphics = scene.add.graphics();
    this.#hpBar = scene.add.graphics();
    this.#indicator = scene.add.graphics();
    this.#drawSprite();
    this.#drawHpBar();
  }

  // ──────────────────────────────── private helpers ────────────────────────────

  #drawIndicator(): void {
    this.#indicator.clear();
    if (!this.#active) return;

    // Small arrow pointing toward the character (in local space, "up" = toward head)
    const hh = CHAR_HEIGHT / 2;
    const arrowTip = -hh - 18;
    this.#indicator.fillStyle(0xffff00, 0.9);
    this.#indicator.fillTriangle(
      -5,
      arrowTip - 8,
      5,
      arrowTip - 8,
      0,
      arrowTip,
    );
  }

  #drawSprite(): void {
    const hw = CHAR_WIDTH / 2;
    const hh = CHAR_HEIGHT / 2;

    this.#graphics.clear();

    // Body
    this.#graphics.fillStyle(this.#color);
    this.#graphics.fillRect(-hw, -hh, CHAR_WIDTH, CHAR_HEIGHT);

    // Head
    this.#graphics.fillStyle(0xffe4c4);
    this.#graphics.fillCircle(0, -hh - 6, 7);

    // Eyes
    this.#graphics.fillStyle(0x000000);
    this.#graphics.fillRect(-3, -hh - 9, 2, 2);
    this.#graphics.fillRect(2, -hh - 9, 2, 2);
  }

  #drawHpBar(): void {
    this.#hpBar.clear();

    const ratio = this.#hp / this.#maxHp;
    const fillWidth = Math.round(HP_BAR_WIDTH * ratio);

    // Dark background
    this.#hpBar.fillStyle(0x222222);
    this.#hpBar.fillRect(
      -HP_BAR_WIDTH / 2,
      HP_BAR_OFFSET_Y,
      HP_BAR_WIDTH,
      HP_BAR_HEIGHT,
    );

    // Colour shifts from green (full) to red (empty)
    const r = Math.round(255 * (1 - ratio));
    const g = Math.round(255 * ratio);
    const barColor = (r << 16) | (g << 8);
    this.#hpBar.fillStyle(barColor);
    this.#hpBar.fillRect(
      -HP_BAR_WIDTH / 2,
      HP_BAR_OFFSET_Y,
      fillWidth,
      HP_BAR_HEIGHT,
    );
  }

  #die(): void {
    this.#alive = false;
    this.clearShield();
    this.#scene.matter.world.remove(this.body, false);
    this.#graphics.destroy();
    this.#hpBar.destroy();
    this.#indicator.destroy();
    this.#scene.events.emit("worm-died", this);
  }

  /** Angle from planet centre to character (the outward radial direction). */
  #radialAngle(): number {
    return Math.atan2(
      this.body.position.y - PLANET_CENTER.y,
      this.body.position.x - PLANET_CENTER.x,
    );
  }

  // ──────────────────────────────── public API ─────────────────────────────────

  get hp(): number {
    return this.#hp;
  }

  get maxHp(): number {
    return this.#maxHp;
  }

  isAlive(): boolean {
    return this.#alive;
  }

  /** Reduce HP by `amount`. Triggers death when HP drops to zero or below. */
  takeDamage(amount: number): void {
    if (!this.#alive) return;
    if (this.#shielded) {
      // Show a floating shield indicator
      const text = this.#scene.add
        .text(this.body.position.x, this.body.position.y - 20, "🛡️", {
          fontSize: "20px",
        })
        .setOrigin(0.5, 1)
        .setDepth(30);
      this.#scene.tweens.add({
        targets: text,
        y: text.y - 30,
        alpha: 0,
        duration: 800,
        ease: "Power2",
        onComplete: () => text.destroy(),
      });
      this.#scene.events.emit("shield-blocked", this);
      return;
    }
    this.#hp = Math.max(0, this.#hp - amount);
    this.#drawHpBar();
    this.#scene.events.emit("hp-changed", this);
    if (this.#hp <= 0) this.#die();
  }

  /** Highlight this worm as the active one (or remove the highlight). */
  setActive(active: boolean): void {
    this.#active = active;
    this.#drawIndicator();
  }

  /** Activate a protective shield that blocks the next incoming damage. */
  activateShield(): void {
    if (this.#shielded) return;
    this.#shielded = true;

    const aura = this.#scene.add.graphics();
    aura.lineStyle(3, 0x00ffff, 0.7);
    aura.strokeCircle(0, 0, 22);
    aura.setPosition(this.body.position.x, this.body.position.y);
    aura.setScale(0.9);
    aura.setDepth(5);
    this.#shieldAura = aura;

    this.#shieldTween = this.#scene.tweens.add({
      targets: aura,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Remove the shield (called at the start of the worm's next turn). */
  clearShield(): void {
    this.#shielded = false;
    this.#shieldTween?.stop();
    this.#shieldTween = null;
    this.#shieldAura?.destroy();
    this.#shieldAura = null;
  }

  get isShielded(): boolean {
    return this.#shielded;
  }

  /** Called every frame to sync the visual representation with the physics body. */
  update(): void {
    if (!this.#alive) return;

    const theta = this.#radialAngle();

    // Keep body upright relative to the planet surface
    Matter.Body.setAngle(toMatterBody(this.body), theta + Math.PI / 2);

    this.#graphics.setPosition(this.body.position.x, this.body.position.y);
    this.#graphics.setRotation(theta + Math.PI / 2);

    this.#hpBar.setPosition(this.body.position.x, this.body.position.y);
    this.#hpBar.setRotation(theta + Math.PI / 2);

    // Sync shield aura position (no rotation — it's always a circle)
    if (this.#shieldAura) {
      this.#shieldAura.setPosition(this.body.position.x, this.body.position.y);
    }

    // Sync the active indicator (always above the character head in world space)
    this.#indicator.setPosition(this.body.position.x, this.body.position.y);
    this.#indicator.setRotation(theta + Math.PI / 2);
  }

  /** Move counterclockwise around the planet. */
  moveLeft(): void {
    const theta = this.#radialAngle();
    Matter.Body.applyForce(toMatterBody(this.body), this.body.position, {
      x: -Math.sin(theta) * MOVE_FORCE,
      y: Math.cos(theta) * MOVE_FORCE,
    });
  }

  /** Move clockwise around the planet. */
  moveRight(): void {
    const theta = this.#radialAngle();
    Matter.Body.applyForce(toMatterBody(this.body), this.body.position, {
      x: Math.sin(theta) * MOVE_FORCE,
      y: -Math.cos(theta) * MOVE_FORCE,
    });
  }

  /** Apply an outward radial impulse (jump away from planet surface). */
  jump(): void {
    const theta = this.#radialAngle();
    Matter.Body.applyForce(toMatterBody(this.body), this.body.position, {
      x: Math.cos(theta) * JUMP_FORCE,
      y: Math.sin(theta) * JUMP_FORCE,
    });
  }
}

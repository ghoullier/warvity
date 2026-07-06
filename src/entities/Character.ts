import Matter from "matter-js";
import type Phaser from "phaser";
import { PLANET_CENTER } from "../config";
import { GameEvents } from "../systems/GameEvents";
import { toMatterBody } from "../utils/matterUtils";

const CHAR_WIDTH = 18;
export const CHAR_HEIGHT = 26;
const MOVE_FORCE = 0.0012;
const JUMP_FORCE = 0.008;
const HP_BAR_WIDTH = 24;
const HP_BAR_HEIGHT = 3;
const HP_BAR_OFFSET_Y = -CHAR_HEIGHT / 2 - 18;

// Animation thresholds
const GROUNDED_RADIAL_SPEED = 0.5;
const MOVING_TANGENTIAL_SPEED = 0.3;

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
  #weaponText: Phaser.GameObjects.Text | null = null;

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

  // Animation state
  #wasGrounded = true;
  #isMoving = false;
  #pulseTween: Phaser.Tweens.Tween | null = null;
  #squashTween: Phaser.Tweens.Tween | null = null;

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
    const headY = -hh - 6;
    const eyeY = -hh - 9;

    const gfx = this.#graphics;
    gfx.clear();

    // Compute a darker shade of team color for helmet and shadow
    const r = (this.#color >> 16) & 0xff;
    const g = (this.#color >> 8) & 0xff;
    const b = this.#color & 0xff;
    const darkenColor =
      (Math.floor(r * 0.7) << 16) |
      (Math.floor(g * 0.7) << 8) |
      Math.floor(b * 0.7);

    // Body base
    gfx.fillStyle(this.#color, 1);
    gfx.fillRect(-hw, -hh, CHAR_WIDTH, CHAR_HEIGHT);

    // Body shadow (bottom 6px)
    gfx.fillStyle(darkenColor, 0.3);
    gfx.fillRect(-hw, hh - 6, CHAR_WIDTH, 6);

    // Body highlight (upper-left subtle glint)
    gfx.fillStyle(0xffffff, 0.2);
    gfx.fillCircle(-4, -6, 4);

    // Helmet (darker shade, slightly larger circle behind face)
    gfx.fillStyle(darkenColor, 1);
    gfx.fillCircle(0, headY - 2, 9);

    // Head (cream face on top of helmet)
    gfx.fillStyle(0xffe4c4, 1);
    gfx.fillCircle(0, headY, 8);

    // Eyes – white sclera
    gfx.fillStyle(0xffffff, 1);
    gfx.fillCircle(-3, eyeY, 2);
    gfx.fillCircle(2, eyeY, 2);

    // Eyes – pupils
    gfx.fillStyle(0x000000, 1);
    gfx.fillCircle(-3, eyeY, 1);
    gfx.fillCircle(2, eyeY, 1);
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

  /** Start (or restart) the active-indicator pulse tween. */
  #startPulseTween(): void {
    this.#pulseTween?.stop();
    this.#pulseTween = this.#scene.tweens.add({
      targets: this.#graphics,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Brief squash on landing: compress vertically, spring back with overshoot. */
  #playLandSquash(): void {
    if (!this.#alive) return;
    // Don't re-trigger while a squash is still in progress
    if (this.#squashTween) return;

    this.#pulseTween?.stop();
    this.#pulseTween = null;

    this.#squashTween = this.#scene.tweens.add({
      targets: this.#graphics,
      scaleX: 1.3,
      scaleY: 0.7,
      duration: 80,
      onComplete: () => {
        this.#squashTween = this.#scene.tweens.add({
          targets: this.#graphics,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: "Back.Out",
          onComplete: () => {
            this.#squashTween = null;
            if (this.#active) this.#startPulseTween();
          },
        });
      },
    });
  }

  /** Spawn a burst of colored circles at the worm's death position. */
  #spawnDeathParticles(x: number, y: number): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      const gfx = this.#scene.add.graphics();
      gfx.fillStyle(this.#color, 1);
      gfx.fillCircle(0, 0, 3 + Math.random() * 3);
      gfx.setPosition(x, y);
      gfx.setDepth(8);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const maxLife = 400 + Math.random() * 300;
      let life = maxLife;

      const handler = (_t: number, delta: number) => {
        life -= delta;
        if (life <= 0) {
          gfx.destroy();
          this.#scene.events.off("update", handler);
          return;
        }
        gfx.x += vx;
        gfx.y += vy;
        gfx.setAlpha(life / maxLife);
      };
      this.#scene.events.on("update", handler);
    }
  }

  #die(): void {
    this.#alive = false;
    this.clearShield();
    this.#pulseTween?.stop();
    this.#pulseTween = null;
    this.#squashTween?.stop();
    this.#squashTween = null;
    this.#scene.matter.world.remove(this.body, false);

    const x = this.body.position.x;
    const y = this.body.position.y;

    // Immediately hide non-animated UI elements
    this.#hpBar.destroy();
    this.#indicator.destroy();
    this.#weaponText?.destroy();
    this.#weaponText = null;

    // Screen shake on impact
    this.#scene.cameras.main.shake(200, 0.005);

    // Particle burst
    this.#spawnDeathParticles(x, y);

    // Spin and shrink, then clean up and notify
    this.#scene.tweens.add({
      targets: this.#graphics,
      rotation: this.#graphics.rotation + Math.PI * 2,
      scaleX: 0,
      scaleY: 0,
      duration: 400,
      ease: "Cubic.In",
      onComplete: () => {
        this.#graphics.destroy();
        this.#scene.events.emit(GameEvents.WORM_DIED, this);
      },
    });
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
      this.#scene.events.emit(GameEvents.SHIELD_BLOCKED, this);
      return;
    }
    this.#hp = Math.max(0, this.#hp - amount);
    this.#drawHpBar();
    this.#scene.events.emit(GameEvents.HP_CHANGED, this);
    if (this.#hp <= 0) this.#die();
  }

  /** Highlight this worm as the active one (or remove the highlight). */
  setActive(active: boolean): void {
    this.#active = active;
    if (!this.#alive) return;
    this.#drawIndicator();

    if (active) {
      // Only start pulse if no squash animation is running (it will restart pulse on complete)
      if (!this.#squashTween) this.#startPulseTween();
    } else {
      this.#pulseTween?.stop();
      this.#pulseTween = null;
      this.#graphics.setScale(1, 1);
      this.#weaponText?.destroy();
      this.#weaponText = null;
    }
  }

  /** Show the active weapon emoji above the HP bar. Call while the worm is active. */
  setWeapon(label: string): void {
    this.#weaponText?.destroy();
    this.#weaponText = null;
    if (!label || !this.#active || !this.#alive) return;
    this.#weaponText = this.#scene.add
      .text(0, 0, label, { fontSize: "16px" })
      .setOrigin(0.5, 1)
      .setDepth(15);
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
  update(time = 0): void {
    if (!this.#alive) return;

    const theta = this.#radialAngle();

    // Radial unit vector (outward from planet centre)
    const nx = Math.cos(theta);
    const ny = Math.sin(theta);

    // Decompose velocity into radial and tangential components
    const vx = this.body.velocity.x;
    const vy = this.body.velocity.y;
    const radialVel = vx * nx + vy * ny;
    const tangentialVel = Math.abs(vx * -ny + vy * nx);

    // ── Grounded / landing detection ──────────────────────────────────────────
    const isGrounded = Math.abs(radialVel) < GROUNDED_RADIAL_SPEED;
    if (!this.#wasGrounded && isGrounded) {
      this.#playLandSquash();
    }
    this.#wasGrounded = isGrounded;

    // ── Moving flag (for walk bob) ─────────────────────────────────────────────
    this.#isMoving = tangentialVel > MOVING_TANGENTIAL_SPEED;

    // ── Walk bob: oscillate the visual along the radial axis ──────────────────
    const bobOffset = this.#isMoving ? Math.sin(time * 0.02) * 2 : 0;

    // Keep body upright relative to the planet surface
    Matter.Body.setAngle(toMatterBody(this.body), theta + Math.PI / 2);

    this.#graphics.setPosition(
      this.body.position.x + nx * bobOffset,
      this.body.position.y + ny * bobOffset,
    );
    this.#graphics.setRotation(theta + Math.PI / 2);

    this.#hpBar.setPosition(this.body.position.x, this.body.position.y);
    this.#hpBar.setRotation(theta + Math.PI / 2);

    // Sync weapon text above the HP bar (in world space along radial direction)
    if (this.#weaponText) {
      const dist = Math.abs(HP_BAR_OFFSET_Y) + 10;
      this.#weaponText.setPosition(
        this.body.position.x + Math.cos(theta) * dist,
        this.body.position.y + Math.sin(theta) * dist,
      );
    }

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

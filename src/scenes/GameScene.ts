import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { Character } from "../entities/Character";
import { Projectile } from "../entities/Projectile";
import { applyRadialGravity } from "../systems/GravitySystem";
import { TerrainManager } from "../systems/TerrainManager";

const FIRE_SPEED = 6;
const FIRE_OFFSET = 40; // px from character centre before spawning projectile

/**
 * Main game scene.
 *
 * Controls:
 *   Arrow Left / Right  — move active character around the planet
 *   Arrow Up            — jump
 *   Space               — fire a projectile outward from the planet surface
 *   Tab                 — switch active character
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #characters: Character[] = [];
  #projectiles: Projectile[] = [];
  #cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  #activeIndex = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  // Called by Phaser when the scene starts (not declared in the base class type)
  create(): void {
    // Starfield background
    this.add.rectangle(
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE,
      CANVAS_SIZE,
      0x0a0a1a,
    );
    this.#addStars();

    // Planet terrain
    this.#terrain = new TerrainManager(this);

    // Two characters on opposite poles
    this.#characters.push(
      new Character(
        this,
        PLANET_CENTER.x,
        PLANET_CENTER.y - PLANET_RADIUS - 20,
        0xff6b35,
      ),
    );
    this.#characters.push(
      new Character(
        this,
        PLANET_CENTER.x,
        PLANET_CENTER.y + PLANET_RADIUS + 20,
        0x35aaff,
      ),
    );

    // Keyboard input
    this.#cursors = this.input.keyboard?.createCursorKeys();

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.#fireProjectile();
    });

    this.input.keyboard?.on("keydown-TAB", (event: KeyboardEvent) => {
      event.preventDefault();
      this.#activeIndex = (this.#activeIndex + 1) % this.#characters.length;
    });

    // HUD
    this.add
      .text(10, 10, "← → move  ↑ jump  Space fire  Tab switch", {
        fontSize: "13px",
        color: "#aaaacc",
      })
      .setDepth(10);
  }

  override update(_time: number, _delta: number): void {
    // Radial gravity for all dynamic bodies
    const bodies = this.matter.world.getAllBodies();
    applyRadialGravity(bodies, PLANET_CENTER, GRAVITY_STRENGTH);

    // Character controls
    const active = this.#characters[this.#activeIndex];
    if (active && this.#cursors) {
      if (this.#cursors.left.isDown) active.moveLeft();
      else if (this.#cursors.right.isDown) active.moveRight();
      if (Phaser.Input.Keyboard.JustDown(this.#cursors.up)) active.jump();
    }

    // Sync visuals for all characters
    for (const c of this.#characters) c.update();

    // Update projectiles and discard detonated ones
    for (const p of this.#projectiles) p.update();
    this.#projectiles = this.#projectiles.filter((p) => p.isActive());
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #fireProjectile(): void {
    const character = this.#characters[this.#activeIndex];
    if (!character) return;

    // Direction: outward from planet centre through the character
    const cx = character.body.position.x;
    const cy = character.body.position.y;
    const dx = cx - PLANET_CENTER.x;
    const dy = cy - PLANET_CENTER.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    this.#projectiles.push(
      new Projectile(
        this,
        cx + nx * FIRE_OFFSET,
        cy + ny * FIRE_OFFSET,
        nx * FIRE_SPEED,
        ny * FIRE_SPEED,
        this.#terrain,
      ),
    );
  }

  #addStars(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.8);
    // Pseudo-random but deterministic star field
    for (let i = 0; i < 120; i++) {
      const sx = (((i * 137 + 53) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sy = (((i * 97 + 179) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sr = i % 3 === 0 ? 1.5 : 1;
      gfx.fillCircle(sx, sy, sr);
    }
  }
}

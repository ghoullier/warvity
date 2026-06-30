import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { Character } from "../entities/Character";
import { Projectile } from "../entities/Projectile";
import { CameraController } from "../systems/CameraController";
import { applyRadialGravity } from "../systems/GravitySystem";
import { TerrainManager } from "../systems/TerrainManager";
import { TurnManager } from "../systems/TurnManager";

const FIRE_SPEED = 6;
const FIRE_OFFSET = 40; // px from character centre before spawning projectile

/**
 * Main game scene.
 *
 * Controls:
 *   Arrow Left / Right  — move active character around the planet
 *   Arrow Up            — jump
 *   Space               — fire a projectile outward from the planet surface
 *   Tab                 — end current turn (advance to next worm / team)
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #turnManager!: TurnManager;
  #allCharacters: Character[] = [];
  #teams: Array<{ name: string; worms: Character[] }> = [];
  #projectiles: Projectile[] = [];
  #cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  #cameraController!: CameraController;

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

    // Two teams, each with one worm, on opposite poles
    const teamA = [
      new Character(
        this,
        PLANET_CENTER.x,
        PLANET_CENTER.y - PLANET_RADIUS - 20,
        0xff6b35,
        100,
        "Worm A1",
      ),
    ];
    const teamB = [
      new Character(
        this,
        PLANET_CENTER.x,
        PLANET_CENTER.y + PLANET_RADIUS + 20,
        0x35aaff,
        100,
        "Worm B1",
      ),
    ];

    this.#allCharacters = [...teamA, ...teamB];
    this.#teams = [
      { name: "Team A", worms: teamA },
      { name: "Team B", worms: teamB },
    ];
    this.#turnManager = new TurnManager([teamA, teamB]);

    this.#turnManager.on("turn-start", (worm: Character) => {
      console.log(
        `[TurnManager] Turn started — active worm: ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
      );
      this.#cameraController.follow(worm);
    });

    // Log the initial worm
    const first = this.#turnManager.getCurrentWorm();
    console.log(
      `[TurnManager] Game start — active worm: ${first.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
    );

    // Keyboard input
    this.#cursors = this.input.keyboard?.createCursorKeys();

    this.input.keyboard?.on("keydown-SPACE", () => {
      this.#fireProjectile();
    });

    this.input.keyboard?.on("keydown-TAB", (event: KeyboardEvent) => {
      event.preventDefault();
      this.#turnManager.nextTurn();
    });

    // Camera
    this.#cameraController = new CameraController(
      this.cameras.main,
      PLANET_CENTER,
    );
    this.#cameraController.follow(this.#turnManager.getCurrentWorm());

    // Worm death events
    this.events.on("worm-died", (_worm: Character) => {
      for (const team of this.#teams) {
        if (team.worms.every((c) => !c.isAlive())) {
          const winner = this.#teams.find(
            (t) => t !== team && t.worms.some((c) => c.isAlive()),
          );
          this.#turnManager.stop();
          if (winner) {
            this.scene.launch("GameOver", { winner: winner.name });
          } else {
            this.scene.launch("GameOver", { winner: "Nobody" });
          }
          return;
        }
      }
    });

    // HUD
    this.add
      .text(10, 10, "← → move  ↑ jump  Space fire  Tab next turn", {
        fontSize: "13px",
        color: "#aaaacc",
      })
      .setDepth(10);
  }

  override update(_time: number, _delta: number): void {
    // Radial gravity for all dynamic bodies
    const bodies = this.matter.world.getAllBodies();
    applyRadialGravity(bodies, PLANET_CENTER, GRAVITY_STRENGTH);

    // Character controls — only the active worm responds
    const active = this.#turnManager.getCurrentWorm();
    if (active?.isAlive() && this.#cursors) {
      if (this.#cursors.left.isDown) active.moveLeft();
      else if (this.#cursors.right.isDown) active.moveRight();
      if (Phaser.Input.Keyboard.JustDown(this.#cursors.up)) active.jump();
    }

    // Sync visuals for all characters across all teams
    for (const worm of this.#allCharacters) worm.update();

    // Update projectiles and discard detonated ones
    for (const p of this.#projectiles) p.update();
    this.#projectiles = this.#projectiles.filter((p) => p.isActive());
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #fireProjectile(): void {
    const character = this.#turnManager.getCurrentWorm();

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

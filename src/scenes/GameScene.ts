import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { Character } from "../entities/Character";
import { Projectile } from "../entities/Projectile";
import { AimingSystem } from "../systems/AimingSystem";
import { CameraController } from "../systems/CameraController";
import { applyRadialGravity } from "../systems/GravitySystem";
import { TerrainManager } from "../systems/TerrainManager";
import { TurnManager } from "../systems/TurnManager";

const FIRE_OFFSET = 40; // px from character centre before spawning projectile
const MAX_FIRE_SPEED = 12;

/**
 * Main game scene.
 *
 * Controls:
 *   Arrow Left / Right  — rotate aim direction
 *   Arrow Up            — jump
 *   Space (hold/release)— charge and fire projectile
 *   Tab                 — end current turn (advance to next worm / team)
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #turnManager!: TurnManager;
  #aimingSystem!: AimingSystem;
  #allCharacters: Character[] = [];
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
    this.#turnManager = new TurnManager([teamA, teamB]);
    this.#aimingSystem = new AimingSystem(this);

    this.#turnManager.on("turn-start", (worm: Character) => {
      console.log(
        `[TurnManager] Turn started — active worm: ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
      );
      this.#cameraController.follow(worm);
      this.#aimingSystem.activate(worm);
    });

    this.events.on(
      "fire",
      ({
        angle,
        power,
        worm,
      }: {
        angle: number;
        power: number;
        worm: Character;
      }) => {
        this.#fireProjectile(angle, power, worm);
        // Advance the turn automatically after firing
        this.#turnManager.nextTurn();
      },
    );

    // Log the initial worm and activate aiming on it
    const first = this.#turnManager.getCurrentWorm();
    console.log(
      `[TurnManager] Game start — active worm: ${first.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
    );

    // Keyboard input
    this.#cursors = this.input.keyboard?.createCursorKeys();

    this.input.keyboard?.on("keydown-TAB", (event: KeyboardEvent) => {
      event.preventDefault();
      this.#aimingSystem.deactivate();
      this.#turnManager.nextTurn();
    });

    // Camera
    this.#cameraController = new CameraController(
      this.cameras.main,
      PLANET_CENTER,
    );
    this.#cameraController.follow(this.#turnManager.getCurrentWorm());

    // Activate aiming on the first worm
    this.#aimingSystem.activate(first);

    // Worm death events
    this.events.on("worm-died", (worm: Character) => {
      console.log(
        `[TurnManager] ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()}) died!`,
      );

      const surviving = this.#allCharacters.filter((c) => c.isAlive());
      if (surviving.length === 0) {
        console.log("All worms are dead — draw!");
      } else if (surviving.length === 1) {
        console.log(`${surviving[0].name} wins!`);
      }
    });

    // HUD
    this.add
      .text(
        10,
        10,
        "↑ jump  ← → aim  Space (hold) charge + fire  Tab next turn",
        {
          fontSize: "13px",
          color: "#aaaacc",
        },
      )
      .setDepth(10);
  }

  override update(_time: number, _delta: number): void {
    // Radial gravity for all dynamic bodies
    const bodies = this.matter.world.getAllBodies();
    applyRadialGravity(bodies, PLANET_CENTER, GRAVITY_STRENGTH);

    // Character movement — only the active worm responds (← → now rotate aim, ↑ still jumps)
    const active = this.#turnManager.getCurrentWorm();
    if (active?.isAlive() && this.#cursors) {
      if (Phaser.Input.Keyboard.JustDown(this.#cursors.up)) active.jump();
    }

    // Aiming system handles ← → for rotation and Space for charge/fire
    this.#aimingSystem.update();

    // Sync visuals for all characters across all teams
    for (const worm of this.#allCharacters) worm.update();

    // Update projectiles and discard detonated ones
    for (const p of this.#projectiles) p.update();
    this.#projectiles = this.#projectiles.filter((p) => p.isActive());
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #fireProjectile(angle: number, power: number, character: Character): void {
    const cx = character.body.position.x;
    const cy = character.body.position.y;
    const speed = power * MAX_FIRE_SPEED;

    this.#projectiles.push(
      new Projectile(
        this,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
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

import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { Character } from "../entities/Character";
import { Grenade, MAX_GRENADE_SPEED } from "../entities/Grenade";
import { Projectile } from "../entities/Projectile";
import { AimingSystem } from "../systems/AimingSystem";
import { CameraController } from "../systems/CameraController";
import { applyRadialGravity } from "../systems/GravitySystem";
import { TerrainManager } from "../systems/TerrainManager";
import { TurnManager } from "../systems/TurnManager";

const FIRE_OFFSET = 40; // px from character centre before spawning projectile
const MAX_FIRE_SPEED = 15;
const EXPLOSION_RADIUS = 60;
const MAX_EXPLOSION_DAMAGE = 50;

/**
 * Main game scene.
 *
 * Controls:
 *   Arrow Left / Right  — rotate aim direction
 *   Arrow Up            — jump
 *   Space (hold/release)— charge and fire projectile
 *   Tab                 — end current turn (advance to next worm / team)
 *   Q                   — switch between Bazooka and Grenade
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #turnManager!: TurnManager;
  #aimingSystem!: AimingSystem;
  #allCharacters: Character[] = [];
  #teams: Array<{ name: string; worms: Character[] }> = [];
  #projectiles: Projectile[] = [];
  #grenades: Grenade[] = [];
  #activeWeapon: "bazooka" | "grenade" = "bazooka";
  #cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  #cameraController!: CameraController;

  constructor() {
    super({ key: "GameScene" });
  }

  // ──────────────────────────────── public getters ──────────────────────────────

  get teams(): Array<{ name: string; worms: Character[] }> {
    return this.#teams;
  }

  get activeWorm(): Character {
    return this.#turnManager.getCurrentWorm();
  }

  get activeTeamName(): string {
    return this.#teams[this.#turnManager.getActiveTeamIndex()]?.name ?? "";
  }

  get remainingTime(): number {
    return this.#turnManager.getRemainingTime();
  }

  get activeWeapon(): "bazooka" | "grenade" {
    return this.#activeWeapon;
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
    this.#aimingSystem = new AimingSystem(this);

    // Forward timer ticks to scene events for UIScene
    this.#turnManager.on("timer-tick", (remaining: number) => {
      this.events.emit("timer-tick", remaining);
    });

    this.#turnManager.on("turn-start", (worm: Character) => {
      console.log(
        `[TurnManager] Turn started — active worm: ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
      );
      this.#cameraController.follow(worm);
      this.#aimingSystem.activate(worm);
      this.#turnManager.startTimer(this);
      // Forward to scene events so UIScene can react
      const teamName =
        this.#teams[this.#turnManager.getActiveTeamIndex()]?.name ?? "";
      this.events.emit("turn-start", worm, teamName);
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
        if (this.#activeWeapon === "grenade") {
          this.#fireGrenade(angle, power, worm);
          // Grenade: advance turn immediately (detonation-based advance is a future feature)
          this.#turnManager.nextTurn();
        } else {
          this.#fireProjectile(angle, power, worm);
          // Bazooka: turn advances once the projectile explodes (see 'projectile-exploded')
        }
      },
    );

    // When the projectile detonates: destroy terrain, apply damage, advance turn
    this.events.on(
      "projectile-exploded",
      ({ x, y }: { x: number; y: number }) => {
        this.#terrain.explode(x, y, EXPLOSION_RADIUS);

        for (const worm of this.#allCharacters) {
          if (!worm.isAlive()) continue;
          const dx = worm.body.position.x - x;
          const dy = worm.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < EXPLOSION_RADIUS) {
            const damage = MAX_EXPLOSION_DAMAGE * (1 - dist / EXPLOSION_RADIUS);
            worm.takeDamage(damage);
          }
        }

        this.#turnManager.nextTurn();
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
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

    this.input.keyboard?.on("keydown-Q", () => {
      this.#activeWeapon =
        this.#activeWeapon === "bazooka" ? "grenade" : "bazooka";
      this.events.emit("weapon-changed", this.#activeWeapon);
    });

    // Camera
    this.#cameraController = new CameraController(
      this.cameras.main,
      PLANET_CENTER,
    );
    this.#cameraController.follow(this.#turnManager.getCurrentWorm());

    // Activate aiming on the first worm and start the first turn's timer
    this.#aimingSystem.activate(first);
    this.#turnManager.startTimer(this);

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

    // Controls hint (bottom of screen, rendered in GameScene so it scrolls with world)
    this.add
      .text(
        10,
        CANVAS_SIZE - 26,
        "↑ jump  ← → aim  Space (hold) charge + fire  Tab next turn  Q weapon",
        {
          fontSize: "13px",
          color: "#aaaacc",
        },
      )
      .setDepth(10);

    // Launch the HUD overlay (restart if already running)
    this.scene.stop("UIScene");
    this.scene.launch("UIScene");
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

    // Update grenades and discard inactive ones
    for (const g of this.#grenades) g.update();
    this.#grenades = this.#grenades.filter((g) => g.isActive());
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
        this.#cameraController,
      ),
    );
  }

  #fireGrenade(angle: number, power: number, character: Character): void {
    const cx = character.body.position.x;
    const cy = character.body.position.y;
    const speed = power * MAX_GRENADE_SPEED;

    this.#grenades.push(
      new Grenade(
        this,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
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

import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { DEFAULT_PLANET_STYLE, type PlanetStyle } from "../config/PlanetStyles";
import { Character } from "../entities/Character";
import {
  ClusterBomb,
  MAX_CLUSTER_SPEED,
  MAX_SUB_DAMAGE,
  SUB_EXPLOSION_RADIUS,
} from "../entities/ClusterBomb";
import { Flamethrower } from "../entities/Flamethrower";
import { GravityBoost } from "../entities/GravityBoost";
import { Grenade, MAX_GRENADE_SPEED } from "../entities/Grenade";
import { Projectile } from "../entities/Projectile";
import { Singularity } from "../entities/Singularity";
import { Teleporter } from "../entities/Teleporter";
import { AimingSystem } from "../systems/AimingSystem";
import { AudioManager } from "../systems/AudioManager";
import { CameraController } from "../systems/CameraController";
import { applyRadialGravity } from "../systems/GravitySystem";
import * as ParticleSystem from "../systems/ParticleSystem";
import { TerrainManager } from "../systems/TerrainManager";
import { TurnManager } from "../systems/TurnManager";

const FIRE_OFFSET = 40; // px from character centre before spawning projectile
const MAX_FIRE_SPEED = 15;
const EXPLOSION_RADIUS = 60;
const MAX_EXPLOSION_DAMAGE = 50;
const GRENADE_EXPLOSION_RADIUS = 50;
const MAX_GRENADE_DAMAGE = 40;
const SINGULARITY_EXPLOSION_RADIUS = 80;
const MAX_SINGULARITY_DAMAGE = 60;

const TEAM_COLORS = [0xff6b35, 0x35aaff, 0x35ff6b, 0xff35aa] as const;
const TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D"] as const;

/**
 * Main game scene.
 *
 * Expects init data: `{ teams?: number; wormsPerTeam?: number }`.
 * Defaults to 2 teams × 1 worm when launched without data.
 *
 * Controls:
 *   Arrow Left / Right  — rotate aim direction
 *   Arrow Up            — jump
 *   Space (hold/release)— charge and fire projectile
 *   Tab                 — end current turn (advance to next worm / team)
 *   Q                   — cycle weapons: Bazooka → Grenade → Gravity Boost → …
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #turnManager!: TurnManager;
  #aimingSystem!: AimingSystem;
  #audioManager!: AudioManager;
  #teleporter!: Teleporter;
  #allCharacters: Character[] = [];
  #teams: Array<{ name: string; worms: Character[] }> = [];
  #projectiles: Projectile[] = [];
  #grenades: Grenade[] = [];
  #clusterBombs: ClusterBomb[] = [];
  #singularities: Singularity[] = [];
  #activeWeapon:
    | "bazooka"
    | "grenade"
    | "cluster-bomb"
    | "teleporter"
    | "singularity"
    | "gravity-boost"
    | "flamethrower"
    | "shield"
    | "jetpack" = "bazooka";
  #activeFlamethrower: Flamethrower | null = null;
  #activeJetpack: Jetpack | null = null;
  #gravityMultiplier = 1;
  #activeGravityBoost: GravityBoost | null = null;
  #cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  #cameraController!: CameraController;
  #config = { teams: 2, wormsPerTeam: 1 };
  #planetStyle: PlanetStyle = DEFAULT_PLANET_STYLE;

  constructor() {
    super({ key: "GameScene" });
  }

  // ──────────────────────────────── init ────────────────────────────────────────

  init(data: {
    teams?: number;
    wormsPerTeam?: number;
    planetStyle?: PlanetStyle;
  }): void {
    this.#config = {
      teams: data?.teams ?? 2,
      wormsPerTeam: data?.wormsPerTeam ?? 1,
    };
    this.#planetStyle = data?.planetStyle ?? DEFAULT_PLANET_STYLE;
    // Reset mutable state so the scene can be restarted cleanly
    this.#allCharacters = [];
    this.#teams = [];
    this.#projectiles = [];
    this.#grenades = [];
    this.#clusterBombs = [];
    this.#singularities = [];
    this.#activeWeapon = "bazooka";
    this.#activeFlamethrower = null;
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

  get activeWeapon():
    | "bazooka"
    | "grenade"
    | "cluster-bomb"
    | "teleporter"
    | "singularity"
    | "gravity-boost"
    | "flamethrower"
    | "shield"
    | "jetpack" {
    return this.#activeWeapon;
  }

  get audioManager(): AudioManager {
    return this.#audioManager;
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  // Called by Phaser when the scene starts (not declared in the base class type)
  create(): void {
    // Starfield background
    this.cameras.main.setBackgroundColor(this.#planetStyle.background);
    this.#addStars();

    // Planet terrain
    this.#terrain = new TerrainManager(this, this.#planetStyle);

    // Audio
    this.#audioManager = new AudioManager(this);
    this.#audioManager.startMusic();

    // Build teams and worms from configuration
    for (let t = 0; t < this.#config.teams; t++) {
      // Spread teams evenly around the planet, starting from the top
      const teamAngle = (2 * Math.PI * t) / this.#config.teams - Math.PI / 2;
      const worms: Character[] = [];
      for (let w = 0; w < this.#config.wormsPerTeam; w++) {
        // Spread each team's worms slightly along the surface
        const spread = (w - (this.#config.wormsPerTeam - 1) / 2) * 0.18;
        const wormAngle = teamAngle + spread;
        const x = PLANET_CENTER.x + Math.cos(wormAngle) * (PLANET_RADIUS + 20);
        const y = PLANET_CENTER.y + Math.sin(wormAngle) * (PLANET_RADIUS + 20);
        worms.push(
          new Character(
            this,
            x,
            y,
            TEAM_COLORS[t] ?? 0xffffff,
            100,
            `${TEAM_NAMES[t] ?? `Team ${t + 1}`} W${w + 1}`,
          ),
        );
      }
      this.#teams.push({ name: TEAM_NAMES[t] ?? `Team ${t + 1}`, worms });
      this.#allCharacters.push(...worms);
    }
    this.#turnManager = new TurnManager(this.#teams.map((team) => team.worms));
    this.#aimingSystem = new AimingSystem(this);
    this.#teleporter = new Teleporter(this, this.#terrain);

    // Forward timer ticks to scene events for UIScene
    this.#turnManager.on("timer-tick", (remaining: number) => {
      this.events.emit("timer-tick", remaining);
    });

    this.#turnManager.on("turn-start", (worm: Character) => {
      console.log(
        `[TurnManager] Turn started — active worm: ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
      );
      worm.clearShield();
      this.#audioManager.playTeleport();
      this.#cameraController.follow(worm);
      this.#activateCurrentWeapon(worm);
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
        this.#audioManager.playFire();
        if (this.#activeWeapon === "gravity-boost") {
          this.#activateGravityBoost();
          // Turn advances after the 5-second boost (handled inside GravityBoost)
        } else if (this.#activeWeapon === "jetpack") {
          this.#activateJetpack();
          // Turn advances after 3-second flight (handled via 'jetpack-end' event)
        } else if (this.#activeWeapon === "grenade") {
          this.#fireGrenade(angle, power, worm);
          // Grenade: turn advances on explosion (see 'grenade-exploded')
        } else if (this.#activeWeapon === "cluster-bomb") {
          this.#fireClusterBomb(angle, power, worm);
          // Cluster bomb: turn advances when all sub-munitions explode (see 'cluster-exploded')
        } else if (this.#activeWeapon === "singularity") {
          this.#fireSingularity(angle, power, worm);
          // Singularity: turn advances on explosion (see 'singularity-exploded')
        } else if (this.#activeWeapon === "flamethrower") {
          this.#audioManager.playFlamethrower();
          this.#fireFlamethrower(angle, worm);
          // Flamethrower: turn advances when all particles settle (see 'flamethrower-done')
        } else {
          this.#fireProjectile(angle, power, worm);
          // Bazooka: turn advances once the projectile explodes (see 'projectile-exploded')
        }
      },
    );

    // When all flamethrower particles have finished: advance turn
    // When jetpack flight ends: advance turn
    this.events.on("jetpack-end", () => {
      this.#activeJetpack = null;
      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

    this.events.on("flamethrower-done", () => {
      this.#activeFlamethrower = null;
      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

    // When the projectile detonates: destroy terrain, apply damage, advance turn
    this.events.on(
      "projectile-exploded",
      ({ x, y }: { x: number; y: number }) => {
        this.#audioManager.playExplosion();
        this.#terrain.explode(x, y, EXPLOSION_RADIUS);
        ParticleSystem.explode(this, x, y, PLANET_CENTER);
        ParticleSystem.debris(this, x, y, PLANET_CENTER);

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

    // When the grenade detonates: destroy terrain, apply damage, advance turn
    this.events.on("grenade-exploded", ({ x, y }: { x: number; y: number }) => {
      this.#audioManager.playExplosion();
      this.#terrain.explode(x, y, GRENADE_EXPLOSION_RADIUS);
      ParticleSystem.explode(this, x, y, PLANET_CENTER);
      ParticleSystem.debris(this, x, y, PLANET_CENTER);

      for (const worm of this.#allCharacters) {
        if (!worm.isAlive()) continue;
        const dx = worm.body.position.x - x;
        const dy = worm.body.position.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < GRENADE_EXPLOSION_RADIUS) {
          const damage =
            MAX_GRENADE_DAMAGE * (1 - dist / GRENADE_EXPLOSION_RADIUS);
          worm.takeDamage(damage);
        }
      }

      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

    // When a teleport completes: advance the turn
    this.events.on("teleport-complete", () => {
      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

    // When the singularity detonates: destroy terrain, apply damage, advance turn
    this.events.on(
      "singularity-exploded",
      ({ x, y }: { x: number; y: number }) => {
        this.#audioManager.playExplosion();
        this.#terrain.explode(x, y, SINGULARITY_EXPLOSION_RADIUS);
        ParticleSystem.explode(this, x, y, PLANET_CENTER);
        ParticleSystem.debris(this, x, y, PLANET_CENTER);

        for (const worm of this.#allCharacters) {
          if (!worm.isAlive()) continue;
          const dx = worm.body.position.x - x;
          const dy = worm.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SINGULARITY_EXPLOSION_RADIUS) {
            const damage =
              MAX_SINGULARITY_DAMAGE *
              (1 - dist / SINGULARITY_EXPLOSION_RADIUS);
            worm.takeDamage(damage);
          }
        }

        this.#turnManager.nextTurn();
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
      },
    );

    // When the cluster bomb splits: play the split sound
    this.events.on("cluster-split", () => {
      this.#audioManager.playClusterSplit();
    });

    // When a sub-munition detonates: destroy terrain, apply damage, play sound
    this.events.on(
      "sub-munition-exploded",
      ({ x, y }: { x: number; y: number }) => {
        this.#audioManager.playSubExplosion();
        this.#terrain.explode(x, y, SUB_EXPLOSION_RADIUS);
        ParticleSystem.explode(this, x, y, PLANET_CENTER);

        for (const worm of this.#allCharacters) {
          if (!worm.isAlive()) continue;
          const dx = worm.body.position.x - x;
          const dy = worm.body.position.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SUB_EXPLOSION_RADIUS) {
            const damage = MAX_SUB_DAMAGE * (1 - dist / SUB_EXPLOSION_RADIUS);
            worm.takeDamage(damage);
          }
        }
      },
    );

    // When all sub-munitions have exploded: advance turn
    this.events.on("cluster-exploded", () => {
      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

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
      const weapons = [
        "bazooka",
        "grenade",
        "singularity",
        "teleporter",
        "gravity-boost",
        "flamethrower",
        "jetpack",
      ] as const;
      const idx = weapons.indexOf(this.#activeWeapon);
      // biome-ignore lint/style/noNonNullAssertion: modulo guarantees in-bounds index
      this.#activeWeapon = weapons[(idx + 1) % weapons.length]!;
      this.events.emit("weapon-changed", this.#activeWeapon);
      this.#activateCurrentWeapon(this.#turnManager.getCurrentWorm());
    });

    // Camera
    this.#cameraController = new CameraController(
      this.cameras.main,
      PLANET_CENTER,
    );
    this.#cameraController.follow(this.#turnManager.getCurrentWorm());

    // Activate the current weapon on the first worm and start the first turn's timer
    this.#activateCurrentWeapon(first);
    this.#turnManager.startTimer(this);

    // Click to trigger teleportation when teleporter is the active weapon
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.#activeWeapon === "teleporter") {
        this.#teleporter.handleClick(pointer.worldX, pointer.worldY);
      }
    });

    // Space key activates the shield when that weapon is selected
    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.#activeWeapon === "shield") {
        const worm = this.#turnManager.getCurrentWorm();
        worm.activateShield();
        this.#audioManager.playShieldActivate();
        this.#turnManager.nextTurn();
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
      }
    });

    // Worm death events
    this.events.on("shield-blocked", () => {
      this.#audioManager.playShieldBlock();
    });

    this.events.on("worm-died", (_worm: Character) => {
      this.#audioManager.playDeath();
      for (const team of this.#teams) {
        if (team.worms.every((c) => !c.isAlive())) {
          const winner = this.#teams.find(
            (t) => t !== team && t.worms.some((c) => c.isAlive()),
          );
          this.#activeGravityBoost?.cancel();
          this.#activeGravityBoost = null;
          this.#activeJetpack?.deactivate();
          this.#activeJetpack = null;
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
    // Radial gravity for all dynamic bodies (multiplier modified by GravityBoost)
    const bodies = this.matter.world.getAllBodies();
    applyRadialGravity(
      bodies,
      PLANET_CENTER,
      GRAVITY_STRENGTH,
      this.#gravityMultiplier,
    );

    // Character movement — only the active worm responds (← → now rotate aim, ↑ still jumps)
    const active = this.#turnManager.getCurrentWorm();

    const jetpackActive = this.#activeJetpack?.isActive() ?? false;

    if (jetpackActive) {
      // Partially cancel gravity for the worm: net = 0.2 (cancel 80%)
      applyRadialGravity(
        [active.body],
        PLANET_CENTER,
        GRAVITY_STRENGTH,
        this.#gravityMultiplier * -0.8,
      );
      // biome-ignore lint/style/noNonNullAssertion: guarded by jetpackActive check
      this.#activeJetpack!.update(this.#cursors);
    }

    if (active?.isAlive() && this.#cursors) {
      if (Phaser.Input.Keyboard.JustDown(this.#cursors.up)) {
        active.jump();
        this.#audioManager.playJump();
      }
    }

    // Aiming system handles ← → for rotation and Space for charge/fire
    this.#aimingSystem.update();

    // Update teleporter cursor when active
    this.#teleporter.update(this.input.activePointer);

    // Sync visuals for all characters across all teams
    for (const worm of this.#allCharacters) worm.update();

    // Update projectiles and discard detonated ones
    for (const p of this.#projectiles) p.update();
    this.#projectiles = this.#projectiles.filter((p) => p.isActive());

    // Update grenades and discard inactive ones
    for (const g of this.#grenades) g.update();
    this.#grenades = this.#grenades.filter((g) => g.isActive());

    // Update cluster bombs and discard inactive ones
    for (const c of this.#clusterBombs) c.update();
    this.#clusterBombs = this.#clusterBombs.filter((c) => c.isActive());

    // Update singularities and discard inactive ones
    for (const s of this.#singularities) s.update();
    this.#singularities = this.#singularities.filter((s) => s.isActive());

    // Update active flamethrower particles
    if (this.#activeFlamethrower) {
      this.#activeFlamethrower.update(_delta);
    }
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  /** Activate the appropriate weapon UI for `worm` based on `#activeWeapon`. */
  #activateCurrentWeapon(worm: Character): void {
    if (this.#activeWeapon === "teleporter") {
      this.#aimingSystem.deactivate();
      this.#teleporter.activate(worm);
    } else if (this.#activeWeapon === "shield") {
      this.#teleporter.deactivate();
      this.#aimingSystem.deactivate();
    } else {
      this.#teleporter.deactivate();
      this.#aimingSystem.activate(worm);
    }
  }

  #activateGravityBoost(): void {
    if (this.#activeGravityBoost?.isActive()) return;
    this.#turnManager.stopTimer();
    const boost = new GravityBoost(
      this,
      (m) => {
        this.#gravityMultiplier = m;
      },
      () => {
        this.#activeGravityBoost = null;
        this.#turnManager.nextTurn();
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
      },
    );
    this.#activeGravityBoost = boost;
    boost.activate();
  }

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

  #fireSingularity(angle: number, power: number, character: Character): void {
    const cx = character.body.position.x;
    const cy = character.body.position.y;
    const speed = power * MAX_FIRE_SPEED;

    this.#singularities.push(
      new Singularity(
        this,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ),
    );
  }

  #fireFlamethrower(angle: number, character: Character): void {
    const cx = character.body.position.x;
    const cy = character.body.position.y;

    this.#activeFlamethrower = new Flamethrower(
      this,
      cx + Math.cos(angle) * FIRE_OFFSET,
      cy + Math.sin(angle) * FIRE_OFFSET,
      angle,
      this.#terrain,
      this.#allCharacters,
    );
    this.#activeFlamethrower.start();
    this.#audioManager.playFlamethrower();
  }

  #fireClusterBomb(angle: number, power: number, character: Character): void {
    const cx = character.body.position.x;
    const cy = character.body.position.y;
    const speed = power * MAX_CLUSTER_SPEED;

    this.#clusterBombs.push(
      new ClusterBomb(
        this,
        cx + Math.cos(angle) * FIRE_OFFSET,
        cy + Math.sin(angle) * FIRE_OFFSET,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
      ),
    );
  }

  #activateJetpack(): void {
    if (this.#activeJetpack?.isActive()) return;
    this.#turnManager.stopTimer();
    this.#aimingSystem.deactivate();
    const jetpack = new Jetpack(
      this,
      this.#turnManager.getCurrentWorm(),
      this.#audioManager,
    );
    this.#activeJetpack = jetpack;
    jetpack.activate();
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

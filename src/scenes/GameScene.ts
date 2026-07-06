import Phaser from "phaser";
import {
  CANVAS_SIZE,
  GRAVITY_STRENGTH,
  PLANET_CENTER,
  PLANET_RADIUS,
} from "../config";
import { DEFAULT_PLANET_STYLE, type PlanetStyle } from "../config/PlanetStyles";
import { Character } from "../entities/Character";
import { GravityBoost } from "../entities/GravityBoost";
import { Teleporter } from "../entities/Teleporter";
import { AimingSystem } from "../systems/AimingSystem";
import { AudioManager } from "../systems/AudioManager";
import { CameraController } from "../systems/CameraController";
import { GameEvents } from "../systems/GameEvents";
import { applyRadialGravity } from "../systems/GravitySystem";
import { TerrainManager } from "../systems/TerrainManager";
import { TurnManager } from "../systems/TurnManager";
import "../weapons/index";
import {
  getWeapon,
  getWeapons,
  resetAllWeapons,
  setupWeaponListeners,
  type WeaponContext,
  type WeaponId,
} from "../weapons/WeaponRegistry";
import { SceneKeys } from "./SceneKeys";

const TEAM_COLORS = [0xff6b35, 0x35aaff, 0x35ff6b, 0xff35aa] as const;
const TEAM_NAMES = ["Team A", "Team B", "Team C", "Team D"] as const;

const STAR_PALETTE = [0xffffff, 0xaaccff, 0xffffcc, 0xffccaa] as const;

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
 *   Q                   — cycle weapons through the registered list
 */
export class GameScene extends Phaser.Scene {
  #terrain!: TerrainManager;
  #turnManager!: TurnManager;
  #aimingSystem!: AimingSystem;
  #audioManager!: AudioManager;
  #teleporter!: Teleporter;
  #allCharacters: Character[] = [];
  #teams: Array<{ name: string; worms: Character[] }> = [];
  #activeWeapon: WeaponId = "bazooka";
  #gravityMultiplier = 1;
  #cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  #cameraController!: CameraController;
  #config = {
    teams: 2,
    wormsPerTeam: 1,
    rounds: 1,
    currentRound: 1,
    roundWins: [0, 0] as number[],
  };
  #planetStyle: PlanetStyle = DEFAULT_PLANET_STYLE;
  #starGfx!: Phaser.GameObjects.Graphics;
  #twinkleStars: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: SceneKeys.Game });
  }

  // ──────────────────────────────── init ────────────────────────────────────────

  init(data: {
    teams?: number;
    wormsPerTeam?: number;
    planetStyle?: PlanetStyle;
    rounds?: number;
    currentRound?: number;
    roundWins?: number[];
  }): void {
    const teams = data?.teams ?? 2;
    this.#config = {
      teams,
      wormsPerTeam: data?.wormsPerTeam ?? 1,
      rounds: data?.rounds ?? 1,
      currentRound: data?.currentRound ?? 1,
      roundWins: data?.roundWins ?? Array.from({ length: teams }, () => 0),
    };
    this.#planetStyle = data?.planetStyle ?? DEFAULT_PLANET_STYLE;
    // Reset mutable state so the scene can be restarted cleanly
    this.#allCharacters = [];
    this.#teams = [];
    this.#activeWeapon = "bazooka";
    resetAllWeapons();
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

  get activeWeapon(): WeaponId {
    return this.#activeWeapon;
  }

  get audioManager(): AudioManager {
    return this.#audioManager;
  }

  get currentRound(): number {
    return this.#config.currentRound;
  }

  get totalRounds(): number {
    return this.#config.rounds;
  }

  get roundWins(): number[] {
    return this.#config.roundWins;
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
    this.#audioManager.startMusic(this.#planetStyle);

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
    this.#turnManager = new TurnManager(
      this.#teams.map((team) => team.worms),
      this,
    );
    this.#aimingSystem = new AimingSystem(this);
    this.#teleporter = new Teleporter(this, this.#terrain);

    this.events.on(GameEvents.TURN_START, (worm: Character) => {
      console.log(
        `[TurnManager] Turn started — active worm: ${worm.name} (team ${this.#turnManager.getActiveTeamIndex()})`,
      );
      worm.clearShield();
      this.#audioManager.playTeleport();
      this.#cameraController.follow(worm);
      this.#activateCurrentWeapon(worm);
      this.#turnManager.startTimer(this);
    });

    // AimingSystem fire event → dispatch to the active weapon
    this.events.on(
      GameEvents.FIRE,
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
        const ctx = this.#buildCtx(worm, angle, power, 0);
        getWeapon(this.#activeWeapon)?.fire(ctx);
      },
    );

    // When a teleport completes: advance the turn
    this.events.on(GameEvents.TELEPORT_COMPLETE, () => {
      this.#turnManager.nextTurn();
      this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
    });

    // Install persistent scene-event listeners declared by weapon definitions (e.g. mines)
    setupWeaponListeners(this, () =>
      this.#buildCtx(this.#turnManager.getCurrentWorm(), 0, 0, 0),
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
      const weapons = getWeapons();
      const ids = weapons.map((w) => w.id);
      const idx = ids.indexOf(this.#activeWeapon);
      this.#activeWeapon = ids[(idx + 1) % ids.length] ?? "bazooka";
      this.events.emit(GameEvents.WEAPON_CHANGED, this.#activeWeapon);
      this.#activateCurrentWeapon(this.#turnManager.getCurrentWorm());
    });

    this.input.keyboard?.addKey("M").on("down", () => {
      const muted = this.#audioManager.toggleMusicMute();
      this.events.emit(GameEvents.MUSIC_TOGGLED, muted);
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

    // Pointer-mode weapons (e.g. Teleporter) fire on mouse click
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((getWeapon(this.#activeWeapon)?.inputMode ?? "aim") === "pointer") {
        this.#teleporter.handleClick(pointer.worldX, pointer.worldY);
      }
    });

    // Space-mode weapons (e.g. Shield) fire on bare Space key press
    this.input.keyboard?.on("keydown-SPACE", () => {
      if ((getWeapon(this.#activeWeapon)?.inputMode ?? "aim") === "space") {
        const worm = this.#turnManager.getCurrentWorm();
        const ctx = this.#buildCtx(worm, 0, 0, 0);
        getWeapon(this.#activeWeapon)?.fire(ctx);
      }
    });

    // Worm death events
    this.events.on(GameEvents.SHIELD_BLOCKED, () => {
      this.#audioManager.playShieldBlock();
    });

    this.events.on(GameEvents.WORM_DIED, (_worm: Character) => {
      this.#audioManager.playDeath();
      for (const team of this.#teams) {
        if (team.worms.every((c) => !c.isAlive())) {
          const winnerTeam = this.#teams.find(
            (t) => t !== team && t.worms.some((c) => c.isAlive()),
          );
          resetAllWeapons();
          this.#turnManager.stop();

          const winnerIndex = winnerTeam ? this.#teams.indexOf(winnerTeam) : -1;
          const scores = this.#teams.map((t, i) => ({
            name: t.name,
            color: TEAM_COLORS[i] ?? 0xffffff,
            hp: t.worms.reduce((sum, w) => sum + (w.isAlive() ? w.hp : 0), 0),
          }));

          // Update round wins
          const newRoundWins = [...this.#config.roundWins];
          if (winnerIndex >= 0) {
            newRoundWins[winnerIndex] = (newRoundWins[winnerIndex] ?? 0) + 1;
          }

          const winsNeeded = Math.ceil(this.#config.rounds / 2);
          const overallWinnerIndex = newRoundWins.findIndex(
            (w) => w >= winsNeeded,
          );

          this.scene.stop(SceneKeys.UI);

          if (overallWinnerIndex >= 0) {
            // Series over — go to GameOver
            this.scene.start(SceneKeys.GameOver, {
              winner: this.#teams[overallWinnerIndex]?.name ?? "Nobody",
              winnerColor: TEAM_COLORS[overallWinnerIndex] ?? 0xffffff,
              scores,
              config: {
                teams: this.#config.teams,
                wormsPerTeam: this.#config.wormsPerTeam,
                planetStyle: this.#planetStyle,
                rounds: this.#config.rounds,
                currentRound: this.#config.currentRound,
                roundWins: newRoundWins,
              },
            });
          } else {
            // More rounds to play — go to RoundSummaryScene
            this.scene.start(SceneKeys.RoundSummary, {
              currentRound: this.#config.currentRound,
              totalRounds: this.#config.rounds,
              roundWins: newRoundWins,
              scores,
              teamNames: this.#teams.map((t) => t.name),
              teamColors: TEAM_COLORS.slice(0, this.#config.teams),
              nextConfig: {
                teams: this.#config.teams,
                wormsPerTeam: this.#config.wormsPerTeam,
                planetStyle: this.#planetStyle,
                rounds: this.#config.rounds,
                currentRound: this.#config.currentRound + 1,
                roundWins: newRoundWins,
              },
            });
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
    this.scene.stop(SceneKeys.UI);
    this.scene.launch(SceneKeys.UI);
  }

  override update(time: number, delta: number): void {
    // Subtle parallax on star background
    this.#starGfx.setPosition(
      this.cameras.main.scrollX * 0.03,
      this.cameras.main.scrollY * 0.03,
    );

    // Radial gravity for all dynamic bodies (multiplier modified by GravityBoost)
    const bodies = this.matter.world.getAllBodies();
    applyRadialGravity(
      bodies,
      PLANET_CENTER,
      GRAVITY_STRENGTH,
      this.#gravityMultiplier,
    );

    // Character movement — only the active worm responds (← → rotate aim, ↑ jump)
    const active = this.#turnManager.getCurrentWorm();

    if (active?.isAlive() && this.#cursors) {
      if (Phaser.Input.Keyboard.JustDown(this.#cursors.up)) {
        active.jump();
        this.#audioManager.playJump();
      }
    }

    // Per-frame update for all weapons (handles in-flight entities, mines, jetpack, etc.)
    const ctx = this.#buildCtx(active, 0, 0, delta);
    for (const weapon of getWeapons()) {
      weapon.update?.(ctx);
    }

    // Aiming system handles ← → for rotation and Space for charge/fire
    this.#aimingSystem.update();

    // Update teleporter cursor when active (pointer-mode weapon)
    if ((getWeapon(this.#activeWeapon)?.inputMode ?? "aim") === "pointer") {
      this.#teleporter.update(this.input.activePointer);
    }

    // Sync visuals for all characters across all teams
    for (const worm of this.#allCharacters) worm.update(time);
  }

  override shutdown(): void {
    for (const s of this.#twinkleStars) s.destroy();
    this.#twinkleStars = [];
    this.#audioManager?.stopMusic();
    this.events.removeAllListeners();
    this.input.keyboard?.removeAllListeners();
    this.#terrain?.destroy();
    resetAllWeapons();
    GravityBoost.resetModeIndex();
    super.shutdown();
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  /** Build a WeaponContext snapshot for the given frame/interaction. */
  #buildCtx(
    worm: Character,
    angle: number,
    power: number,
    delta: number,
  ): WeaponContext {
    return {
      scene: this,
      worm,
      angle,
      power,
      delta,
      terrain: this.#terrain,
      allWorms: this.#allCharacters,
      audioManager: this.#audioManager,
      gravityMultiplier: this.#gravityMultiplier,
      cameraController: this.#cameraController,
      nextTurn: () => {
        this.#turnManager.nextTurn();
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
      },
      returnCamera: () => {
        this.#cameraController.returnToWorm(this.#turnManager.getCurrentWorm());
      },
      setGravityMultiplier: (m: number) => {
        this.#gravityMultiplier = m;
      },
      stopTimer: () => {
        this.#turnManager.stopTimer();
      },
      deactivateAiming: () => {
        this.#aimingSystem.deactivate();
      },
    };
  }

  /** Activate input and visuals for the current weapon on `worm`. */
  #activateCurrentWeapon(worm: Character): void {
    const inputMode = getWeapon(this.#activeWeapon)?.inputMode ?? "aim";
    if (inputMode === "pointer") {
      this.#aimingSystem.deactivate();
      this.#teleporter.activate(worm);
    } else {
      this.#teleporter.deactivate();
      if (inputMode === "aim") {
        this.#aimingSystem.activate(worm, this.#activeWeapon);
      } else {
        this.#aimingSystem.deactivate();
      }
    }
  }

  #addStars(): void {
    // Faint nebula ellipses behind everything
    const nebulaGfx = this.add.graphics();
    const nebulae = [
      { x: 100, y: 150, rw: 500, rh: 200 },
      { x: 700, y: 260, rw: 620, rh: 240 },
      { x: 350, y: 680, rw: 480, rh: 200 },
    ];
    for (const n of nebulae) {
      nebulaGfx.fillStyle(0x224488, 0.04);
      nebulaGfx.fillEllipse(n.x, n.y, n.rw, n.rh);
    }
    nebulaGfx.setDepth(-1);

    // 250-star field: 3 size tiers, color variation, varying opacity
    const starGfx = this.add.graphics();
    this.#starGfx = starGfx;
    starGfx.setDepth(-1);

    for (let i = 0; i < 250; i++) {
      const sx = (((i * 137 + 53) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sy = (((i * 97 + 179) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sr = i < 150 ? 0.7 : i < 220 ? 1.3 : 2.0;
      const color =
        i % 20 < 14
          ? STAR_PALETTE[0]
          : i % 20 < 17
            ? STAR_PALETTE[1]
            : i % 20 < 19
              ? STAR_PALETTE[2]
              : STAR_PALETTE[3];
      const alpha = 0.6 + (i % 5) * 0.1;
      starGfx.fillStyle(color, alpha);
      starGfx.fillCircle(sx, sy, sr);
    }

    // 25 twinkling stars — separate Graphics objects so alpha can be tweened
    this.#twinkleStars = [];
    for (let i = 0; i < 25; i++) {
      const s = this.add.graphics();
      const x = Math.random() * CANVAS_SIZE;
      const y = Math.random() * CANVAS_SIZE;
      const color =
        i % 20 < 14
          ? STAR_PALETTE[0]
          : i % 20 < 17
            ? STAR_PALETTE[1]
            : i % 20 < 19
              ? STAR_PALETTE[2]
              : STAR_PALETTE[3];
      s.fillStyle(color, 1);
      s.fillCircle(x, y, 1.5);
      s.setDepth(-1);
      this.#twinkleStars.push(s);
      this.tweens.add({
        targets: s,
        alpha: { from: 0.3, to: 1.0 },
        duration: 1500 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 3000,
      });
    }
  }
}

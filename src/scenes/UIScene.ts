import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import type { Character } from "../entities/Character";
import type { GameScene } from "./GameScene";

// ── Layout constants ──────────────────────────────────────────────────────────
const HP_BAR_W = 68;
const HP_BAR_H = 8;
const ROW_H = 20;
const PANEL_PAD = 8;
const PANEL_W = 160;

type WormRow = {
  fill: Phaser.GameObjects.Graphics;
  barX: number;
  barY: number;
  worm: Character;
};

/**
 * Transparent overlay scene that renders the HUD on top of GameScene.
 *
 * Elements:
 *   - Turn timer   — large counter, top center, colour-coded by urgency
 *   - Turn indicator — active worm + team name, top left
 *   - Active weapon  — icon + name, bottom right
 *   - Team HP panel  — list of worms with HP bars, top right
 *
 * Communicates with GameScene exclusively via `gameScene.events`.
 */
export class UIScene extends Phaser.Scene {
  #timerText!: Phaser.GameObjects.Text;
  #turnText!: Phaser.GameObjects.Text;
  #weaponText!: Phaser.GameObjects.Text;
  #panelBg!: Phaser.GameObjects.Graphics;
  #wormRows = new Map<string, WormRow>();

  constructor() {
    super({ key: "UIScene" });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  create(): void {
    const game = this.scene.get("GameScene") as GameScene;

    // ── Timer (top center) ────────────────────────────────────────────────────
    this.#timerText = this.add
      .text(CANVAS_SIZE / 2, 12, "30", {
        fontSize: "44px",
        fontStyle: "bold",
        color: "#00dd00",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    // ── Turn indicator (top left) ─────────────────────────────────────────────
    this.#turnText = this.add
      .text(10, 10, "", {
        fontSize: "14px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 5 },
      })
      .setDepth(20);

    // ── Active weapon (bottom right) ──────────────────────────────────────────
    this.#weaponText = this.add
      .text(CANVAS_SIZE - 10, CANVAS_SIZE - 10, "", {
        fontSize: "15px",
        color: "#ffff88",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(1, 1)
      .setDepth(20);
    this.#applyWeaponChange(game.activeWeapon);

    // ── HP panel (top right) ──────────────────────────────────────────────────
    this.#panelBg = this.add.graphics().setDepth(19);
    this.#buildHpPanel(game.teams);

    // Seed the UI with the current game state
    this.#applyTurnUpdate(game.activeWorm, game.activeTeamName);
    this.#applyTimerTick(game.remainingTime);

    // ── Subscribe to GameScene events ────────────────────────────────────────
    const ge = game.events;
    ge.on(
      "turn-start",
      (worm: Character, teamName: string) => {
        this.#applyTurnUpdate(worm, teamName);
        this.#applyTimerTick(30);
      },
      this,
    );
    ge.on(
      "timer-tick",
      (remaining: number) => this.#applyTimerTick(remaining),
      this,
    );
    ge.on("hp-changed", (worm: Character) => this.#refreshHpFill(worm), this);
    ge.on("worm-died", (worm: Character) => this.#refreshHpFill(worm), this);
    ge.on(
      "weapon-changed",
      (weapon: "bazooka" | "grenade") => this.#applyWeaponChange(weapon),
      this,
    );
  }

  override shutdown(): void {
    // Remove listeners keyed by this scene context so they don't leak
    const game = this.scene.get("GameScene") as GameScene | null;
    if (game) {
      game.events.off("turn-start", undefined, this);
      game.events.off("timer-tick", undefined, this);
      game.events.off("hp-changed", undefined, this);
      game.events.off("worm-died", undefined, this);
      game.events.off("weapon-changed", undefined, this);
    }
    this.#wormRows.clear();
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  /** Build the team HP panel on the top right and store per-worm fill handles. */
  #buildHpPanel(teams: Array<{ name: string; worms: Character[] }>): void {
    let totalItems = 0;
    for (const t of teams) totalItems += 1 + t.worms.length; // header + worm rows
    const panelH =
      PANEL_PAD * 2 + totalItems * ROW_H + Math.max(0, teams.length - 1) * 6;
    const panelX = CANVAS_SIZE - 10 - PANEL_W;
    const panelY = 10;

    // Background
    this.#panelBg.fillStyle(0x000000, 0.6);
    this.#panelBg.fillRoundedRect(panelX, panelY, PANEL_W, panelH, 5);

    const textX = panelX + PANEL_PAD;
    const barX = panelX + PANEL_W - HP_BAR_W - PANEL_PAD;
    let y = panelY + PANEL_PAD;

    for (let ti = 0; ti < teams.length; ti++) {
      // biome-ignore lint/style/noNonNullAssertion: loop index is within bounds
      const team = teams[ti]!;

      // Team header
      this.add
        .text(textX, y, team.name.toUpperCase(), {
          fontSize: "11px",
          fontStyle: "bold",
          color: "#aaaaff",
        })
        .setDepth(20);
      y += ROW_H;

      for (const worm of team.worms) {
        // Worm name label
        this.add
          .text(textX, y + 1, worm.name, {
            fontSize: "11px",
            color: "#dddddd",
          })
          .setDepth(20);

        // Bar trough (drawn once into the shared background)
        this.#panelBg.fillStyle(0x333333);
        this.#panelBg.fillRect(barX, y + 4, HP_BAR_W, HP_BAR_H);

        // Per-worm fill bar (updated on HP change)
        const fill = this.add.graphics().setDepth(21);
        this.#drawHpFill(fill, worm, barX, y + 4);
        this.#wormRows.set(worm.name, { fill, barX, barY: y + 4, worm });

        y += ROW_H;
      }

      if (ti < teams.length - 1) y += 6;
    }
  }

  /** Draw the coloured portion of a worm's HP bar. */
  #drawHpFill(
    gfx: Phaser.GameObjects.Graphics,
    worm: Character,
    x: number,
    y: number,
  ): void {
    gfx.clear();
    if (!worm.isAlive() || worm.hp <= 0) return;
    const ratio = worm.hp / worm.maxHp;
    const w = Math.max(1, Math.round(HP_BAR_W * ratio));
    // Colour shifts green → yellow → red as HP drops
    const r = Math.round(255 * (1 - ratio));
    const g = Math.round(200 * ratio);
    const color = (r << 16) | (g << 8) | 0;
    gfx.fillStyle(color);
    gfx.fillRect(x, y, w, HP_BAR_H);
  }

  /** Refresh the fill bar for the given worm (after HP change or death). */
  #refreshHpFill(worm: Character): void {
    const row = this.#wormRows.get(worm.name);
    if (!row) return;
    this.#drawHpFill(row.fill, worm, row.barX, row.barY);
  }

  /** Update the turn-indicator label. */
  #applyTurnUpdate(worm: Character, teamName: string): void {
    this.#turnText.setText(`${teamName}  •  ${worm.name}`);
  }

  /**
   * Update the timer display.
   * Colour: green (>15 s) → orange (6–15 s) → red (≤5 s)
   */
  #applyTimerTick(remaining: number): void {
    this.#timerText.setText(String(Math.max(0, remaining)));
    if (remaining > 15) {
      this.#timerText.setColor("#00dd00");
    } else if (remaining > 5) {
      this.#timerText.setColor("#ff8800");
    } else {
      this.#timerText.setColor("#ff2222");
    }
  }

  /** Update the active weapon display. */
  #applyWeaponChange(weapon: "bazooka" | "grenade"): void {
    const label = weapon === "grenade" ? "💣  Grenade" : "🚀  Bazooka";
    this.#weaponText.setText(label);
  }
}

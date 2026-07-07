import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import type { Character } from "../entities/Character";
import type { AudioManager } from "../systems/AudioManager";
import { GameEvents } from "../systems/GameEvents";
import { getWeapon, type WeaponId } from "../weapons/WeaponRegistry";
import type { GameScene } from "./GameScene";
import { SceneKeys } from "./SceneKeys";

// ── Layout constants ──────────────────────────────────────────────────────────
const HP_BAR_W = 68;
const HP_BAR_H = 11;
const ROW_H = 20;
const PANEL_PAD = 8;
const PANEL_W = 160;

// Approximate vertical center of the 44 px timer text (origin top-center at y=12)
const TIMER_ARC_Y = 38;
const TIMER_ARC_R = 32;
const TIMER_MAX = 30;

type WormRow = {
  fill: Phaser.GameObjects.Graphics;
  barX: number;
  barY: number;
  worm: Character;
  teamColor: number;
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
  #timerArc!: Phaser.GameObjects.Graphics;
  #timerPulsing = false;
  #turnText!: Phaser.GameObjects.Text;
  #weaponText!: Phaser.GameObjects.Text;
  #weaponPill!: Phaser.GameObjects.Graphics;
  #muteBtn!: Phaser.GameObjects.Text;
  #gravityText!: Phaser.GameObjects.Text;
  #musicToast!: Phaser.GameObjects.Text;
  #musicToastTimer: ReturnType<typeof setTimeout> | null = null;
  #roundText!: Phaser.GameObjects.Text;
  #panelBg!: Phaser.GameObjects.Graphics;
  #wormRows = new Map<string, WormRow>();
  #audioManager: AudioManager | null = null;

  constructor() {
    super({ key: SceneKeys.UI });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  create(): void {
    const game = this.scene.get(SceneKeys.Game) as GameScene;
    this.#audioManager = game.audioManager;

    // ── Timer arc (behind timer text) ─────────────────────────────────────────
    this.#timerArc = this.add.graphics().setDepth(19);

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

    // ── Weapon pill (behind weapon text) ──────────────────────────────────────
    this.#weaponPill = this.add.graphics().setDepth(19);

    // ── Active weapon (bottom right) ──────────────────────────────────────────
    this.#weaponText = this.add
      .text(CANVAS_SIZE - 10, CANVAS_SIZE - 10, "", {
        fontSize: "15px",
        color: "#ffff88",
        padding: { x: 10, y: 4 },
      })
      .setOrigin(1, 1)
      .setDepth(20);
    this.#applyWeaponChange(game.activeWeapon);

    // ── Mute button (bottom left) ─────────────────────────────────────────────
    this.#muteBtn = this.add
      .text(10, CANVAS_SIZE - 10, "🔊", {
        fontSize: "22px",
        backgroundColor: "#00000099",
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0, 1)
      .setDepth(20)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const muted = this.#audioManager?.toggleMute() ?? false;
        this.#muteBtn.setText(muted ? "🔇" : "🔊");
      });

    // ── Gravity boost status (bottom center) ─────────────────────────────────
    this.#gravityText = this.add
      .text(CANVAS_SIZE / 2, CANVAS_SIZE - 10, "", {
        fontSize: "15px",
        color: "#aaffff",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
      .setVisible(false);

    // ── Music toggle toast (center screen, fades out) ──────────────────────
    this.#musicToast = this.add
      .text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 40, "", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#00000099",
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5, 0.5)
      .setDepth(30)
      .setVisible(false);
    // ── Round indicator (top center, below timer) ─────────────────────────────
    this.#roundText = this.add
      .text(CANVAS_SIZE / 2, 62, "", {
        fontSize: "14px",
        color: "#ccccff",
        backgroundColor: "#00000099",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 0)
      .setDepth(20);
    this.#applyRoundIndicator(game);

    // ── HP panel (top right) ──────────────────────────────────────────────────
    this.#panelBg = this.add.graphics().setDepth(19);
    this.#buildHpPanel(game);

    // Seed the UI with the current game state
    this.#applyTurnUpdate(game.activeWorm, game.activeTeamName);
    this.#applyTimerTick(game.remainingTime);

    // ── Subscribe to GameScene events ────────────────────────────────────────
    const ge = game.events;
    ge.on(
      GameEvents.TURN_START,
      (worm: Character) => {
        this.#applyTurnUpdate(worm, game.activeTeamName);
        this.#applyTimerTick(30);
        const teamColor = game.teamColors[game.activeTeamIndex] ?? 0xffffff;
        this.#flashVignette(teamColor);
      },
      this,
    );
    ge.on(
      GameEvents.TIMER_TICK,
      (remaining: number) => this.#applyTimerTick(remaining),
      this,
    );
    ge.on(
      GameEvents.HP_CHANGED,
      (worm: Character) => this.#refreshHpFill(worm),
      this,
    );
    ge.on(
      GameEvents.WORM_DIED,
      (worm: Character) => this.#refreshHpFill(worm),
      this,
    );
    ge.on(
      GameEvents.WEAPON_CHANGED,
      (weapon: WeaponId) => this.#applyWeaponChange(weapon),
      this,
    );
    ge.on(
      GameEvents.GRAVITY_CHANGED,
      ({ mode, remaining }: { mode: string | null; remaining: number }) =>
        this.#applyGravityChanged(mode, remaining),
      this,
    );
    ge.on(
      GameEvents.JETPACK_TICK,
      (remaining: number) => this.#applyJetpackTick(remaining),
      this,
    );
    ge.on(GameEvents.JETPACK_END, () => this.#applyJetpackEnd(), this);
    ge.on(
      GameEvents.MUSIC_TOGGLED,
      (muted: boolean) => this.#showMusicToast(muted),
      this,
    );
  }

  override shutdown(): void {
    if (this.#musicToastTimer !== null) {
      clearTimeout(this.#musicToastTimer);
      this.#musicToastTimer = null;
    }
    if (this.#timerPulsing) {
      this.tweens.killTweensOf(this.#timerText);
      this.#timerPulsing = false;
    }
    // Remove listeners keyed by this scene context so they don't leak
    const game = this.scene.get(SceneKeys.Game) as GameScene | null;
    if (game) {
      game.events.off(GameEvents.TURN_START, undefined, this);
      game.events.off(GameEvents.TIMER_TICK, undefined, this);
      game.events.off(GameEvents.HP_CHANGED, undefined, this);
      game.events.off(GameEvents.WORM_DIED, undefined, this);
      game.events.off(GameEvents.WEAPON_CHANGED, undefined, this);
      game.events.off(GameEvents.GRAVITY_CHANGED, undefined, this);
      game.events.off(GameEvents.JETPACK_TICK, undefined, this);
      game.events.off(GameEvents.JETPACK_END, undefined, this);
      game.events.off(GameEvents.MUSIC_TOGGLED, undefined, this);
    }
    this.#wormRows.clear();
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  /** Build the team HP panel on the top right and store per-worm fill handles. */
  #buildHpPanel(game: GameScene): void {
    const teams = game.teams;
    const teamColors = game.teamColors;
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
      const teamColor = teamColors[ti] ?? 0xaaaaff;

      // Colored dot before team name
      const dotGfx = this.add.graphics().setDepth(20);
      dotGfx.fillStyle(teamColor, 1);
      dotGfx.fillCircle(textX + 5, y + 6, 5);

      // Team header (offset right to leave room for dot)
      this.add
        .text(textX + 14, y, team.name.toUpperCase(), {
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
        this.#drawHpFill(fill, worm, barX, y + 4, teamColor);
        this.#wormRows.set(worm.name, {
          fill,
          barX,
          barY: y + 4,
          worm,
          teamColor,
        });

        y += ROW_H;
      }

      if (ti < teams.length - 1) y += 6;
    }
  }

  /** Draw the coloured portion of a worm's HP bar with a team-colored border. */
  #drawHpFill(
    gfx: Phaser.GameObjects.Graphics,
    worm: Character,
    x: number,
    y: number,
    teamColor: number,
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
    // Team-colored 1px border over the full trough width
    gfx.lineStyle(1, teamColor, 1);
    gfx.strokeRect(x, y, HP_BAR_W, HP_BAR_H);
  }

  /** Refresh the fill bar for the given worm (after HP change or death). */
  #refreshHpFill(worm: Character): void {
    const row = this.#wormRows.get(worm.name);
    if (!row) return;
    this.#drawHpFill(row.fill, worm, row.barX, row.barY, row.teamColor);
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
    let color: number;
    if (remaining > 15) {
      this.#timerText.setColor("#00dd00");
      color = 0x00dd00;
    } else if (remaining > 5) {
      this.#timerText.setColor("#ff8800");
      color = 0xff8800;
    } else {
      this.#timerText.setColor("#ff2222");
      color = 0xff2222;
    }

    // Circular progress arc behind timer
    this.#timerArc.clear();
    const ratio = Math.max(0, remaining) / TIMER_MAX;
    if (ratio > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + 2 * Math.PI * ratio;
      this.#timerArc.lineStyle(3, color, 0.4);
      this.#timerArc.beginPath();
      this.#timerArc.arc(
        CANVAS_SIZE / 2,
        TIMER_ARC_Y,
        TIMER_ARC_R,
        startAngle,
        endAngle,
        false,
      );
      this.#timerArc.strokePath();
    }

    // Pulse animation when time is critical
    if (remaining <= 5 && !this.#timerPulsing) {
      this.#timerPulsing = true;
      this.tweens.add({
        targets: this.#timerText,
        scaleX: { from: 1, to: 1.15 },
        scaleY: { from: 1, to: 1.15 },
        duration: 300,
        yoyo: true,
        repeat: -1,
      });
    }
    if (remaining > 5 && this.#timerPulsing) {
      this.#timerPulsing = false;
      this.tweens.killTweensOf(this.#timerText);
      this.#timerText.setScale(1);
    }
  }

  /** Update the active weapon display and redraw the pill background. */
  #applyWeaponChange(weapon: WeaponId): void {
    this.#weaponText.setText(getWeapon(weapon)?.label ?? weapon);

    // Pill background — drawn after setting text so we know its dimensions
    const tw = this.#weaponText.width;
    const th = 28;
    const px = CANVAS_SIZE - 10 - tw;
    const py = CANVAS_SIZE - 10 - th;
    this.#weaponPill.clear();
    this.#weaponPill.fillStyle(0x1a1a2e, 0.8);
    this.#weaponPill.fillRoundedRect(px, py, tw, th, 14);
    this.#weaponPill.lineStyle(1, 0xffff88, 1);
    this.#weaponPill.strokeRoundedRect(px, py, tw, th, 14);
  }

  /** Show or hide the gravity boost status indicator. */
  #applyGravityChanged(mode: string | null, remaining: number): void {
    if (!mode || remaining <= 0) {
      this.#gravityText.setVisible(false);
      return;
    }
    this.#gravityText.setText(`🌀 Gravity: ${mode}  (${remaining}s)`);
    this.#gravityText.setVisible(true);
  }

  /** Show jetpack countdown in the timer area. */
  #applyJetpackTick(remaining: number): void {
    this.#timerText.setText(String(Math.max(0, remaining)));
    this.#timerText.setColor("#ff8800");
    this.#timerArc.clear();
  }

  /** Restore timer display after jetpack ends (next turn-start will repopulate). */
  #applyJetpackEnd(): void {
    this.#timerText.setColor("#00dd00");
  }

  /** Briefly flash a full-screen team-colored vignette on turn start. */
  #flashVignette(teamColor: number): void {
    const vignette = this.add.graphics().setDepth(50);
    vignette.fillStyle(teamColor, 1);
    vignette.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    vignette.setAlpha(0);
    this.tweens.add({
      targets: vignette,
      alpha: { from: 0, to: 0.15 },
      duration: 200,
      yoyo: true,
      onComplete: () => vignette.destroy(),
    });
  }

  /** Briefly show "Music: ON" or "Music: OFF" in the center of the screen. */
  #showMusicToast(muted: boolean): void {
    this.#musicToast.setText(muted ? "🔇 Music: OFF" : "🎵 Music: ON");
    this.#musicToast.setVisible(true).setAlpha(1);
    if (this.#musicToastTimer !== null) clearTimeout(this.#musicToastTimer);
    this.#musicToastTimer = setTimeout(() => {
      this.#musicToast.setVisible(false);
      this.#musicToastTimer = null;
    }, 1800);
  }

  /** Render the round counter and win dots (only visible in multi-round mode). */
  #applyRoundIndicator(game: GameScene): void {
    const total = game.totalRounds;
    if (total <= 1) {
      this.#roundText.setVisible(false);
      return;
    }
    const current = game.currentRound;
    const wins = game.roundWins;
    const winsNeeded = Math.ceil(total / 2);
    const dots = wins
      .map((w) => {
        const filled = "●".repeat(w);
        const empty = "○".repeat(winsNeeded - w);
        return `${filled}${empty}`;
      })
      .join("  ");
    this.#roundText.setText(`Round ${current}/${total}  ${dots}`);
    this.#roundText.setVisible(true);
  }
}

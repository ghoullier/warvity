import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import type { PlanetStyle } from "../config/PlanetStyles";
import { SceneKeys } from "./SceneKeys";

interface ScoreEntry {
  name: string;
  color: number;
  hp: number;
}

interface RoundSummaryData {
  currentRound: number;
  totalRounds: number;
  roundWins: number[];
  scores: ScoreEntry[];
  teamNames: string[];
  teamColors: readonly number[];
  nextConfig: {
    teams: number;
    wormsPerTeam: number;
    planetStyle?: PlanetStyle;
    rounds: number;
    currentRound: number;
    roundWins: number[];
  };
}

const CX = CANVAS_SIZE / 2;
const CY = CANVAS_SIZE / 2;
const COUNTDOWN_SECONDS = 3;

/**
 * Shown between rounds when more rounds remain in a best-of-N series.
 * Displays current standings and counts down before auto-starting the next round.
 */
export class RoundSummaryScene extends Phaser.Scene {
  #data: RoundSummaryData = {
    currentRound: 1,
    totalRounds: 1,
    roundWins: [],
    scores: [],
    teamNames: [],
    teamColors: [],
    nextConfig: {
      teams: 2,
      wormsPerTeam: 1,
      rounds: 1,
      currentRound: 2,
      roundWins: [],
    },
  };
  #countdown = COUNTDOWN_SECONDS;
  #countdownText!: Phaser.GameObjects.Text;
  #elapsed = 0;

  constructor() {
    super({ key: SceneKeys.RoundSummary });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  init(data: RoundSummaryData): void {
    this.#data = data;
    this.#countdown = COUNTDOWN_SECONDS;
    this.#elapsed = 0;
  }

  create(): void {
    // Dark background
    this.add
      .rectangle(CX, CY, CANVAS_SIZE, CANVAS_SIZE, 0x060610, 1)
      .setDepth(0);

    this.#addStars();
    this.#drawRoundBanner();
    this.#drawStandings();
    this.#drawCountdown();
    this.#drawNextRoundButton();
  }

  override update(_time: number, delta: number): void {
    this.#elapsed += delta;
    const remaining = Math.max(
      0,
      COUNTDOWN_SECONDS - Math.floor(this.#elapsed / 1000),
    );

    if (remaining !== this.#countdown) {
      this.#countdown = remaining;
      if (remaining > 0) {
        this.#countdownText.setText(`Next round in ${remaining}...`);
      } else {
        this.#startNextRound();
      }
    }
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #drawRoundBanner(): void {
    const { currentRound, totalRounds } = this.#data;

    // Panel
    const panelW = 520;
    const panelH = 100;
    const gfx = this.add.graphics().setDepth(1);
    gfx.fillStyle(0x111130, 0.95);
    gfx.fillRoundedRect(CX - panelW / 2, CY - 230, panelW, panelH, 16);
    gfx.lineStyle(3, 0x5566ff, 0.9);
    gfx.strokeRoundedRect(CX - panelW / 2, CY - 230, panelW, panelH, 16);

    this.add
      .text(CX, CY - 183, `Round ${currentRound} of ${totalRounds} complete!`, {
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#5566ff",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  #drawStandings(): void {
    const { teamNames, teamColors, roundWins, totalRounds } = this.#data;
    const winsNeeded = Math.ceil(totalRounds / 2);
    const rowH = 52;
    const panelW = 440;
    const panelH = teamNames.length * rowH + 30;
    const panelTop = CY - 110;

    const bg = this.add.graphics().setDepth(1);
    bg.fillStyle(0x0d0d22, 0.9);
    bg.fillRoundedRect(CX - panelW / 2, panelTop, panelW, panelH, 14);
    bg.lineStyle(2, 0x333366, 0.8);
    bg.strokeRoundedRect(CX - panelW / 2, panelTop, panelW, panelH, 14);

    for (let i = 0; i < teamNames.length; i++) {
      const name = teamNames[i] ?? `Team ${i + 1}`;
      const color = teamColors[i] ?? 0xffffff;
      const wins = roundWins[i] ?? 0;
      const colorHex = `#${color.toString(16).padStart(6, "0")}`;
      const y = panelTop + 15 + i * rowH + rowH / 2;

      // Team color dot
      const dotGfx = this.add.graphics().setDepth(2);
      dotGfx.fillStyle(color, 1);
      dotGfx.fillCircle(CX - panelW / 2 + 28, y, 10);

      // Team name
      this.add
        .text(CX - panelW / 2 + 54, y, name, {
          fontSize: "22px",
          color: colorHex,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);

      // Win dots
      const dotStartX = CX + 30;
      for (let d = 0; d < winsNeeded; d++) {
        const dotGfx2 = this.add.graphics().setDepth(2);
        const filled = d < wins;
        dotGfx2.fillStyle(filled ? color : 0x333344, filled ? 1 : 0.8);
        dotGfx2.fillCircle(dotStartX + d * 26, y, 9);
        dotGfx2.lineStyle(2, color, 0.7);
        dotGfx2.strokeCircle(dotStartX + d * 26, y, 9);
      }
    }
  }

  #drawCountdown(): void {
    this.#countdownText = this.add
      .text(CX, CY + 100, `Next round in ${COUNTDOWN_SECONDS}...`, {
        fontSize: "28px",
        color: "#aaaacc",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  #drawNextRoundButton(): void {
    const w = 220;
    const h = 52;
    const x = CX;
    const y = CY + 170;
    const accentColor = 0x44ff44;
    const accentHex = "#44ff44";

    const gfx = this.add.graphics().setDepth(3);
    const drawBg = (hovered: boolean) => {
      gfx.clear();
      gfx.fillStyle(hovered ? accentColor : 0x1a3a1a, hovered ? 0.25 : 0.9);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      gfx.lineStyle(2, accentColor, hovered ? 1 : 0.7);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    drawBg(false);

    const btn = this.add
      .text(x, y, "▶  Start Now", {
        fontSize: "22px",
        color: accentHex,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(4)
      .setInteractive({
        useHandCursor: true,
        hitArea: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      });

    btn.on("pointerover", () => {
      drawBg(true);
      btn.setStyle({ color: "#ffffff" });
    });
    btn.on("pointerout", () => {
      drawBg(false);
      btn.setStyle({ color: accentHex });
    });
    btn.on("pointerdown", () => this.#startNextRound());
  }

  #startNextRound(): void {
    this.scene.start(SceneKeys.Game, this.#data.nextConfig);
  }

  #addStars(): void {
    const gfx = this.add.graphics().setDepth(0);
    gfx.fillStyle(0xffffff, 0.7);
    for (let i = 0; i < 100; i++) {
      const sx = (((i * 137 + 53) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sy = (((i * 97 + 179) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      gfx.fillCircle(sx, sy, i % 3 === 0 ? 1.5 : 1);
    }
  }
}

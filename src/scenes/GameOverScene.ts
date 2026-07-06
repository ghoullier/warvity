import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import type { PlanetStyle } from "../config/PlanetStyles";
import { AudioManager } from "../systems/AudioManager";
import { SceneKeys } from "./SceneKeys";

interface ScoreEntry {
  name: string;
  color: number;
  hp: number;
}

interface GameOverData {
  winner: string;
  winnerColor: number;
  scores: ScoreEntry[];
  config?: { teams: number; wormsPerTeam: number; planetStyle?: PlanetStyle };
}

const CX = CANVAS_SIZE / 2;
const CY = CANVAS_SIZE / 2;

/**
 * Full-screen overlay shown when the game ends.
 *
 * Expects init data matching {@link GameOverData}.
 */
export class GameOverScene extends Phaser.Scene {
  #data: GameOverData = { winner: "", winnerColor: 0xffffff, scores: [] };
  #audioManager: AudioManager | null = null;

  constructor() {
    super({ key: SceneKeys.GameOver });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  init(data: GameOverData): void {
    this.#data = data;
  }

  create(): void {
    this.#audioManager = new AudioManager(this);

    // Dark semi-transparent overlay
    this.add
      .rectangle(CX, CY, CANVAS_SIZE, CANVAS_SIZE, 0x000000, 0.78)
      .setDepth(0);

    this.#drawWinnerBanner();
    this.#drawScoreList();
    this.#drawButtons();
    this.#spawnCelebrationParticles();
    this.#audioManager.playVictory();
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #drawWinnerBanner(): void {
    const { winner, winnerColor } = this.#data;
    const colorHex = `#${winnerColor.toString(16).padStart(6, "0")}`;

    // Glow panel behind the banner
    const panelW = 560;
    const panelH = 110;
    const panelGfx = this.add.graphics().setDepth(1);
    panelGfx.fillStyle(0x111122, 0.9);
    panelGfx.fillRoundedRect(CX - panelW / 2, CY - 210, panelW, panelH, 18);
    panelGfx.lineStyle(3, winnerColor, 0.9);
    panelGfx.strokeRoundedRect(CX - panelW / 2, CY - 210, panelW, panelH, 18);

    // Trophy + winner name
    this.add
      .text(CX, CY - 162, `🏆  ${winner} wins!`, {
        fontSize: "46px",
        color: colorHex,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 5,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: colorHex,
          blur: 18,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  #drawScoreList(): void {
    const { scores } = this.#data;
    const rowH = 44;
    const listTop = CY - 80;
    const panelW = 380;
    const panelH = scores.length * rowH + 24;

    // Score panel background
    const bgGfx = this.add.graphics().setDepth(1);
    bgGfx.fillStyle(0x0d0d22, 0.88);
    bgGfx.fillRoundedRect(CX - panelW / 2, listTop - 14, panelW, panelH, 14);
    bgGfx.lineStyle(2, 0x333366, 0.8);
    bgGfx.strokeRoundedRect(CX - panelW / 2, listTop - 14, panelW, panelH, 14);

    for (let i = 0; i < scores.length; i++) {
      const entry = scores[i];
      if (!entry) continue;
      const y = listTop + i * rowH + rowH / 2;
      const colorHex = `#${entry.color.toString(16).padStart(6, "0")}`;

      // Colored dot
      const dotGfx = this.add.graphics().setDepth(2);
      dotGfx.fillStyle(entry.color, 1);
      dotGfx.fillCircle(CX - panelW / 2 + 26, y, 8);

      // Team name
      this.add
        .text(CX - panelW / 2 + 50, y, entry.name, {
          fontSize: "20px",
          color: colorHex,
          fontStyle: "bold",
        })
        .setOrigin(0, 0.5)
        .setDepth(2);

      // HP value
      const hpLabel = entry.hp > 0 ? `${entry.hp} HP` : "eliminated";
      this.add
        .text(CX + panelW / 2 - 14, y, hpLabel, {
          fontSize: "18px",
          color: entry.hp > 0 ? "#88ff88" : "#ff6666",
        })
        .setOrigin(1, 0.5)
        .setDepth(2);
    }
  }

  #drawButtons(): void {
    const btnY = CY + (this.#data.scores.length * 44) / 2 + 60;
    this.#makeRoundedButton(
      CX - 110,
      btnY,
      "▶  Play Again",
      0x1a3a1a,
      0x44ff44,
      () => {
        this.scene.stop(SceneKeys.GameOver);
        this.scene.stop(SceneKeys.UI);
        this.scene.start(SceneKeys.Game, this.#data.config ?? {});
      },
    );

    this.#makeRoundedButton(
      CX + 110,
      btnY,
      "⌂  Main Menu",
      0x1a1a3a,
      0x4488ff,
      () => {
        this.scene.stop(SceneKeys.GameOver);
        this.scene.stop(SceneKeys.UI);
        this.scene.start(SceneKeys.Menu);
      },
    );
  }

  #makeRoundedButton(
    x: number,
    y: number,
    label: string,
    bgColor: number,
    accentColor: number,
    onClick: () => void,
  ): void {
    const w = 190;
    const h = 52;
    const accentHex = `#${accentColor.toString(16).padStart(6, "0")}`;

    const gfx = this.add.graphics().setDepth(3);
    const drawBg = (hovered: boolean) => {
      gfx.clear();
      gfx.fillStyle(hovered ? accentColor : bgColor, hovered ? 0.25 : 0.9);
      gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
      gfx.lineStyle(2, accentColor, hovered ? 1 : 0.7);
      gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    };
    drawBg(false);

    const txt = this.add
      .text(x, y, label, {
        fontSize: "20px",
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

    txt.on("pointerover", () => {
      drawBg(true);
      txt.setStyle({ color: "#ffffff" });
    });
    txt.on("pointerout", () => {
      drawBg(false);
      txt.setStyle({ color: accentHex });
    });
    txt.on("pointerdown", onClick);
  }

  #spawnCelebrationParticles(): void {
    const { winnerColor } = this.#data;
    const count = 40;

    interface Confetti {
      gfx: Phaser.GameObjects.Graphics;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      dead: boolean;
    }

    const particles: Confetti[] = [];
    const colors = [winnerColor, 0xffffff, 0xffff00, 0xff88ff];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const color =
        colors[Math.floor(Math.random() * colors.length)] ?? winnerColor;
      const size = 3 + Math.random() * 4;
      const maxLife = 1200 + Math.random() * 1200;

      const gfx = this.add.graphics().setDepth(5);
      gfx.fillStyle(color, 1);
      gfx.fillRect(-size / 2, -size / 2, size, size);
      gfx.setPosition(
        CX + (Math.random() - 0.5) * 200,
        CY - 160 + (Math.random() - 0.5) * 60,
      );

      particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: maxLife,
        maxLife,
        dead: false,
      });
    }

    const handler = (_time: number, delta: number) => {
      let anyAlive = false;
      for (const p of particles) {
        if (p.dead) continue;
        p.life -= delta;
        if (p.life <= 0) {
          p.dead = true;
          p.gfx.destroy();
          continue;
        }
        anyAlive = true;
        p.vy += 0.12 * (delta / 16.667);
        p.gfx.x += p.vx * (delta / 16.667);
        p.gfx.y += p.vy * (delta / 16.667);
        p.gfx.setAlpha(p.life / p.maxLife);
      }
      if (!anyAlive) this.events.off("update", handler);
    };

    this.events.on("update", handler);
  }
}

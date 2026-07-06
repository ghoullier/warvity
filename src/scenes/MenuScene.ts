import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import {
  DEFAULT_PLANET_STYLE,
  PLANET_STYLES,
  type PlanetStyle,
} from "../config/PlanetStyles";
import { SceneKeys } from "./SceneKeys";

const PLANET_CX = CANVAS_SIZE / 2;
const PLANET_CY = 740;
const PLANET_R = 220;

const PLANET_PATCHES: Array<{ a: number; d: number; s: number }> = [
  { a: 0.3, d: 70, s: 34 },
  { a: 1.2, d: 90, s: 28 },
  { a: 2.1, d: 60, s: 22 },
  { a: 3.0, d: 80, s: 30 },
  { a: 4.3, d: 50, s: 26 },
  { a: 5.4, d: 75, s: 20 },
];

/**
 * Main menu scene shown at startup.
 *
 * Lets the player choose the number of teams (2–4) and worms per team (1–4),
 * then launches GameScene with that configuration.
 */
export class MenuScene extends Phaser.Scene {
  #teams = 2;
  #wormsPerTeam = 1;
  #planetStyle: PlanetStyle = PLANET_STYLES[0] ?? DEFAULT_PLANET_STYLE;
  #teamsText!: Phaser.GameObjects.Text;
  #wormsText!: Phaser.GameObjects.Text;
  #planetBaseGfx!: Phaser.GameObjects.Graphics;
  #planetGfx!: Phaser.GameObjects.Graphics;
  #planetRingGfx!: Phaser.GameObjects.Graphics;
  #planetAngle = 0;
  #overlayActive = false;
  #styleSwatches: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({ key: SceneKeys.Menu });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  create(): void {
    // Background
    this.add.rectangle(
      CANVAS_SIZE / 2,
      CANVAS_SIZE / 2,
      CANVAS_SIZE,
      CANVAS_SIZE,
      0x0a0a1a,
    );
    this.#addStars();

    // Animated planet (partially visible at the bottom):
    // three layers so static base/ring are drawn once and only patches rotate
    this.#planetBaseGfx = this.add.graphics();
    this.#drawPlanetBase();

    this.#planetGfx = this.add.graphics();
    this.#drawPatches();

    this.#planetRingGfx = this.add.graphics();
    this.#drawPlanetRing();

    // Title
    this.add
      .text(CANVAS_SIZE / 2, 110, "WARVITY", {
        fontSize: "86px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#ff6b35",
        strokeThickness: 7,
        shadow: {
          offsetX: 4,
          offsetY: 4,
          color: "#000000",
          blur: 10,
          fill: true,
        },
      })
      .setOrigin(0.5);

    // Tagline
    this.add
      .text(CANVAS_SIZE / 2, 180, "Worms on a tiny planet", {
        fontSize: "18px",
        color: "#888899",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    // Teams selector
    this.add
      .text(CANVAS_SIZE / 2, 258, "TEAMS", {
        fontSize: "20px",
        color: "#aaaacc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.#makeSpinnerButton(CANVAS_SIZE / 2 - 80, 302, "−", () =>
      this.#changeTeams(-1),
    );
    this.#teamsText = this.add
      .text(CANVAS_SIZE / 2, 302, String(this.#teams), {
        fontSize: "38px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.#makeSpinnerButton(CANVAS_SIZE / 2 + 80, 302, "+", () =>
      this.#changeTeams(1),
    );

    // Worms per team selector
    this.add
      .text(CANVAS_SIZE / 2, 370, "WORMS PER TEAM", {
        fontSize: "20px",
        color: "#aaaacc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.#makeSpinnerButton(CANVAS_SIZE / 2 - 80, 414, "−", () =>
      this.#changeWorms(-1),
    );
    this.#wormsText = this.add
      .text(CANVAS_SIZE / 2, 414, String(this.#wormsPerTeam), {
        fontSize: "38px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.#makeSpinnerButton(CANVAS_SIZE / 2 + 80, 414, "+", () =>
      this.#changeWorms(1),
    );

    // Planet style selector
    this.add
      .text(CANVAS_SIZE / 2, 472, "PLANET", {
        fontSize: "20px",
        color: "#aaaacc",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.#buildStyleSwatches(514);

    // PLAY button
    const playBtn = this.add
      .text(CANVAS_SIZE / 2, 590, "▶  PLAY", {
        fontSize: "38px",
        color: "#ffff00",
        fontStyle: "bold",
        backgroundColor: "#333344",
        padding: { x: 36, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    playBtn.on("pointerover", () => {
      playBtn.setStyle({ color: "#ffffff", backgroundColor: "#44445a" });
    });
    playBtn.on("pointerout", () => {
      playBtn.setStyle({ color: "#ffff00", backgroundColor: "#333344" });
    });
    playBtn.on("pointerdown", () => {
      this.scene.start(SceneKeys.Game, {
        teams: this.#teams,
        wormsPerTeam: this.#wormsPerTeam,
        planetStyle: this.#planetStyle,
      });
    });

    // HOW TO PLAY button
    const howBtn = this.add
      .text(CANVAS_SIZE / 2, 670, "HOW TO PLAY", {
        fontSize: "20px",
        color: "#8888bb",
        backgroundColor: "#1a1a33",
        padding: { x: 20, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    howBtn.on("pointerover", () => howBtn.setStyle({ color: "#ffffff" }));
    howBtn.on("pointerout", () => howBtn.setStyle({ color: "#8888bb" }));
    howBtn.on("pointerdown", () => this.#showHowToPlay());
  }

  override update(): void {
    this.#planetAngle += 0.003;
    this.#planetGfx.clear();
    this.#drawPatches();
  }

  // ──────────────────────────────── private helpers ─────────────────────────────

  #drawPlanetBase(): void {
    const gfx = this.#planetBaseGfx;
    gfx.clear();
    const fill = this.#planetStyle.terrainFill;

    gfx.lineStyle(10, 0x4499ff, 0.15);
    gfx.strokeCircle(PLANET_CX, PLANET_CY, PLANET_R + 12);

    gfx.fillStyle(fill, 1);
    gfx.fillCircle(PLANET_CX, PLANET_CY, PLANET_R);
  }

  #drawPatches(): void {
    const gfx = this.#planetGfx;
    const accent = this.#planetStyle.surfaceAccent;

    gfx.fillStyle(accent, 1);
    for (const p of PLANET_PATCHES) {
      const px = PLANET_CX + Math.cos(p.a + this.#planetAngle) * p.d;
      const py = PLANET_CY + Math.sin(p.a + this.#planetAngle) * p.d;
      gfx.fillCircle(px, py, p.s);
    }
  }

  #drawPlanetRing(): void {
    const gfx = this.#planetRingGfx;
    gfx.clear();
    const outline = this.#planetStyle.terrainOutline;

    gfx.lineStyle(3, outline, 0.5);
    gfx.strokeCircle(PLANET_CX, PLANET_CY, PLANET_R + 5);
  }

  #makeSpinnerButton(
    x: number,
    y: number,
    label: string,
    callback: () => void,
  ): void {
    const btn = this.add
      .text(x, y, label, {
        fontSize: "36px",
        color: "#ff6b35",
        fontStyle: "bold",
        backgroundColor: "#1e1e3a",
        padding: { x: 14, y: 4 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ color: "#ffffff" }));
    btn.on("pointerout", () => btn.setStyle({ color: "#ff6b35" }));
    btn.on("pointerdown", callback);
  }

  #changeTeams(delta: number): void {
    this.#teams = Math.max(2, Math.min(4, this.#teams + delta));
    this.#teamsText.setText(String(this.#teams));
  }

  #changeWorms(delta: number): void {
    this.#wormsPerTeam = Math.max(1, Math.min(4, this.#wormsPerTeam + delta));
    this.#wormsText.setText(String(this.#wormsPerTeam));
  }

  #showHowToPlay(): void {
    if (this.#overlayActive) return;
    this.#overlayActive = true;

    const overlay = this.add.container(0, 0).setDepth(200);

    // Dark backdrop
    const bg = this.add
      .rectangle(CANVAS_SIZE / 2, CANVAS_SIZE / 2, 620, 420, 0x000011, 0.92)
      .setInteractive(); // blocks clicks through
    overlay.add(bg);

    // Border
    const border = this.add.graphics();
    border.lineStyle(2, 0x4444aa, 1);
    border.strokeRect(CANVAS_SIZE / 2 - 310, CANVAS_SIZE / 2 - 210, 620, 420);
    overlay.add(border);

    overlay.add(
      this.add
        .text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 170, "HOW TO PLAY", {
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#4444ff",
          strokeThickness: 3,
        })
        .setOrigin(0.5),
    );

    const controls: [string, string][] = [
      ["← →", "Rotate aim direction"],
      ["↑", "Jump"],
      ["Space (hold/release)", "Charge and fire"],
      ["Tab", "End current turn"],
      ["Q", "Switch weapon  (Bazooka / Grenade)"],
    ];

    controls.forEach(([key, desc], i) => {
      const y = CANVAS_SIZE / 2 - 108 + i * 46;
      overlay.add(
        this.add
          .text(CANVAS_SIZE / 2 - 260, y, key, {
            fontSize: "18px",
            color: "#ffff88",
            fontStyle: "bold",
          })
          .setOrigin(0, 0.5),
      );
      overlay.add(
        this.add
          .text(CANVAS_SIZE / 2 - 60, y, `— ${desc}`, {
            fontSize: "18px",
            color: "#ccccee",
          })
          .setOrigin(0, 0.5),
      );
    });

    const closeBtn = this.add
      .text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 168, "CLOSE", {
        fontSize: "24px",
        color: "#ffff00",
        backgroundColor: "#333333",
        padding: { x: 24, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on("pointerover", () => closeBtn.setStyle({ color: "#ffffff" }));
    closeBtn.on("pointerout", () => closeBtn.setStyle({ color: "#ffff00" }));
    closeBtn.on("pointerdown", () => {
      overlay.destroy(true);
      this.#overlayActive = false;
    });
    overlay.add(closeBtn);
  }

  #buildStyleSwatches(y: number): void {
    const swatchSize = 44;
    const gap = 14;
    const total = PLANET_STYLES.length;
    const totalWidth = total * swatchSize + (total - 1) * gap;
    const startX = CANVAS_SIZE / 2 - totalWidth / 2 + swatchSize / 2;

    this.#styleSwatches = [];

    for (let i = 0; i < PLANET_STYLES.length; i++) {
      const style = PLANET_STYLES[i];
      if (!style) continue;
      const sx = startX + i * (swatchSize + gap);

      const swatch = this.add
        .rectangle(sx, y, swatchSize, swatchSize, style.terrainFill)
        .setStrokeStyle(
          this.#planetStyle.id === style.id ? 3 : 1,
          this.#planetStyle.id === style.id ? 0xffffff : style.terrainOutline,
        )
        .setInteractive({ useHandCursor: true });

      this.#styleSwatches.push(swatch);

      // Emoji label
      this.add.text(sx, y, style.emoji, { fontSize: "20px" }).setOrigin(0.5);

      swatch.on("pointerdown", () => {
        this.#planetStyle = style;
        this.#refreshSwatchBorders();
        this.#drawPlanetBase();
        this.#drawPlanetRing();
      });

      swatch.on("pointerover", () => {
        swatch.setStrokeStyle(3, 0xffff00);
      });

      swatch.on("pointerout", () => {
        this.#refreshSwatchBorders();
      });
    }
  }

  #refreshSwatchBorders(): void {
    for (let i = 0; i < PLANET_STYLES.length; i++) {
      const style = PLANET_STYLES[i];
      const swatch = this.#styleSwatches[i];
      if (!style || !swatch) continue;
      const selected = this.#planetStyle.id === style.id;
      swatch.setStrokeStyle(
        selected ? 3 : 1,
        selected ? 0xffffff : style.terrainOutline,
      );
    }
  }

  #addStars(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 0.8);
    for (let i = 0; i < 120; i++) {
      const sx = (((i * 137 + 53) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      const sy = (((i * 97 + 179) % CANVAS_SIZE) + CANVAS_SIZE) % CANVAS_SIZE;
      gfx.fillCircle(sx, sy, i % 3 === 0 ? 1.5 : 1);
    }
  }
}

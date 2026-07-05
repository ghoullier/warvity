import Phaser from "phaser";
import { CANVAS_SIZE } from "../config";
import { SceneKeys } from "./SceneKeys";

/**
 * Overlay scene displayed when the game ends.
 *
 * Expects init data: `{ winner: string }` — the name of the winning team.
 */
export class GameOverScene extends Phaser.Scene {
  #winner = "";

  constructor() {
    super({ key: SceneKeys.GameOver });
  }

  // ──────────────────────────────── lifecycle ───────────────────────────────────

  init(data: { winner: string }): void {
    this.#winner = data.winner;
  }

  create(): void {
    // Semi-transparent dark overlay
    this.add
      .rectangle(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        CANVAS_SIZE,
        CANVAS_SIZE,
        0x000000,
        0.7,
      )
      .setDepth(0);

    // Winner announcement
    this.add
      .text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 60, `${this.#winner} wins!`, {
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(1);

    // Play Again button
    const btn = this.add
      .text(CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 60, "Play Again", {
        fontSize: "32px",
        color: "#ffff00",
        backgroundColor: "#333333",
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ color: "#ffffff" }));
    btn.on("pointerout", () => btn.setStyle({ color: "#ffff00" }));
    btn.on("pointerdown", () => {
      this.scene.stop(SceneKeys.GameOver);
      this.scene.stop(SceneKeys.UI);
      this.scene.start(SceneKeys.Menu);
    });
  }
}

import Phaser from "phaser";
import { CANVAS_SIZE } from "./config";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { MenuScene } from "./scenes/MenuScene";
import { RoundSummaryScene } from "./scenes/RoundSummaryScene";
import { UIScene } from "./scenes/UIScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: CANVAS_SIZE,
  height: CANVAS_SIZE,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MenuScene, GameScene, UIScene, GameOverScene, RoundSummaryScene],
};

new Phaser.Game(config);

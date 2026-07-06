export const SceneKeys = {
  Menu: "MenuScene",
  Game: "GameScene",
  UI: "UIScene",
  GameOver: "GameOver",
  RoundSummary: "RoundSummaryScene",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

/** Two harmonically rising oscillators (teleport / turn start). */
registerSound({
  id: "teleport",
  play(ctx, master) {
    const duration = 0.3;
    for (const [startHz, endHz] of [
      [300, 600],
      [400, 800],
    ] as [number, number][]) {
      playOscillator(
        ctx,
        master,
        "sine",
        duration,
        [
          [0, startHz],
          [duration, endHz],
        ],
        [
          [0, 0.2],
          [duration, 0],
        ],
      );
    }
  },
});

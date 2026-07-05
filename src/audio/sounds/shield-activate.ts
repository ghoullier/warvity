import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

/** Two rising sine harmonics (shield activation hum). */
registerSound({
  id: "shield-activate",
  play(ctx, master) {
    const duration = 0.5;
    for (const [startHz, endHz] of [
      [300, 900],
      [450, 1200],
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
          [0, 0],
          [0.05, 0.25],
          [duration * 0.7, 0.15],
          [duration, 0],
        ],
      );
    }
  },
});

import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

/** Two descending sawtooth oscillators that fade and sputter. */
registerSound({
  id: "jetpack-end",
  play(ctx, master) {
    const duration = 0.4;
    for (const [startHz, endHz] of [
      [600, 80],
      [400, 40],
    ] as [number, number][]) {
      playOscillator(
        ctx,
        master,
        "sawtooth",
        duration,
        [
          [0, startHz],
          [duration, endHz],
        ],
        [
          [0, 0.3],
          [duration * 0.5, 0.15],
          [duration, 0],
        ],
      );
    }
  },
});

import { playFilteredNoise, playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

/** Bandpass whoosh + short triangle pop. */
registerSound({
  id: "cluster-split",
  play(ctx, master) {
    // Whoosh: bandpass noise sweep
    playFilteredNoise(
      ctx,
      master,
      0.18,
      "bandpass",
      1800,
      [
        [0, 0.45],
        [0.18, 0],
      ],
      1.5,
    );

    // Pop: short triangle burst
    playOscillator(
      ctx,
      master,
      "triangle",
      0.06,
      [
        [0, 900],
        [0.06, 400],
      ],
      [
        [0, 0.35],
        [0.06, 0],
      ],
    );
  },
});

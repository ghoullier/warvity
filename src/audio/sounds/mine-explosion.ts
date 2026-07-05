import { playFilteredNoise } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "mine-explosion",
  play(ctx, master) {
    playFilteredNoise(
      ctx,
      master,
      0.25,
      "bandpass",
      1200,
      [
        [0, 0],
        [0.01, 1.0],
        [0.05, 0.5],
        [0.25, 0],
      ],
      0.5,
    );
  },
});

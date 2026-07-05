import { playFilteredNoise } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "jetpack-thrust",
  play(ctx, master) {
    playFilteredNoise(
      ctx,
      master,
      0.12,
      "bandpass",
      800,
      [
        [0, 0.25],
        [0.12, 0],
      ],
      1.5,
    );
  },
});

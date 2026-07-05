import { playFilteredNoise } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "sub-explosion",
  play(ctx, master) {
    playFilteredNoise(ctx, master, 0.18, "lowpass", 900, [
      [0, 0],
      [0.01, 0.4],
      [0.04, 0.25],
      [0.18, 0],
    ]);
  },
});

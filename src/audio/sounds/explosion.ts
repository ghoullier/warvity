import { playFilteredNoise } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "explosion",
  play(ctx, master) {
    playFilteredNoise(ctx, master, 0.3, "lowpass", 600, [
      [0, 0],
      [0.02, 0.9],
      [0.05, 0.6],
      [0.3, 0],
    ]);
  },
});

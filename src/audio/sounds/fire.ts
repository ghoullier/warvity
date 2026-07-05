import { playFilteredNoise } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "fire",
  play(ctx, master) {
    playFilteredNoise(ctx, master, 0.2, "highpass", 2000, [
      [0, 0.5],
      [0.2, 0],
    ]);
  },
});

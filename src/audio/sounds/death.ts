import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "death",
  play(ctx, master) {
    playOscillator(
      ctx,
      master,
      "sawtooth",
      0.5,
      [
        [0, 500],
        [0.5, 20],
      ],
      [
        [0, 0.35],
        [0.5, 0],
      ],
    );
  },
});

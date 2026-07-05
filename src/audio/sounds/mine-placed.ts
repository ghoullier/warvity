import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "mine-placed",
  play(ctx, master) {
    playOscillator(
      ctx,
      master,
      "square",
      0.08,
      [
        [0, 800],
        [0.08, 400],
      ],
      [
        [0, 0.15],
        [0.08, 0],
      ],
    );
  },
});

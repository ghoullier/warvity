import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "shield-block",
  play(ctx, master) {
    playOscillator(
      ctx,
      master,
      "square",
      0.18,
      [
        [0, 1200],
        [0.18, 800],
      ],
      [
        [0, 0.4],
        [0.18, 0],
      ],
    );
  },
});

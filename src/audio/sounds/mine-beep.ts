import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "mine-beep",
  play(ctx, master) {
    playOscillator(
      ctx,
      master,
      "sine",
      0.05,
      [[0, 1200]],
      [
        [0, 0.12],
        [0.05, 0],
      ],
    );
  },
});

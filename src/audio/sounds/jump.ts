import { playOscillator } from "../helpers";
import { registerSound } from "../SoundRegistry";

registerSound({
  id: "jump",
  play(ctx, master) {
    playOscillator(
      ctx,
      master,
      "sine",
      0.15,
      [
        [0, 200],
        [0.15, 500],
      ],
      [
        [0, 0.4],
        [0.15, 0],
      ],
    );
  },
});

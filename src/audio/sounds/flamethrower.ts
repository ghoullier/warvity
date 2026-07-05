import { registerSound } from "../SoundRegistry";

/**
 * Flamethrower crackle — bandpass noise piped through a second lowpass layer.
 * Uses two chained filters so it can't be expressed via playFilteredNoise alone.
 */
registerSound({
  id: "flamethrower",
  play(ctx, master) {
    const duration = 1.5;
    const size = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, size, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < size; i++) ch[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 800;
    bp.Q.value = 0.8;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1800;

    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.7, now + 0.05);
    g.gain.linearRampToValueAtTime(0.5, now + 0.8);
    g.gain.linearRampToValueAtTime(0, now + duration);

    src.connect(bp);
    bp.connect(lp);
    lp.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + duration);
  },
});

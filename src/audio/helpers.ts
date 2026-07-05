/**
 * Web Audio utility helpers shared by individual sound definitions.
 *
 * Each helper is intentionally self-contained: it creates nodes, connects
 * them, starts them, and lets the GC clean up when playback finishes.
 */

type EnvPoint = [offsetSeconds: number, value: number];

/** Apply an ADSR-style gain envelope to an existing GainNode. */
function applyEnvelope(gain: GainNode, now: number, pts: EnvPoint[]): void {
  for (let i = 0; i < pts.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: i is bounded by pts.length
    const pt = pts[i]!;
    if (i === 0) {
      gain.gain.setValueAtTime(pt[1], now + pt[0]);
    } else {
      gain.gain.linearRampToValueAtTime(pt[1], now + pt[0]);
    }
  }
}

/**
 * Create and play a white-noise buffer routed through a single biquad filter.
 * `gainEnv`: [[timeOffsetFromNow, value], …] — first point sets, rest ramp.
 */
export function playFilteredNoise(
  ctx: AudioContext,
  master: GainNode,
  duration: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  gainEnv: EnvPoint[],
  filterQ?: number,
): void {
  const size = Math.ceil(ctx.sampleRate * duration);
  const buf = ctx.createBuffer(1, size, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < size; i++) ch[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buf;

  const flt = ctx.createBiquadFilter();
  flt.type = filterType;
  flt.frequency.value = filterFreq;
  if (filterQ !== undefined) flt.Q.value = filterQ;

  const g = ctx.createGain();
  applyEnvelope(g, ctx.currentTime, gainEnv);

  src.connect(flt);
  flt.connect(g);
  g.connect(master);
  src.start(ctx.currentTime);
  src.stop(ctx.currentTime + duration);
}

type FreqPoint = [offsetSeconds: number, hz: number];

/**
 * Create and play a single oscillator.
 * `freqRamp`: [[offset, hz], …] — first uses setValueAtTime, rest linearRamp.
 * `gainEnv`:  [[offset, value], …] — same convention.
 */
export function playOscillator(
  ctx: AudioContext,
  master: GainNode,
  type: OscillatorType,
  duration: number,
  freqRamp: FreqPoint[],
  gainEnv: EnvPoint[],
): void {
  const osc = ctx.createOscillator();
  osc.type = type;
  const now = ctx.currentTime;

  for (let i = 0; i < freqRamp.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: i is bounded by freqRamp.length
    const pt = freqRamp[i]!;
    if (i === 0) {
      osc.frequency.setValueAtTime(pt[1], now + pt[0]);
    } else {
      osc.frequency.linearRampToValueAtTime(pt[1], now + pt[0]);
    }
  }

  const g = ctx.createGain();
  applyEnvelope(g, now, gainEnv);

  osc.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + duration);
}

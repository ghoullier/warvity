export interface SoundDefinition {
  readonly id: string;
  play(ctx: AudioContext, master: GainNode): void;
}

const SOUNDS: SoundDefinition[] = [];

export function registerSound(def: SoundDefinition): void {
  SOUNDS.push(def);
}

export function getSound(id: string): SoundDefinition | undefined {
  return SOUNDS.find((s) => s.id === id);
}

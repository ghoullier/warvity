export interface PlanetStyle {
  id: string;
  name: string;
  emoji: string;
  terrainFill: number;
  terrainOutline: number;
  background: number;
  surfaceAccent: number;
}

export const PLANET_STYLES: PlanetStyle[] = [
  {
    id: "earth",
    name: "Earth",
    emoji: "🌍",
    terrainFill: 0x8b5e3c,
    terrainOutline: 0x5a3e1b,
    background: 0x1a1a2e,
    surfaceAccent: 0x4a7c59,
  },
  {
    id: "moon",
    name: "Moon",
    emoji: "🌑",
    terrainFill: 0x888888,
    terrainOutline: 0x555555,
    background: 0x0a0a0a,
    surfaceAccent: 0xaaaaaa,
  },
  {
    id: "lava",
    name: "Lava",
    emoji: "🔥",
    terrainFill: 0x3d1a00,
    terrainOutline: 0xff4500,
    background: 0x1a0000,
    surfaceAccent: 0xff6b00,
  },
  {
    id: "ice",
    name: "Ice",
    emoji: "🧊",
    terrainFill: 0xb0d4e8,
    terrainOutline: 0x4a90d9,
    background: 0x0d1b2a,
    surfaceAccent: 0xe0f4ff,
  },
];

export const DEFAULT_PLANET_STYLE: PlanetStyle = PLANET_STYLES[0];

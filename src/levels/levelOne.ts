export interface CrystalSpawn {
  x: number;
  y: number;
}

export interface LevelDefinition {
  id: string;
  playerStart: { x: number; y: number };
  firefly: { x: number; y: number };
  portal: { x: number; y: number };
  crystals: CrystalSpawn[];
}

export const LEVEL_ONE: LevelDefinition = {
  id: 'moon-garden',
  playerStart: { x: 164, y: 560 },
  firefly: { x: 642, y: 328 },
  portal: { x: 1110, y: 156 },
  crystals: [
    { x: 240, y: 178 },
    { x: 438, y: 520 },
    { x: 624, y: 190 },
    { x: 824, y: 470 },
    { x: 1014, y: 286 },
    { x: 1100, y: 594 },
  ],
};

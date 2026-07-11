export interface CrystalSpawn {
  x: number;
  y: number;
}

export interface LevelDefinition {
  id: string;
  name: string;
  description: string;
  mapX: number;
  mapY: number;
  themeColor: number;
  textColor: string;
  storyFile: string;
  playerStart: { x: number; y: number };
  firefly: { x: number; y: number };
  portal: { x: number; y: number };
  crystals: CrystalSpawn[];
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 'home',
    name: 'Cozy Home',
    description: 'Wander around Heena\'s cozy room, collect birthday wishes, and start the magical journey.',
    mapX: 250,
    mapY: 900,
    themeColor: 0xffa07a, // Light Salmon / Orange glow
    textColor: '#ffa07a',
    storyFile: 'stories/level_home.json',
    playerStart: { x: 150, y: 560 },
    firefly: { x: 640, y: 360 },
    portal: { x: 1120, y: 180 },
    crystals: [
      { x: 250, y: 200 },
      { x: 450, y: 500 },
      { x: 640, y: 220 },
      { x: 830, y: 480 },
      { x: 1000, y: 300 },
      { x: 1100, y: 580 },
    ],
  },
  {
    id: 'friends',
    name: 'Friends World',
    description: 'A floating sky realm made of shared laughter, warm wishes, and friendship trees.',
    mapX: 580,
    mapY: 760,
    themeColor: 0xff69b4, // Hot Pink
    textColor: '#ff69b4',
    storyFile: 'stories/level_friends.json',
    playerStart: { x: 160, y: 540 },
    firefly: { x: 600, y: 380 },
    portal: { x: 1100, y: 200 },
    crystals: [
      { x: 300, y: 180 },
      { x: 400, y: 480 },
      { x: 650, y: 160 },
      { x: 780, y: 520 },
      { x: 920, y: 260 },
      { x: 1050, y: 450 },
    ],
  },
  {
    id: 'office',
    name: 'Cozy Office',
    description: 'Solve coffee-break puzzles, collect coding bugs, and gather wishes in the hybrid office space.',
    mapX: 880,
    mapY: 860,
    themeColor: 0x40e0d0, // Turquoise
    textColor: '#40e0d0',
    storyFile: 'stories/level_office.json',
    playerStart: { x: 200, y: 580 },
    firefly: { x: 700, y: 300 },
    portal: { x: 1080, y: 160 },
    crystals: [
      { x: 280, y: 220 },
      { x: 480, y: 460 },
      { x: 620, y: 180 },
      { x: 800, y: 500 },
      { x: 960, y: 320 },
      { x: 1120, y: 520 },
    ],
  },
  {
    id: 'wizard',
    name: 'Wizard School',
    description: 'Enter the glowing libraries of the arcane academy. Watch out for flying spellbooks!',
    mapX: 980,
    mapY: 500,
    themeColor: 0x9370db, // Medium Purple
    textColor: '#9370db',
    storyFile: 'stories/level_wizard.json',
    playerStart: { x: 140, y: 520 },
    firefly: { x: 620, y: 340 },
    portal: { x: 1150, y: 220 },
    crystals: [
      { x: 260, y: 160 },
      { x: 440, y: 540 },
      { x: 680, y: 200 },
      { x: 850, y: 460 },
      { x: 980, y: 280 },
      { x: 1080, y: 500 },
    ],
  },
  {
    id: 'dungeon',
    name: 'Developer Dungeon',
    description: 'A neon cyberpunk terminal. Compile wishes and debug birthday code loops.',
    mapX: 1360,
    mapY: 620,
    themeColor: 0x00ff7f, // Spring Green
    textColor: '#00ff7f',
    storyFile: 'stories/level_dungeon.json',
    playerStart: { x: 180, y: 560 },
    firefly: { x: 660, y: 320 },
    portal: { x: 1090, y: 180 },
    crystals: [
      { x: 240, y: 240 },
      { x: 420, y: 480 },
      { x: 600, y: 150 },
      { x: 840, y: 510 },
      { x: 990, y: 290 },
      { x: 1140, y: 460 },
    ],
  },
  {
    id: 'garden',
    name: 'Memory Garden',
    description: 'Stroll through bioluminescent flowers that bloom with cherishable memories of the past year.',
    mapX: 1580,
    mapY: 340,
    themeColor: 0xffd700, // Gold
    textColor: '#ffd700',
    storyFile: 'stories/level_garden.json',
    playerStart: { x: 160, y: 580 },
    firefly: { x: 640, y: 350 },
    portal: { x: 1100, y: 160 },
    crystals: [
      { x: 220, y: 210 },
      { x: 450, y: 530 },
      { x: 630, y: 190 },
      { x: 810, y: 490 },
      { x: 970, y: 310 },
      { x: 1110, y: 570 },
    ],
  },
  {
    id: 'castle',
    name: 'Birthday Castle',
    description: 'The final destination! Enter the grand ballroom, blow out the candles, and let the wishes come true.',
    mapX: 1820,
    mapY: 200,
    themeColor: 0xff1493, // Deep Pink
    textColor: '#ff1493',
    storyFile: 'stories/level_castle.json',
    playerStart: { x: 150, y: 520 },
    firefly: { x: 640, y: 330 },
    portal: { x: 1130, y: 150 },
    crystals: [
      { x: 250, y: 180 },
      { x: 430, y: 500 },
      { x: 620, y: 160 },
      { x: 800, y: 460 },
      { x: 980, y: 260 },
      { x: 1100, y: 550 },
    ],
  },
];

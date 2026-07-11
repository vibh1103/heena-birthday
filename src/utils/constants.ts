export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const SAVE_KEY = 'heenas-birthday-adventure-save-v1';

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  MENU: 'MenuScene',
  MAP: 'MapScene',
  GAME: 'GameScene',
  UI: 'UIScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

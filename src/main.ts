import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './utils/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MenuScene } from './scenes/MenuScene';
import { MapScene } from './scenes/MapScene';
import { PreloadScene } from './scenes/PreloadScene';
import { UIScene } from './scenes/UIScene';
import { EndingScene } from './scenes/EndingScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#05030a',
  pixelArt: false,
  roundPixels: false,
  scene: [BootScene, PreloadScene, MenuScene, MapScene, GameScene, UIScene, EndingScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0, x: 0 },
    },
  },
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    min: {
      width: 320,
      height: 180,
    },
  },
  render: {
    antialias: true,
    powerPreference: 'high-performance',
  },
  title: "Heena's Birthday Adventure",
  version: '1.0.0',
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  // Dev-only: lets you jump straight into any scene from the browser console,
  // e.g. game.scene.start('GameScene', { levelId: 'garden' })
  (window as unknown as { game: Phaser.Game }).game = game;
}

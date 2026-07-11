import Phaser from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { SCENE_KEYS } from '../utils/constants';
import { SceneManager } from '../systems/SceneManager';

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  public preload(): void {
    AssetLoader.preload(this);
    // Load stories manifest
    this.load.json('stories-manifest', 'stories/manifest.json');
    // Load levels manifest
    this.load.json('levels-manifest', 'levels/manifest.json');
  }

  public create(): void {
    AssetLoader.createGeneratedTextures(this);
    SceneManager.fadeTo(this, SCENE_KEYS.MAP);
  }
}

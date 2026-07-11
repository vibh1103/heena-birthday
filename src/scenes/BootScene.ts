import Phaser from 'phaser';
import { SCENE_KEYS } from '../utils/constants';
import { SceneManager } from '../systems/SceneManager';

export class BootScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.BOOT);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#05030a');
    SceneManager.fadeTo(this, SCENE_KEYS.PRELOAD);
  }
}

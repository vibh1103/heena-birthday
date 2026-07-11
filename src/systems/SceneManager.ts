import Phaser from 'phaser';
import { SceneKey } from '../utils/constants';

export class SceneManager {
  public static fadeTo(scene: Phaser.Scene, target: SceneKey, data?: object): void {
    const camera = scene.cameras.main;
    camera.fadeOut(450, 5, 3, 10);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      scene.scene.start(target, data);
    });
  }

  public static launchOverlay(scene: Phaser.Scene, target: SceneKey, data?: object): void {
    if (!scene.scene.isActive(target)) {
      scene.scene.launch(target, data);
    }
  }
}

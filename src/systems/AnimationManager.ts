import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/assetManifest';

export class AnimationManager {
  public constructor(private readonly scene: Phaser.Scene) {}

  public createAmbientTweens(targets: Phaser.GameObjects.GameObject[]): void {
    targets.forEach((target, index) => {
      this.scene.tweens.add({
        targets: target,
        y: `+=${index % 2 === 0 ? 12 : -12}`,
        duration: 1300 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    });
  }

  public pulsePortal(portal: Phaser.GameObjects.Image): void {
    this.scene.tweens.add({
      targets: portal,
      scale: 1.14,
      alpha: 0.72,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  public shimmerCrystal(crystal: Phaser.GameObjects.Image): void {
    crystal.setTexture(TEXTURE_KEYS.CRYSTAL);
    this.scene.tweens.add({
      targets: crystal,
      angle: 360,
      duration: 2600,
      repeat: -1,
      ease: 'Linear',
    });
  }
}

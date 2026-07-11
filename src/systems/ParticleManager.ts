import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/assetManifest';
import { COLORS } from '../utils/colors';

export class ParticleManager {
  public constructor(private readonly scene: Phaser.Scene) {}

  public createAmbientMist(tints?: number[]): Phaser.GameObjects.Particles.ParticleEmitter {
    return this.scene.add.particles(0, 0, TEXTURE_KEYS.SPARK, {
      x: { min: 0, max: 1280 },
      y: { min: 0, max: 720 },
      lifespan: 5200,
      speed: { min: 8, max: 24 },
      scale: { start: 0.55, end: 0 },
      alpha: { start: 0.22, end: 0 },
      quantity: 2,
      frequency: 120,
      tint: tints ?? [COLORS.fuchsia, COLORS.amethyst, COLORS.teal],
      blendMode: Phaser.BlendModes.ADD,
    });
  }

  public burst(x: number, y: number): void {
    this.scene.add.particles(x, y, TEXTURE_KEYS.STAR, {
      lifespan: 700,
      speed: { min: 90, max: 240 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.9, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 90,
      quantity: 18,
      tint: [COLORS.gold, COLORS.fuchsia, COLORS.moon],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    }).explode(18);
  }
}

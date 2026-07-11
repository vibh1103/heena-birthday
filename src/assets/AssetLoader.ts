import Phaser from 'phaser';
import { TEXTURE_KEYS } from './assetManifest';
import { COLORS } from '../utils/colors';

export class AssetLoader {
  public static preload(scene: Phaser.Scene): void {
    scene.load.setPath('/');
  }

  public static createGeneratedTextures(scene: Phaser.Scene): void {
    this.createPlayer(scene);
    this.createCrystal(scene);
    this.createFirefly(scene);
    this.createPortal(scene);
    this.createParticles(scene);
    this.createTile(scene);
    this.createPortraits(scene);
  }

  private static createPlayer(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.PLAYER)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(COLORS.amethyst, 1);
    graphics.fillCircle(24, 22, 15);
    graphics.fillStyle(COLORS.moon, 1);
    graphics.fillCircle(19, 19, 3);
    graphics.fillCircle(29, 19, 3);
    graphics.fillStyle(COLORS.fuchsia, 0.9);
    graphics.fillRoundedRect(9, 34, 30, 28, 10);
    graphics.fillStyle(COLORS.rose, 0.95);
    graphics.fillTriangle(24, 2, 13, 14, 35, 14);
    graphics.generateTexture(TEXTURE_KEYS.PLAYER, 48, 68);
    graphics.destroy();
  }

  private static createCrystal(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.CRYSTAL)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(COLORS.fuchsia, 0.95);
    graphics.fillTriangle(24, 0, 44, 22, 24, 56);
    graphics.fillStyle(COLORS.teal, 0.9);
    graphics.fillTriangle(24, 0, 4, 22, 24, 56);
    graphics.lineStyle(3, COLORS.moon, 0.72);
    graphics.strokeTriangle(24, 0, 44, 22, 24, 56);
    graphics.strokeTriangle(24, 0, 4, 22, 24, 56);
    graphics.generateTexture(TEXTURE_KEYS.CRYSTAL, 48, 58);
    graphics.destroy();
  }

  private static createFirefly(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.FIREFLY)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(COLORS.gold, 0.95);
    graphics.fillCircle(24, 24, 12);
    graphics.fillStyle(COLORS.moon, 0.45);
    graphics.fillEllipse(13, 17, 18, 26);
    graphics.fillEllipse(35, 17, 18, 26);
    graphics.lineStyle(2, COLORS.gold, 0.8);
    graphics.strokeCircle(24, 24, 16);
    graphics.generateTexture(TEXTURE_KEYS.FIREFLY, 48, 48);
    graphics.destroy();
  }

  private static createPortal(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.PORTAL)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(8, COLORS.fuchsia, 0.85);
    graphics.strokeCircle(60, 60, 44);
    graphics.lineStyle(4, COLORS.teal, 0.7);
    graphics.strokeCircle(60, 60, 31);
    graphics.fillStyle(COLORS.amethyst, 0.26);
    graphics.fillCircle(60, 60, 42);
    graphics.generateTexture(TEXTURE_KEYS.PORTAL, 120, 120);
    graphics.destroy();
  }

  private static createParticles(scene: Phaser.Scene): void {
    if (!scene.textures.exists(TEXTURE_KEYS.STAR)) {
      const star = scene.make.graphics({ x: 0, y: 0 }, false);
      star.fillStyle(COLORS.moon, 1);
      star.fillTriangle(8, 0, 11, 6, 16, 8);
      star.fillTriangle(16, 8, 10, 11, 8, 16);
      star.fillTriangle(8, 16, 5, 10, 0, 8);
      star.fillTriangle(0, 8, 6, 5, 8, 0);
      star.generateTexture(TEXTURE_KEYS.STAR, 16, 16);
      star.destroy();
    }

    if (!scene.textures.exists(TEXTURE_KEYS.SPARK)) {
      const spark = scene.make.graphics({ x: 0, y: 0 }, false);
      spark.fillStyle(COLORS.fuchsia, 1);
      spark.fillCircle(4, 4, 4);
      spark.generateTexture(TEXTURE_KEYS.SPARK, 8, 8);
      spark.destroy();
    }
  }

  private static createTile(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.TILE)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(COLORS.midnight, 1);
    graphics.fillRect(0, 0, 96, 96);
    graphics.lineStyle(1, COLORS.amethyst, 0.16);
    graphics.strokeRect(0, 0, 96, 96);
    graphics.lineBetween(0, 48, 96, 48);
    graphics.lineBetween(48, 0, 48, 96);
    graphics.generateTexture(TEXTURE_KEYS.TILE, 96, 96);
    graphics.destroy();
  }

  private static createPortraits(scene: Phaser.Scene): void {
    this.createHeenaPortrait(scene, TEXTURE_KEYS.PORTRAIT_HEENA_HAPPY, COLORS.rose);
    this.createHeenaPortrait(scene, TEXTURE_KEYS.PORTRAIT_HEENA_CURIOUS, COLORS.teal);
    this.createFireflyPortrait(scene, TEXTURE_KEYS.PORTRAIT_FIREFLY_NEUTRAL, COLORS.gold);
    this.createFireflyPortrait(scene, TEXTURE_KEYS.PORTRAIT_FIREFLY_EXCITED, COLORS.fuchsia);
  }

  private static createHeenaPortrait(scene: Phaser.Scene, key: string, accent: number): void {
    if (scene.textures.exists(key)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x15102a, 0.94);
    graphics.fillRoundedRect(0, 0, 168, 168, 34);
    graphics.lineStyle(5, accent, 0.82);
    graphics.strokeRoundedRect(8, 8, 152, 152, 28);
    graphics.fillStyle(COLORS.amethyst, 1);
    graphics.fillCircle(84, 72, 38);
    graphics.fillStyle(COLORS.rose, 1);
    graphics.fillTriangle(84, 20, 44, 56, 124, 56);
    graphics.fillStyle(COLORS.moon, 1);
    graphics.fillCircle(70, 66, 7);
    graphics.fillCircle(98, 66, 7);
    graphics.fillStyle(accent, 0.94);
    graphics.fillRoundedRect(48, 108, 72, 36, 18);
    graphics.generateTexture(key, 168, 168);
    graphics.destroy();
  }

  private static createFireflyPortrait(scene: Phaser.Scene, key: string, accent: number): void {
    if (scene.textures.exists(key)) {
      return;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x15102a, 0.94);
    graphics.fillRoundedRect(0, 0, 168, 168, 34);
    graphics.lineStyle(5, accent, 0.82);
    graphics.strokeRoundedRect(8, 8, 152, 152, 28);
    graphics.fillStyle(COLORS.moon, 0.2);
    graphics.fillEllipse(58, 72, 48, 86);
    graphics.fillEllipse(110, 72, 48, 86);
    graphics.fillStyle(COLORS.gold, 1);
    graphics.fillCircle(84, 84, 34);
    graphics.lineStyle(4, accent, 0.8);
    graphics.strokeCircle(84, 84, 48);
    graphics.fillStyle(COLORS.moon, 1);
    graphics.fillCircle(72, 78, 5);
    graphics.fillCircle(96, 78, 5);
    graphics.generateTexture(key, 168, 168);
    graphics.destroy();
  }
}

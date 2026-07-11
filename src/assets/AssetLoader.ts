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
    
    // Custom Level 1 Collectibles & Door
    this.createCoffee(scene);
    this.createLaptop(scene);
    this.createTeddy(scene);
    this.createKey(scene);
    this.createDoor(scene);

    // Custom Level 2 Cafe Ingredients
    this.createMilk(scene);
    this.createChocolate(scene);
    this.createEggs(scene);
    this.createFlour(scene);
    this.createSugar(scene);
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

  private static createCoffee(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.COFFEE)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xf59e0b, 1);
    graphics.fillRoundedRect(12, 16, 24, 26, 6);
    graphics.lineStyle(3, 0xf59e0b, 1);
    graphics.strokeEllipse(11, 29, 10, 14);
    graphics.fillStyle(0x78350f, 1);
    graphics.fillEllipse(24, 16, 20, 6);
    graphics.lineStyle(2, 0xffffff, 0.7);
    graphics.lineBetween(20, 11, 18, 5);
    graphics.lineBetween(28, 11, 30, 5);
    graphics.generateTexture(TEXTURE_KEYS.COFFEE, 48, 48);
    graphics.destroy();
  }

  private static createLaptop(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.LAPTOP)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x475569, 1);
    graphics.fillRoundedRect(8, 10, 32, 22, 4);
    graphics.fillStyle(0x0f172a, 1);
    graphics.fillRect(10, 12, 28, 18);
    graphics.fillStyle(0x22c55e, 0.95);
    graphics.fillRect(13, 15, 12, 2);
    graphics.fillRect(13, 19, 18, 2);
    graphics.fillRect(13, 23, 8, 2);
    graphics.fillStyle(0x94a3b8, 1);
    graphics.fillRoundedRect(4, 32, 40, 6, 2);
    graphics.generateTexture(TEXTURE_KEYS.LAPTOP, 48, 48);
    graphics.destroy();
  }

  private static createTeddy(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.TEDDY)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xd97706, 1);
    graphics.fillCircle(15, 15, 6);
    graphics.fillCircle(33, 15, 6);
    graphics.fillStyle(0xd97706, 1);
    graphics.fillCircle(24, 22, 12);
    graphics.fillStyle(0xd97706, 1);
    graphics.fillRoundedRect(14, 30, 20, 16, 8);
    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(20, 20, 1.5);
    graphics.fillCircle(28, 20, 1.5);
    graphics.fillStyle(0xfde047, 1);
    graphics.fillCircle(24, 25, 4);
    graphics.fillStyle(0x000000, 1);
    graphics.fillTriangle(24, 24, 22, 22, 26, 22);
    graphics.generateTexture(TEXTURE_KEYS.TEDDY, 48, 48);
    graphics.destroy();
  }

  private static createKey(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.KEY)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(4, 0xfacc15, 1);
    graphics.strokeCircle(16, 24, 8);
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillRect(24, 22, 16, 4);
    graphics.fillRect(34, 26, 3, 4);
    graphics.fillRect(38, 26, 3, 4);
    graphics.generateTexture(TEXTURE_KEYS.KEY, 48, 48);
    graphics.destroy();
  }

  private static createDoor(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.DOOR)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x451a03, 1);
    graphics.fillRect(0, 0, 64, 96);
    graphics.fillStyle(0x9a3412, 1);
    graphics.fillRect(4, 4, 56, 92);
    graphics.fillStyle(0x7c2d12, 1);
    graphics.fillRect(10, 10, 18, 32);
    graphics.fillRect(36, 10, 18, 32);
    graphics.fillRect(10, 52, 18, 32);
    graphics.fillRect(36, 52, 18, 32);
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillCircle(12, 48, 4.5);
    graphics.generateTexture(TEXTURE_KEYS.DOOR, 64, 96);
    graphics.destroy();
  }

  private static createMilk(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.MILK)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillRect(14, 16, 20, 26);
    graphics.fillTriangle(14, 16, 24, 8, 34, 16);
    graphics.fillStyle(0x38bdf8, 1);
    graphics.fillRect(14, 24, 20, 8);
    graphics.fillStyle(0x0284c7, 1);
    graphics.fillCircle(24, 28, 3);
    graphics.generateTexture(TEXTURE_KEYS.MILK, 48, 48);
    graphics.destroy();
  }

  private static createChocolate(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.CHOCOLATE)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x7c2d12, 1);
    graphics.fillRect(12, 12, 24, 26);
    graphics.lineStyle(1.5, 0x451a03, 1);
    graphics.strokeRect(12, 12, 24, 26);
    graphics.lineBetween(20, 12, 20, 38);
    graphics.lineBetween(28, 12, 28, 38);
    graphics.lineBetween(12, 20, 36, 20);
    graphics.lineBetween(12, 30, 36, 30);
    graphics.fillStyle(0xdc2626, 1);
    graphics.fillRect(12, 24, 24, 16);
    graphics.fillStyle(0xe2e8f0, 1);
    graphics.fillRect(12, 22, 24, 2);
    graphics.generateTexture(TEXTURE_KEYS.CHOCOLATE, 48, 48);
    graphics.destroy();
  }

  private static createEggs(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.EGGS)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x78350f, 1);
    graphics.fillRoundedRect(10, 26, 28, 14, 4);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillEllipse(17, 20, 6, 9);
    graphics.fillEllipse(24, 18, 6, 9);
    graphics.fillEllipse(31, 20, 6, 9);
    graphics.generateTexture(TEXTURE_KEYS.EGGS, 48, 48);
    graphics.destroy();
  }

  private static createFlour(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.FLOUR)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0xe2e8f0, 1);
    graphics.fillRoundedRect(12, 14, 24, 28, 6);
    graphics.fillStyle(0xcbd5e1, 1);
    graphics.fillTriangle(12, 14, 24, 8, 36, 14);
    graphics.fillStyle(0xb45309, 1);
    graphics.fillRect(16, 14, 16, 2);
    graphics.fillStyle(0xd97706, 1);
    graphics.fillTriangle(24, 24, 21, 30, 27, 30);
    graphics.fillTriangle(24, 30, 21, 24, 27, 24);
    graphics.generateTexture(TEXTURE_KEYS.FLOUR, 48, 48);
    graphics.destroy();
  }

  private static createSugar(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEXTURE_KEYS.SUGAR)) return;
    const graphics = scene.make.graphics({ x: 0, y: 0 }, false);
    graphics.lineStyle(2, 0x38bdf8, 1);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRoundedRect(10, 18, 28, 22, 4);
    graphics.strokeRoundedRect(10, 18, 28, 22, 4);
    graphics.lineBetween(10, 18, 38, 18);
    graphics.fillStyle(0x38bdf8, 1);
    graphics.fillCircle(24, 11, 3);
    graphics.strokeEllipse(24, 15, 12, 4);
    graphics.generateTexture(TEXTURE_KEYS.SUGAR, 48, 48);
    graphics.destroy();
  }
}

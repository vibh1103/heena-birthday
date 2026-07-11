import Phaser from 'phaser';
import { UI_COLORS } from '../utils/uiTheme';

interface GlassPanelOptions {
  radius?: number;
  fillAlpha?: number;
  strokeAlpha?: number;
  glowAlpha?: number;
}

export class GlassPanel extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    options: GlassPanelOptions = {},
  ) {
    super(scene, x, y);
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    scene.add.existing(this);
    this.draw(width, height, options);
  }

  private draw(width: number, height: number, options: GlassPanelOptions): void {
    const radius = options.radius ?? 26;
    const fillAlpha = options.fillAlpha ?? 0.68;
    const strokeAlpha = options.strokeAlpha ?? 0.34;
    const glowAlpha = options.glowAlpha ?? 0.22;
    const x = -width / 2;
    const y = -height / 2;

    this.graphics.clear();
    this.graphics.fillStyle(0x000000, 0.28);
    this.graphics.fillRoundedRect(x + 10, y + 14, width, height, radius);
    this.graphics.lineStyle(12, UI_COLORS.pink, glowAlpha);
    this.graphics.strokeRoundedRect(x - 2, y - 2, width + 4, height + 4, radius + 3);
    this.graphics.lineStyle(2, UI_COLORS.cream, strokeAlpha);
    this.graphics.fillStyle(UI_COLORS.glass, fillAlpha);
    this.graphics.fillRoundedRect(x, y, width, height, radius);
    this.graphics.strokeRoundedRect(x, y, width, height, radius);
    this.graphics.lineStyle(1, UI_COLORS.gold, 0.2);
    this.graphics.strokeRoundedRect(x + 8, y + 8, width - 16, height - 16, Math.max(8, radius - 8));
  }
}

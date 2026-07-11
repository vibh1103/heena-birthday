import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/assetManifest';
import { UI_COLORS, UI_HEX, FONT_FAMILY } from '../utils/uiTheme';

interface MagicButtonOptions {
  label: string;
  width?: number;
  height?: number;
  onClick: () => void;
}

export class MagicButton extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly sparkleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly widthValue: number;
  private readonly heightValue: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, options: MagicButtonOptions) {
    super(scene, x, y);
    this.widthValue = options.width ?? 330;
    this.heightValue = options.height ?? 82;
    this.graphics = scene.add.graphics();
    this.label = scene.add
      .text(0, -2, options.label, {
        fontFamily: FONT_FAMILY.display,
        fontSize: '30px',
        color: UI_HEX.navy,
        fontStyle: '700',
      })
      .setOrigin(0.5);

    this.sparkleEmitter = scene.add.particles(0, 0, TEXTURE_KEYS.STAR, {
      lifespan: 620,
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [UI_COLORS.gold, UI_COLORS.pink, UI_COLORS.cream],
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });

    this.add([this.graphics, this.label]);
    scene.add.existing(this);
    this.setSize(this.widthValue, this.heightValue);
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        -this.widthValue / 2,
        -this.heightValue / 2,
        this.widthValue,
        this.heightValue,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    this.draw(false);

    this.on(Phaser.Input.Events.POINTER_OVER, () => this.setHover(true));
    this.on(Phaser.Input.Events.POINTER_OUT, () => this.setHover(false));
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.sparkleEmitter.explode(22, this.x, this.y);
      scene.tweens.add({
        targets: this,
        scale: 0.96,
        duration: 70,
        yoyo: true,
        ease: 'Sine.inOut',
        onComplete: options.onClick,
      });
    });
  }

  private setHover(isHovering: boolean): void {
    this.draw(isHovering);
    this.scene.tweens.add({
      targets: this,
      scale: isHovering ? 1.08 : 1,
      duration: 180,
      ease: 'Back.out',
    });

    if (isHovering) {
      this.sparkleEmitter.explode(14, this.x, this.y);
    }
  }

  private draw(isHovering: boolean): void {
    const width = this.widthValue;
    const height = this.heightValue;
    const x = -width / 2;
    const y = -height / 2;
    const radius = 25;
    const glowAlpha = isHovering ? 0.5 : 0.28;

    this.graphics.clear();
    this.graphics.fillStyle(0x000000, 0.25);
    this.graphics.fillRoundedRect(x + 8, y + 10, width, height, radius);
    this.graphics.lineStyle(isHovering ? 16 : 10, UI_COLORS.gold, glowAlpha);
    this.graphics.strokeRoundedRect(x - 2, y - 2, width + 4, height + 4, radius + 3);
    this.graphics.fillGradientStyle(UI_COLORS.gold, UI_COLORS.pinkSoft, UI_COLORS.pink, UI_COLORS.gold, 1);
    this.graphics.fillRoundedRect(x, y, width, height, radius);
    this.graphics.lineStyle(2, UI_COLORS.cream, 0.75);
    this.graphics.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, radius - 3);
  }
}

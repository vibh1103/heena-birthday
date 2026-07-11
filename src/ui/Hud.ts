import Phaser from 'phaser';
import { GlassPanel } from '../components/GlassPanel';
import { FONT_FAMILY, UI_COLORS, UI_HEX } from '../utils/uiTheme';

export class Hud {
  private readonly crystalText: Phaser.GameObjects.Text;
  private readonly timerText: Phaser.GameObjects.Text;
  private pips: Phaser.GameObjects.Star[] = [];

  public constructor(scene: Phaser.Scene) {
    new GlassPanel(scene, 164, 58, 272, 88, {
      radius: 24,
      fillAlpha: 0.56,
      strokeAlpha: 0.28,
      glowAlpha: 0.12,
    }).setDepth(900);
    this.crystalText = scene.add.text(44, 24, 'Crystals 0/6', {
      fontFamily: FONT_FAMILY.display,
      fontSize: '22px',
      color: UI_HEX.cream,
      fontStyle: '700',
      stroke: '#14051f',
      strokeThickness: 5,
    }).setDepth(901);
    this.timerText = scene.add.text(44, 56, '00:00', {
      fontFamily: FONT_FAMILY.body,
      fontSize: '18px',
      color: UI_HEX.gold,
      stroke: '#14051f',
      strokeThickness: 4,
    }).setDepth(901);

    for (let index = 0; index < 6; index += 1) {
      const pip = scene.add
        .star(184 + index * 18, 66, 5, 3, 7, UI_COLORS.purple, 0.7)
        .setDepth(901)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.pips.push(pip);
    }
  }

  public setCrystals(count: number, total: number, scene?: Phaser.Scene): void {
    this.crystalText.setText(`Crystals ${count}/${total}`);
    
    // Rebuild pips if total count changes
    if (scene && this.pips.length !== total) {
      this.pips.forEach(pip => pip.destroy());
      this.pips = [];
      for (let index = 0; index < total; index += 1) {
        const pip = scene.add
          .star(184 + index * 18, 66, 5, 3, 7, UI_COLORS.purple, 0.7)
          .setDepth(901)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.pips.push(pip);
      }
    }

    this.pips.forEach((pip, index) => {
      if (pip) {
        pip.setFillStyle(index < count ? UI_COLORS.gold : UI_COLORS.purple, index < count ? 1 : 0.5);
        pip.setScale(index < count ? 1.15 : 1);
      }
    });
  }

  public setElapsed(milliseconds: number): void {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    this.timerText.setText(`${minutes}:${seconds}`);
  }
}

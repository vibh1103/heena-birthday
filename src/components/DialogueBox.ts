import Phaser from 'phaser';
import { ActiveDialogueLine, DialogueChoiceDefinition, DialogueUiAdapter } from '../systems/DialogueSystem';
import { FONT_FAMILY, UI_COLORS, UI_HEX } from '../utils/uiTheme';
import { GlassPanel } from './GlassPanel';

export class DialogueBox implements DialogueUiAdapter {
  private readonly container: Phaser.GameObjects.Container;
  private readonly portraitFrame: GlassPanel;
  private readonly portrait: Phaser.GameObjects.Image;
  private readonly speaker: Phaser.GameObjects.Text;
  private readonly emotion: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;
  private readonly continueHint: Phaser.GameObjects.Text;
  private readonly skipButton: Phaser.GameObjects.Text;
  private readonly choiceContainer: Phaser.GameObjects.Container;
  private choiceButtons: Phaser.GameObjects.Container[] = [];

  public constructor(scene: Phaser.Scene) {
    const panel = new GlassPanel(scene, 640, 610, 1010, 142, {
      radius: 30,
      fillAlpha: 0.78,
      strokeAlpha: 0.42,
      glowAlpha: 0.18,
    });
    panel.setSize(1010, 142);
    panel.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-505, -71, 1010, 142),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });
    panel.on(Phaser.Input.Events.POINTER_DOWN, (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      if (event) event.stopPropagation();
      scene.events.emit('dialogue:advance');
    });

    this.portraitFrame = new GlassPanel(scene, 187, 602, 128, 128, {
      radius: 28,
      fillAlpha: 0.72,
      strokeAlpha: 0.34,
      glowAlpha: 0.16,
    });
    this.portrait = scene.add.image(187, 602, '').setDisplaySize(104, 104).setVisible(false);
    this.speaker = scene.add.text(270, 558, '', {
      fontFamily: FONT_FAMILY.display,
      fontSize: '20px',
      color: UI_HEX.gold,
      fontStyle: '700',
    });
    this.emotion = scene.add.text(270, 584, '', {
      fontFamily: FONT_FAMILY.body,
      fontSize: '13px',
      color: UI_HEX.pink,
      fontStyle: '800',
    });
    this.text = scene.add.text(270, 606, '', {
      fontFamily: FONT_FAMILY.body,
      fontSize: '22px',
      color: UI_HEX.cream,
      wordWrap: { width: 760 },
      lineSpacing: 8,
    });
    this.continueHint = scene.add
      .text(1100, 666, 'Space', {
        fontFamily: FONT_FAMILY.display,
        fontSize: '16px',
        color: UI_HEX.gold,
        fontStyle: '700',
      })
      .setOrigin(0.5);

    this.skipButton = scene.add
      .text(1100, 558, 'SKIP ➔', {
        fontFamily: FONT_FAMILY.display,
        fontSize: '15px',
        color: UI_HEX.pink,
        fontStyle: '800',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.skipButton.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.skipButton.setColor(UI_HEX.gold);
      scene.tweens.add({ targets: this.skipButton, scale: 1.1, duration: 100 });
    });
    this.skipButton.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.skipButton.setColor(UI_HEX.pink);
      scene.tweens.add({ targets: this.skipButton, scale: 1, duration: 100 });
    });

    this.choiceContainer = scene.add.container(0, 0).setDepth(1001).setVisible(false);

    this.container = scene.add.container(0, 0, [
      panel,
      this.portraitFrame,
      this.portrait,
      this.speaker,
      this.emotion,
      this.text,
      this.continueHint,
      this.skipButton,
    ]);
    this.container.setDepth(1000).setAlpha(0).setVisible(false).setScrollFactor(0);
    this.choiceContainer.setScrollFactor(0);

    scene.tweens.add({
      targets: this.continueHint,
      alpha: 0.35,
      y: 660,
      duration: 820,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  public showLine(line: ActiveDialogueLine, onSkipClick?: () => void): void {
    this.speaker.setText(line.speaker);
    this.emotion.setText(line.emotion.toUpperCase());
    this.text.setText(line.text);
    if (line.portraitKey) {
      this.portrait.setTexture(line.portraitKey).setVisible(true);
      this.portrait.setDisplaySize(100, 100);
    } else {
      this.portrait.setVisible(false);
    }

    this.skipButton.removeAllListeners(Phaser.Input.Events.POINTER_DOWN);
    if (onSkipClick) {
      this.skipButton.setVisible(true);
      this.skipButton.on(
        Phaser.Input.Events.POINTER_DOWN,
        (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
          if (event) event.stopPropagation();
          onSkipClick();
        },
      );
    } else {
      this.skipButton.setVisible(false);
    }

    this.container.setVisible(true);
    this.container.scene.tweens.killTweensOf(this.container);
    if (this.container.alpha < 1) {
      this.container.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        y: -10,
        duration: 180,
        ease: 'Sine.out',
      });
    } else {
      this.container.y = -10;
      this.container.alpha = 1;
    }
  }

  public setBodyText(text: string): void {
    this.text.setText(text);
  }

  public showChoices(choices: DialogueChoiceDefinition[], onChoose: (choice: DialogueChoiceDefinition) => void): void {
    this.hideChoices();
    const scene = this.choiceContainer.scene;
    choices.forEach((choice, index) => {
      const y = 436 + index * 62;
      const button = this.createChoiceButton(scene, 640, y, choice.label, () => onChoose(choice));
      button.setAlpha(0).setScale(0.92);
      this.choiceContainer.add(button);
      this.choiceButtons.push(button);
      scene.tweens.add({
        targets: button,
        alpha: 1,
        scale: 1,
        duration: 220,
        delay: index * 80,
        ease: 'Back.out',
      });
    });
    this.choiceContainer.setVisible(true);
  }

  public hideChoices(): void {
    this.choiceButtons.forEach((button) => button.destroy());
    this.choiceButtons = [];
    this.choiceContainer.removeAll(true);
    this.choiceContainer.setVisible(false);
  }

  public hide(): void {
    this.hideChoices();
    this.container.scene.tweens.killTweensOf(this.container);
    this.container.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      y: 0,
      duration: 140,
      ease: 'Sine.in',
      onComplete: () => this.container.setVisible(false),
    });
  }

  private createChoiceButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const width = 430;
    const height = 48;
    const container = scene.add.container(x, y);
    const graphics = scene.add.graphics();
    const text = scene.add
      .text(0, -1, label, {
        fontFamily: FONT_FAMILY.display,
        fontSize: '20px',
        color: UI_HEX.cream,
        fontStyle: '700',
      })
      .setOrigin(0.5);
    container.add([graphics, text]);
    this.drawChoice(graphics, width, height, false);
    container.setSize(width, height);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.drawChoice(graphics, width, height, true);
      scene.tweens.add({ targets: container, scale: 1.05, duration: 150, ease: 'Back.out' });
    });
    container.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.drawChoice(graphics, width, height, false);
      scene.tweens.add({ targets: container, scale: 1, duration: 150, ease: 'Sine.out' });
    });
    container.on(Phaser.Input.Events.POINTER_DOWN, onClick);
    return container;
  }

  private drawChoice(graphics: Phaser.GameObjects.Graphics, width: number, height: number, isHovering: boolean): void {
    const x = -width / 2;
    const y = -height / 2;
    graphics.clear();
    graphics.fillStyle(0x000000, 0.28);
    graphics.fillRoundedRect(x + 5, y + 7, width, height, 18);
    graphics.lineStyle(isHovering ? 8 : 4, UI_COLORS.gold, isHovering ? 0.46 : 0.22);
    graphics.strokeRoundedRect(x, y, width, height, 18);
    graphics.fillStyle(UI_COLORS.purpleDark, isHovering ? 0.92 : 0.78);
    graphics.fillRoundedRect(x, y, width, height, 18);
    graphics.lineStyle(2, UI_COLORS.pink, isHovering ? 0.78 : 0.38);
    graphics.strokeRoundedRect(x + 3, y + 3, width - 6, height - 6, 15);
  }
}

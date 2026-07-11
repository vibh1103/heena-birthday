import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { MagicButton } from '../components/MagicButton';
import { GlassPanel } from '../components/GlassPanel';
import { SceneManager } from '../systems/SceneManager';
import { SaveGameManager } from '../systems/SaveGameManager';
import { SCENE_KEYS } from '../utils/constants';
import { FONT_FAMILY, UI_COLORS, UI_HEX } from '../utils/uiTheme';
import { DialogueStoryDefinition } from '../systems/DialogueSystem';

export class MenuScene extends Phaser.Scene {
  private audioManager!: AudioManager;

  public constructor() {
    super(SCENE_KEYS.MENU);
  }

  public create(): void {
    this.audioManager = new AudioManager(this);
    const saveManager = new SaveGameManager();
    const save = saveManager.load();

    this.cameras.main.fadeIn(500, 5, 3, 10);
    this.add.rectangle(640, 360, 1280, 720, UI_COLORS.navy);
    const backTiles = this.add.tileSprite(640, 360, 1400, 820, 'moonlit-tile').setAlpha(0.26);
    const nearGlow = this.add.circle(1060, 180, 210, UI_COLORS.gold, 0.12).setBlendMode(Phaser.BlendModes.ADD);
    const pinkGlow = this.add.circle(260, 560, 260, UI_COLORS.pink, 0.1).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: backTiles,
      tilePositionX: 96,
      tilePositionY: -52,
      duration: 11000,
      repeat: -1,
      ease: 'Sine.inOut',
      yoyo: true,
    });
    this.tweens.add({
      targets: [nearGlow, pinkGlow],
      y: '+=18',
      scale: 1.06,
      duration: 2400,
      repeat: -1,
      yoyo: true,
      ease: 'Sine.inOut',
    });

    this.createSparkles();
    
    const card = new GlassPanel(this, 640, 400, 1080, 470, { radius: 34, fillAlpha: 0.58, glowAlpha: 0.22 });
    card.setAlpha(0).setScale(0.92);
    this.tweens.add({ targets: card, alpha: 1, scale: 1, duration: 520, ease: 'Back.out' });

    const title = this.add
      .text(640, 96, "Heena's Dialogue Adventures", {
        fontFamily: FONT_FAMILY.display,
        fontSize: '48px',
        color: UI_HEX.cream,
        fontStyle: '800',
        align: 'center',
        stroke: '#241341',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(4);

    this.tweens.add({
      targets: title,
      y: 88,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    this.add
      .text(640, 172, 'Choose a story to begin Heena\'s magical birthday quest.', {
        fontFamily: FONT_FAMILY.body,
        fontSize: '20px',
        color: UI_HEX.cream,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(4);

    const manifest = this.cache.json.get('stories-manifest') as Array<{
      id: string;
      title: string;
      description: string;
      file: string;
    }>;

    manifest.forEach((storyItem, index) => {
      const y = 278 + index * 172;
      
      const subCard = new GlassPanel(this, 640, y, 1000, 142, { radius: 24, fillAlpha: 0.44, strokeAlpha: 0.24, glowAlpha: 0.1 });
      subCard.setDepth(4);

      this.add.text(170, y - 40, storyItem.title, {
        fontFamily: FONT_FAMILY.display,
        fontSize: '26px',
        color: UI_HEX.gold,
        fontStyle: '700'
      }).setDepth(5);

      this.add.text(170, y - 4, storyItem.description, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '16px',
        color: UI_HEX.cream,
        wordWrap: { width: 550 }
      }).setDepth(5);

      const storyProgress = save.dialogueProgress;
      const hasSaveForThisStory = storyProgress && storyProgress.storyId === storyItem.id;

      if (hasSaveForThisStory) {
        new MagicButton(this, 830, y, {
          label: 'New Run',
          width: 140,
          height: 48,
          onClick: () => {
            this.audioManager.unlock();
            this.audioManager.playTone(392, 160, 0.09);
            this.loadStory(storyItem.file, (loadedStory) => {
              const currentSave = saveManager.load();
              saveManager.save({
                ...currentSave,
                crystals: 0,
                dialogueProgress: undefined
              });
              SceneManager.fadeTo(this, SCENE_KEYS.GAME, { story: loadedStory });
            });
          }
        }).setDepth(5);

        new MagicButton(this, 985, y, {
          label: 'Resume',
          width: 130,
          height: 48,
          onClick: () => {
            this.audioManager.unlock();
            this.audioManager.playTone(440, 160, 0.09);
            this.loadStory(storyItem.file, (loadedStory) => {
              SceneManager.fadeTo(this, SCENE_KEYS.GAME, { story: loadedStory });
            });
          }
        }).setDepth(5);
      } else {
        new MagicButton(this, 910, y, {
          label: 'Begin Story',
          width: 200,
          height: 52,
          onClick: () => {
            this.audioManager.unlock();
            this.audioManager.playTone(392, 160, 0.09);
            this.loadStory(storyItem.file, (loadedStory) => {
              const currentSave = saveManager.load();
              saveManager.save({
                ...currentSave,
                crystals: 0,
                dialogueProgress: undefined
              });
              SceneManager.fadeTo(this, SCENE_KEYS.GAME, { story: loadedStory });
            });
          }
        }).setDepth(5);
      }
    });

    const best = save.bestTimeMs === null ? 'No completed run yet' : `Best wish time: ${this.formatTime(save.bestTimeMs)}`;
    this.add
      .text(640, 608, best, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '17px',
        color: UI_HEX.gold,
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  private loadStory(file: string, onComplete: (story: DialogueStoryDefinition) => void): void {
    const key = `story-${file}`;
    if (this.cache.json.exists(key)) {
      onComplete(this.cache.json.get(key));
      return;
    }

    this.load.json(key, file);
    this.load.once(`filecomplete-json-${key}`, () => {
      onComplete(this.cache.json.get(key));
    });
    this.load.start();
  }

  private createSparkles(): void {
    for (let index = 0; index < 34; index += 1) {
      const sparkle = this.add
        .star(
          Phaser.Math.Between(50, 1230),
          Phaser.Math.Between(36, 680),
          5,
          Phaser.Math.Between(3, 6),
          Phaser.Math.Between(8, 15),
          index % 3 === 0 ? UI_COLORS.gold : UI_COLORS.pinkSoft,
          Phaser.Math.FloatBetween(0.3, 0.72),
        )
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: sparkle,
        alpha: Phaser.Math.FloatBetween(0.08, 0.85),
        scale: Phaser.Math.FloatBetween(0.75, 1.35),
        duration: Phaser.Math.Between(900, 2200),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.inOut',
      });
    }
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}

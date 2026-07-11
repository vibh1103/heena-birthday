import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { TEXTURE_KEYS } from '../assets/assetManifest';
import { Heena, MovementKeys } from '../characters/Heena';
import { DialogueBox } from '../components/DialogueBox';
import { GlassPanel } from '../components/GlassPanel';
import { MiniGamePanel } from '../components/MiniGamePanel';
import { AnimationManager } from '../systems/AnimationManager';
import {
  DialogueCameraCommand,
  DialogueEngine,
  DialogueEventDefinition,
  DialogueStoryDefinition,
} from '../systems/DialogueSystem';
import { ParticleManager } from '../systems/ParticleManager';
import { ResponsiveCanvas } from '../systems/ResponsiveCanvas';
import { SaveGameManager } from '../systems/SaveGameManager';
import { SceneManager } from '../systems/SceneManager';
import { COLORS } from '../utils/colors';
import { SCENE_KEYS } from '../utils/constants';
import { FONT_FAMILY, UI_COLORS, UI_HEX } from '../utils/uiTheme';

export class GameScene extends Phaser.Scene {
  private player!: Heena;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: MovementKeys;
  private crystals!: Phaser.Physics.Arcade.Group;
  private portal!: Phaser.GameObjects.Image;
  private collected = 0;
  private totalCrystals = 6;
  private startTime = 0;
  private dialogue!: DialogueEngine;
  private dialogueBox!: DialogueBox;
  private audioManager!: AudioManager;
  private particles!: ParticleManager;
  private saveManager = new SaveGameManager();
  private portalReady = false;
  private story!: DialogueStoryDefinition;
  private dialogueBgImage: Phaser.GameObjects.Image | null = null;

  // Level Engine data-driven fields
  private levelId = 'home';
  private levelFile = 'levels/home.json';
  private levelConfig!: any;
  private npcSprites: Map<string, Phaser.Physics.Arcade.Image> = new Map();
  private objectivesProgress: Record<string, boolean> = {};
  private gamePausedForMinigame = false;

  // Quest Checklist display
  private objectiveTexts: Array<{ id: string; textObject: Phaser.GameObjects.Text; desc: string }> = [];

  public constructor() {
    super(SCENE_KEYS.GAME);
  }

  public init(data?: { levelId?: string }): void {
    this.levelId = data?.levelId ?? 'home';
    this.levelFile = `levels/${this.levelId}.json`;
  }

  public preload(): void {
    // Dynamically load the level's JSON configuration
    this.load.json(`level-config-${this.levelId}`, this.levelFile);
  }

  public create(): void {
    this.levelConfig = this.cache.json.get(`level-config-${this.levelId}`);

    // Show a premium visual loading screen while story-specific assets load
    const loadingText = this.add.text(640, 360, 'Loading Level Magic...', {
      fontFamily: FONT_FAMILY.display,
      fontSize: '28px',
      color: UI_HEX.gold,
      fontStyle: '800',
    }).setOrigin(0.5).setDepth(2000);

    const loadingGlow = this.add.circle(640, 360, 160, UI_COLORS.pink, 0.08)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(1999);

    this.tweens.add({
      targets: [loadingText, loadingGlow],
      alpha: 0.4,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    // Preload dialog story file specified in the level configuration
    const storyKey = `story-${this.levelConfig.storyFile}`;
    this.load.json(storyKey, this.levelConfig.storyFile);
    this.load.once(`filecomplete-json-${storyKey}`, () => {
      this.story = this.cache.json.get(storyKey);
      
      loadingText.destroy();
      loadingGlow.destroy();

      // Boot level engine once story files are preloaded
      this.bootLevelEngine();
    });
    this.load.start();
  }

  private bootLevelEngine(): void {
    this.cameras.main.fadeIn(500, 5, 3, 10);
    this.physics.world.setBounds(0, 0, 1280, 720);
    this.startTime = this.time.now;
    this.audioManager = new AudioManager(this);
    this.audioManager.unlock();
    this.particles = new ParticleManager(this);

    this.portalReady = false;
    this.collected = 0;
    this.totalCrystals = this.levelConfig.collectibles.length;

    // Reset objectives progress checklist state
    this.objectivesProgress = {};
    this.levelConfig.objectives.forEach((obj: any) => {
      this.objectivesProgress[obj.id] = false;
    });

    this.createSystems();
    this.createWorld();
    this.createActors();
    this.createInput();
    this.createObjectivesList();

    SceneManager.launchOverlay(this, SCENE_KEYS.UI);
    this.updateHud();

    // Check for saved progress on this specific story
    const save = this.saveManager.load();
    if (save && save.dialogueProgress && save.dialogueProgress.storyId === this.story.id) {
      this.collected = save.crystals;
      this.dialogue.start(save.dialogueProgress.nodeId, save.dialogueProgress.lineIndex);
    } else {
      this.showIntroDialogue();
    }
  }

  public update(_time: number, _delta: number): void {
    if (this.dialogue.isActive || this.gamePausedForMinigame) {
      this.player.setVelocity(0, 0);
    } else {
      this.player.move(this.cursors, this.keys);
    }

    this.updateHud();
  }

  private createWorld(): void {
    this.add.rectangle(640, 360, 1280, 720, COLORS.void);
    const farTiles = this.add.tileSprite(640, 360, 1340, 780, TEXTURE_KEYS.TILE).setAlpha(0.34);
    const nearTiles = this.add.tileSprite(640, 360, 1280, 720, TEXTURE_KEYS.TILE).setAlpha(0.2);
    this.tweens.add({
      targets: farTiles,
      tilePositionX: 80,
      duration: 12000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: nearTiles,
      tilePositionY: -70,
      duration: 9000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    const veil = this.add.graphics();
    veil.fillGradientStyle(0x33205f, 0x15102a, 0x070a22, 0x12091f, 0.7, 0.55, 1, 1);
    veil.fillRect(0, 0, 1280, 720);

    const birthdayMoon = this.add.circle(1078, 118, 78, UI_COLORS.cream, 0.24).setBlendMode(Phaser.BlendModes.ADD);
    const warmGlow = this.add.circle(1044, 152, 190, this.levelConfig.themeColor, 0.08).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: [birthdayMoon, warmGlow],
      scale: 1.08,
      alpha: '+=0.04',
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });

    for (let index = 0; index < 38; index += 1) {
      this.add
        .circle(
          Phaser.Math.Between(30, 1250),
          Phaser.Math.Between(28, 690),
          Phaser.Math.Between(1, 3),
          COLORS.moon,
          Phaser.Math.FloatBetween(0.12, 0.55),
        )
        .setDepth(1);
    }

    const mistColors = this.levelConfig.ambientParticleColor.map((c: string) => parseInt(c));
    this.particles.createAmbientMist(mistColors).setDepth(2);
  }

  private createActors(): void {
    const animations = new AnimationManager(this);
    this.player = new Heena(this, this.levelConfig.playerStart.x, this.levelConfig.playerStart.y);

    this.crystals = this.physics.add.group({ immovable: true, allowGravity: false });
    const crystalObjects: Phaser.GameObjects.GameObject[] = [];
    this.levelConfig.collectibles.forEach((spawn: any) => {
      const crystal = this.physics.add.image(spawn.x, spawn.y, TEXTURE_KEYS.CRYSTAL);
      crystal.setDepth(10).setCircle(22).setScale(0.88);
      
      // Color-theme the crystals to match level
      crystal.setTint(this.levelConfig.themeColor);

      this.crystals.add(crystal);
      crystalObjects.push(crystal);
      animations.shimmerCrystal(crystal);
    });
    animations.createAmbientTweens(crystalObjects);

    // Spawn custom NPCs dynamically
    this.npcSprites.clear();
    this.levelConfig.npcs.forEach((npc: any) => {
      const npcSprite = this.physics.add.image(npc.x, npc.y, npc.texture).setDepth(25);
      this.tweens.add({
        targets: npcSprite,
        y: npc.y - 18,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
      this.npcSprites.set(npc.id, npcSprite);
    });

    // Spawn Portal
    const portalCfg = this.levelConfig.portal;
    this.portal = this.add
      .image(portalCfg.x, portalCfg.y, TEXTURE_KEYS.PORTAL)
      .setDepth(8)
      .setAlpha(0.28)
      .setScale(0.86);
      
    this.portal.setTint(this.levelConfig.themeColor);
    animations.pulsePortal(this.portal);

    this.physics.add.overlap(this.player, this.crystals, (_player, crystal) => {
      this.collectCrystal(crystal as Phaser.Physics.Arcade.Image);
    });
  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error("Keyboard input is required for Heena's Birthday Adventure.");
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys('W,A,S,D,SPACE') as MovementKeys;
    keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, () => this.audioManager.unlock());
    this.keys.SPACE.on(Phaser.Input.Keyboard.Events.DOWN, () => this.handleAction());
  }

  private createSystems(): void {
    this.dialogueBox = new DialogueBox(this);
    this.dialogue = new DialogueEngine({
      scene: this,
      story: this.story,
      ui: this.dialogueBox,
      saveManager: this.saveManager,
      audioManager: this.audioManager,
      onBackground: (background) => this.applyDialogueBackground(background),
      onMusic: (music) => this.applyDialogueMusic(music),
      onCamera: (camera) => this.applyDialogueCamera(camera),
      onEvent: (event) => this.handleDialogueEvent(event),
      onComplete: () => this.resetCameraAfterDialogue(),
    });
    new ResponsiveCanvas(this).bind(() => {
      this.cameras.main.setViewport(0, 0, 1280, 720);
    });
  }

  private createObjectivesList(): void {
    new GlassPanel(this, 1120, 95, 280, 120, {
      radius: 20,
      fillAlpha: 0.54,
      strokeAlpha: 0.25,
      glowAlpha: 0.1
    }).setDepth(900);

    this.add.text(995, 48, "Objectives", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '17px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setDepth(901);

    this.objectiveTexts = [];
    this.levelConfig.objectives.forEach((obj: any, index: number) => {
      const textObj = this.add.text(995, 80 + index * 26, `- ${obj.description}`, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '14px',
        color: UI_HEX.cream
      }).setDepth(901);
      
      this.objectiveTexts.push({
        id: obj.id,
        textObject: textObj,
        desc: obj.description
      });
    });

    this.updateObjectivesDisplay();
  }

  private updateObjectivesDisplay(): void {
    this.objectiveTexts.forEach(item => {
      const isDone = this.objectivesProgress[item.id] === true;
      if (isDone) {
        item.textObject.setText(`✓ ${item.desc}`).setColor('#10b981');
      } else {
        if (item.id === 'collect_crystals') {
          item.textObject.setText(`- ${item.desc} (${this.collected}/${this.totalCrystals})`).setColor(UI_HEX.cream);
        } else {
          item.textObject.setText(`- ${item.desc}`).setColor(UI_HEX.cream);
        }
      }
    });
  }

  private completeObjective(id: string): void {
    if (this.objectivesProgress[id] === true) return;

    this.objectivesProgress[id] = true;
    this.audioManager.playTone(880, 180, 0.08); // complete sound
    this.updateObjectivesDisplay();

    this.checkAllObjectivesCompleted();
  }

  private checkAllObjectivesCompleted(): void {
    const allDone = this.levelConfig.objectives.every((obj: any) => this.objectivesProgress[obj.id] === true);
    if (allDone && !this.portalReady) {
      this.openPortal();
    }
  }

  private startMiniGame(): void {
    this.player.setVelocity(0, 0);
    if (this.input.keyboard) {
      this.input.keyboard.resetKeys();
    }

    this.gamePausedForMinigame = true;

    new MiniGamePanel(
      this,
      640,
      360,
      this.levelConfig.minigame,
      () => {
        // Match win callback
        this.gamePausedForMinigame = false;
        this.completeObjective('play_minigame');
      },
      () => {
        // Cancel/close callback
        this.gamePausedForMinigame = false;
      }
    );
  }

  private collectCrystal(crystal: Phaser.Physics.Arcade.Image): void {
    if (!crystal.active) {
      return;
    }

    crystal.disableBody(true, true);
    this.collected += 1;
    this.audioManager.playTone(660 + this.collected * 42, 130, 0.08);
    this.particles.burst(crystal.x, crystal.y);
    
    this.updateHud();
    this.updateObjectivesDisplay();

    if (this.collected >= this.totalCrystals) {
      this.completeObjective('collect_crystals');
    }
  }

  private openPortal(): void {
    this.portalReady = true;
    this.audioManager.playTone(880, 260, 0.08);
    this.tweens.add({
      targets: this.portal,
      alpha: 1,
      scale: 1.12,
      duration: 420,
      ease: 'Back.out',
    });
    this.dialogue.start('portalReady');
  }

  private handleAction(): void {
    if (this.dialogue.isActive) {
      this.dialogue.advanceOrSkip();
      return;
    }

    // Check if near any NPC
    let nearNpc: any = null;
    this.levelConfig.npcs.forEach((npc: any) => {
      const sprite = this.npcSprites.get(npc.id);
      if (sprite && Phaser.Math.Distance.BetweenPoints(this.player, sprite) < npc.interactiveRange) {
        nearNpc = npc;
      }
    });

    if (nearNpc) {
      const hasMinigame = this.levelConfig.minigame && this.levelConfig.minigame.triggerNpc === nearNpc.id;
      const isMinigameDone = this.objectivesProgress['play_minigame'] === true;

      if (hasMinigame && !isMinigameDone) {
        this.startMiniGame();
      } else {
        this.dialogue.start(this.portalReady ? 'portalReminder' : nearNpc.dialogueNode);
      }
      return;
    }

    if (this.portalReady && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y) < 96) {
      this.finishAdventure();
    }
  }

  private showIntroDialogue(): void {
    this.dialogue.start('intro');
  }

  private applyDialogueBackground(background: string): void {
    if (this.textures.exists(background)) {
      if (!this.dialogueBgImage) {
        this.dialogueBgImage = this.add.image(640, 360, background)
          .setDisplaySize(1280, 720)
          .setDepth(2)
          .setAlpha(0);
      } else {
        this.dialogueBgImage.setTexture(background);
      }
      this.tweens.add({
        targets: this.dialogueBgImage,
        alpha: 1,
        duration: 450,
        ease: 'Power2',
      });
    } else {
      const tint = background === 'portalBloom' ? UI_COLORS.pink : UI_COLORS.gold;
      const bloom = this.add.circle(640, 360, 520, tint, 0).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: bloom,
        alpha: background === 'portalBloom' ? 0.16 : 0.08,
        scale: 1.12,
        duration: 520,
        yoyo: true,
        ease: 'Sine.inOut',
        onComplete: () => bloom.destroy(),
      });
    }
  }

  private applyDialogueMusic(music: string): void {
    if (this.cache.audio.exists(music)) {
      this.audioManager.playMusic(music, true, 0.45, 800);
    } else {
      const tone = music === 'portalTheme' ? 740 : 440;
      this.audioManager.playTone(tone, 180, 0.035);
    }
  }

  private applyDialogueCamera(camera: DialogueCameraCommand): void {
    if (camera.pan) {
      this.cameras.main.pan(camera.pan.x, camera.pan.y, camera.pan.durationMs ?? 500, 'Sine.easeInOut');
    }
    if (camera.zoom) {
      this.cameras.main.zoomTo(camera.zoom.value, camera.zoom.durationMs ?? 500, 'Sine.easeInOut');
    }
    if (camera.shake) {
      this.cameras.main.shake(camera.shake.durationMs ?? 180, camera.shake.intensity ?? 0.004);
    }
  }

  private handleDialogueEvent(event: DialogueEventDefinition): void {
    if (event.type === 'portal_ready') {
      this.particles.burst(this.portal.x, this.portal.y);
    }
  }

  private resetCameraAfterDialogue(): void {
    this.cameras.main.pan(640, 360, 360, 'Sine.easeInOut');
    this.cameras.main.zoomTo(1, 360, 'Sine.easeInOut');
  }

  private finishAdventure(): void {
    const elapsedMs = this.time.now - this.startTime;
    const save = this.saveManager.load();

    const levelsList = this.cache.json.get('levels-manifest') as Array<{ id: string }>;
    const currentLevelIndex = levelsList.findIndex((l) => l.id === this.levelId);
    const nextLevel = levelsList[currentLevelIndex + 1];

    const isAlreadyCompleted = save.completedLevels.includes(this.levelId);
    const completedLevels = isAlreadyCompleted ? save.completedLevels : [...save.completedLevels, this.levelId];

    const newlyUnlocked = (nextLevel && !save.completedLevels.includes(nextLevel.id)) ? nextLevel.id : null;

    const levelBestTimes = save.levelBestTimes ?? {};
    const previousBest = levelBestTimes[this.levelId];
    levelBestTimes[this.levelId] = previousBest ? Math.min(previousBest, elapsedMs) : elapsedMs;

    const hasCompletedAdventure = save.hasCompletedAdventure || (this.levelId === 'castle');

    this.saveManager.save({
      crystals: this.collected,
      bestTimeMs: save.bestTimeMs === null ? elapsedMs : Math.min(save.bestTimeMs, elapsedMs),
      hasCompletedAdventure,
      completedLevels,
      newlyUnlockedLevelId: newlyUnlocked,
      levelBestTimes,
      activeLevelId: nextLevel ? nextLevel.id : this.levelId,
      dialogueProgress: undefined,
    });

    this.audioManager.stopMusic(1000);
    this.audioManager.playTone(988, 420, 0.1);
    this.particles.burst(this.portal.x, this.portal.y);

    if (this.keys) {
      this.keys.SPACE.removeAllListeners();
    }

    const completionPanel = new GlassPanel(this, 640, 358, 610, 220, {
      radius: 34,
      fillAlpha: 0.72,
      strokeAlpha: 0.44,
      glowAlpha: 0.28,
    })
      .setDepth(1999)
      .setScale(0.9)
      .setAlpha(0);
    const wishText = this.add
      .text(640, 326, 'Birthday Wish Complete', {
        fontFamily: FONT_FAMILY.display,
        fontSize: '48px',
        color: UI_HEX.cream,
        fontStyle: '800',
        align: 'center',
        stroke: '#241341',
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setAlpha(0)
      .setScale(0.86);
    const subtitle = this.add
      .text(640, 388, `You have completed the ${this.levelConfig.name}!`, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '22px',
        color: UI_HEX.gold,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setAlpha(0);
    this.tweens.add({
      targets: completionPanel,
      alpha: 1,
      scale: 1,
      duration: 360,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: wishText,
      alpha: 1,
      scale: 1,
      duration: 420,
      ease: 'Back.out',
    });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 380, delay: 140, ease: 'Sine.out' });

    this.time.delayedCall(2500, () => SceneManager.fadeTo(this, SCENE_KEYS.MAP));
  }

  private updateHud(): void {
    const uiScene = this.scene.get(SCENE_KEYS.UI);
    uiScene.events.emit('hud:update', {
      crystals: this.collected,
      total: this.totalCrystals,
      elapsedMs: this.time.now - this.startTime,
    });
  }
}

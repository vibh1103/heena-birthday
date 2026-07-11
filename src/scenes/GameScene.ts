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
  private playerSpotlight: Phaser.GameObjects.Arc | null = null;
  private veil: Phaser.GameObjects.Graphics | null = null;
  private sunriseOverlay: Phaser.GameObjects.Rectangle | null = null;
  private mistEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

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

    if (this.levelId === 'wizard') {
      this.setupMagicalAcademyElements();
    }

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

    if (this.playerSpotlight && this.player) {
      this.playerSpotlight.setPosition(this.player.x, this.player.y);
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

    this.veil = this.add.graphics();
    this.veil.fillGradientStyle(0x33205f, 0x15102a, 0x070a22, 0x12091f, 0.7, 0.55, 1, 1);
    this.veil.fillRect(0, 0, 1280, 720);

    // Golden sunrise overlay (fades in as memories are unlocked)
    this.sunriseOverlay = this.add.rectangle(640, 360, 1280, 720, 0xfef08a, 0)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.ADD);

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
    this.mistEmitter = this.particles.createAmbientMist(mistColors).setDepth(2);
  }

  private createActors(): void {
    const animations = new AnimationManager(this);
    this.player = new Heena(this, this.levelConfig.playerStart.x, this.levelConfig.playerStart.y);

    this.crystals = this.physics.add.group({ immovable: true, allowGravity: false });
    const crystalObjects: Phaser.GameObjects.GameObject[] = [];
    this.levelConfig.collectibles.forEach((spawn: any) => {
      const texture = spawn.texture ?? TEXTURE_KEYS.CRYSTAL;
      const crystal = this.physics.add.image(spawn.x, spawn.y, texture);
      crystal.setDepth(10).setCircle(22).setScale(0.88);
      
      // Color-theme default crystals
      if (!spawn.texture) {
        crystal.setTint(this.levelConfig.themeColor);
      }

      // Setup hover interactions
      crystal.setInteractive();
      crystal.on(Phaser.Input.Events.POINTER_OVER, () => {
        this.tweens.add({
          targets: crystal,
          scale: 1.06,
          duration: 150,
          ease: 'Power1'
        });
        this.audioManager.playTone(440, 50, 0.04);
        
        // Spawn small hover sparkles
        const hoverEmitter = this.add.particles(crystal.x, crystal.y, TEXTURE_KEYS.SPARK, {
          speed: { min: 20, max: 40 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.8, end: 0 },
          lifespan: 400,
          blendMode: Phaser.BlendModes.ADD,
          tint: this.levelConfig.themeColor
        });
        hoverEmitter.explode(6);
        this.time.delayedCall(400, () => {
          if (hoverEmitter) hoverEmitter.destroy();
        });
      });

      crystal.on(Phaser.Input.Events.POINTER_OUT, () => {
        this.tweens.add({
          targets: crystal,
          scale: 0.88,
          duration: 150,
          ease: 'Power1'
        });
      });

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

    // Spawn Portal / Door
    const portalCfg = this.levelConfig.portal;
    const portalTexture = portalCfg.texture ?? TEXTURE_KEYS.PORTAL;
    this.portal = this.add
      .image(portalCfg.x, portalCfg.y, portalTexture)
      .setDepth(8)
      .setAlpha(0.28)
      .setScale(0.86);
      
    if (portalTexture === TEXTURE_KEYS.PORTAL) {
      this.portal.setTint(this.levelConfig.themeColor);
    }
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
    
    this.updateHud();
    this.updateObjectivesDisplay();

    if (this.levelId === 'garden') {
      this.showMemoryOverlay(this.collected, () => {
        // Trigger environment change callbacks:
        
        // 1. Fog clears (veil alpha drops)
        if (this.veil) {
          this.tweens.add({
            targets: this.veil,
            alpha: Math.max(0.12, this.veil.alpha - 0.14),
            duration: 1600
          });
        }
        
        // 2. Sunrise begins (sunriseOverlay alpha increases)
        if (this.sunriseOverlay) {
          this.tweens.add({
            targets: this.sunriseOverlay,
            alpha: Math.min(0.64, this.sunriseOverlay.alpha + 0.16),
            duration: 2000
          });
        }
        
        // 3. Music becomes softer
        const curVol = this.audioManager.getMusicVolume();
        this.audioManager.setMusicVolume(curVol * 0.72);
        
        // 4. Mist particles warm up (tints shift)
        if (this.mistEmitter) {
          (this.mistEmitter as any).setTint([0xfca5a5, 0xfecdd3, 0xffedd5]);
        }
        
        // 5. Play sweet chime and warm burst
        this.audioManager.playTone(880, 160, 0.08);
        const warmBurst = this.add.particles(this.player.x, this.player.y, TEXTURE_KEYS.STAR, {
          speed: { min: 40, max: 120 },
          scale: { start: 0.75, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 800,
          tint: 0xfca5a5,
          blendMode: Phaser.BlendModes.ADD
        });
        warmBurst.explode(16);
        this.time.delayedCall(800, () => warmBurst.destroy());

        if (this.collected >= this.totalCrystals) {
          this.completeObjective('collect_crystals');
        }
      });
    } else {
      this.audioManager.playTone(660 + this.collected * 42, 130, 0.08);
      this.particles.burst(crystal.x, crystal.y);
      if (this.collected >= this.totalCrystals) {
        this.completeObjective('collect_crystals');
      }
    }
  }

  private openPortal(): void {
    this.portalReady = true;
    const portalCfg = this.levelConfig.portal;

    if (portalCfg.exitType === 'door') {
      // 1. Play door opening sound sweep (creaking sound!)
      this.audioManager.playTone(220, 200, 0.07);
      this.time.delayedCall(200, () => this.audioManager.playTone(293, 350, 0.06));

      // 2. Door opens (swing open tween: scaleX = 0)
      this.tweens.add({
        targets: this.portal,
        scaleX: 0,
        duration: 800,
        ease: 'Cubic.easeOut'
      });

      // 3. Light beams appear behind the door
      const rayCount = 12;
      for (let i = 0; i < rayCount; i++) {
        const ray = this.add.graphics().setDepth(7).setAlpha(0);
        ray.fillStyle(0xfef08a, 0.22);
        
        const angleStart = (i * (360 / rayCount)) * (Math.PI / 180);
        const angleEnd = ((i + 0.5) * (360 / rayCount)) * (Math.PI / 180);
        const length = 380;
        
        ray.beginPath();
        ray.moveTo(portalCfg.x, portalCfg.y);
        ray.lineTo(portalCfg.x + Math.cos(angleStart) * length, portalCfg.y + Math.sin(angleStart) * length);
        ray.lineTo(portalCfg.x + Math.cos(angleEnd) * length, portalCfg.y + Math.sin(angleEnd) * length);
        ray.closePath();
        ray.fillPath();
        
        this.tweens.add({
          targets: ray,
          alpha: 0.3,
          angle: '+=360',
          duration: 9000 + i * 1500,
          repeat: -1
        });
      }

      // 4. Birthday Crystal floats upward from the door center
      const floatingCrystal = this.add.image(portalCfg.x, portalCfg.y, TEXTURE_KEYS.CRYSTAL)
        .setDepth(10)
        .setAlpha(0)
        .setScale(0.5);
      
      this.tweens.add({
        targets: floatingCrystal,
        alpha: 1,
        y: portalCfg.y - 70,
        scale: 1.05,
        angle: 360,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: floatingCrystal,
            y: portalCfg.y - 80,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      });

      // 5. Camera zooms & pans
      this.cameras.main.zoomTo(1.25, 1200, 'Cubic.easeInOut');
      this.cameras.main.pan(portalCfg.x, portalCfg.y - 45, 1200, 'Cubic.easeInOut');

      const celebrationEmitter = this.add.particles(portalCfg.x, portalCfg.y - 40, TEXTURE_KEYS.STAR, {
        speed: { min: 80, max: 240 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1.0, end: 0 },
        lifespan: 800,
        gravityY: 100,
        blendMode: Phaser.BlendModes.ADD,
        tint: [0xfacc15, 0xffffff, 0xf59e0b]
      });
      celebrationEmitter.explode(45);
      
      this.time.delayedCall(1200, () => {
        if (celebrationEmitter) celebrationEmitter.destroy();
      });

    } else {
      // Standard portal fade in
      this.audioManager.playTone(880, 260, 0.08);
      this.tweens.add({
        targets: this.portal,
        alpha: 1,
        scale: 1.12,
        duration: 420,
        ease: 'Back.out',
      });
    }

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

    if (this.levelId === 'castle') {
      this.time.delayedCall(1200, () => {
        SceneManager.fadeTo(this, SCENE_KEYS.ENDING);
      });
      return;
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

  private setupMagicalAcademyElements(): void {
    // 1. Floating Candles
    for (let i = 0; i < 8; i++) {
      const cx = Phaser.Math.Between(100, 1180);
      const cy = Phaser.Math.Between(80, 260);

      const candle = this.add.container(cx, cy).setDepth(6);

      const wax = this.add.graphics();
      wax.fillStyle(0xfef08a, 0.95);
      wax.fillRoundedRect(-4, -12, 8, 24, 2);
      candle.add(wax);

      const flame = this.add.circle(0, -15, 5, 0xf97316).setBlendMode(Phaser.BlendModes.ADD);
      candle.add(flame);

      this.tweens.add({
        targets: flame,
        scale: 1.35,
        alpha: 0.7,
        duration: Phaser.Math.Between(150, 300),
        yoyo: true,
        repeat: -1
      });

      this.tweens.add({
        targets: candle,
        y: cy - 20,
        duration: Phaser.Math.Between(1800, 2800),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // 2. Flying Owl
    const owl = this.add.image(-60, 120, TEXTURE_KEYS.OWL).setDepth(6).setScale(0.85);
    const flyAcross = () => {
      const startRight = owl.x < 0;
      const targetX = startRight ? 1340 : -60;
      owl.setFlipX(startRight);

      this.tweens.add({
        targets: owl,
        x: targetX,
        y: 120 + Phaser.Math.Between(-30, 30),
        duration: 6000,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.time.delayedCall(Phaser.Math.Between(8000, 15000), flyAcross);
        }
      });
    };
    this.time.delayedCall(3000, flyAcross);

    // 3. Moving Portraits
    const portraitPositions = [
      { x: 300, y: 150 },
      { x: 640, y: 130 },
      { x: 980, y: 150 }
    ];

    portraitPositions.forEach((pos, idx) => {
      const frame = this.add.graphics().setDepth(3);
      frame.lineStyle(4, 0xb45309, 0.95);
      frame.fillStyle(0x0e0b1f, 0.9);
      frame.fillRoundedRect(pos.x - 36, pos.y - 48, 72, 96, 6);
      frame.strokeRoundedRect(pos.x - 36, pos.y - 48, 72, 96, 6);

      const subject = this.add.circle(pos.x, pos.y, 10, idx === 0 ? 0x22c55e : (idx === 1 ? 0xa855f7 : 0xec4899))
        .setDepth(4)
        .setAlpha(0.6)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: subject,
        scale: 1.5,
        x: pos.x + (idx === 0 ? 8 : -8),
        y: pos.y + (idx === 2 ? 6 : -6),
        duration: 2500 + idx * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });

    // 4. Follow spotlight
    this.playerSpotlight = this.add.circle(this.player.x, this.player.y, 180, this.levelConfig.themeColor, 0.05)
      .setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);

    // 5. Bright Fireflies Emitter
    this.add.particles(0, 0, TEXTURE_KEYS.SPARK, {
      x: { min: 0, max: 1280 },
      y: { min: 0, max: 720 },
      lifespan: 3000,
      speed: { min: 10, max: 20 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 1,
      frequency: 150,
      tint: 0xfacc15,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(5);
  }

  private showMemoryOverlay(index: number, onClosed: () => void): void {
    this.gamePausedForMinigame = true;
    this.player.setVelocity(0, 0);
    if (this.input.keyboard) {
      this.input.keyboard.resetKeys();
    }

    const memories = [
      {
        title: "💍 Memory Unlocked: Our Wedding Day",
        desc: "A promise of forever, written in laughter and tears of joy.\nYou looked absolutely radiant, a memory etched in stars."
      },
      {
        title: "👶 Memory Unlocked: Baby Steps",
        desc: "Chasing tiny footsteps, watching you grow and explore.\nEvery single milestone a precious treasure in our hearts."
      },
      {
        title: "✈️ Memory Unlocked: The Adventure Trip",
        desc: "Wandering through new streets, hand in hand, finding magic\nin everyday moments and getting lost in beautiful horizons."
      },
      {
        title: "❤️ Memory Unlocked: Our Anniversary",
        desc: "Another year of love, support, and pair programming through\nlife's compile errors. Happy Anniversary, my partner in everything."
      }
    ];

    const mem = memories[index - 1] ?? { title: "Memory", desc: "A sweet memory of love." };

    const overlay = this.add.container(640, 360).setDepth(2000);

    const bg = new GlassPanel(this, 0, 0, 680, 240, {
      radius: 28,
      fillAlpha: 0.95,
      strokeAlpha: 0.5,
      glowAlpha: 0.35
    });
    overlay.add(bg);

    const title = this.add.text(0, -60, mem.title, {
      fontFamily: FONT_FAMILY.display,
      fontSize: '24px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setOrigin(0.5);
    overlay.add(title);

    const body = this.add.text(0, 10, mem.desc, {
      fontFamily: FONT_FAMILY.body,
      fontSize: '16px',
      color: UI_HEX.cream,
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5);
    overlay.add(body);

    const btn = this.add.text(0, 75, "Cherish Memory", {
      fontFamily: FONT_FAMILY.body,
      fontSize: '16px',
      color: UI_HEX.gold,
      fontStyle: '700',
      backgroundColor: '#1e1b4b',
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive();
    
    // Draw button border
    const border = this.add.graphics();
    border.lineStyle(1.5, UI_COLORS.purple, 0.7);
    border.strokeRoundedRect(-70, 50, 140, 48, 8);
    overlay.add(border);
    overlay.add(btn);

    btn.on(Phaser.Input.Events.POINTER_OVER, () => {
      btn.setColor(UI_HEX.cream);
      this.audioManager.playTone(440, 50, 0.05);
    });
    btn.on(Phaser.Input.Events.POINTER_OUT, () => btn.setColor(UI_HEX.gold));
    btn.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioManager.playTone(523.25, 120, 0.08);
      
      // Zoom out overlay
      this.tweens.add({
        targets: overlay,
        scale: 0.85,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          overlay.destroy();
          border.destroy();
          this.gamePausedForMinigame = false;
          onClosed();
        }
      });
    });

    // Zoom in overlay
    overlay.setScale(0.85).setAlpha(0);
    this.tweens.add({
      targets: overlay,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.out'
    });
  }
}

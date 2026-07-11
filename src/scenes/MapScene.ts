import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { GlassPanel } from '../components/GlassPanel';
import { MagicButton } from '../components/MagicButton';
import { SaveGameManager } from '../systems/SaveGameManager';
import { SCENE_KEYS } from '../utils/constants';
import { FONT_FAMILY, UI_HEX } from '../utils/uiTheme';
import { TEXTURE_KEYS } from '../assets/assetManifest';

export interface LevelConfig {
  id: string;
  name: string;
  description: string;
  mapX: number;
  mapY: number;
  themeColor: number;
  textColor: string;
  levelFile: string;
}

export class MapScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private saveManager = new SaveGameManager();
  
  // Drag-to-pan camera variables
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;

  // Visual layers (Containers)
  private skyLayer!: Phaser.GameObjects.Container;
  private cloudsFarLayer!: Phaser.GameObjects.Container;
  private mapLayer!: Phaser.GameObjects.Container;
  private cloudsNearLayer!: Phaser.GameObjects.Container;

  // Graphics objects
  private waterGraphics!: Phaser.GameObjects.Graphics;
  private pathsGraphics!: Phaser.GameObjects.Graphics;
  private activePathGraphics!: Phaser.GameObjects.Graphics;

  // UI elements
  private infoPanel: GlassPanel | null = null;
  private infoTitle!: Phaser.GameObjects.Text;
  private infoDesc!: Phaser.GameObjects.Text;
  private infoStatus!: Phaser.GameObjects.Text;

  // State
  private levels: LevelConfig[] = [];
  private completedLevels: string[] = [];
  private newlyUnlockedLevelId: string | null = null;
  private levelNodes: Map<string, Phaser.GameObjects.Container> = new Map();
  private clouds: Array<{ sprite: Phaser.GameObjects.Image; speed: number; scrollFactor: number }> = [];
  private waterRipples: Phaser.GameObjects.Arc[] = [];

  public constructor() {
    super(SCENE_KEYS.MAP);
  }

  public create(): void {
    const save = this.saveManager.load();
    this.completedLevels = save.completedLevels;
    this.newlyUnlockedLevelId = save.newlyUnlockedLevelId ?? null;
    this.levels = this.cache.json.get('levels-manifest') as LevelConfig[];

    // Fade in camera
    this.cameras.main.fadeIn(600, 5, 3, 10);
    this.cameras.main.setBounds(0, 0, 2000, 1200);

    this.audioManager = new AudioManager(this);
    this.audioManager.unlock();

    // Play map background ambiance tone / music
    this.audioManager.playMusic('mapTheme', true, 0.35, 1200);

    // Initialize parallax layers
    this.skyLayer = this.add.container(0, 0).setScrollFactor(0.15);
    this.cloudsFarLayer = this.add.container(0, 0).setScrollFactor(0.4);
    this.mapLayer = this.add.container(0, 0).setScrollFactor(1.0);
    this.cloudsNearLayer = this.add.container(0, 0).setScrollFactor(1.4);

    // Create sky backdrop (fixed scroll)
    const skyBg = this.add.graphics();
    skyBg.fillGradientStyle(0x060312, 0x0c0628, 0x18093c, 0x1f0b4d, 1);
    skyBg.fillRect(0, 0, 2000, 1200);
    skyBg.setScrollFactor(0);
    this.add.existing(skyBg);
    // Send skyBg to the very back
    skyBg.setDepth(-10);

    // 1. Sky layer: Twinkling stars
    this.createTwinklingStars();

    // 2. Far Clouds
    this.createFarClouds();

    // 3. Map layer: Ocean background and islands
    this.createWater();
    this.createIslands();
    this.drawLevelPaths();
    this.createLevelNodes();

    // 4. Near Clouds
    this.createNearClouds();

    // 5. HUD & UI Layer (Fixed Scroll)
    this.createUI();

    // Enable drag panning
    this.setupCameraPanning();

    // Trigger path unlock sequence if there's a newly completed level
    if (this.newlyUnlockedLevelId) {
      this.time.delayedCall(800, () => this.runUnlockSequence());
    } else {
      // Focus camera on the active level (last completed + 1, or home)
      const nextLevel = this.levels.find(l => !this.completedLevels.includes(l.id)) ?? this.levels[this.levels.length - 1];
      if (nextLevel) {
        this.centerCameraOn(nextLevel.mapX, nextLevel.mapY, 0);
      }
    }
  }

  public update(_time: number, _delta: number): void {
    // 1. Water waves drawing
    this.animateWater();

    // 2. Move Far & Near clouds (floating animation)
    this.clouds.forEach(cloud => {
      cloud.sprite.x += cloud.speed;
      // Wrap around bounds
      if (cloud.sprite.x > 2200) {
        cloud.sprite.x = -200;
        cloud.sprite.y = Phaser.Math.Between(100, 1100);
      }
    });

    // 3. Ambient ripples fading in/out
    this.animateRipples();
  }

  private setupCameraPanning(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Don't pan if clicking UI elements or during animation
      if (this.newlyUnlockedLevelId) return;

      this.isDragging = true;
      this.dragStartX = this.cameras.main.scrollX + pointer.x;
      this.dragStartY = this.cameras.main.scrollY + pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        this.cameras.main.scrollX = this.dragStartX - pointer.x;
        this.cameras.main.scrollY = this.dragStartY - pointer.y;
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
  }

  private centerCameraOn(x: number, y: number, duration = 800): void {
    const clampedX = Phaser.Math.Clamp(x - 640, 0, 2000 - 1280);
    const clampedY = Phaser.Math.Clamp(y - 360, 0, 1200 - 720);

    if (duration === 0) {
      this.cameras.main.scrollX = clampedX;
      this.cameras.main.scrollY = clampedY;
    } else {
      this.tweens.add({
        targets: this.cameras.main,
        scrollX: clampedX,
        scrollY: clampedY,
        duration: duration,
        ease: 'Quad.easeInOut'
      });
    }
  }

  private createTwinklingStars(): void {
    for (let i = 0; i < 90; i++) {
      const star = this.add.star(
        Phaser.Math.Between(0, 2000),
        Phaser.Math.Between(0, 1200),
        5,
        Phaser.Math.Between(2, 4),
        Phaser.Math.Between(5, 10),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.6)
      ).setBlendMode(Phaser.BlendModes.ADD);

      this.skyLayer.add(star);

      // Star twinkle animation
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.7, 1.0),
        scale: Phaser.Math.FloatBetween(0.8, 1.3),
        duration: Phaser.Math.Between(1000, 3000),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.inOut'
      });
    }
  }

  private createFarClouds(): void {
    // Generate soft, slow drifting clouds in the background
    for (let i = 0; i < 6; i++) {
      // Draw procedural cloud texture
      const key = `cloud-far-${i}`;
      if (!this.textures.exists(key)) {
        const graphics = this.make.graphics({ x: 0, y: 0 }, false);
        graphics.fillStyle(0xffffff, 0.15);
        graphics.fillCircle(40, 40, 35);
        graphics.fillCircle(75, 40, 42);
        graphics.fillCircle(110, 40, 35);
        graphics.fillCircle(55, 20, 30);
        graphics.fillCircle(90, 20, 30);
        graphics.generateTexture(key, 150, 90);
        graphics.destroy();
      }

      const cloudImg = this.add.image(
        Phaser.Math.Between(-100, 1900),
        Phaser.Math.Between(50, 1100),
        key
      );
      this.cloudsFarLayer.add(cloudImg);
      this.clouds.push({
        sprite: cloudImg,
        speed: Phaser.Math.FloatBetween(0.1, 0.25),
        scrollFactor: 0.4
      });
    }
  }

  private createNearClouds(): void {
    // Drifting foreground clouds (faster, higher opacity)
    for (let i = 0; i < 5; i++) {
      const key = `cloud-near-${i}`;
      if (!this.textures.exists(key)) {
        const graphics = this.make.graphics({ x: 0, y: 0 }, false);
        graphics.fillStyle(0xffffff, 0.24);
        graphics.fillCircle(60, 60, 50);
        graphics.fillCircle(110, 60, 60);
        graphics.fillCircle(160, 60, 50);
        graphics.fillCircle(85, 30, 45);
        graphics.fillCircle(135, 30, 45);
        graphics.generateTexture(key, 220, 130);
        graphics.destroy();
      }

      const cloudImg = this.add.image(
        Phaser.Math.Between(-200, 1800),
        Phaser.Math.Between(0, 1200),
        key
      ).setDepth(200); // foreground
      this.cloudsNearLayer.add(cloudImg);
      this.clouds.push({
        sprite: cloudImg,
        speed: Phaser.Math.FloatBetween(0.4, 0.8),
        scrollFactor: 1.4
      });
    }
  }

  private createWater(): void {
    this.waterGraphics = this.add.graphics();
    this.mapLayer.add(this.waterGraphics);

    // Spawn initial water ripples/bubbles
    for (let i = 0; i < 24; i++) {
      const x = Phaser.Math.Between(50, 1950);
      const y = Phaser.Math.Between(50, 1150);
      const ripple = this.add.circle(x, y, Phaser.Math.Between(15, 35), 0x0ea5e9, 0.08)
        .setStrokeStyle(1.5, 0x38bdf8, 0.12);
      this.mapLayer.add(ripple);
      this.waterRipples.push(ripple);
    }
  }

  private animateWater(): void {
    this.waterGraphics.clear();
    
    // Wave lines in the background
    // Draw 8 stylized flow lines across the map
    this.waterGraphics.lineStyle(1.5, 0x1d4ed8, 0.12);
    for (let i = 0; i < 8; i++) {
      const yBase = 100 + i * 140;
      this.waterGraphics.beginPath();
      for (let x = 0; x <= 2000; x += 50) {
        const offset = Math.sin((x / 140) + (this.time.now / 1200) + i) * 18;
        if (x === 0) {
          this.waterGraphics.moveTo(x, yBase + offset);
        } else {
          this.waterGraphics.lineTo(x, yBase + offset);
        }
      }
      this.waterGraphics.strokePath();
    }
  }

  private animateRipples(): void {
    this.waterRipples.forEach(ripple => {
      // Pulse scale and alpha
      ripple.scale += 0.002;
      const progress = ripple.scale - 1; // starts at 0, goes up
      ripple.setAlpha(Math.max(0, 0.8 - progress * 1.5));

      if (ripple.alpha <= 0) {
        // Reset to new position
        ripple.x = Phaser.Math.Between(50, 1950);
        ripple.y = Phaser.Math.Between(50, 1150);
        ripple.scale = 1.0;
        ripple.setAlpha(0.08);
      }
    });
  }

  private createIslands(): void {
    // Draw beautiful, glowing islands for each level
    this.levels.forEach(level => {
      // Create island graphics
      const islandGraphics = this.add.graphics();
      islandGraphics.fillStyle(0x0e072b, 0.7); // Deep dark purple base
      islandGraphics.lineStyle(4, level.themeColor, 0.35);

      // Draw custom organic-looking shapes (overlapping circles/ovals)
      islandGraphics.fillEllipse(level.mapX, level.mapY + 10, 140, 80);
      islandGraphics.strokeEllipse(level.mapX, level.mapY + 10, 140, 80);

      islandGraphics.fillStyle(level.themeColor, 0.12);
      islandGraphics.fillEllipse(level.mapX, level.mapY + 10, 120, 68);

      // Draw warm shore waves around islands
      const rippleRing = this.add.ellipse(level.mapX, level.mapY + 10, 150, 90)
        .setStrokeStyle(2, level.themeColor, 0.25);
      this.tweens.add({
        targets: rippleRing,
        width: 175,
        height: 105,
        alpha: 0,
        duration: 2500,
        repeat: -1,
        ease: 'Sine.easeOut'
      });

      this.mapLayer.add(islandGraphics);
      this.mapLayer.add(rippleRing);
    });
  }

  // Draw paths connecting the levels
  private drawLevelPaths(): void {
    this.pathsGraphics = this.add.graphics();
    this.activePathGraphics = this.add.graphics();
    this.mapLayer.add(this.pathsGraphics);
    this.mapLayer.add(this.activePathGraphics);

    this.pathsGraphics.clear();
    this.activePathGraphics.clear();

    for (let i = 0; i < this.levels.length - 1; i++) {
      const fromL = this.levels[i];
      const toL = this.levels[i + 1];
      if (!fromL || !toL) continue;

      // Dotted curve connecting level nodes
      const curve = this.getCurveBetween(fromL, toL);
      const isPathUnlocked = this.completedLevels.includes(fromL.id);

      if (isPathUnlocked) {
        // Draw unlocked active paths in gold
        this.activePathGraphics.lineStyle(4, 0xfacc15, 0.9);
        const points = curve.getPoints(45);
        const startPt = points[0];
        if (startPt) {
          this.activePathGraphics.beginPath();
          this.activePathGraphics.moveTo(startPt.x, startPt.y);
          for (let j = 1; j < points.length; j++) {
            const pt = points[j];
            if (pt) this.activePathGraphics.lineTo(pt.x, pt.y);
          }
          this.activePathGraphics.strokePath();
        }

        // Add soft ambient particle sparkles drifting along unlocked path
        if (i % 2 === 0) {
          const path = new Phaser.Curves.Path(fromL.mapX, fromL.mapY);
          path.add(curve);
          const follower = this.add.follower(path, fromL.mapX, fromL.mapY, TEXTURE_KEYS.STAR).setVisible(false);
          this.mapLayer.add(follower);
          follower.startFollow({
            duration: Phaser.Math.Between(5000, 8000),
            repeat: -1,
            positionOnPath: true,
            rotateToPath: true
          });
          
          this.time.addEvent({
            delay: 150,
            loop: true,
            callback: () => {
              if (follower.active) {
                const sp = this.add.circle(follower.x, follower.y, Phaser.Math.Between(1, 3), 0xfacc15, 0.8)
                  .setBlendMode(Phaser.BlendModes.ADD);
                this.mapLayer.add(sp);
                this.tweens.add({
                  targets: sp,
                  alpha: 0,
                  scale: 0.1,
                  y: '+=10',
                  duration: 800,
                  onComplete: () => sp.destroy()
                });
              }
            }
          });
        }
      } else {
        // Draw locked path as a grey dotted line
        this.pathsGraphics.lineStyle(3, 0x475569, 0.5);
        const points = curve.getPoints(25);
        for (let j = 0; j < points.length - 1; j += 2) {
          const pStart = points[j];
          const pEnd = points[j + 1];
          if (pStart && pEnd) {
            this.pathsGraphics.lineBetween(pStart.x, pStart.y, pEnd.x, pEnd.y);
          }
        }
      }
    }
  }

  private getCurveBetween(fromL: LevelConfig, toL: LevelConfig): Phaser.Curves.QuadraticBezier {
    const p1 = new Phaser.Math.Vector2(fromL.mapX, fromL.mapY);
    const p2 = new Phaser.Math.Vector2(toL.mapX, toL.mapY);
    const mid = new Phaser.Math.Vector2((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    
    // Calculate perpendicular offset for curved paths
    const dir = p2.clone().subtract(p1).normalize();
    const perp = new Phaser.Math.Vector2(-dir.y, dir.x).scale(65);
    const control = mid.clone().add(perp);

    return new Phaser.Curves.QuadraticBezier(p1, control, p2);
  }

  private createLevelNodes(): void {
    this.levels.forEach((level, index) => {
      const container = this.add.container(level.mapX, level.mapY);
      this.mapLayer.add(container);
      this.levelNodes.set(level.id, container);

      // Determine level state
      const isCompleted = this.completedLevels.includes(level.id);
      
      const prevL = index > 0 ? this.levels[index - 1] : undefined;
      const isUnlocked = index === 0 || (prevL !== undefined && this.completedLevels.includes(prevL.id));

      // 1. Draw glowing background/rings
      let ring: Phaser.GameObjects.Arc | null = null;
      let halo: Phaser.GameObjects.Arc | null = null;

      if (isCompleted) {
        // Completed glow ring
        halo = this.add.circle(0, 0, 52, level.themeColor, 0.15).setBlendMode(Phaser.BlendModes.ADD);
        ring = this.add.circle(0, 0, 42, 0xfacc15, 0.1)
          .setStrokeStyle(3, 0xfacc15, 0.7)
          .setBlendMode(Phaser.BlendModes.ADD);
        container.add([halo, ring]);

        // Spin the ring
        this.tweens.add({
          targets: ring,
          scale: 1.08,
          alpha: 0.35,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      } else if (isUnlocked) {
        // Active pulsing ring
        halo = this.add.circle(0, 0, 48, level.themeColor, 0.1).setBlendMode(Phaser.BlendModes.ADD);
        ring = this.add.circle(0, 0, 36, level.themeColor, 0.1)
          .setStrokeStyle(2, level.themeColor, 0.6)
          .setBlendMode(Phaser.BlendModes.ADD);
        container.add([halo, ring]);

        this.tweens.add({
          targets: [halo, ring],
          scale: 1.15,
          alpha: '-=0.08',
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut'
        });
      }

      // 2. Draw core node button
      const baseColor = isUnlocked ? level.themeColor : 0x334155; // slate-700 for locked
      const buttonNode = this.add.circle(0, 0, 26, baseColor, 0.92)
        .setStrokeStyle(3, isUnlocked ? 0xffffff : 0x64748b, 0.9);
      container.add(buttonNode);

      // Add a smaller inside core circle
      const innerCore = this.add.circle(0, 0, 12, isUnlocked ? 0xffffff : 0x475569);
      container.add(innerCore);

      // 3. Add visual indicators (lock icon, star, etc.)
      if (!isUnlocked) {
        const lockText = this.add.text(0, -1, '🔒', { fontSize: '15px' }).setOrigin(0.5);
        container.add(lockText);
      } else if (isCompleted) {
        const starIcon = this.add.text(0, -1, '★', { fontSize: '15px', color: '#facc15' }).setOrigin(0.5);
        container.add(starIcon);
      }

      // 4. Add level title text below node
      const levelTitle = this.add.text(0, 45, level.name, {
        fontFamily: FONT_FAMILY.display,
        fontSize: '15px',
        color: isUnlocked ? UI_HEX.cream : '#64748b',
        fontStyle: '700',
        stroke: '#05030a',
        strokeThickness: 5
      }).setOrigin(0.5);
      container.add(levelTitle);

      // Interactivity
      if (isUnlocked) {
        buttonNode.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        
        buttonNode.on(Phaser.Input.Events.POINTER_OVER, () => {
          this.hoverLevelNode(level, container);
        });

        buttonNode.on(Phaser.Input.Events.POINTER_OUT, () => {
          this.unhoverLevelNode(container);
        });

        buttonNode.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.clickLevelNode(level, container);
        });
      } else {
        // Locked nodes shake and play locked tone if clicked
        buttonNode.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
        buttonNode.on(Phaser.Input.Events.POINTER_DOWN, () => {
          this.audioManager.playTone(180, 180, 0.08); // low buzz locked tone
          this.tweens.add({
            targets: container,
            x: level.mapX + 6,
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
              container.x = level.mapX;
            }
          });
        });
      }
    });
  }

  private hoverLevelNode(level: LevelConfig, container: Phaser.GameObjects.Container): void {
    if (this.newlyUnlockedLevelId) return;

    // Hover scale up
    this.tweens.add({
      targets: container,
      scale: 1.22,
      duration: 200,
      ease: 'Back.out'
    });

    // Play hover chime
    const index = this.levels.indexOf(level);
    const hoverFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88]; // Major scale!
    const freq = hoverFrequencies[index] ?? 261.63;
    this.audioManager.playTone(freq, 100, 0.07);

    // Show Details Tooltip Panel
    this.showInfoPanel(level);
  }

  private unhoverLevelNode(container: Phaser.GameObjects.Container): void {
    if (this.newlyUnlockedLevelId) return;

    this.tweens.add({
      targets: container,
      scale: 1.0,
      duration: 180,
      ease: 'Sine.out'
    });

    // Hide details panel
    this.hideInfoPanel();
  }

  private clickLevelNode(level: LevelConfig, container: Phaser.GameObjects.Container): void {
    if (this.newlyUnlockedLevelId) return;

    this.isDragging = false;

    // Play bubble click burst particles
    const burstCount = 20;
    this.add.particles(level.mapX, level.mapY, TEXTURE_KEYS.STAR, {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1.0, end: 0 },
      lifespan: 600,
      blendMode: Phaser.BlendModes.ADD,
      tint: [level.themeColor, 0xffffff, 0xfacc15]
    }).explode(burstCount);

    // Play high sweep unlock sound
    this.audioManager.playTone(659.25, 80, 0.08);
    this.time.delayedCall(70, () => this.audioManager.playTone(880, 200, 0.09));

    // Disable interaction immediately
    this.input.enabled = false;

    // Cinematic zoom & pan transition
    this.tweens.add({
      targets: container,
      scale: 0.85,
      duration: 90,
      yoyo: true,
      ease: 'Sine.easeInOut'
    });

    this.centerCameraOn(level.mapX, level.mapY, 900);
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.45,
      duration: 1000,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // Fade out
        this.cameras.main.fadeOut(500, 5, 3, 10);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          // Restore input for next scene
          this.input.enabled = true;
          // Go to game
          this.scene.start(SCENE_KEYS.GAME, { levelId: level.id });
        });
      }
    });
  }

  private showInfoPanel(level: LevelConfig): void {
    const isCompleted = this.completedLevels.includes(level.id);
    const save = this.saveManager.load();
    const bestTime = save.levelBestTimes?.[level.id];

    if (!this.infoPanel) {
      // Create tooltip container panel
      this.infoPanel = new GlassPanel(this, 640, 620, 600, 160, {
        radius: 20,
        fillAlpha: 0.88,
        strokeAlpha: 0.4,
        glowAlpha: 0.2
      }).setDepth(1000).setScrollFactor(0);

      this.infoTitle = this.add.text(-270, -55, '', {
        fontFamily: FONT_FAMILY.display,
        fontSize: '24px',
        color: UI_HEX.cream,
        fontStyle: '800'
      }).setDepth(1001);
      
      this.infoDesc = this.add.text(-270, -20, '', {
        fontFamily: FONT_FAMILY.body,
        fontSize: '15px',
        color: '#94a3b8',
        wordWrap: { width: 540 }
      }).setDepth(1001);

      this.infoStatus = this.add.text(-270, 45, '', {
        fontFamily: FONT_FAMILY.body,
        fontSize: '14px',
        color: UI_HEX.gold,
        fontStyle: '700'
      }).setDepth(1001);

      this.infoPanel.add([this.infoTitle, this.infoDesc, this.infoStatus]);
      this.infoPanel.setAlpha(0).setScale(0.9);
    }

    // Update panel text details
    this.infoTitle.setText(level.name).setColor(level.textColor);
    this.infoDesc.setText(level.description);

    let statusText = isCompleted ? '✓ Completed' : '✦ Unlocked - Play Adventure';
    if (isCompleted && bestTime) {
      statusText += ` (Best Time: ${this.formatTime(bestTime)})`;
    }
    this.infoStatus.setText(statusText);

    // Fade in panel
    this.tweens.add({
      targets: this.infoPanel,
      alpha: 1,
      scale: 1,
      y: 610,
      duration: 250,
      ease: 'Back.out'
    });
  }

  private hideInfoPanel(): void {
    if (this.infoPanel) {
      this.tweens.add({
        targets: this.infoPanel,
        alpha: 0,
        scale: 0.9,
        y: 630,
        duration: 180,
        ease: 'Sine.in'
      });
    }
  }

  private createUI(): void {
    // Title Card overlay
    const titleBox = new GlassPanel(this, 640, 70, 680, 80, {
      radius: 20,
      fillAlpha: 0.65,
      strokeAlpha: 0.3
    }).setDepth(1000).setScrollFactor(0);

    const titleText = this.add.text(0, -4, "Heena's Birthday Quest", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '34px',
      color: UI_HEX.cream,
      fontStyle: '800',
      stroke: '#0c0a21',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(1001);

    const subTitleText = this.add.text(0, 22, "Select an unlocked location to continue the journey", {
      fontFamily: FONT_FAMILY.body,
      fontSize: '13px',
      color: UI_HEX.gold
    }).setOrigin(0.5).setDepth(1001);

    titleBox.add([titleText, subTitleText]);

    // Reset Progress Button (in case they want to review unlock animations)
    new MagicButton(this, 1140, 50, {
      label: 'Reset Save',
      width: 170,
      height: 44,
      onClick: () => {
        this.saveManager.clear();
        this.completedLevels = [];
        this.newlyUnlockedLevelId = null;
        this.audioManager.playTone(300, 100, 0.08);
        this.time.delayedCall(100, () => this.audioManager.playTone(200, 150, 0.08));
        this.scene.restart();
      }
    }).setScrollFactor(0).setDepth(1000).setScale(0.8);
  }

  // Golden path unlock sequence
  private runUnlockSequence(): void {
    const nextLevelId = this.newlyUnlockedLevelId!;
    const nextLevelIndex = this.levels.findIndex(l => l.id === nextLevelId);
    
    // Safety check
    if (nextLevelIndex <= 0) {
      this.newlyUnlockedLevelId = null;
      return;
    }

    const prevLevel = nextLevelIndex > 0 ? this.levels[nextLevelIndex - 1] : undefined;
    const nextLevel = this.levels[nextLevelIndex];
    if (!prevLevel || !nextLevel) {
      this.newlyUnlockedLevelId = null;
      return;
    }

    // Disable all inputs
    this.input.enabled = false;

    // Pan camera to start of path (previous level)
    this.centerCameraOn(prevLevel.mapX, prevLevel.mapY, 1000);

    this.time.delayedCall(1200, () => {
      // Create curved path definitions
      const curve = this.getCurveBetween(prevLevel, nextLevel);
      
      // Spawn star follower
      const path = new Phaser.Curves.Path(prevLevel.mapX, prevLevel.mapY);
      path.add(curve);
      const follower = this.add.follower(path, prevLevel.mapX, prevLevel.mapY, TEXTURE_KEYS.STAR).setDepth(100);
      this.mapLayer.add(follower);

      // Play soft path drawing hum
      this.audioManager.playTone(392, 1800, 0.05);

      // Path sparkle particles
      const sparkles = this.add.particles(0, 0, TEXTURE_KEYS.STAR, {
        speed: { min: 20, max: 70 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1.0, end: 0 },
        lifespan: 500,
        tint: 0xfacc15, // gold
        blendMode: Phaser.BlendModes.ADD
      });
      sparkles.startFollow(follower);
      this.mapLayer.add(sparkles);

      // Start follow
      follower.startFollow({
        duration: 2000,
        onUpdate: () => {
          // Centering the camera smoothly on the follower as it travels
          this.centerCameraOn(follower.x, follower.y, 0);
          
          // Draw active path dynamically
          const t = follower.pathTween ? Number(follower.pathTween.getValue()) : 0;
          this.activePathGraphics.lineStyle(4, 0xfacc15, 0.95);
          this.activePathGraphics.beginPath();
          this.activePathGraphics.moveTo(prevLevel.mapX, prevLevel.mapY);
          
          const segments = Math.floor(t * 30);
          for (let k = 1; k <= segments; k++) {
            const pt = curve.getPoint(k / 30);
            this.activePathGraphics.lineTo(pt.x, pt.y);
          }
          this.activePathGraphics.lineTo(follower.x, follower.y);
          this.activePathGraphics.strokePath();
        },
        onComplete: () => {
          // Explosion of gold particles when path reaches the target node
          sparkles.destroy();
          follower.destroy();

          this.add.particles(nextLevel.mapX, nextLevel.mapY, TEXTURE_KEYS.STAR, {
            speed: { min: 90, max: 280 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            alpha: { start: 1.0, end: 0 },
            lifespan: 800,
            blendMode: Phaser.BlendModes.ADD,
            tint: [0xfacc15, 0xffffff]
          }).explode(35);

          // Play level unlock fanfare chime
          this.audioManager.playTone(523.25, 120, 0.08); // C5
          this.time.delayedCall(120, () => this.audioManager.playTone(659.25, 120, 0.08)); // E5
          this.time.delayedCall(240, () => this.audioManager.playTone(783.99, 120, 0.08)); // G5
          this.time.delayedCall(360, () => this.audioManager.playTone(1046.50, 400, 0.1)); // C6

          // Node bounce scale pop
          const nodeContainer = this.levelNodes.get(nextLevelId);
          if (nodeContainer) {
            this.tweens.add({
              targets: nodeContainer,
              scale: 1.6,
              duration: 250,
              yoyo: true,
              ease: 'Back.out',
              onComplete: () => {
                // Save progress, clearing the newlyUnlockedLevelId
                const save = this.saveManager.load();
                this.saveManager.save({
                  ...save,
                  newlyUnlockedLevelId: null // clear so it doesn't trigger again
                });
                
                this.newlyUnlockedLevelId = null;
                
                // Re-enable inputs
                this.input.enabled = true;
                
                // Redraw map nodes to reflect unlocked state
                this.scene.restart();
              }
            });
          }
        }
      });
    });
  }

  private formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }
}

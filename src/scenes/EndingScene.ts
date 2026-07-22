import Phaser from 'phaser';
import { GlassPanel } from '../components/GlassPanel';
import { AudioManager } from '../audio/AudioManager';
import { TEXTURE_KEYS } from '../assets/assetManifest';
import { FONT_FAMILY, UI_HEX } from '../utils/uiTheme';
import { SCENE_KEYS } from '../utils/constants';

export class EndingScene extends Phaser.Scene {
  private audioManager!: AudioManager;
  private backgroundLayer!: Phaser.GameObjects.Container;
  private castleGraphics!: Phaser.GameObjects.Graphics;
  private cakeContainer!: Phaser.GameObjects.Container;
  private textContainer!: Phaser.GameObjects.Container;
  private letterContainer!: Phaser.GameObjects.Container;
  private giftContainer!: Phaser.GameObjects.Container;
  private crystals: Phaser.GameObjects.Container[] = [];
  
  public constructor() {
    super(SCENE_KEYS.ENDING);
  }

  public create(): void {
    // 1. Initialize systems
    this.audioManager = new AudioManager(this);
    this.audioManager.unlock();
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 2. Base dark space background
    this.backgroundLayer = this.add.container(0, 0);
    const bgRect = this.add.rectangle(640, 360, 1280, 720, 0x05030a);
    this.backgroundLayer.add(bgRect);

    // Add starry points
    for (let i = 0; i < 45; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(10, 1270),
        Phaser.Math.Between(10, 710),
        Phaser.Math.Between(1, 3),
        0xffffff,
        Phaser.Math.FloatBetween(0.1, 0.7)
      );
      this.backgroundLayer.add(star);
    }

    // 3. Spawning the Birthday Castle
    this.createCastle();

    // 4. Start the Cinematic Timeline
    this.time.delayedCall(1200, () => this.runCombineCrystalsSequence());
  }

  private createCastle(): void {
    // We compose the castle in the center
    const cx = 640;
    const cy = 350;

    // Draw the castle backing glow
    const castleGlow = this.add.circle(cx, cy, 180, 0xff007f, 0.05)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.8)
      .setAlpha(0);
    
    // Animate glow pulse
    this.tweens.add({
      targets: castleGlow,
      scale: 1.15,
      alpha: 0.12,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.castleGraphics = this.add.graphics().setDepth(5).setAlpha(0);

    // Draw castle vector shapes (procedural dark silhouette with neon stroke!)
    this.castleGraphics.fillStyle(0x0a0518, 0.9);
    this.castleGraphics.lineStyle(3, 0xff1493, 0.82); // neon hot pink highlight

    // Left tower
    this.castleGraphics.fillRect(cx - 100, cy - 20, 34, 100);
    this.castleGraphics.strokeRect(cx - 100, cy - 20, 34, 100);
    // Left cone roof
    this.castleGraphics.fillStyle(0x450a30, 0.9);
    this.castleGraphics.fillTriangle(cx - 105, cy - 20, cx - 83, cy - 70, cx - 61, cy - 20);
    this.castleGraphics.strokeTriangle(cx - 105, cy - 20, cx - 83, cy - 70, cx - 61, cy - 20);

    // Right tower
    this.castleGraphics.fillStyle(0x0a0518, 0.9);
    this.castleGraphics.fillRect(cx + 66, cy - 20, 34, 100);
    this.castleGraphics.strokeRect(cx + 66, cy - 20, 34, 100);
    // Right cone roof
    this.castleGraphics.fillStyle(0x450a30, 0.9);
    this.castleGraphics.fillTriangle(cx + 61, cy - 20, cx + 83, cy - 70, cx + 105, cy - 20);
    this.castleGraphics.strokeTriangle(cx + 61, cy - 20, cx + 83, cy - 70, cx + 105, cy - 20);

    // Center keep body
    this.castleGraphics.fillStyle(0x0a0518, 0.9);
    this.castleGraphics.fillRect(cx - 66, cy - 10, 132, 100);
    this.castleGraphics.strokeRect(cx - 66, cy - 10, 132, 100);

    // Center spire
    this.castleGraphics.fillRect(cx - 20, cy - 80, 40, 70);
    this.castleGraphics.strokeRect(cx - 20, cy - 80, 40, 70);
    // Center spire roof
    this.castleGraphics.fillStyle(0x450a30, 0.9);
    this.castleGraphics.fillTriangle(cx - 24, cy - 80, cx, cy - 140, cx + 24, cy - 80);
    this.castleGraphics.strokeTriangle(cx - 24, cy - 80, cx, cy - 140, cx + 24, cy - 80);

    // Castle door
    this.castleGraphics.fillStyle(0x240722, 1);
    this.castleGraphics.lineStyle(2, 0xfacc15, 0.7);
    this.castleGraphics.fillRect(cx - 22, cy + 30, 44, 60);
    this.castleGraphics.strokeRect(cx - 22, cy + 30, 44, 60);

    // Draw lit windows (glowing yellow)
    this.castleGraphics.fillStyle(0xfde047, 0.85);
    this.castleGraphics.fillRect(cx - 84, cy + 10, 12, 20);
    this.castleGraphics.fillRect(cx + 72, cy + 10, 12, 20);
    this.castleGraphics.fillRect(cx - 12, cy - 50, 24, 24);

    // Fade castle in
    this.tweens.add({
      targets: [this.castleGraphics, castleGlow],
      alpha: 1,
      duration: 1500,
      ease: 'Power2.easeOut'
    });
  }

  private runCombineCrystalsSequence(): void {
    // We play emotional background music arpeggio
    this.playEmotionalArpeggio();

    const cx = 640;
    const cy = 350;
    const crystalColors = [0xff1493, 0xffa07a, 0xfacc15, 0x00ff7f, 0x00ffff, 0x9370db, 0xff00ff];
    
    // Spawn 7 crystals orbiting the castle
    for (let i = 0; i < 7; i++) {
      const angle = (i * (360 / 7)) * (Math.PI / 180);
      const startRadius = 320;
      
      const x = cx + Math.cos(angle) * startRadius;
      const y = cy + Math.sin(angle) * startRadius;

      const crystalContainer = this.add.container(x, y).setDepth(10);
      
      // Star particle inside
      const glow = this.add.circle(0, 0, 16, crystalColors[i] ?? 0xffffff, 0.28).setBlendMode(Phaser.BlendModes.ADD);
      const star = this.add.star(0, 0, 5, 4, 10, crystalColors[i] ?? 0xffffff).setScale(1.1);
      
      crystalContainer.add([glow, star]);
      this.crystals.push(crystalContainer);

      // Animate circular rotate and pull-in spiral
      this.tweens.add({
        targets: crystalContainer,
        x: cx,
        y: cy - 140, // Combine at the spire tip
        scale: 0.25,
        alpha: 0.8,
        duration: 4800,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          if (i === 6) {
            // Trigger Golden Light Screen fill
            this.triggerGoldenLightFanfare();
          }
          crystalContainer.destroy();
        }
      });
      
      // Gentle bob/flicker
      this.tweens.add({
        targets: star,
        scale: 1.4,
        angle: 360,
        duration: 1200 + i * 200,
        repeat: -1,
        yoyo: true
      });
    }
  }

  private triggerGoldenLightFanfare(): void {
    const cx = 640;
    const cy = 350;

    // Play golden chime sound
    this.audioManager.playTone(880, 500, 0.12);
    this.time.delayedCall(120, () => this.audioManager.playTone(1320, 800, 0.1));

    // Flash Golden light filling screen
    const goldenFlash = this.add.rectangle(640, 360, 1280, 720, 0xfef08a, 1)
      .setDepth(100)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: goldenFlash,
      alpha: 0,
      duration: 2500,
      ease: 'Power2.easeOut',
      onComplete: () => goldenFlash.destroy()
    });

    // Castle lights up fully (scale castle glow and add sparkles)
    const castleAura = this.add.circle(cx, cy, 320, 0xfacc15, 0.14)
      .setDepth(4)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: castleAura,
      scale: 1.35,
      alpha: 0,
      duration: 3500
    });

    // Launch Fireworks and Confetti
    this.startFireworksConfetti();

    // Rotate camera slowly back and forth
    this.tweens.add({
      targets: this.cameras.main,
      rotation: 0.03, // approx 2 degrees
      duration: 5000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Fade in Birthday Cake & Typography
    this.time.delayedCall(1600, () => this.showCakeAndWishes());
  }

  private startFireworksConfetti(): void {
    // 1. Fireworks
    const fireworkColors = [0xff007f, 0x00ffff, 0xfacc15, 0x00ff7f, 0xff00ff];
    const launchFirework = () => {
      const fx = Phaser.Math.Between(200, 1080);
      const fy = Phaser.Math.Between(100, 320);
      const color = fireworkColors[Phaser.Math.Between(0, fireworkColors.length - 1)] ?? 0xffffff;

      this.audioManager.playTone(180 + Phaser.Math.Between(0, 180), 80, 0.04);
      
      const firework = this.add.particles(fx, fy, TEXTURE_KEYS.STAR, {
        speed: { min: 60, max: 220 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.0, end: 0 },
        alpha: { start: 1.0, end: 0 },
        lifespan: 1000,
        gravityY: 90,
        blendMode: Phaser.BlendModes.ADD,
        tint: color
      });
      firework.explode(35);
      this.time.delayedCall(1100, () => firework.destroy());
    };

    // Trigger fireworks repeatedly
    this.time.addEvent({
      delay: 1500,
      callback: launchFirework,
      repeat: 12
    });

    // 2. Confetti falling
    this.add.particles(640, -20, TEXTURE_KEYS.SPARK, {
      x: { min: 20, max: 1260 },
      lifespan: 4500,
      speedY: { min: 80, max: 160 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 1, end: 0 },
      quantity: 2,
      frequency: 200,
      tint: [0xff007f, 0x00ffff, 0xfacc15, 0xff7f50],
      blendMode: Phaser.BlendModes.ADD
    }).setDepth(50);
  }

  private showCakeAndWishes(): void {
    // 1. Birthday Cake vector assembly
    this.cakeContainer = this.add.container(640, 520).setDepth(20).setScale(0.86).setAlpha(0);

    const cakeG = this.add.graphics();
    cakeG.fillStyle(0xfecdd3, 1); // pink frosting bottom tier
    cakeG.fillRoundedRect(-110, 30, 220, 50, 10);
    cakeG.lineStyle(2, 0xffffff, 0.7);
    cakeG.strokeRoundedRect(-110, 30, 220, 50, 10);

    cakeG.fillStyle(0xdb2777, 1); // middle tier
    cakeG.fillRoundedRect(-80, -20, 160, 50, 8);
    cakeG.strokeRoundedRect(-80, -20, 160, 50, 8);

    cakeG.fillStyle(0xfde047, 1); // top tier
    cakeG.fillRoundedRect(-50, -70, 100, 50, 6);
    cakeG.strokeRoundedRect(-50, -70, 100, 50, 6);

    this.cakeContainer.add(cakeG);

    // Add 3 candles
    for (let i = -1; i <= 1; i++) {
      const cx = i * 20;
      const cy = -82;
      
      const wax = this.add.rectangle(cx, cy, 6, 24, 0xffffff);
      const flame = this.add.circle(cx, cy - 16, 4.5, 0xf97316).setBlendMode(Phaser.BlendModes.ADD);
      this.cakeContainer.add([wax, flame]);

      this.tweens.add({
        targets: flame,
        scale: 1.4,
        alpha: 0.6,
        duration: Phaser.Math.Between(150, 250),
        yoyo: true,
        repeat: -1
      });
    }

    // 2. Happy Birthday Typography
    this.textContainer = this.add.container(640, 200).setDepth(20).setScale(0.86).setAlpha(0);
    
    const wishGlow = this.add.text(0, -30, "Happy Birthday Heena ❤️", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '52px',
      color: UI_HEX.gold,
      fontStyle: '800',
      align: 'center',
      stroke: '#4c1d95',
      strokeThickness: 12
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.65);

    const wishText = this.add.text(0, -30, "Happy Birthday Heena ❤️", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '52px',
      color: UI_HEX.cream,
      fontStyle: '800',
      align: 'center',
      stroke: '#1e1b4b',
      strokeThickness: 8
    }).setOrigin(0.5);

    this.textContainer.add([wishGlow, wishText]);

    // Animate fade-in of Cake and Title
    this.tweens.add({
      targets: [this.cakeContainer, this.textContainer],
      alpha: 1,
      scale: 1,
      duration: 1000,
      ease: 'Back.out'
    });

    // Fade to letter after 5 seconds
    this.time.delayedCall(5000, () => this.fadeIntoPersonalizedLetter());
  }

  private fadeIntoPersonalizedLetter(): void {
    // Fade out cake and text containers
    this.tweens.add({
      targets: [this.cakeContainer, this.textContainer, this.castleGraphics],
      alpha: 0.12,
      duration: 1200
    });

    // Letter container
    this.letterContainer = this.add.container(640, 340).setDepth(60).setScale(0.85).setAlpha(0);

    const letterBg = new GlassPanel(this, 0, 0, 720, 360, {
      radius: 32,
      fillAlpha: 0.95,
      strokeAlpha: 0.54,
      glowAlpha: 0.35
    });
    this.letterContainer.add(letterBg);

    const letterText = this.add.text(0, -30, 
      "Dearest Heena,\n\n" +
      "Through every level of life's adventure, you bring\n" +
      "warmth, brilliance, and magic to my world.\n\n" +
      "From cozy rooms to coding dungeons, there is no one\n" +
      "I'd rather pair-program through life with.\n\n" +
      "Happy Birthday, my love! ❤️", {
      fontFamily: FONT_FAMILY.body,
      fontSize: '20px',
      color: UI_HEX.cream,
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5);
    this.letterContainer.add(letterText);

    this.tweens.add({
      targets: this.letterContainer,
      alpha: 1,
      scale: 1,
      duration: 1200,
      ease: 'Back.out',
      onComplete: () => {
        // Show Gift Container
        this.showGiftBoxButton();
      }
    });
  }

  private showGiftBoxButton(): void {
    this.giftContainer = this.add.container(640, 580).setDepth(70).setScale(0.88).setAlpha(0);

    // Gift Lid
    const lid = this.add.rectangle(0, -14, 110, 16, 0xdb2777).setOrigin(0.5); // pink
    const lidRibbon = this.add.rectangle(0, -14, 18, 16, 0xfde047).setOrigin(0.5); // gold ribbon
    
    // Gift Box Base
    const base = this.add.rectangle(0, 15, 100, 42, 0xdb2777).setOrigin(0.5);
    const verticalRibbon = this.add.rectangle(0, 15, 18, 42, 0xfde047).setOrigin(0.5);

    const btnText = this.add.text(0, -42, "Press to open your gift", {
      fontFamily: FONT_FAMILY.body,
      fontSize: '15px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setOrigin(0.5);

    // Make base interactive
    base.setInteractive(new Phaser.Geom.Rectangle(-50, -21, 100, 42), Phaser.Geom.Rectangle.Contains);

    this.giftContainer.add([base, verticalRibbon, lid, lidRibbon, btnText]);

    this.tweens.add({
      targets: this.giftContainer,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: 'Back.out'
    });

    // Make it bob/bounce softly to invite interaction
    this.tweens.add({
      targets: this.giftContainer,
      y: 572,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    base.on(Phaser.Input.Events.POINTER_OVER, () => {
      this.giftContainer.setScale(1.08);
      btnText.setColor(UI_HEX.cream);
      this.audioManager.playTone(330, 40, 0.05);
    });
    base.on(Phaser.Input.Events.POINTER_OUT, () => {
      this.giftContainer.setScale(1.0);
      btnText.setColor(UI_HEX.gold);
    });

    base.on(Phaser.Input.Events.POINTER_DOWN, () => {
      // Open Gift Sequence!
      base.disableInteractive();
      this.openGiftBox(lid, lidRibbon, base, verticalRibbon, btnText);
    });
  }

  private openGiftBox(
    lid: Phaser.GameObjects.Rectangle,
    lidRibbon: Phaser.GameObjects.Rectangle,
    base: Phaser.GameObjects.Rectangle,
    verticalRibbon: Phaser.GameObjects.Rectangle,
    btnText: Phaser.GameObjects.Text
  ): void {
    // 1. Play grand gift chime sound
    this.audioManager.playTone(523.25, 80, 0.08); // C5
    this.time.delayedCall(80, () => this.audioManager.playTone(659.25, 80, 0.08)); // E5
    this.time.delayedCall(160, () => this.audioManager.playTone(783.99, 80, 0.08)); // G5
    this.time.delayedCall(240, () => this.audioManager.playTone(1046.5, 450, 0.12)); // C6

    // Fade out text prompt
    this.tweens.add({ targets: btnText, alpha: 0, duration: 200 });

    // 2. Lid flies off!
    this.tweens.add({
      targets: [lid, lidRibbon],
      y: -110,
      x: -40,
      angle: -45,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut'
    });

    // Box slides open wider
    this.tweens.add({
      targets: [base, verticalRibbon],
      scaleY: 0.1,
      alpha: 0,
      delay: 200,
      duration: 500,
      ease: 'Sine.easeOut'
    });

    // 3. Huge sparkles explosion!
    const explosion = this.add.particles(640, 560, TEXTURE_KEYS.STAR, {
      speed: { min: 100, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.95, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 1200,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xfacc15, 0xff00ff, 0x00ffff, 0xffffff]
    });
    explosion.explode(50);
    this.time.delayedCall(1300, () => explosion.destroy());

    // 4. Reveal final gift wish badge: Golden Heart Star!
    const badge = this.add.container(640, 550).setScale(0).setAlpha(0).setDepth(80);
    const badgeGlow = this.add.star(0, 0, 5, 14, 28, 0xfacc15).setAlpha(0.6).setBlendMode(Phaser.BlendModes.ADD);
    const badgeHeart = this.add.text(0, -6, "❤️", { fontSize: '32px' }).setOrigin(0.5);
    
    badge.add([badgeGlow, badgeHeart]);

    // Animate badge emergence
    this.tweens.add({
      targets: badge,
      y: 350, // Float up to letter center
      scale: 1.8,
      alpha: 1,
      duration: 1500,
      ease: 'Back.out',
      onComplete: () => {
        // Continuous rotate and pulse
        this.tweens.add({
          targets: badgeGlow,
          angle: 360,
          duration: 6000,
          repeat: -1
        });
        this.tweens.add({
          targets: badge,
          scale: 2.0,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });

        // Reveal the birthday coupon message
        const couponContainer = this.add.container(640, 470).setDepth(85).setScale(0.85).setAlpha(0);
        const couponPanel = new GlassPanel(this, 0, 0, 560, 110, {
          radius: 24,
          fillAlpha: 0.9,
          strokeAlpha: 0.5,
          glowAlpha: 0.3
        });
        const couponText = this.add.text(
          0,
          0,
          "🎟️ You've won a Birthday Coupon!\nTo redeem it, contact your husband ❤️",
          {
            fontFamily: FONT_FAMILY.body,
            fontSize: '18px',
            color: UI_HEX.cream,
            align: 'center',
            lineSpacing: 8,
            fontStyle: '700'
          }
        ).setOrigin(0.5);
        couponContainer.add([couponPanel, couponText]);

        this.time.delayedCall(400, () => {
          this.tweens.add({
            targets: couponContainer,
            scale: 1,
            alpha: 1,
            duration: 700,
            ease: 'Back.out'
          });
        });

        // Add a back-to-menu link or finish note
        const returnText = this.add.text(640, 680, "Click anywhere to return to Map", {
          fontFamily: FONT_FAMILY.body,
          fontSize: '15px',
          color: UI_HEX.cream
        }).setOrigin(0.5).setAlpha(0.5);
        
        this.tweens.add({
          targets: returnText,
          alpha: 0.9,
          duration: 1000,
          yoyo: true,
          repeat: -1
        });

        this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
          this.cameras.main.fadeOut(800, 0, 0, 0);
          this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Stop arpeggios
            this.scene.start(SCENE_KEYS.MAP);
          });
        });
      }
    });
  }

  private playEmotionalArpeggio(): void {
    // Synthesize a beautiful, delicate arpeggio of C Major 9 in background
    const notes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25, 783.99, 987.77];
    let noteIdx = 0;
    
    const playNext = () => {
      if (!this.scene.isActive(SCENE_KEYS.ENDING)) return;
      
      const baseFreq = notes[noteIdx] ?? 261.63;
      // Play a soft high note chime
      this.audioManager.playTone(baseFreq, 420, 0.024);
      
      noteIdx = (noteIdx + 1) % notes.length;
      
      this.time.delayedCall(280, playNext);
    };

    playNext();
  }
}

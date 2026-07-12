import Phaser from 'phaser';
import { GlassPanel } from './GlassPanel';
import { FONT_FAMILY, UI_COLORS, UI_HEX } from '../utils/uiTheme';
import { TEXTURE_KEYS } from '../assets/assetManifest';
import { AudioManager } from '../audio/AudioManager';

export interface MathGameConfig {
  type: 'math_quiz';
  prompt: string;
  question?: string;
  options?: string[];
  answerIndex?: number;
  questions?: Array<{
    question: string;
    options: string[];
    answerIndex: number;
  }>;
}

export interface TypingGameConfig {
  type: 'typing_test';
  prompt: string;
  text: string;
}

export interface MemoryGameConfig {
  type: 'memory_match';
  prompt: string;
  pairs: string[];
}

export interface TimingGameConfig {
  type: 'timing_game';
  prompt: string;
  targetCount: number;
  mode: 'candles' | 'server';
}

export interface CatchingGameConfig {
  type: 'catching_game';
  prompt: string;
  items: string[];
  targetCount: number;
  mode: 'bugs' | 'wishes';
}

export interface WirePuzzleConfig {
  type: 'wire_connect';
  prompt: string;
}

export interface SimonSaysConfig {
  type: 'simon_says';
  prompt: string;
}

export interface FlappyGameConfig {
  type: 'flappy_firefly';
  prompt: string;
  targetCount: number;
}

export type MiniGameConfig = 
  | MathGameConfig 
  | TypingGameConfig 
  | MemoryGameConfig 
  | TimingGameConfig 
  | CatchingGameConfig
  | WirePuzzleConfig
  | SimonSaysConfig
  | FlappyGameConfig;

export class MiniGamePanel extends Phaser.GameObjects.Container {
  private readonly bgPanel: GlassPanel;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly audioManager: AudioManager;
  
  // Game config & callbacks
  private gameConfig: MiniGameConfig;
  private onCompleteCallback: () => void;
  private onCancelCallback: () => void;

  // Sub-components
  private gameElements: Phaser.GameObjects.GameObject[] = [];
  
  // Typing state
  private typedText = '';
  private typingInputListener: ((event: KeyboardEvent) => void) | null = null;
  private typingDisplayText: Phaser.GameObjects.Text | null = null;

  // Memory match state
  private memoryCards: Array<{
    container: Phaser.GameObjects.Container;
    symbol: string;
    isFaceUp: boolean;
    isMatched: boolean;
    bg: Phaser.GameObjects.Graphics;
    txt: Phaser.GameObjects.Text;
  }> = [];
  private selectedCards: number[] = [];
  private memoryBusy = false;
  private currentQuestionIndex = 0;

  // New minigame states
  private caughtCount = 0;
  private fallingItems: Array<{ sprite: Phaser.GameObjects.Text; speedY: number }> = [];
  private basket: Phaser.GameObjects.Container | null = null;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;
  private catchUpdateListener: ((time: number, delta: number) => void) | null = null;

  private timingOscillator: Phaser.Tweens.Tween | null = null;
  private timingSlider: Phaser.GameObjects.Graphics | null = null;
  private timingSuccessCount = 0;
  private timingIndicators: Phaser.GameObjects.Text[] = [];

  // Wire connect state
  private wireGrid: Array<{
    type: 'straight' | 'corner';
    rotation: number; // 0, 90, 180, 270
    container: Phaser.GameObjects.Container;
    graphics: Phaser.GameObjects.Graphics;
    row: number;
    col: number;
  }> = [];
  private wireCompleted = false;

  // Simon says state
  private simonSequence: number[] = [];
  private simonPlayerIndex = 0;
  private simonRound = 0;
  private simonBusy = false;
  private simonButtons: Phaser.GameObjects.Container[] = [];

  // Flappy game states
  private flappyPlayer: Phaser.GameObjects.Container | null = null;
  private flappyVelocityY = 0;
  private flappySparksCollected = 0;
  private flappyObstacles: Array<{
    topPipe: Phaser.GameObjects.Graphics;
    bottomPipe: Phaser.GameObjects.Graphics;
    spark: Phaser.GameObjects.Text;
    x: number;
    gapTop: number;
    gapBottom: number;
    passed: boolean;
  }> = [];
  private flappyUpdateListener: ((time: number, delta: number) => void) | null = null;
  private flappySpawnTimer: Phaser.Time.TimerEvent | null = null;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: MiniGameConfig,
    onComplete: () => void,
    onCancel: () => void
  ) {
    super(scene, x, y);
    this.gameConfig = config;
    this.onCompleteCallback = onComplete;
    this.onCancelCallback = onCancel;
    this.audioManager = new AudioManager(scene);
    this.audioManager.unlock();

    // 1. Create main dialog panel
    this.bgPanel = new GlassPanel(scene, 0, 0, 750, 420, {
      radius: 28,
      fillAlpha: 0.94,
      strokeAlpha: 0.5,
      glowAlpha: 0.3
    });
    this.add(this.bgPanel);

    // 2. Title Text
    this.titleText = scene.add.text(0, -160, config.prompt, {
      fontFamily: FONT_FAMILY.display,
      fontSize: '26px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add(this.titleText);

    // 3. Close Button
    const closeBtn = scene.add.text(340, -180, '✕', {
      fontFamily: FONT_FAMILY.display,
      fontSize: '26px',
      color: UI_HEX.cream
    }).setOrigin(0.5).setInteractive();
    
    closeBtn.on(Phaser.Input.Events.POINTER_OVER, () => closeBtn.setColor(UI_HEX.pink));
    closeBtn.on(Phaser.Input.Events.POINTER_OUT, () => closeBtn.setColor(UI_HEX.cream));
    closeBtn.on(Phaser.Input.Events.POINTER_DOWN, () => this.cancel());
    this.add(closeBtn);

    scene.add.existing(this);
    this.setDepth(1500);

    // Animate panel opening
    this.setScale(0.85).setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.out'
    });

    // 4. Initialize specific game mode
    this.setupGameMode();
  }

  private setupGameMode(): void {
    if (this.gameConfig.type === 'math_quiz') {
      this.setupMathQuiz(this.gameConfig);
    } else if (this.gameConfig.type === 'typing_test') {
      this.setupTypingTest(this.gameConfig);
    } else if (this.gameConfig.type === 'memory_match') {
      this.setupMemoryMatch(this.gameConfig);
    } else if (this.gameConfig.type === 'timing_game') {
      this.setupTimingGame(this.gameConfig);
    } else if (this.gameConfig.type === 'catching_game') {
      this.setupCatchingGame(this.gameConfig);
    } else if (this.gameConfig.type === 'wire_connect') {
      this.setupWireConnect(this.gameConfig);
    } else if (this.gameConfig.type === 'simon_says') {
      this.setupSimonSays(this.gameConfig);
    } else if (this.gameConfig.type === 'flappy_firefly') {
      this.setupFlappyFirefly(this.gameConfig);
    }
  }

  private setupMathQuiz(config: MathGameConfig): void {
    // Clear previous game elements for multi-question updates
    this.gameElements.forEach(el => el.destroy());
    this.gameElements = [];

    let activeQuestion: string;
    let activeOptions: string[];
    let activeAnswerIndex: number;

    if (config.questions && config.questions.length > 0) {
      const q = config.questions[this.currentQuestionIndex];
      if (!q) return;
      activeQuestion = q.question;
      activeOptions = q.options;
      activeAnswerIndex = q.answerIndex;
      this.titleText.setText(`${config.prompt} (${this.currentQuestionIndex + 1}/${config.questions.length})`);
    } else {
      activeQuestion = config.question ?? '';
      activeOptions = config.options ?? [];
      activeAnswerIndex = config.answerIndex ?? 0;
    }

    const scene = this.scene;

    // Draw question text
    const questText = scene.add.text(0, -80, activeQuestion, {
      fontFamily: FONT_FAMILY.body,
      fontSize: '20px',
      color: UI_HEX.cream,
      align: 'center',
      wordWrap: { width: 620 }
    }).setOrigin(0.5);
    this.add(questText);
    this.gameElements.push(questText);

    // Render option buttons
    activeOptions.forEach((opt, idx) => {
      const yPos = 30 + idx * 80;
      const btnContainer = scene.add.container(0, yPos);
      this.add(btnContainer);
      this.gameElements.push(btnContainer);

      const btnBg = scene.add.graphics();
      btnBg.fillStyle(0x1e1b4b, 0.7);
      btnBg.lineStyle(2, UI_COLORS.purple, 0.8);
      btnBg.fillRoundedRect(-220, -25, 440, 50, 15);
      btnBg.strokeRoundedRect(-220, -25, 440, 50, 15);
      btnBg.setInteractive(new Phaser.Geom.Rectangle(-220, -25, 440, 50), Phaser.Geom.Rectangle.Contains);
      btnContainer.add(btnBg);

      const btnTxt = scene.add.text(0, 0, opt, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '17px',
        color: UI_HEX.cream,
        fontStyle: '700'
      }).setOrigin(0.5);
      btnContainer.add(btnTxt);

      btnBg.on(Phaser.Input.Events.POINTER_OVER, () => {
        btnBg.clear();
        btnBg.fillStyle(UI_COLORS.purple, 0.4);
        btnBg.lineStyle(2, UI_COLORS.gold, 0.95);
        btnBg.fillRoundedRect(-220, -25, 440, 50, 15);
        btnBg.strokeRoundedRect(-220, -25, 440, 50, 15);
        this.audioManager.playTone(330 + idx * 60, 60, 0.05);
      });

      btnBg.on(Phaser.Input.Events.POINTER_OUT, () => {
        btnBg.clear();
        btnBg.fillStyle(0x1e1b4b, 0.7);
        btnBg.lineStyle(2, UI_COLORS.purple, 0.8);
        btnBg.fillRoundedRect(-220, -25, 440, 50, 15);
        btnBg.strokeRoundedRect(-220, -25, 440, 50, 15);
      });

      btnBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (idx === activeAnswerIndex) {
          // Play mini success tone
          this.audioManager.playTone(523.25, 100, 0.08);

          if (config.questions && this.currentQuestionIndex < config.questions.length - 1) {
            // Correct and has more questions: flash green and advance
            btnBg.clear();
            btnBg.fillStyle(0x064e3b, 0.8);
            btnBg.lineStyle(3, 0x10b981, 0.95);
            btnBg.fillRoundedRect(-220, -25, 440, 50, 15);
            btnBg.strokeRoundedRect(-220, -25, 440, 50, 15);

            this.scene.time.delayedCall(400, () => {
              this.currentQuestionIndex++;
              this.setupMathQuiz(config);
            });
          } else {
            // Correct and final!
            this.correctAnswer(btnContainer);
          }
        } else {
          this.wrongAnswer(btnContainer);
        }
      });
    });
  }

  // --- TYPING TEST MODE ---
  private setupTypingTest(config: TypingGameConfig): void {
    const scene = this.scene;

    // Display string to match
    const targetText = scene.add.text(0, -60, config.text, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#64748b', // Gray
      fontStyle: '700',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.add(targetText);
    this.gameElements.push(targetText);

    // Display typed characters in gold
    this.typingDisplayText = scene.add.text(0, -60, '', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: UI_HEX.gold,
      fontStyle: '700',
      letterSpacing: 2
    }).setOrigin(0.5);
    this.add(this.typingDisplayText);
    this.gameElements.push(this.typingDisplayText);

    // Typing Instruction helper
    const helpTxt = scene.add.text(0, 40, 'Type on your keyboard to match the text!', {
      fontFamily: FONT_FAMILY.body,
      fontSize: '15px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    this.add(helpTxt);
    this.gameElements.push(helpTxt);

    // Bind physical keyboard event listener
    this.typedText = '';
    this.typingInputListener = (event: KeyboardEvent) => {
      const key = event.key;
      const targetStr = config.text;

      // Handle backspace
      if (key === 'Backspace') {
        if (this.typedText.length > 0) {
          this.typedText = this.typedText.slice(0, -1);
          this.audioManager.playTone(280, 50, 0.05);
        }
      } 
      // Handle standard keys
      else if (key.length === 1) {
        const nextCharIndex = this.typedText.length;
        const expectedChar = targetStr[nextCharIndex];

        if (expectedChar !== undefined && key === expectedChar) {
          this.typedText += key;
          this.audioManager.playTone(520 + nextCharIndex * 24, 60, 0.06);
        } else {
          // Play mistake buzz
          this.audioManager.playTone(150, 100, 0.08);
          // Shake target text
          scene.tweens.add({
            targets: targetText,
            x: targetText.x + 8,
            duration: 40,
            yoyo: true,
            repeat: 2,
            onComplete: () => { targetText.x = 0; }
          });
        }
      }

      // Update text displays
      if (this.typingDisplayText) {
        this.typingDisplayText.setText(this.typedText);
      }

      // Check win condition
      if (this.typedText === targetStr) {
        // Unbind listener
        this.cleanupActiveGames();
        this.complete();
      }
    };

    window.addEventListener('keydown', this.typingInputListener);
  }

  // --- MEMORY MATCH MODE ---
  private setupMemoryMatch(config: MemoryGameConfig): void {
    const scene = this.scene;
    
    // Duplicate symbols to create matching pairs
    const deck = [...config.pairs, ...config.pairs];
    // Shuffle the deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = deck[i]!;
      deck[i] = deck[j]!;
      deck[j] = temp;
    }

    const startX = -170;
    const startY = -40;
    const gapX = 170;
    const gapY = 130;

    deck.forEach((symbol, idx) => {
      const gridX = startX + (idx % 3) * gapX;
      const gridY = startY + Math.floor(idx / 3) * gapY;

      const cardContainer = scene.add.container(gridX, gridY);
      this.add(cardContainer);
      this.gameElements.push(cardContainer);

      // Procedural card graphic
      const cardBg = scene.add.graphics();
      cardBg.fillStyle(0x1e1b4b, 0.8);
      cardBg.lineStyle(2, UI_COLORS.purple, 0.8);
      cardBg.fillRoundedRect(-60, -45, 120, 90, 12);
      cardBg.strokeRoundedRect(-60, -45, 120, 90, 12);
      cardBg.setInteractive(new Phaser.Geom.Rectangle(-60, -45, 120, 90), Phaser.Geom.Rectangle.Contains);
      cardContainer.add(cardBg);

      // Card symbol text
      const cardTxt = scene.add.text(0, 0, '?', {
        fontFamily: FONT_FAMILY.display,
        fontSize: '28px',
        color: UI_HEX.cream
      }).setOrigin(0.5);
      cardContainer.add(cardTxt);

      const cardObj = {
        container: cardContainer,
        symbol: symbol,
        isFaceUp: false,
        isMatched: false,
        bg: cardBg,
        txt: cardTxt
      };

      this.memoryCards.push(cardObj);

      cardBg.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (cardObj.isFaceUp || cardObj.isMatched || this.memoryBusy) return;
        cardBg.clear();
        cardBg.fillStyle(UI_COLORS.purple, 0.4);
        cardBg.lineStyle(2, UI_COLORS.gold, 0.95);
        cardBg.fillRoundedRect(-60, -45, 120, 90, 12);
        cardBg.strokeRoundedRect(-60, -45, 120, 90, 12);
        this.audioManager.playTone(392, 50, 0.05);
      });

      cardBg.on(Phaser.Input.Events.POINTER_OUT, () => {
        if (cardObj.isFaceUp || cardObj.isMatched) return;
        cardBg.clear();
        cardBg.fillStyle(0x1e1b4b, 0.8);
        cardBg.lineStyle(2, UI_COLORS.purple, 0.8);
        cardBg.fillRoundedRect(-60, -45, 120, 90, 12);
        cardBg.strokeRoundedRect(-60, -45, 120, 90, 12);
      });

      cardBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.clickCard(idx);
      });
    });
  }

  private clickCard(cardIdx: number): void {
    const card = this.memoryCards[cardIdx];
    if (!card || card.isFaceUp || card.isMatched || this.memoryBusy || this.selectedCards.length >= 2) return;

    // Flip Card Face Up
    card.isFaceUp = true;
    card.txt.setText(card.symbol);
    card.bg.clear();
    card.bg.fillStyle(UI_COLORS.glass, 0.9);
    card.bg.lineStyle(2, UI_COLORS.gold, 0.95);
    card.bg.fillRoundedRect(-60, -45, 120, 90, 12);
    card.bg.strokeRoundedRect(-60, -45, 120, 90, 12);

    this.audioManager.playTone(587.33, 80, 0.07); // flip up tone
    this.selectedCards.push(cardIdx);

    if (this.selectedCards.length === 2) {
      this.checkMemoryMatch();
    }
  }

  private checkMemoryMatch(): void {
    const idx1 = this.selectedCards[0]!;
    const idx2 = this.selectedCards[1]!;
    const c1 = this.memoryCards[idx1]!;
    const c2 = this.memoryCards[idx2]!;

    this.memoryBusy = true;

    if (c1.symbol === c2.symbol) {
      // Match found!
      this.scene.time.delayedCall(500, () => {
        c1.isMatched = true;
        c2.isMatched = true;
        
        // Success ring
        c1.bg.clear().lineStyle(3, 0x10b981, 0.9).strokeRoundedRect(-60, -45, 120, 90, 12);
        c2.bg.clear().lineStyle(3, 0x10b981, 0.9).strokeRoundedRect(-60, -45, 120, 90, 12);

        this.audioManager.playTone(880, 150, 0.08); // high chime

        // Star bursts
        this.scene.add.particles(c1.container.x + this.x, c1.container.y + this.y, TEXTURE_KEYS.STAR, {
          speed: { min: 40, max: 100 },
          scale: { start: 0.6, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 500,
          blendMode: Phaser.BlendModes.ADD,
          tint: 0x10b981
        }).explode(12);

        this.selectedCards = [];
        this.memoryBusy = false;

        // Check if all cards matched
        if (this.memoryCards.every(c => c.isMatched)) {
          this.complete();
        }
      });
    } else {
      // No match - Flip back over
      this.scene.time.delayedCall(1000, () => {
        c1.isFaceUp = false;
        c2.isFaceUp = false;
        c1.txt.setText('?');
        c2.txt.setText('?');
        
        // Reset backgrounds
        c1.bg.clear().fillStyle(0x1e1b4b, 0.8).lineStyle(2, UI_COLORS.purple, 0.8)
          .fillRoundedRect(-60, -45, 120, 90, 12).strokeRoundedRect(-60, -45, 120, 90, 12);
        c2.bg.clear().fillStyle(0x1e1b4b, 0.8).lineStyle(2, UI_COLORS.purple, 0.8)
          .fillRoundedRect(-60, -45, 120, 90, 12).strokeRoundedRect(-60, -45, 120, 90, 12);

        this.audioManager.playTone(220, 140, 0.07); // buzz retry tone

        this.selectedCards = [];
        this.memoryBusy = false;
      });
    }
  }

  // --- SHARED UTILS ---
  private correctAnswer(btn: Phaser.GameObjects.Container): void {
    this.audioManager.playTone(523.25, 80, 0.08);
    this.scene.time.delayedCall(80, () => this.audioManager.playTone(659.25, 250, 0.09));

    // Green glow flash
    const bg = btn.list[0] as Phaser.GameObjects.Graphics;
    bg.clear();
    bg.fillStyle(0x064e3b, 0.8);
    bg.lineStyle(3, 0x10b981, 0.95);
    bg.fillRoundedRect(-220, -25, 440, 50, 15);
    bg.strokeRoundedRect(-220, -25, 440, 50, 15);

    this.scene.time.delayedCall(500, () => this.complete());
  }

  private wrongAnswer(btn: Phaser.GameObjects.Container): void {
    this.audioManager.playTone(220, 150, 0.08); // Fail buzzer
    this.scene.tweens.add({
      targets: btn,
      x: btn.x + 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => { btn.x = 0; }
    });
  }

  private complete(): void {
    // Play complete fanfare sound
    this.audioManager.playTone(659.25, 100, 0.08); // E5
    this.scene.time.delayedCall(100, () => this.audioManager.playTone(880, 350, 0.1)); // A5

    // Sparkle burst
    this.scene.add.particles(this.x, this.y, TEXTURE_KEYS.STAR, {
      speed: { min: 80, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 700,
      blendMode: Phaser.BlendModes.ADD,
      tint: [UI_COLORS.gold, UI_COLORS.pink, 0xffffff]
    }).explode(25);

    // Fade out panel
    this.scene.tweens.add({
      targets: this,
      scale: 0.85,
      alpha: 0,
      duration: 300,
      ease: 'Sine.in',
      onComplete: () => {
        this.cleanupActiveGames();
        this.destroy();
        this.onCompleteCallback();
      }
    });
  }

  private cancel(): void {
    this.audioManager.playTone(330, 80, 0.08);
    this.scene.tweens.add({
      targets: this,
      scale: 0.85,
      alpha: 0,
      duration: 250,
      ease: 'Sine.in',
      onComplete: () => {
        this.cleanupActiveGames();
        this.destroy();
        this.onCancelCallback();
      }
    });
  }

  // --- TIMING / CALIBRATION MODE ---
  private setupTimingGame(config: TimingGameConfig): void {
    const scene = this.scene;
    this.timingSuccessCount = 0;
    this.timingIndicators = [];

    // 1. Description Text
    const descTxt = scene.add.text(0, -90, config.prompt, {
      fontFamily: FONT_FAMILY.body,
      fontSize: '18px',
      color: UI_HEX.cream
    }).setOrigin(0.5);
    this.add(descTxt);
    this.gameElements.push(descTxt);

    // 2. Display indicators (Candles or Server Bars)
    const indY = -40;
    const startX = -((config.targetCount - 1) * 55) / 2;

    for (let i = 0; i < config.targetCount; i++) {
      const char = config.mode === 'candles' ? '🕯️' : '⚙️';
      const ind = scene.add.text(startX + i * 55, indY, char, {
        fontSize: '34px'
      }).setOrigin(0.5);
      this.add(ind);
      this.gameElements.push(ind);
      this.timingIndicators.push(ind);
    }

    // 3. Draw Track
    const trackW = 340;
    const trackH = 14;
    const trackBg = scene.add.graphics();
    trackBg.fillStyle(0x1e1b4b, 0.9);
    trackBg.lineStyle(2, UI_COLORS.purple, 0.6);
    trackBg.fillRoundedRect(-trackW / 2, 43, trackW, trackH, 7);
    trackBg.strokeRoundedRect(-trackW / 2, 43, trackW, trackH, 7);
    this.add(trackBg);
    this.gameElements.push(trackBg);

    // Target zone green box
    const targetW = 48;
    const targetBg = scene.add.graphics();
    targetBg.fillStyle(0x10b981, 0.4);
    targetBg.lineStyle(2, 0x10b981, 0.9);
    targetBg.fillRoundedRect(-targetW / 2, 40, targetW, trackH + 6, 4);
    targetBg.strokeRoundedRect(-targetW / 2, 40, targetW, trackH + 6, 4);
    this.add(targetBg);
    this.gameElements.push(targetBg);

    // 4. Create Slider
    this.timingSlider = scene.add.graphics();
    this.timingSlider.fillStyle(UI_COLORS.gold, 0.95);
    this.timingSlider.lineStyle(1.5, 0xffffff, 0.9);
    // Draw triangle pointing down
    this.timingSlider.fillTriangle(0, 32, -8, 16, 8, 16);
    this.timingSlider.strokeTriangle(0, 32, -8, 16, 8, 16);
    this.timingSlider.x = -160;
    this.add(this.timingSlider);
    this.gameElements.push(this.timingSlider);

    // Animate Slider Oscillation
    const baseDuration = config.mode === 'server' ? 620 : 760;
    this.timingOscillator = scene.tweens.add({
      targets: this.timingSlider,
      x: 160,
      duration: baseDuration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 5. Button
    const btnContainer = scene.add.container(0, 130);
    this.add(btnContainer);
    this.gameElements.push(btnContainer);

    const btnBg = scene.add.graphics();
    btnBg.fillStyle(0x1e1b4b, 0.85);
    btnBg.lineStyle(2.5, UI_COLORS.pink, 0.85);
    btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
    btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);
    btnBg.setInteractive(new Phaser.Geom.Rectangle(-120, -22, 240, 44), Phaser.Geom.Rectangle.Contains);
    btnContainer.add(btnBg);

    const btnLabel = config.mode === 'candles' ? 'LIGHT CANDLE' : 'CALIBRATE';
    const btnTxt = scene.add.text(0, -1, btnLabel, {
      fontFamily: FONT_FAMILY.display,
      fontSize: '18px',
      color: UI_HEX.cream,
      fontStyle: '800'
    }).setOrigin(0.5);
    btnContainer.add(btnTxt);

    btnBg.on(Phaser.Input.Events.POINTER_OVER, () => {
      btnBg.clear();
      btnBg.fillStyle(UI_COLORS.pink, 0.4);
      btnBg.lineStyle(2.5, UI_COLORS.gold, 0.95);
      btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
      btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);
      this.audioManager.playTone(392, 50, 0.05);
    });

    btnBg.on(Phaser.Input.Events.POINTER_OUT, () => {
      btnBg.clear();
      btnBg.fillStyle(0x1e1b4b, 0.85);
      btnBg.lineStyle(2.5, UI_COLORS.pink, 0.85);
      btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
      btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);
    });

    btnBg.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (!this.active || !this.timingSlider) return;

      const sliderX = this.timingSlider.x;
      const isSuccess = Math.abs(sliderX) <= (targetW / 2 + 2); // Sweet spot within target zone

      if (isSuccess) {
        // Success!
        const curIdx = this.timingSuccessCount;
        this.timingSuccessCount++;
        
        // Update indicator visual
        const ind = this.timingIndicators[curIdx];
        if (ind) {
          ind.setText(config.mode === 'candles' ? '🔥' : '✅');
          // Scale pop effect
          scene.tweens.add({
            targets: ind,
            scale: 1.4,
            duration: 100,
            yoyo: true,
            ease: 'Back.out'
          });
        }

        this.audioManager.playTone(523.25 + this.timingSuccessCount * 60, 100, 0.08);

        // Flash green
        btnBg.clear();
        btnBg.fillStyle(0x064e3b, 0.8);
        btnBg.lineStyle(2.5, 0x10b981, 0.95);
        btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
        btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);

        scene.time.delayedCall(250, () => {
          btnBg.clear();
          btnBg.fillStyle(0x1e1b4b, 0.85);
          btnBg.lineStyle(2.5, UI_COLORS.pink, 0.85);
          btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
          btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);
        });

        // Speed up slider on success to increase challenge!
        if (this.timingOscillator && this.timingSuccessCount < config.targetCount) {
          const prevTime = this.timingOscillator.duration;
          this.timingOscillator.destroy();
          this.timingOscillator = scene.tweens.add({
            targets: this.timingSlider,
            x: 160,
            duration: prevTime * 0.8,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }

        if (this.timingSuccessCount >= config.targetCount) {
          this.complete();
        }
      } else {
        // Miss! Shake button and play buzz
        this.audioManager.playTone(220, 150, 0.08);
        
        // Flash red
        btnBg.clear();
        btnBg.fillStyle(0x7f1d1d, 0.8);
        btnBg.lineStyle(2.5, 0xef4444, 0.95);
        btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
        btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);

        this.scene.tweens.add({
          targets: btnContainer,
          x: 10,
          duration: 50,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            btnContainer.x = 0;
            btnBg.clear();
            btnBg.fillStyle(0x1e1b4b, 0.85);
            btnBg.lineStyle(2.5, UI_COLORS.pink, 0.85);
            btnBg.fillRoundedRect(-120, -22, 240, 44, 12);
            btnBg.strokeRoundedRect(-120, -22, 240, 44, 12);
          }
        });
      }
    });
  }

  // --- CATCHING / COLLECTING GAME MODE ---
  private setupCatchingGame(config: CatchingGameConfig): void {
    const scene = this.scene;
    this.caughtCount = 0;
    this.fallingItems = [];

    // Title / Label text
    const catchingLabel = config.mode === 'bugs' ? 'Catch green 1/0 blocks, avoid red viruses 👾!' : 'Catch falling golden wishes ⭐!';
    const progressTxt = scene.add.text(0, -90, `Items Caught: 0 / ${config.targetCount}`, {
      fontFamily: FONT_FAMILY.display,
      fontSize: '19px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add(progressTxt);
    this.gameElements.push(progressTxt);

    const helpTxt = scene.add.text(0, -60, catchingLabel, {
      fontFamily: FONT_FAMILY.body,
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    this.add(helpTxt);
    this.gameElements.push(helpTxt);

    // Create the Catcher Tray
    const basketWidth = 110;
    const basketHeight = 16;
    this.basket = scene.add.container(0, 130);
    this.add(this.basket);
    this.gameElements.push(this.basket);

    const basketBg = scene.add.graphics();
    basketBg.fillStyle(0x475569, 0.9);
    basketBg.lineStyle(2, 0xe2e8f0, 0.85);
    basketBg.fillRoundedRect(-basketWidth / 2, -basketHeight / 2, basketWidth, basketHeight, 6);
    basketBg.strokeRoundedRect(-basketWidth / 2, -basketHeight / 2, basketWidth, basketHeight, 6);
    
    basketBg.fillStyle(UI_COLORS.gold, 0.8);
    basketBg.fillCircle(-basketWidth / 2, 0, 4);
    basketBg.fillCircle(basketWidth / 2, 0, 4);
    this.basket.add(basketBg);

    // Drag tracking
    const handlePointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!this.basket || !this.active) return;
      const localX = pointer.x - 640;
      const halfW = basketWidth / 2;
      const clampedX = Phaser.Math.Clamp(localX, -375 + halfW + 15, 375 - halfW - 15);
      this.basket.x = clampedX;
    };

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, handlePointerMove);

    // Spawn timer
    this.spawnTimer = scene.time.addEvent({
      delay: 850,
      loop: true,
      callback: () => {
        if (!this.active || this.caughtCount >= config.targetCount) return;

        let spawnChar = '⭐';
        let isBad = false;

        if (config.mode === 'bugs') {
          // 25% chance of virus
          if (Math.random() < 0.26) {
            spawnChar = '👾';
            isBad = true;
          } else {
            spawnChar = Math.random() < 0.5 ? '1' : '0';
          }
        } else {
          // Wishes mode
          const emojis = config.items;
          spawnChar = emojis[Math.floor(Math.random() * emojis.length)] ?? '⭐';
        }

        const spawnX = Phaser.Math.Between(-320, 320);
        const spawnY = -140;

        const itemText = scene.add.text(spawnX, spawnY, spawnChar, {
          fontSize: '30px'
        }).setOrigin(0.5);
        
        if (config.mode === 'bugs') {
          itemText.setColor(isBad ? '#ef4444' : '#10b981');
        } else {
          itemText.setColor(UI_HEX.gold);
        }

        this.add(itemText);
        this.gameElements.push(itemText);

        itemText.setData('isBad', isBad);

        this.fallingItems.push({
          sprite: itemText,
          speedY: Phaser.Math.Between(155, 230)
        });
      }
    });

    // Update check loop
    this.catchUpdateListener = (_time: number, delta: number) => {
      if (!this.active || !this.basket || this.caughtCount >= config.targetCount) return;

      const dt = delta / 1000;
      const basketY = this.basket.y;
      const basketX = this.basket.x;
      const basketHalfW = basketWidth / 2;

      for (let i = this.fallingItems.length - 1; i >= 0; i--) {
        const item = this.fallingItems[i];
        if (!item || !item.sprite.active) continue;

        item.sprite.y += item.speedY * dt;

        const itemX = item.sprite.x;
        const itemY = item.sprite.y;

        // Collision Check
        if (
          itemY >= basketY - 18 && 
          itemY <= basketY + 8 && 
          itemX >= basketX - basketHalfW - 12 && 
          itemX <= basketX + basketHalfW + 12
        ) {
          const isBad = item.sprite.getData('isBad') === true;

          if (isBad) {
            // Caught bad item! Buzz sound and decrement caughtCount
            this.audioManager.playTone(180, 150, 0.08);
            if (this.caughtCount > 0) this.caughtCount--;
            progressTxt.setText(`Items Caught: ${this.caughtCount} / ${config.targetCount}`);
            
            scene.tweens.add({
              targets: this.basket,
              x: this.basket.x + 8,
              duration: 50,
              yoyo: true,
              repeat: 2
            });
          } else {
            // Success caught!
            this.caughtCount++;
            progressTxt.setText(`Items Caught: ${this.caughtCount} / ${config.targetCount}`);
            this.audioManager.playTone(523.25 + this.caughtCount * 45, 90, 0.08);

            // Burst sparkles
            const burst = scene.add.particles(itemX + 640, itemY + 360, TEXTURE_KEYS.STAR, {
              speed: { min: 30, max: 70 },
              scale: { start: 0.5, end: 0 },
              alpha: { start: 0.9, end: 0 },
              lifespan: 400,
              blendMode: Phaser.BlendModes.ADD,
              tint: config.mode === 'bugs' ? 0x10b981 : UI_COLORS.gold
            });
            burst.explode(8);
            scene.time.delayedCall(400, () => burst.destroy());
          }

          item.sprite.destroy();
          this.fallingItems.splice(i, 1);

          // Win check
          if (this.caughtCount >= config.targetCount) {
            scene.input.off(Phaser.Input.Events.POINTER_MOVE, handlePointerMove);
            if (this.catchUpdateListener) {
              scene.events.off(Phaser.Scenes.Events.UPDATE, this.catchUpdateListener);
              this.catchUpdateListener = null;
            }
            if (this.spawnTimer) this.spawnTimer.destroy();
            this.complete();
            return;
          }
        } 
        // Fall off screen
        else if (itemY > 180) {
          item.sprite.destroy();
          this.fallingItems.splice(i, 1);
        }
      }
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.catchUpdateListener);
  }

  // ==========================================
  // WIRE CONNECTOR PUZZLE (Stage 3 Office)
  // ==========================================
  private setupWireConnect(_config: WirePuzzleConfig): void {
    const scene = this.scene;
    this.wireCompleted = false;
    this.wireGrid = [];

    // Clear old elements
    this.gameElements.forEach(el => el.destroy());
    this.gameElements = [];

    // Source indicator
    const sourceLabel = scene.add.text(-220, -90, "⚡ POWER\nSOURCE", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '14px',
      color: '#fbbf24',
      align: 'center',
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add(sourceLabel);
    this.gameElements.push(sourceLabel);

    // Mainframe indicator
    const exitLabel = scene.add.text(220, 110, "💻 SERVER\nMAIN", {
      fontFamily: FONT_FAMILY.display,
      fontSize: '14px',
      color: '#10b981',
      align: 'center',
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add(exitLabel);
    this.gameElements.push(exitLabel);

    // Setup 3x3 grid
    const startX = -100;
    const startY = -90;
    const spacingX = 100;
    const spacingY = 100;

    // Define grid layout
    const gridLayout = [
      ['straight', 'straight', 'corner'],
      ['corner',   'straight', 'straight'],
      ['corner',   'straight', 'corner']
    ];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const type = gridLayout[r]![c] as 'straight' | 'corner';
        
        // Random starting rotation (90, 180, 270)
        const rotationChoices = [90, 180, 270];
        const rotation = rotationChoices[Math.floor(Math.random() * rotationChoices.length)]!;

        const tx = startX + c * spacingX;
        const ty = startY + r * spacingY;

        const container = scene.add.container(tx, ty);
        this.add(container);
        this.gameElements.push(container);

        // Glass button bg
        const tileBg = scene.add.graphics();
        tileBg.fillStyle(0xffffff, 0.05);
        tileBg.lineStyle(1.5, 0xffffff, 0.15);
        tileBg.fillRoundedRect(-40, -40, 80, 80, 10);
        tileBg.strokeRoundedRect(-40, -40, 80, 80, 10);
        container.add(tileBg);

        // Graphics for wire drawing
        const graphics = scene.add.graphics();
        container.add(graphics);

        // Interactive hit area
        const hitArea = scene.add.zone(0, 0, 80, 80).setInteractive({ useHandCursor: true });
        container.add(hitArea);

        const tileIndex = this.wireGrid.length;
        const tileData = {
          type,
          rotation,
          container,
          graphics,
          row: r,
          col: c
        };
        this.wireGrid.push(tileData);

        container.setAngle(rotation);
        this.drawWire(tileData, false);

        hitArea.on(Phaser.Input.Events.POINTER_DOWN, () => {
          if (this.wireCompleted) return;
          this.rotateWire(tileIndex);
        });

        // Hover feedback
        hitArea.on(Phaser.Input.Events.POINTER_OVER, () => {
          if (this.wireCompleted) return;
          tileBg.clear();
          tileBg.fillStyle(0xffffff, 0.1);
          tileBg.lineStyle(2, UI_COLORS.pink, 0.7);
          tileBg.fillRoundedRect(-40, -40, 80, 80, 10);
          tileBg.strokeRoundedRect(-40, -40, 80, 80, 10);
        });
        hitArea.on(Phaser.Input.Events.POINTER_OUT, () => {
          tileBg.clear();
          tileBg.fillStyle(0xffffff, 0.05);
          tileBg.lineStyle(1.5, 0xffffff, 0.15);
          tileBg.fillRoundedRect(-40, -40, 80, 80, 10);
          tileBg.strokeRoundedRect(-40, -40, 80, 80, 10);
        });
      }
    }

    this.checkWireConnection();
  }

  private drawWire(tile: any, isPowered: boolean): void {
    const g = tile.graphics;
    g.clear();
    
    const color = isPowered ? 0xfbbd23 : 0xd946ef;
    const thickness = isPowered ? 6.5 : 4.5;
    const alpha = isPowered ? 0.95 : 0.6;
    
    g.lineStyle(thickness, color, alpha);
    
    if (tile.type === 'straight') {
      g.beginPath();
      g.moveTo(-40, 0);
      g.lineTo(40, 0);
      g.strokePath();
    } else if (tile.type === 'corner') {
      g.beginPath();
      g.moveTo(-40, 0);
      g.lineTo(0, 0);
      g.lineTo(0, 40);
      g.strokePath();
    }
  }

  private rotateWire(idx: number): void {
    const tile = this.wireGrid[idx]!;
    tile.rotation = (tile.rotation + 90) % 360;
    
    this.audioManager.playTone(392, 60, 0.05); // click sound
    
    this.scene.tweens.add({
      targets: tile.container,
      angle: '+=90',
      duration: 180,
      ease: 'Back.out',
      onComplete: () => {
        this.checkWireConnection();
      }
    });
  }

  private getTileOpenDirs(tile: any): boolean[] {
    const open = [false, false, false, false]; // Up, Right, Down, Left
    const rot = (tile.rotation % 360 + 360) % 360;

    if (tile.type === 'straight') {
      if (rot === 0 || rot === 180) {
        open[1] = true; // Right
        open[3] = true; // Left
      } else {
        open[0] = true; // Up
        open[2] = true; // Down
      }
    } else if (tile.type === 'corner') {
      if (rot === 0) {
        open[2] = true; // Down
        open[3] = true; // Left
      } else if (rot === 90) {
        open[0] = true; // Up
        open[3] = true; // Left
      } else if (rot === 180) {
        open[0] = true; // Up
        open[1] = true; // Right
      } else if (rot === 270) {
        open[1] = true; // Right
        open[2] = true; // Down
      }
    }
    return open;
  }

  private checkWireConnection(): void {
    const visited = new Set<string>();
    const powered = new Set<string>();

    const getTile = (r: number, c: number) => {
      return this.wireGrid.find(t => t.row === r && t.col === c);
    };

    const dfs = (r: number, c: number, entryDir: number) => {
      const tile = getTile(r, c);
      if (!tile) return;

      const key = `${r},${c}`;
      if (visited.has(key)) return;
      visited.add(key);

      const openDirs = this.getTileOpenDirs(tile);
      if (!openDirs[entryDir]) return;

      powered.add(key);

      const neighbors = [
        { dr: -1, dc: 0, fromDir: 2, toDir: 0 }, // Up (neighbor from Down)
        { dr: 0, dc: 1, fromDir: 3, toDir: 1 },  // Right (neighbor from Left)
        { dr: 1, dc: 0, fromDir: 0, toDir: 2 },  // Down (neighbor from Up)
        { dr: 0, dc: -1, fromDir: 1, toDir: 3 }  // Left (neighbor from Right)
      ];

      neighbors.forEach(n => {
        if (openDirs[n.toDir]) {
          dfs(r + n.dr, c + n.dc, n.fromDir);
        }
      });
    };

    // Start DFS at (0,0) entering from Left (3)
    dfs(0, 0, 3);

    // Redraw all tiles with powered states
    this.wireGrid.forEach(t => {
      const isPowered = powered.has(`${t.row},${t.col}`);
      this.drawWire(t, isPowered);
    });

    const endTile = getTile(2, 2);
    const win = powered.has("2,2") && endTile && this.getTileOpenDirs(endTile)[1];

    if (win && !this.wireCompleted) {
      this.wireCompleted = true;
      this.audioManager.playTone(523.25, 100, 0.08); // Success notes
      this.scene.time.delayedCall(120, () => this.audioManager.playTone(659.25, 120, 0.08));
      this.scene.time.delayedCall(240, () => this.audioManager.playTone(880, 240, 0.1));

      this.scene.time.delayedCall(800, () => {
        this.complete();
      });
    }
  }

  // ==========================================
  // SIMON SAYS MEMORY SEQUENCE (Stage 6 Garden)
  // ==========================================
  private setupSimonSays(_config: SimonSaysConfig): void {
    const scene = this.scene;
    this.simonRound = 0;
    this.simonSequence = [];
    this.simonButtons = [];
    this.simonBusy = false;

    // Clear old elements
    this.gameElements.forEach(el => el.destroy());
    this.gameElements = [];

    // Prompt instructions
    const instruction = scene.add.text(0, -90, "Repeat the memory pattern of glowing crystals!", {
      fontFamily: FONT_FAMILY.body,
      fontSize: '16px',
      color: UI_HEX.cream,
      align: 'center'
    }).setOrigin(0.5);
    this.add(instruction);
    this.gameElements.push(instruction);

    // Positions for diamond shape: Top, Right, Bottom, Left
    const positions = [
      { x: 0, y: -25, color: 0xf43f5e, symbol: '💍', label: 'Wedding', tone: 261.63 },    // C4
      { x: 120, y: 50, color: 0xec4899, symbol: '💖', label: 'Anniversary', tone: 293.66 }, // D4
      { x: 0, y: 125, color: 0x3b82f6, symbol: '✈️', label: 'Trip', tone: 329.63 },        // E4
      { x: -120, y: 50, color: 0xa855f7, symbol: '👶', label: 'Baby', tone: 349.23 }       // F4
    ];

    positions.forEach((pos, idx) => {
      const container = scene.add.container(pos.x, pos.y);
      this.add(container);
      this.gameElements.push(container);
      this.simonButtons.push(container);

      // Colored crystal button bg
      const bg = scene.add.graphics();
      bg.fillStyle(pos.color, 0.15);
      bg.lineStyle(2, pos.color, 0.4);
      bg.fillRoundedRect(-45, -30, 90, 60, 15);
      bg.strokeRoundedRect(-45, -30, 90, 60, 15);
      container.add(bg);

      // Symbol
      const symText = scene.add.text(0, -10, pos.symbol, {
        fontSize: '24px'
      }).setOrigin(0.5);
      container.add(symText);

      // Label
      const lblText = scene.add.text(0, 16, pos.label, {
        fontFamily: FONT_FAMILY.body,
        fontSize: '11px',
        color: UI_HEX.cream,
        fontStyle: '600'
      }).setOrigin(0.5);
      container.add(lblText);

      // Interactive hit area
      const hitArea = scene.add.zone(0, 0, 90, 60).setInteractive({ useHandCursor: true });
      container.add(hitArea);

      hitArea.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.simonBusy) return;
        this.handleSimonInput(idx);
      });

      // Hover feedback
      hitArea.on(Phaser.Input.Events.POINTER_OVER, () => {
        if (this.simonBusy) return;
        bg.clear();
        bg.fillStyle(pos.color, 0.3);
        bg.lineStyle(2.5, pos.color, 0.95);
        bg.fillRoundedRect(-45, -30, 90, 60, 15);
        bg.strokeRoundedRect(-45, -30, 90, 60, 15);
      });
      hitArea.on(Phaser.Input.Events.POINTER_OUT, () => {
        bg.clear();
        bg.fillStyle(pos.color, 0.15);
        bg.lineStyle(2, pos.color, 0.4);
        bg.fillRoundedRect(-45, -30, 90, 60, 15);
        bg.strokeRoundedRect(-45, -30, 90, 60, 15);
      });
    });

    // Start sequence generation
    this.scene.time.delayedCall(800, () => {
      this.playSimonNextRound();
    });
  }

  private playSimonNextRound(): void {
    this.simonPlayerIndex = 0;
    
    // Add one random step (0 to 3) to the sequence
    const nextStep = Math.floor(Math.random() * 4);
    this.simonSequence.push(nextStep);
    
    this.titleText.setText(`${this.gameConfig.prompt} (Round ${this.simonRound + 1}/3)`);
    this.playSimonSequence();
  }

  private playSimonSequence(): void {
    this.simonBusy = true;
    let delay = 0;
    
    this.simonSequence.forEach((btnIdx) => {
      this.scene.time.delayedCall(delay, () => {
        this.flashSimonButton(btnIdx);
      });
      delay += 600;
    });

    this.scene.time.delayedCall(delay - 150, () => {
      this.simonBusy = false;
    });
  }

  private flashSimonButton(btnIdx: number): void {
    const btn = this.simonButtons[btnIdx]!;
    const tones = [261.63, 293.66, 329.63, 349.23];
    this.audioManager.playTone(tones[btnIdx]!, 280, 0.08);

    // Scaling/Glow animation
    this.scene.tweens.add({
      targets: btn,
      scale: 1.15,
      duration: 150,
      yoyo: true,
      ease: 'Quad.easeInOut'
    });
  }

  private handleSimonInput(btnIdx: number): void {
    this.flashSimonButton(btnIdx);
    
    const expectedIdx = this.simonSequence[this.simonPlayerIndex];
    
    if (btnIdx === expectedIdx) {
      this.simonPlayerIndex++;
      
      if (this.simonPlayerIndex === this.simonSequence.length) {
        this.simonBusy = true;
        this.simonRound++;
        
        if (this.simonRound >= 3) {
          this.scene.time.delayedCall(600, () => {
            this.complete();
          });
        } else {
          this.scene.time.delayedCall(900, () => {
            this.playSimonNextRound();
          });
        }
      }
    } else {
      // Incorrect pattern
      this.simonBusy = true;
      this.audioManager.playTone(180, 250, 0.09);
      
      const btn = this.simonButtons[btnIdx]!;
      this.scene.tweens.add({
        targets: btn,
        x: btn.x + 8,
        duration: 40,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          // Reset positioning
          const positions = [
            { x: 0, y: -25 },
            { x: 120, y: 50 },
            { x: 0, y: 125 },
            { x: -120, y: 50 }
          ];
          btn.x = positions[btnIdx]!.x;
          btn.y = positions[btnIdx]!.y;

          // Replay sequence
          this.scene.time.delayedCall(800, () => {
            this.simonPlayerIndex = 0;
            this.playSimonSequence();
          });
        }
      });
    }
  }

  private cleanupActiveGames(): void {
    const scene = this.scene;
    
    // Keyboard
    if (this.typingInputListener) {
      window.removeEventListener('keydown', this.typingInputListener);
      this.typingInputListener = null;
    }

    // Oscillators
    if (this.timingOscillator) {
      this.timingOscillator.destroy();
      this.timingOscillator = null;
    }

    // Catching timers and loops
    if (this.spawnTimer) {
      this.spawnTimer.destroy();
      this.spawnTimer = null;
    }

    if (this.catchUpdateListener) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.catchUpdateListener);
      this.catchUpdateListener = null;
    }

    // Flappy timers and loops
    if (this.flappySpawnTimer) {
      this.flappySpawnTimer.destroy();
      this.flappySpawnTimer = null;
    }

    if (this.flappyUpdateListener) {
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.flappyUpdateListener);
      this.flappyUpdateListener = null;
    }

    this.flappyObstacles.forEach(obs => {
      obs.topPipe.destroy();
      obs.bottomPipe.destroy();
      obs.spark.destroy();
    });
    this.flappyObstacles = [];
  }

  // ==========================================
  // FLAPPY FIREFLY ARCADE GAME (Stage 1 Home)
  // ==========================================
  private setupFlappyFirefly(config: FlappyGameConfig): void {
    const scene = this.scene;
    this.flappySparksCollected = 0;
    this.flappyVelocityY = 0;
    this.flappyObstacles = [];

    // 1. Progress Text
    const progressTxt = scene.add.text(0, -95, `Sparks Collected: 0 / ${config.targetCount}`, {
      fontFamily: FONT_FAMILY.display,
      fontSize: '20px',
      color: UI_HEX.gold,
      fontStyle: '800'
    }).setOrigin(0.5);
    this.add(progressTxt);
    this.gameElements.push(progressTxt);

    // 2. Help Info Text
    const helpTxt = scene.add.text(0, -65, 'Click / Tap inside boundaries to Flap!', {
      fontFamily: FONT_FAMILY.body,
      fontSize: '14px',
      color: '#94a3b8'
    }).setOrigin(0.5);
    this.add(helpTxt);
    this.gameElements.push(helpTxt);

    // 3. Visual Border for Flappy Game Arena
    // Size: 700 width, 240 height. Centered at Y: 80.
    const playArea = scene.add.graphics();
    playArea.fillStyle(0x0a071b, 0.4);
    playArea.lineStyle(2, UI_COLORS.purple, 0.5);
    playArea.fillRoundedRect(-350, -40, 700, 240, 12);
    playArea.strokeRoundedRect(-350, -40, 700, 240, 12);
    this.add(playArea);
    this.gameElements.push(playArea);

    // 4. Interactive Click Zone (Clicking anywhere in the arena flaps the firefly)
    const clickZone = scene.add.zone(0, 80, 700, 240).setInteractive({ useHandCursor: true });
    this.add(clickZone);
    this.gameElements.push(clickZone);

    // 5. Firefly Player Container
    this.flappyPlayer = scene.add.container(-220, 80);
    this.add(this.flappyPlayer);
    this.gameElements.push(this.flappyPlayer);

    const bodyGlow = scene.add.circle(0, 0, 11, 0xfacc15, 0.55).setBlendMode(Phaser.BlendModes.ADD);
    const bodyCore = scene.add.circle(0, 0, 7, 0xffffff, 1);
    const wingL = scene.add.ellipse(-6, -4, 9, 5, 0xffffff, 0.6);
    const wingR = scene.add.ellipse(6, -4, 9, 5, 0xffffff, 0.6);
    this.flappyPlayer.add([bodyGlow, bodyCore, wingL, wingR]);

    // Animate wing flutter
    scene.tweens.add({
      targets: [wingL, wingR],
      scaleY: 0.1,
      duration: 65,
      yoyo: true,
      repeat: -1
    });

    // Flap movement handler
    const flap = () => {
      if (!this.active || this.flappySparksCollected >= config.targetCount) return;
      this.flappyVelocityY = -185;
      this.audioManager.playTone(466.16, 50, 0.05); // A#4 flap sound
      
      // Pop scale effect on click
      if (this.flappyPlayer) {
        this.flappyPlayer.setScale(1.15, 0.85);
        scene.tweens.add({
          targets: this.flappyPlayer,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 120
        });
      }
    };
    clickZone.on(Phaser.Input.Events.POINTER_DOWN, flap);

    // Spawner for Obstacles (Pipes)
    this.flappySpawnTimer = scene.time.addEvent({
      delay: 1750,
      loop: true,
      callback: () => {
        if (!this.active || this.flappySparksCollected >= config.targetCount) return;

        // Gap center (Y coordinates: top boundary is -40, bottom is 200, total height 240)
        // Keep gap center between Y: 10 and Y: 150
        const gapCenterY = Phaser.Math.Between(10, 150);
        const gapHeight = 84;
        const gapTop = gapCenterY - gapHeight / 2;
        const gapBottom = gapCenterY + gapHeight / 2;

        const obsX = 350; // starts at the right boundary

        // Top Pipe
        const topPipe = scene.add.graphics();
        topPipe.fillStyle(0x13112b, 0.95);
        topPipe.lineStyle(2, UI_COLORS.pink, 0.8);
        // Height of pipe is distance from top boundary (-40) to gapTop
        const topPipeH = gapTop - (-40);
        topPipe.fillRoundedRect(-22, -topPipeH, 44, topPipeH, { tl: 0, tr: 0, bl: 6, br: 6 });
        topPipe.strokeRoundedRect(-22, -topPipeH, 44, topPipeH, { tl: 0, tr: 0, bl: 6, br: 6 });
        topPipe.x = obsX;
        topPipe.y = gapTop;
        this.add(topPipe);
        this.gameElements.push(topPipe);

        // Bottom Pipe
        const bottomPipe = scene.add.graphics();
        bottomPipe.fillStyle(0x13112b, 0.95);
        bottomPipe.lineStyle(2, UI_COLORS.pink, 0.8);
        // Height of bottom pipe is distance from gapBottom to bottom boundary (200)
        const bottomPipeH = 200 - gapBottom;
        bottomPipe.fillRoundedRect(-22, 0, 44, bottomPipeH, { tl: 6, tr: 6, bl: 0, br: 0 });
        bottomPipe.strokeRoundedRect(-22, 0, 44, bottomPipeH, { tl: 6, tr: 6, bl: 0, br: 0 });
        bottomPipe.x = obsX;
        bottomPipe.y = gapBottom;
        this.add(bottomPipe);
        this.gameElements.push(bottomPipe);

        // Spark in gap
        const spark = scene.add.text(obsX, gapCenterY, '⭐', { fontSize: '24px' }).setOrigin(0.5);
        spark.setColor(UI_HEX.gold);
        this.add(spark);
        this.gameElements.push(spark);

        this.flappyObstacles.push({
          topPipe,
          bottomPipe,
          spark,
          x: obsX,
          gapTop,
          gapBottom,
          passed: false
        });
      }
    });

    // Real-time Update Loop
    const gravity = 430;
    this.flappyUpdateListener = (_time: number, delta: number) => {
      if (!this.active || !this.flappyPlayer || this.flappySparksCollected >= config.targetCount) return;

      const dt = delta / 1000;

      // 1. Apply physics to player
      this.flappyVelocityY += gravity * dt;
      this.flappyPlayer.y += this.flappyVelocityY * dt;

      // Check bounds collision (top: -40, bottom: 200)
      if (this.flappyPlayer.y < -40 || this.flappyPlayer.y > 200) {
        this.resetFlappyGame(progressTxt);
        return;
      }

      // Rotate based on velocity
      this.flappyPlayer.setAngle(Phaser.Math.Clamp(this.flappyVelocityY * 0.12, -22, 45));

      const px = this.flappyPlayer.x;
      const py = this.flappyPlayer.y;
      const playerRadius = 7;

      // 2. Update and check obstacles
      const scrollSpeed = 135; // px/sec

      for (let i = this.flappyObstacles.length - 1; i >= 0; i--) {
        const obs = this.flappyObstacles[i];
        if (!obs) continue;

        // Move obstacle left
        obs.x -= scrollSpeed * dt;
        obs.topPipe.x = obs.x;
        obs.bottomPipe.x = obs.x;
        if (obs.spark.active) {
          obs.spark.x = obs.x;
        }

        // Pipe collision check
        const withinX = px + playerRadius >= obs.x - 22 && px - playerRadius <= obs.x + 22;
        if (withinX) {
          const hitTop = py - playerRadius <= obs.gapTop;
          const hitBottom = py + playerRadius >= obs.gapBottom;
          if (hitTop || hitBottom) {
            this.resetFlappyGame(progressTxt);
            return;
          }
        }

        // Spark collection check
        if (!obs.passed && obs.spark.active) {
          const dist = Phaser.Math.Distance.Between(px, py, obs.spark.x, obs.spark.y);
          if (dist < 25) {
            obs.spark.destroy();
            this.flappySparksCollected++;
            progressTxt.setText(`Sparks Collected: ${this.flappySparksCollected} / ${config.targetCount}`);
            this.audioManager.playTone(523.25 + this.flappySparksCollected * 65, 80, 0.08);

            // Explosive sparkle particles
            const sparkBurst = scene.add.particles(obs.spark.x + this.x, obs.spark.y + this.y, TEXTURE_KEYS.STAR, {
              speed: { min: 25, max: 70 },
              scale: { start: 0.55, end: 0 },
              alpha: { start: 0.95, end: 0 },
              lifespan: 400,
              blendMode: Phaser.BlendModes.ADD,
              tint: UI_COLORS.gold
            });
            sparkBurst.explode(8);
            scene.time.delayedCall(400, () => sparkBurst.destroy());

            if (this.flappySparksCollected >= config.targetCount) {
              this.completeFlappyGame();
              return;
            }
          }
        }

        // Offscreen check
        if (obs.x < -380) {
          obs.topPipe.destroy();
          obs.bottomPipe.destroy();
          obs.spark.destroy();
          this.flappyObstacles.splice(i, 1);
        }
      }
    };

    scene.events.on(Phaser.Scenes.Events.UPDATE, this.flappyUpdateListener);
  }

  private resetFlappyGame(progressTxt: Phaser.GameObjects.Text): void {
    this.audioManager.playTone(196, 200, 0.085); // G3 buzz tone
    this.scene.cameras.main.shake(120, 0.005);

    if (this.flappyPlayer) {
      this.flappyPlayer.setPosition(-220, 80);
      this.flappyVelocityY = 0;
      this.flappyPlayer.setAngle(0);
    }

    this.flappySparksCollected = 0;
    const target = (this.gameConfig as FlappyGameConfig).targetCount ?? 3;
    progressTxt.setText(`Sparks Collected: 0 / ${target}`);

    this.flappyObstacles.forEach(obs => {
      obs.topPipe.destroy();
      obs.bottomPipe.destroy();
      obs.spark.destroy();
    });
    this.flappyObstacles = [];
  }

  private completeFlappyGame(): void {
    this.cleanupActiveGames();
    this.complete();
  }
}

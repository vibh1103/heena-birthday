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

export type MiniGameConfig = MathGameConfig | TypingGameConfig | MemoryGameConfig;

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
        this.cleanupKeyboard();
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
        this.cleanupKeyboard();
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
        this.cleanupKeyboard();
        this.destroy();
        this.onCancelCallback();
      }
    });
  }

  private cleanupKeyboard(): void {
    if (this.typingInputListener) {
      window.removeEventListener('keydown', this.typingInputListener);
      this.typingInputListener = null;
    }
  }
}

import Phaser from 'phaser';
import { AudioManager } from '../audio/AudioManager';
import { SaveGameManager } from './SaveGameManager';

export interface DialogueCharacterDefinition {
  name: string;
  portraits: Record<string, string>;
  typingTone?: number;
  typingSound?: string;
  typingVolume?: number;
}

export interface DialogueChoiceDefinition {
  id: string;
  label: string;
  next: string;
  events?: DialogueEventDefinition[];
}

export interface DialogueEventDefinition {
  type: string;
  payload?: Record<string, string | number | boolean>;
}

export interface DialogueCameraCommand {
  pan?: { x: number; y: number; durationMs?: number };
  zoom?: { value: number; durationMs?: number };
  shake?: { durationMs?: number; intensity?: number };
}

export interface DialogueLineDefinition {
  character: string;
  emotion?: string;
  portrait?: string;
  text: string;
  background?: string;
  music?: string;
  events?: DialogueEventDefinition[];
  camera?: DialogueCameraCommand;
  choices?: DialogueChoiceDefinition[];
  next?: string;
}

export interface DialogueNodeDefinition {
  id: string;
  background?: string;
  music?: string;
  events?: DialogueEventDefinition[];
  camera?: DialogueCameraCommand;
  autoSave?: boolean;
  lines: DialogueLineDefinition[];
  next?: string;
}

export interface DialogueStoryDefinition {
  id: string;
  title: string;
  start: string;
  assets?: {
    portraits?: Record<string, string>;
    backgrounds?: Record<string, string>;
    music?: Record<string, string>;
    sounds?: Record<string, string>;
  };
  characters: Record<string, DialogueCharacterDefinition>;
  nodes: Record<string, DialogueNodeDefinition>;
}

export interface ActiveDialogueLine {
  speaker: string;
  emotion: string;
  portraitKey: string | null;
  text: string;
}

export interface DialogueUiAdapter {
  showLine(line: ActiveDialogueLine, onSkipClick?: () => void): void;
  setBodyText(text: string): void;
  showChoices(choices: DialogueChoiceDefinition[], onChoose: (choice: DialogueChoiceDefinition) => void): void;
  hideChoices(): void;
  hide(): void;
}

export interface DialogueEngineOptions {
  scene: Phaser.Scene;
  story: DialogueStoryDefinition;
  ui: DialogueUiAdapter;
  saveManager: SaveGameManager;
  audioManager: AudioManager;
  onBackground?: (background: string) => void;
  onMusic?: (music: string) => void;
  onCamera?: (camera: DialogueCameraCommand) => void;
  onEvent?: (event: DialogueEventDefinition) => void;
  onComplete?: (nodeId: string) => void;
}

interface DialogueProgress {
  storyId: string;
  nodeId: string;
  lineIndex: number;
}

export class DialogueEngine {
  private readonly scene: Phaser.Scene;
  private readonly story: DialogueStoryDefinition;
  private readonly ui: DialogueUiAdapter;
  private readonly saveManager: SaveGameManager;
  private readonly audioManager: AudioManager;
  private readonly onBackground?: (background: string) => void;
  private readonly onMusic?: (music: string) => void;
  private readonly onCamera?: (camera: DialogueCameraCommand) => void;
  private readonly onEvent?: (event: DialogueEventDefinition) => void;
  private readonly onComplete?: (nodeId: string) => void;
  private node: DialogueNodeDefinition | null = null;
  private lineIndex = 0;
  private timer: Phaser.Time.TimerEvent | null = null;
  private fullText = '';
  private isTyping = false;
  private awaitingChoice = false;

  public constructor(options: DialogueEngineOptions) {
    this.scene = options.scene;
    this.story = options.story;
    this.ui = options.ui;
    this.saveManager = options.saveManager;
    this.audioManager = options.audioManager;
    this.onBackground = options.onBackground;
    this.onMusic = options.onMusic;
    this.onCamera = options.onCamera;
    this.onEvent = options.onEvent;
    this.onComplete = options.onComplete;
  }

  public loadStoryAssets(callback: () => void): void {
    if (!this.story.assets) {
      callback();
      return;
    }

    let needsLoad = false;
    const assets = this.story.assets;

    if (assets.portraits) {
      for (const [key, path] of Object.entries(assets.portraits)) {
        if (!this.scene.textures.exists(key)) {
          this.scene.load.image(key, path);
          needsLoad = true;
        }
      }
    }

    if (assets.backgrounds) {
      for (const [key, path] of Object.entries(assets.backgrounds)) {
        if (!this.scene.textures.exists(key)) {
          this.scene.load.image(key, path);
          needsLoad = true;
        }
      }
    }

    if (assets.music) {
      for (const [key, path] of Object.entries(assets.music)) {
        if (!this.scene.cache.audio.exists(key)) {
          this.scene.load.audio(key, path);
          needsLoad = true;
        }
      }
    }

    if (assets.sounds) {
      for (const [key, path] of Object.entries(assets.sounds)) {
        if (!this.scene.cache.audio.exists(key)) {
          this.scene.load.audio(key, path);
          needsLoad = true;
        }
      }
    }

    if (needsLoad) {
      this.scene.load.once('complete', callback);
      this.scene.load.start();
    } else {
      callback();
    }
  }

  public start(nodeId = this.story.start, lineIndex = 0): void {
    const node = this.story.nodes[nodeId];
    if (!node) {
      throw new Error(`Dialogue node "${nodeId}" does not exist in story "${this.story.id}".`);
    }

    this.node = node;
    this.lineIndex = lineIndex;
    this.applyNodeCommands(node);
    this.autoSave();
    this.showCurrentLine();
  }

  public advanceOrSkip(): void {
    if (!this.node || this.awaitingChoice) {
      return;
    }

    if (this.isTyping) {
      this.completeTyping();
      return;
    }

    const currentLine = this.node.lines[this.lineIndex];
    if (currentLine?.next) {
      this.start(currentLine.next);
      return;
    }

    this.lineIndex += 1;
    if (this.lineIndex < this.node.lines.length) {
      this.showCurrentLine();
      return;
    }

    this.finishNode();
  }

  public skipNode(): void {
    if (!this.node) {
      return;
    }

    this.clearTimer();
    this.isTyping = false;

    // Find if there is a line with choices, or go to the last line
    let targetIndex = this.node.lines.length - 1;
    for (let i = this.lineIndex; i < this.node.lines.length; i++) {
      const lineDef = this.node.lines[i];
      if (lineDef && lineDef.choices && lineDef.choices.length > 0) {
        targetIndex = i;
        break;
      }
    }

    // Apply all commands for any skipped lines to ensure music/backgrounds match
    for (let i = this.lineIndex; i <= targetIndex; i++) {
      const lineDef = this.node.lines[i];
      if (lineDef) {
        this.applyLineCommands(lineDef);
      }
    }

    this.lineIndex = targetIndex;
    const line = this.node.lines[this.lineIndex];
    if (!line) {
      return;
    }
    const character = this.story.characters[line.character];
    if (!character) {
      throw new Error(`Dialogue character "${line.character}" is missing from story "${this.story.id}".`);
    }

    this.awaitingChoice = false;
    this.ui.hideChoices();
    const emotion = line.emotion ?? 'neutral';
    const portraitKey = line.portrait ?? character.portraits[emotion] ?? character.portraits.neutral ?? null;

    this.ui.showLine({
      speaker: character.name,
      emotion,
      portraitKey,
      text: line.text,
    }, () => this.skipNode());

    this.completeTyping();
    this.autoSave();
  }

  public get isActive(): boolean {
    return this.node !== null;
  }

  public get isAwaitingChoice(): boolean {
    return this.awaitingChoice;
  }

  public stop(): void {
    this.clearTimer();
    this.awaitingChoice = false;
    this.node = null;
    this.ui.hideChoices();
    this.ui.hide();
  }

  private showCurrentLine(): void {
    if (!this.node) {
      return;
    }

    const line = this.node.lines[this.lineIndex];
    if (!line) {
      this.finishNode();
      return;
    }

    const character = this.story.characters[line.character];
    if (!character) {
      throw new Error(`Dialogue character "${line.character}" is missing from story "${this.story.id}".`);
    }

    this.applyLineCommands(line);
    this.awaitingChoice = false;
    this.ui.hideChoices();
    const emotion = line.emotion ?? 'neutral';
    const portraitKey = line.portrait ?? character.portraits[emotion] ?? character.portraits.neutral ?? null;
    this.ui.showLine({
      speaker: character.name,
      emotion,
      portraitKey,
      text: line.text,
    }, () => this.skipNode());
    this.typeText(line.text, character.typingTone ?? 520, line.choices);
    this.autoSave();
  }

  private typeText(text: string, tone: number, choices?: DialogueChoiceDefinition[]): void {
    this.clearTimer();
    this.fullText = text;
    this.isTyping = true;
    this.ui.setBodyText('');

    if (text.length === 0) {
      this.isTyping = false;
      this.presentChoices(choices);
      return;
    }

    const currentLine = this.node?.lines[this.lineIndex];
    const character = currentLine ? this.story.characters[currentLine.character] : null;

    let index = 0;
    this.timer = this.scene.time.addEvent({
      delay: 24,
      repeat: text.length - 1,
      callback: () => {
        index += 1;
        this.ui.setBodyText(text.slice(0, index));

        if (index % 3 === 0 && text[index - 1] !== ' ') {
          if (character && character.typingSound && this.scene.cache.audio.exists(character.typingSound)) {
            this.audioManager.playSound(character.typingSound, character.typingVolume ?? 0.25);
          } else {
            this.audioManager.playTone(tone + (index % 5) * 14, 24, 0.018);
          }
        }

        if (index >= text.length) {
          this.isTyping = false;
          this.timer = null;
          this.presentChoices(choices);
        }
      },
    });
  }

  private completeTyping(): void {
    this.clearTimer();
    this.isTyping = false;
    this.ui.setBodyText(this.fullText);
    const choices = this.node?.lines[this.lineIndex]?.choices;
    this.presentChoices(choices);
  }

  private presentChoices(choices?: DialogueChoiceDefinition[]): void {
    if (!choices || choices.length === 0) {
      return;
    }

    this.awaitingChoice = true;
    this.ui.showChoices(choices, (choice) => this.choose(choice));
  }

  private choose(choice: DialogueChoiceDefinition): void {
    choice.events?.forEach((event) => this.dispatchEvent(event));
    this.ui.hideChoices();
    this.awaitingChoice = false;
    this.start(choice.next);
  }

  private finishNode(): void {
    if (!this.node) {
      return;
    }

    const completedNodeId = this.node.id;
    const next = this.node.next;
    if (next) {
      this.start(next);
      return;
    }

    this.stop();
    this.onComplete?.(completedNodeId);
  }

  private applyNodeCommands(node: DialogueNodeDefinition): void {
    if (node.background) {
      this.onBackground?.(node.background);
    }
    if (node.music) {
      this.onMusic?.(node.music);
    }
    if (node.camera) {
      this.onCamera?.(node.camera);
    }
    node.events?.forEach((event) => this.dispatchEvent(event));
  }

  private applyLineCommands(line: DialogueLineDefinition): void {
    if (line.background) {
      this.onBackground?.(line.background);
    }
    if (line.music) {
      this.onMusic?.(line.music);
    }
    if (line.camera) {
      this.onCamera?.(line.camera);
    }
    line.events?.forEach((event) => this.dispatchEvent(event));
  }

  private dispatchEvent(event: DialogueEventDefinition): void {
    this.onEvent?.(event);
    this.scene.events.emit(`dialogue:${event.type}`, event.payload ?? {});
  }

  private autoSave(): void {
    if (!this.node?.autoSave) {
      return;
    }

    const save = this.saveManager.load();
    const progress: DialogueProgress = {
      storyId: this.story.id,
      nodeId: this.node.id,
      lineIndex: this.lineIndex,
    };
    this.saveManager.save({ ...save, dialogueProgress: progress });
  }

  private clearTimer(): void {
    if (this.timer) {
      this.timer.remove(false);
      this.timer = null;
    }
  }
}


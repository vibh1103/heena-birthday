import Phaser from 'phaser';
import { Hud } from '../ui/Hud';
import { SCENE_KEYS } from '../utils/constants';

export interface HudUpdateEvent {
  crystals: number;
  total: number;
  elapsedMs: number;
}

export class UIScene extends Phaser.Scene {
  private hud!: Hud;

  public constructor() {
    super(SCENE_KEYS.UI);
  }

  public create(): void {
    this.hud = new Hud(this);
    this.events.on('hud:update', (event: HudUpdateEvent) => {
      this.hud.setCrystals(event.crystals, event.total, this);
      this.hud.setElapsed(event.elapsedMs);
    });
  }
}

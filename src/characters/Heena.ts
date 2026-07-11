import Phaser from 'phaser';
import { TEXTURE_KEYS } from '../assets/assetManifest';

export interface MovementKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
}

export class Heena extends Phaser.Physics.Arcade.Sprite {
  private readonly speed = 245;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURE_KEYS.PLAYER);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(20);
    this.setCircle(18, 6, 14);
  }

  public move(cursors: Phaser.Types.Input.Keyboard.CursorKeys, keys: MovementKeys): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const left = cursors.left.isDown || keys.A.isDown;
    const right = cursors.right.isDown || keys.D.isDown;
    const up = cursors.up.isDown || keys.W.isDown;
    const down = cursors.down.isDown || keys.S.isDown;

    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.speed);
      this.setFlipX(velocity.x < 0);
    }

    body.setVelocity(velocity.x, velocity.y);
  }
}

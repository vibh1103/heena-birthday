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

  public move(
    cursors: Phaser.Types.Input.Keyboard.CursorKeys,
    keys: MovementKeys,
    virtualVelocity?: Phaser.Math.Vector2
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    let vx = 0;
    let vy = 0;

    if (virtualVelocity && virtualVelocity.lengthSq() > 0) {
      vx = virtualVelocity.x;
      vy = virtualVelocity.y;
    } else {
      const left = cursors.left.isDown || keys.A.isDown;
      const right = cursors.right.isDown || keys.D.isDown;
      const up = cursors.up.isDown || keys.W.isDown;
      const down = cursors.down.isDown || keys.S.isDown;
      
      const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));
      if (velocity.lengthSq() > 0) {
        velocity.normalize();
        vx = velocity.x;
        vy = velocity.y;
      }
    }

    if (vx !== 0 || vy !== 0) {
      body.setVelocity(vx * this.speed, vy * this.speed);
      this.setFlipX(vx < 0);
    } else {
      body.setVelocity(0, 0);
    }
  }
}

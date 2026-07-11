import Phaser from 'phaser';

export class ResponsiveCanvas {
  public constructor(private readonly scene: Phaser.Scene) {}

  public bind(onResize: (size: Phaser.Structs.Size) => void): void {
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, onResize);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.scale.off(Phaser.Scale.Events.RESIZE, onResize);
    });
  }
}

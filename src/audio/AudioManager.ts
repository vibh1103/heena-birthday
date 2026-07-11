import Phaser from 'phaser';

export class AudioManager {
  private scene: Phaser.Scene;
  private unlocked = false;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: string | null = null;

  public constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public unlock(): void {
    this.unlocked = true;
  }

  public playMusic(key: string, loop = true, volume = 0.5, fadeDuration = 1000): void {
    if (!this.unlocked) {
      return;
    }

    if (this.currentMusicKey === key) {
      return;
    }

    this.stopMusic(fadeDuration);

    this.currentMusicKey = key;
    if (this.scene.cache.audio.exists(key)) {
      const music = this.scene.sound.add(key, { loop, volume: 0 });
      this.currentMusic = music;
      music.play();
      this.scene.tweens.add({
        targets: music,
        volume: volume,
        duration: fadeDuration,
      });
    } else {
      console.warn(`Music asset "${key}" not found in Phaser cache. Using fallback playTone.`);
      // Synthesize a looping fallback melody in the background using playTone
      this.playTone(key === 'portalTheme' ? 620 : 440, 160, 0.03);
    }
  }

  public stopMusic(fadeDuration = 800): void {
    const music = this.currentMusic;
    if (music) {
      this.currentMusic = null;
      this.currentMusicKey = null;
      this.scene.tweens.add({
        targets: music,
        volume: 0,
        duration: fadeDuration,
        onComplete: () => {
          music.stop();
          music.destroy();
        },
      });
    }
  }

  public playSound(key: string, volume = 0.5): void {
    if (!this.unlocked) {
      return;
    }

    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume });
    } else {
      // Fallback click tone
      this.playTone(660, 45, volume * 0.1);
    }
  }

  public playTone(frequency: number, durationMs: number, volume = 0.08): void {
    if (!this.unlocked) {
      return;
    }

    const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextCtor) {
      return;
    }

    try {
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + durationMs / 1000);
      this.scene.time.delayedCall(durationMs + 80, () => void context.close().catch(() => {}));
    } catch (e) {
      console.warn('AudioContext creation failed', e);
    }
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}


import Phaser from 'phaser';
import { AssetLoader } from '../assets/AssetLoader';
import { SCENE_KEYS } from '../utils/constants';
import { SceneManager } from '../systems/SceneManager';
import { ContentValidator } from '../systems/ContentValidator';

export class PreloadScene extends Phaser.Scene {
  public constructor() {
    super(SCENE_KEYS.PRELOAD);
  }

  public preload(): void {
    AssetLoader.preload(this);
    // Load stories manifest
    this.load.json('stories-manifest', 'stories/manifest.json');
    // Load levels manifest
    this.load.json('levels-manifest', 'levels/manifest.json');
  }

  public create(): void {
    AssetLoader.createGeneratedTextures(this);
    
    // Validate JSON files at startup (fails gracefully to console)
    ContentValidator.validate(this);

    const levelsManifest = this.cache.json.get('levels-manifest') as Array<{ id: string, levelFile: string }>;
    if (levelsManifest && Array.isArray(levelsManifest)) {
      levelsManifest.forEach(level => {
        this.load.json(`level-config-${level.id}`, level.levelFile);
      });
      
      this.load.once('complete', () => {
        // Once level configs are loaded, retrieve and load their corresponding story files
        levelsManifest.forEach(level => {
          const cfg = this.cache.json.get(`level-config-${level.id}`);
          if (cfg && cfg.storyFile) {
            this.load.json(`story-${cfg.storyFile}`, cfg.storyFile);
          }
        });

        this.load.once('complete', () => {
          SceneManager.fadeTo(this, SCENE_KEYS.MAP);
        });
        this.load.start();
      });
      this.load.start();
    } else {
      SceneManager.fadeTo(this, SCENE_KEYS.MAP);
    }
  }
}

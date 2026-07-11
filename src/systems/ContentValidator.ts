import Phaser from 'phaser';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class ContentValidator {
  /**
   * Validates loaded levels and stories configurations against schema integrity checks.
   */
  public static validate(scene: Phaser.Scene): ValidationReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.group('🛡️ Content Validation System');

    // 1. Check levels manifest
    const levelsManifest = scene.cache.json.get('levels-manifest');
    if (!levelsManifest) {
      errors.push('CRITICAL: public/levels/manifest.json is missing or failed to parse.');
    } else if (!Array.isArray(levelsManifest)) {
      errors.push('CRITICAL: Levels manifest must be a JSON array of level definitions.');
    } else {
      console.log(`✓ Loaded levels manifest containing ${levelsManifest.length} levels.`);
      
      const levelIds = new Set<string>();
      levelsManifest.forEach((level: any, idx: number) => {
        // Check for missing id
        if (!level.id) {
          errors.push(`Level index [${idx}] is missing a unique "id" field.`);
          return;
        }

        // Check for duplicate ids
        if (levelIds.has(level.id)) {
          errors.push(`Duplicate Level ID detected: "${level.id}" is defined multiple times.`);
        } else {
          levelIds.add(level.id);
        }

        // Check map coordinates
        if (typeof level.mapX !== 'number' || typeof level.mapY !== 'number') {
          errors.push(`Level "${level.id}" has invalid map coordinates: x=${level.mapX}, y=${level.mapY}`);
        }

        // Check file reference path
        if (!level.levelFile) {
          errors.push(`Level "${level.id}" is missing its "levelFile" JSON configuration path.`);
        }
      });
    }

    // 2. Check stories manifest
    const storiesManifest = scene.cache.json.get('stories-manifest');
    if (!storiesManifest) {
      warnings.push('Warning: public/stories/manifest.json is missing.');
    } else {
      console.log(`✓ Loaded stories manifest containing ${Object.keys(storiesManifest).length} stories.`);
    }

    // 3. Log results to console
    const isValid = errors.length === 0;
    
    if (isValid) {
      console.log('✓ Validation passed! All JSON configurations are healthy.');
    } else {
      console.error(`❌ Validation failed with ${errors.length} errors:`);
      errors.forEach(err => console.error(`  -> ${err}`));
    }

    if (warnings.length > 0) {
      console.warn(`⚠️ Validation warnings (${warnings.length}):`);
      warnings.forEach(warn => console.warn(`  -> ${warn}`));
    }

    console.groupEnd();

    return {
      isValid,
      errors,
      warnings
    };
  }
}

import { SAVE_KEY } from '../utils/constants';

export interface SaveData {
  crystals: number;
  bestTimeMs: number | null;
  hasCompletedAdventure: boolean;
  completedLevels: string[];
  newlyUnlockedLevelId?: string | null;
  levelBestTimes?: Record<string, number>;
  activeLevelId?: string;
  dialogueProgress?: {
    storyId: string;
    nodeId: string;
    lineIndex: number;
  };
}

const DEFAULT_SAVE: SaveData = {
  crystals: 0,
  bestTimeMs: null,
  hasCompletedAdventure: false,
  completedLevels: [],
  newlyUnlockedLevelId: null,
  levelBestTimes: {},
  activeLevelId: 'home',
};

export class SaveGameManager {
  public load(): SaveData {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return { ...DEFAULT_SAVE };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const dialogueProgress =
        parsed.dialogueProgress &&
        typeof parsed.dialogueProgress.storyId === 'string' &&
        typeof parsed.dialogueProgress.nodeId === 'string' &&
        typeof parsed.dialogueProgress.lineIndex === 'number'
          ? parsed.dialogueProgress
          : undefined;

      const completedLevels = Array.isArray(parsed.completedLevels) ? parsed.completedLevels : [];
      const newlyUnlockedLevelId = typeof parsed.newlyUnlockedLevelId === 'string' || parsed.newlyUnlockedLevelId === null ? parsed.newlyUnlockedLevelId : null;
      const levelBestTimes = parsed.levelBestTimes && typeof parsed.levelBestTimes === 'object' ? parsed.levelBestTimes : {};
      const activeLevelId = typeof parsed.activeLevelId === 'string' ? parsed.activeLevelId : 'home';

      return {
        crystals: typeof parsed.crystals === 'number' ? parsed.crystals : DEFAULT_SAVE.crystals,
        bestTimeMs: typeof parsed.bestTimeMs === 'number' ? parsed.bestTimeMs : DEFAULT_SAVE.bestTimeMs,
        hasCompletedAdventure:
          typeof parsed.hasCompletedAdventure === 'boolean'
            ? parsed.hasCompletedAdventure
            : DEFAULT_SAVE.hasCompletedAdventure,
        completedLevels,
        newlyUnlockedLevelId,
        levelBestTimes,
        activeLevelId,
        ...(dialogueProgress ? { dialogueProgress } : {}),
      };
    } catch {
      return { ...DEFAULT_SAVE };
    }
  }

  public save(data: SaveData): void {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  public clear(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }
}

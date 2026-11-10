import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENTS,
  emptyAchievementProgress,
  type AchievementProgress,
} from '../utils/achievements';

export const ACHIEVEMENTS_KEY = '@climbstack/achievements';

export async function loadAchievements(): Promise<AchievementProgress> {
  const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
  if (!raw) return emptyAchievementProgress();
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object') throw new Error('Invalid achievement data');
  const progress = data as AchievementProgress;
  const validIds = (ids: unknown): ids is string[] =>
    Array.isArray(ids) && ids.every((id) => typeof id === 'string');
  if (
    !validIds(progress.completedPeakIds) ||
    !validIds(progress.scheduledBlockIds) ||
    !validIds(progress.categoryIds) ||
    !Number.isFinite(progress.altitude) ||
    progress.altitude < 0 ||
    !Number.isFinite(progress.streak) ||
    progress.streak < 0 ||
    !progress.unlocked ||
    typeof progress.unlocked !== 'object' ||
    Array.isArray(progress.unlocked) ||
    Object.entries(progress.unlocked).some(
      ([id, date]) =>
        !ACHIEVEMENTS.some((achievement) => achievement.id === id) ||
        typeof date !== 'string' ||
        Number.isNaN(Date.parse(date))
    )
  ) {
    throw new Error('Invalid achievement data');
  }
  return progress;
}

export async function saveAchievements(progress: AchievementProgress): Promise<void> {
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(progress));
}

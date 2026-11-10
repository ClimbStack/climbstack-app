import type { Category, Peak, WeeklyPlan } from '../types';
import { computeStats, isPeakComplete } from './stats';

export type AchievementMetric = 'altitude' | 'peaks' | 'blocks' | 'categories' | 'streak';

export const ACHIEVEMENTS = [
  { id: 'ventoux', metric: 'altitude', target: 810, icon: 'image-filter-hdr' },
  { id: 'etna', metric: 'altitude', target: 3357, icon: 'volcano' },
  { id: 'matterhorn', metric: 'altitude', target: 4478, icon: 'image-filter-hdr' },
  { id: 'montBlanc', metric: 'altitude', target: 4808, icon: 'snowflake' },
  { id: 'everest', metric: 'altitude', target: 8849, icon: 'earth' },
  { id: 'olympus', metric: 'altitude', target: 21229, icon: 'rocket-launch' },
  { id: 'firstSummit', metric: 'peaks', target: 1, icon: 'flag-checkered' },
  { id: 'mountaineer', metric: 'peaks', target: 5, icon: 'image-filter-hdr' },
  { id: 'alpinist', metric: 'peaks', target: 10, icon: 'image-filter-hdr' },
  { id: 'legendaryClimber', metric: 'peaks', target: 25, icon: 'trophy' },
  { id: 'firstBlock', metric: 'blocks', target: 1, icon: 'cube-outline' },
  { id: 'blockBuilder', metric: 'blocks', target: 100, icon: 'package-variant' },
  { id: 'architect', metric: 'blocks', target: 500, icon: 'domain' },
  { id: 'diversifier', metric: 'categories', target: 5, icon: 'shape' },
  { id: 'paletteMaster', metric: 'categories', target: 10, icon: 'palette' },
  { id: 'onFire', metric: 'streak', target: 7, icon: 'fire' },
  { id: 'unstoppable', metric: 'streak', target: 30, icon: 'arm-flex' },
  { id: 'legendary', metric: 'streak', target: 100, icon: 'trophy' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

export interface AchievementProgress {
  unlocked: Partial<Record<AchievementId, string>>;
  completedPeakIds: string[];
  scheduledBlockIds: string[];
  categoryIds: string[];
  altitude: number;
  streak: number;
}

export interface AchievementSnapshot {
  peaks: Peak[];
  plans: WeeklyPlan[];
  categories: Category[];
  streak: number;
  totalCompletedHours: number;
}

export function emptyAchievementProgress(): AchievementProgress {
  return {
    unlocked: {},
    completedPeakIds: [],
    scheduledBlockIds: [],
    categoryIds: [],
    altitude: 0,
    streak: 0,
  };
}

function mergeIds(previous: string[], current: string[], limit: number): string[] {
  return [...new Set([...previous, ...current])].slice(0, limit);
}

export function achievementValues(
  progress: AchievementProgress
): Record<AchievementMetric, number> {
  return {
    altitude: progress.altitude,
    peaks: progress.completedPeakIds.length,
    blocks: progress.scheduledBlockIds.length,
    categories: progress.categoryIds.length,
    streak: progress.streak,
  };
}

export function updateAchievements(
  previous: AchievementProgress,
  snapshot: AchievementSnapshot,
  defaultCategoryIds: readonly string[],
  unlockedAt: string
): { progress: AchievementProgress; newlyUnlocked: AchievementId[] } {
  const progress: AchievementProgress = {
    unlocked: { ...previous.unlocked },
    completedPeakIds: mergeIds(
      previous.completedPeakIds,
      snapshot.peaks.filter(isPeakComplete).map((peak) => peak.id),
      25
    ),
    scheduledBlockIds: mergeIds(
      previous.scheduledBlockIds,
      snapshot.plans.flatMap((plan) => plan.blocks.map((block) => block.id)),
      500
    ),
    categoryIds: mergeIds(
      previous.categoryIds,
      snapshot.categories
        .filter((category) => !defaultCategoryIds.includes(category.id))
        .map((c) => c.id),
      10
    ),
    altitude: Math.max(
      previous.altitude,
      computeStats(snapshot.peaks, snapshot.streak, undefined, snapshot.totalCompletedHours)
        .totalAltitude
    ),
    streak: Math.max(previous.streak, snapshot.streak),
  };
  const values = achievementValues(progress);
  const newlyUnlocked: AchievementId[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!progress.unlocked[achievement.id] && values[achievement.metric] >= achievement.target) {
      progress.unlocked[achievement.id] = unlockedAt;
      newlyUnlocked.push(achievement.id);
    }
  }

  return {
    progress: JSON.stringify(previous) === JSON.stringify(progress) ? previous : progress,
    newlyUnlocked,
  };
}

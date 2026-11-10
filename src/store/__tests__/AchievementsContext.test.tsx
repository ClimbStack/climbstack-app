import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AchievementsProvider, useAchievements } from '../AchievementsContext';
import { PeaksProvider, usePeaks } from '../PeaksContext';
import { PlannerProvider, usePlanner } from '../PlannerContext';
import * as storage from '../achievementStorage';
import { emptyAchievementProgress } from '../../utils/achievements';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../utils/calendar', () => ({
  createCalendarEvent: jest.fn().mockResolvedValue(null),
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
}));
let mockId = 0;
jest.mock('../../utils/id', () => ({ generateId: () => `id-${++mockId}` }));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PeaksProvider>
    <PlannerProvider>
      <AchievementsProvider>{children}</AchievementsProvider>
    </PlannerProvider>
  </PeaksProvider>
);
const useApp = () => ({
  achievements: useAchievements(),
  planner: usePlanner(),
  peaks: usePeaks(),
});

describe('achievement integration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockId = 0;
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires its provider', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(useAchievements)).rejects.toThrow(
      'useAchievements must be used within AchievementsProvider'
    );
    error.mockRestore();
  });

  it('awards real scheduling, custom category and peak actions and restores dates after restart', async () => {
    const { result, unmount } = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(result.current.achievements.isLoading).toBe(false));
    expect(result.current.achievements.progress?.categoryIds).toEqual([]);
    await act(async () => {
      result.current.peaks.addPeak('Goal');
      result.current.planner.scheduleOneOffBlock('Activity', 'uni', 1, 'lun', '09:00');
      for (let i = 0; i < 5; i++)
        result.current.planner.addCategory(`Custom ${i}`, 'shape', 'teal', 1);
    });
    await act(async () => result.current.peaks.addCamp(result.current.peaks.peaks[0].id, 'Step'));
    await act(async () =>
      result.current.peaks.toggleCamp(
        result.current.peaks.peaks[0].id,
        result.current.peaks.peaks[0].camps[0].id
      )
    );
    const date = result.current.achievements.progress!.unlocked.firstSummit;
    expect(date).toBeDefined();
    expect(result.current.achievements.progress?.unlocked.firstBlock).toBeDefined();
    expect(result.current.achievements.progress?.unlocked.diversifier).toBeDefined();
    const pendingCount = result.current.achievements.pending.length;
    await act(async () => result.current.achievements.dismissCelebration());
    expect(result.current.achievements.pending).toHaveLength(pendingCount - 1);
    await act(async () => {
      result.current.peaks.deletePeak(result.current.peaks.peaks[0].id);
      await result.current.planner.clearCurrentWeek();
    });
    await waitFor(async () =>
      expect((await storage.loadAchievements()).unlocked.firstSummit).toBe(date)
    );
    await unmount();
    const restored = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(restored.result.current.achievements.isLoading).toBe(false));
    expect(restored.result.current.achievements.progress?.unlocked.firstSummit).toBe(date);
    expect(restored.result.current.achievements.progress?.scheduledBlockIds).toHaveLength(1);
    expect(restored.result.current.achievements.pending).toEqual([]);
  });

  it('backfills historical weeks once and prefers migrated storage over legacy duplicates', async () => {
    const block = { id: 'legacy', day: 'lun', startTime: '09:00', done: false };
    await AsyncStorage.multiSet([
      ['@levelup/week/2026-01-05', JSON.stringify({ weekId: '2026-01-05', blocks: [block] })],
      [
        '@climbstack/week/2026-01-05',
        JSON.stringify({ weekId: '2026-01-05', blocks: [{ ...block, id: 'migrated' }] }),
      ],
      [
        '@levelup/week/2026-01-12',
        JSON.stringify({ weekId: '2026-01-12', blocks: [{ ...block, id: 'second' }] }),
      ],
    ]);
    const { result } = await renderHook(useApp, { wrapper });
    await waitFor(() =>
      expect(result.current.achievements.progress?.unlocked.firstBlock).toBeDefined()
    );
    expect(result.current.achievements.progress?.scheduledBlockIds).toEqual(['migrated', 'second']);
    await act(async () => result.current.planner.changeWeek('2026-01-12'));
    expect(result.current.achievements.progress?.scheduledBlockIds).toHaveLength(2);
  });

  it('replaces progress and cached plans when importing an older backup', async () => {
    const { result } = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(result.current.achievements.isLoading).toBe(false));
    await act(async () =>
      result.current.planner.scheduleOneOffBlock('Activity', 'uni', 1, 'lun', '09:00')
    );
    expect(result.current.achievements.progress?.unlocked.firstBlock).toBeDefined();
    await act(async () =>
      result.current.achievements.restoreBackup(async () => {
        await AsyncStorage.clear();
        await result.current.peaks.refreshData();
        await result.current.planner.refreshData(true);
      })
    );
    expect(result.current.planner.currentPlan.blocks).toEqual([]);
    expect(result.current.achievements.progress).toEqual(emptyAchievementProgress());
    expect(result.current.achievements.pending).toEqual([]);
    await waitFor(async () =>
      expect(await storage.loadAchievements()).toEqual(emptyAchievementProgress())
    );
  });

  it('preserves malformed storage until it can be repaired and retried', async () => {
    await AsyncStorage.setItem(storage.ACHIEVEMENTS_KEY, '{broken');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(result.current.achievements.hasError).toBe(true));
    expect(await AsyncStorage.getItem(storage.ACHIEVEMENTS_KEY)).toBe('{broken');
    await storage.saveAchievements(emptyAchievementProgress());
    await act(async () => result.current.achievements.retry());
    expect(result.current.achievements.hasError).toBe(false);
    expect(result.current.achievements.progress).toEqual(emptyAchievementProgress());
  });

  it('retries failed persistence without changing the original unlock date', async () => {
    const { result } = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(result.current.achievements.isLoading).toBe(false));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(storage, 'saveAchievements').mockRejectedValueOnce(new Error('Disk full'));
    await act(async () =>
      result.current.planner.scheduleOneOffBlock('Activity', 'uni', 1, 'lun', '09:00')
    );
    await waitFor(() => expect(result.current.achievements.hasError).toBe(true));
    const date = result.current.achievements.progress?.unlocked.firstBlock;
    await act(async () => result.current.achievements.retry());
    expect(result.current.achievements.hasError).toBe(false);
    expect((await storage.loadAchievements()).unlocked.firstBlock).toBe(date);
    expect(date).toBeDefined();
  });

  it('waits for queued saves before restoring a backup', async () => {
    const { result } = await renderHook(useApp, { wrapper });
    await waitFor(() => expect(result.current.achievements.isLoading).toBe(false));
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = storage.saveAchievements;
    jest.spyOn(storage, 'saveAchievements').mockImplementationOnce(async (progress) => {
      await blocked;
      await original(progress);
    });
    await act(async () =>
      result.current.planner.scheduleOneOffBlock('Activity', 'uni', 1, 'lun', '09:00')
    );
    let started = false;
    let restore!: Promise<void>;
    await act(async () => {
      restore = result.current.achievements.restoreBackup(async () => {
        started = true;
        await AsyncStorage.clear();
        await result.current.peaks.refreshData();
        await result.current.planner.refreshData(true);
      });
    });
    expect(started).toBe(false);
    await act(async () => {
      release();
      await restore;
    });
    expect(started).toBe(true);
    await waitFor(async () =>
      expect(await storage.loadAchievements()).toEqual(emptyAchievementProgress())
    );
  });
});

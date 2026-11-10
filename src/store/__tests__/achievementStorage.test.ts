import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACHIEVEMENTS_KEY, loadAchievements, saveAchievements } from '../achievementStorage';
import { emptyAchievementProgress } from '../../utils/achievements';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('achievement storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('starts with empty progress when no ledger is stored', async () => {
    expect(await loadAchievements()).toEqual(emptyAchievementProgress());
  });

  it('round-trips rewards and exact unlock dates', async () => {
    const progress = {
      ...emptyAchievementProgress(),
      unlocked: { firstBlock: '2026-11-09T12:00:00.000Z' },
      scheduledBlockIds: ['b1'],
      altitude: 123.5,
      streak: 7,
    };
    await saveAchievements(progress);
    expect(await loadAchievements()).toEqual(progress);
    expect(await AsyncStorage.getItem(ACHIEVEMENTS_KEY)).toBe(JSON.stringify(progress));
  });

  it.each([
    null,
    [],
    { altitude: -1 },
    { streak: -1 },
    { completedPeakIds: [1] },
    { categoryIds: 'invalid' },
    { scheduledBlockIds: [null] },
    { unlocked: { firstBlock: 'invalid-date' } },
    { unlocked: { unknown: '2026-11-09T12:00:00.000Z' } },
    { unlocked: [] },
  ])('rejects invalid stored data %j without replacing it', async (invalid) => {
    const raw = JSON.stringify(
      invalid === null || Array.isArray(invalid)
        ? invalid
        : { ...emptyAchievementProgress(), ...invalid }
    );
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, raw);
    await expect(loadAchievements()).rejects.toThrow('Invalid achievement data');
    expect(await AsyncStorage.getItem(ACHIEVEMENTS_KEY)).toBe(raw);
  });

  it('propagates parse and persistence failures', async () => {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, '{broken');
    await expect(loadAchievements()).rejects.toThrow(SyntaxError);
    const failure = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('Disk full'));
    await expect(saveAchievements(emptyAchievementProgress())).rejects.toThrow('Disk full');
    failure.mockRestore();
  });
});

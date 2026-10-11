import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Peak } from '../../types';
import { loadPeaks, loadStreak, savePeaks, saveStreak } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const makePeak = (overrides: Partial<Peak> = {}): Peak => ({
  id: 'peak-1',
  name: 'Mont Blanc',
  camps: [{ id: 'camp-1', name: 'Base camp', done: false, order: 0 }],
  createdAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

describe('storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('peaks', () => {
    test('returns empty array when nothing has been saved', async () => {
      expect(await loadPeaks()).toEqual([]);
    });

    test('round-trips peaks including nested camps', async () => {
      const peaks = [
        makePeak(),
        makePeak({ id: 'peak-2', name: 'Eiger', completedAt: '2026-05-01T08:00:00.000Z' }),
      ];

      await savePeaks(peaks);

      expect(await loadPeaks()).toEqual(peaks);
    });

    test('overwrites previously saved peaks', async () => {
      await savePeaks([makePeak()]);
      await savePeaks([makePeak({ id: 'peak-9' })]);

      const loaded = await loadPeaks();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('peak-9');
    });

    test('persists an empty list as an empty list', async () => {
      await savePeaks([makePeak()]);
      await savePeaks([]);

      expect(await loadPeaks()).toEqual([]);
    });
  });

  describe('streak', () => {
    test('returns defaults when nothing has been saved', async () => {
      expect(await loadStreak()).toEqual({
        streak: 0,
        lastActiveDate: undefined,
        totalCompletedHours: 0,
      });
    });

    test('round-trips streak, last active date and fractional hours', async () => {
      await saveStreak(7, '2026-10-07', 12.5);

      expect(await loadStreak()).toEqual({
        streak: 7,
        lastActiveDate: '2026-10-07',
        totalCompletedHours: 12.5,
      });
    });

    test('defaults completed hours to 0 when omitted', async () => {
      await saveStreak(3, '2026-10-01');

      const loaded = await loadStreak();

      expect(loaded.streak).toBe(3);
      expect(loaded.totalCompletedHours).toBe(0);
    });

    test('stores values as strings under the expected keys', async () => {
      await saveStreak(4, '2026-10-02', 1.25);

      expect(await AsyncStorage.getItem('@climbstack/streak')).toBe('4');
      expect(await AsyncStorage.getItem('@climbstack/last_active')).toBe('2026-10-02');
      expect(await AsyncStorage.getItem('@climbstack/completed_hours')).toBe('1.25');
    });

    test('overwrites a previous streak', async () => {
      await saveStreak(10, '2026-10-01', 40);
      await saveStreak(0, '2026-10-05', 40);

      expect((await loadStreak()).streak).toBe(0);
    });

    test('treats a partially stored streak as defaults for missing fields', async () => {
      await AsyncStorage.setItem('@climbstack/streak', '5');

      expect(await loadStreak()).toEqual({
        streak: 5,
        lastActiveDate: undefined,
        totalCompletedHours: 0,
      });
    });

    test('reads from legacy @levelup keys when @climbstack keys are absent', async () => {
      await AsyncStorage.setItem('@levelup/streak', '7');
      await AsyncStorage.setItem('@levelup/last_active', '2026-10-01');
      await AsyncStorage.setItem('@levelup/completed_hours', '3.5');

      expect(await loadStreak()).toEqual({
        streak: 7,
        lastActiveDate: '2026-10-01',
        totalCompletedHours: 3.5,
      });
    });

    test('parses streak as integer and hours as float from raw strings', async () => {
      await AsyncStorage.multiSet([
        ['@climbstack/streak', '6.9'],
        ['@climbstack/completed_hours', '2.75'],
      ]);

      const loaded = await loadStreak();

      expect(loaded.streak).toBe(6);
      expect(loaded.totalCompletedHours).toBe(2.75);
    });
  });
});

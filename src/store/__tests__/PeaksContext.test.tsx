import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { PeaksProvider, usePeaks } from '../PeaksContext';
import { savePeaks, loadPeaks, saveStreak, loadStreak } from '../storage';
import type { Peak, Camp } from '../../types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../storage', () => ({
  savePeaks: jest.fn().mockResolvedValue(undefined),
  loadPeaks: jest.fn().mockResolvedValue([]),
  saveStreak: jest.fn().mockResolvedValue(undefined),
  loadStreak: jest.fn().mockResolvedValue({
    streak: 0,
    lastActiveDate: undefined,
    totalCompletedHours: 0,
  }),
}));

let mockIdCounter = 1;
jest.mock('../../utils/id', () => ({
  generateId: jest.fn(() => `test-id-${mockIdCounter++}`),
}));

const mockSavePeaks = savePeaks as jest.MockedFunction<typeof savePeaks>;
const mockLoadPeaks = loadPeaks as jest.MockedFunction<typeof loadPeaks>;
const mockSaveStreak = saveStreak as jest.MockedFunction<typeof saveStreak>;
const mockLoadStreak = loadStreak as jest.MockedFunction<typeof loadStreak>;

describe('PeaksContext', () => {
  beforeEach(() => {
    mockIdCounter = 1;
    jest.clearAllMocks();
    mockSavePeaks.mockResolvedValue(undefined);
    mockLoadPeaks.mockResolvedValue([]);
    mockSaveStreak.mockResolvedValue(undefined);
    mockLoadStreak.mockResolvedValue({
      streak: 0,
      lastActiveDate: undefined,
      totalCompletedHours: 0,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PeaksProvider>{children}</PeaksProvider>
  );

  describe('usePeaks hook', () => {
    it('throws error when used outside PeaksProvider', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(renderHook(() => usePeaks())).rejects.toThrow(
        'usePeaks must be used within PeaksProvider'
      );
      consoleError.mockRestore();
    });
  });

  describe('initialization & data loading', () => {
    it('loads peaks and streak on mount', async () => {
      const initialPeaks: Peak[] = [
        {
          id: 'peak-1',
          name: 'Monte Bianco',
          description: 'Highest in the Alps',
          camps: [],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ];
      mockLoadPeaks.mockResolvedValueOnce(initialPeaks);
      mockLoadStreak.mockResolvedValueOnce({
        streak: 5,
        lastActiveDate: '2026-10-14',
        totalCompletedHours: 14.5,
      });

      const { result } = await renderHook(() => usePeaks(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.peaks).toEqual(initialPeaks);
      expect(result.current.streak).toBe(5);
      expect(result.current.lastActiveDate).toBe('2026-10-14');
      expect(result.current.totalCompletedHours).toBe(14.5);
      expect(mockLoadPeaks).toHaveBeenCalledTimes(1);
      expect(mockLoadStreak).toHaveBeenCalledTimes(1);
    });

    it('handles error when loading data fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLoadPeaks.mockRejectedValueOnce(new Error('Storage load failed'));

      const { result } = await renderHook(() => usePeaks(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(consoleError).toHaveBeenCalledWith('Errore caricamento dati:', expect.any(Error));
      expect(result.current.peaks).toEqual([]);
      expect(result.current.streak).toBe(0);
      consoleError.mockRestore();
    });

    it('reloads data when refreshData is invoked', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const refreshedPeaks: Peak[] = [
        {
          id: 'refreshed-peak',
          name: 'Everest',
          camps: [],
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ];
      mockLoadPeaks.mockResolvedValueOnce(refreshedPeaks);
      mockLoadStreak.mockResolvedValueOnce({
        streak: 12,
        lastActiveDate: '2026-10-15',
        totalCompletedHours: 20,
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.peaks).toEqual(refreshedPeaks);
      expect(result.current.streak).toBe(12);
      expect(result.current.lastActiveDate).toBe('2026-10-15');
      expect(result.current.totalCompletedHours).toBe(20);
    });
  });

  describe('saving effects & error handling', () => {
    it('saves peaks when peaks change after loading', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Matterhorn');
      });

      await waitFor(() => {
        expect(mockSavePeaks).toHaveBeenCalledWith(
          expect.arrayContaining([expect.objectContaining({ name: 'Matterhorn' })])
        );
      });
    });

    it('logs error if savePeaks fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSavePeaks.mockRejectedValueOnce(new Error('Failed to save peaks'));

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Matterhorn');
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Errore salvataggio peaks:', expect.any(Error));
      });
      consoleError.mockRestore();
    });

    it('saves streak and hours when active date is present', async () => {
      mockLoadStreak.mockResolvedValueOnce({
        streak: 2,
        lastActiveDate: '2026-10-14',
        totalCompletedHours: 5,
      });

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addCompletedHours(2.5);
      });

      await waitFor(() => {
        expect(mockSaveStreak).toHaveBeenCalledWith(expect.any(Number), expect.any(String), 7.5);
      });
    });

    it('logs error if saveStreak fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockLoadStreak.mockResolvedValueOnce({
        streak: 2,
        lastActiveDate: '2026-10-14',
        totalCompletedHours: 5,
      });
      mockSaveStreak.mockRejectedValueOnce(new Error('Failed to save streak'));

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addCompletedHours(1);
      });

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Errore salvataggio streak:', expect.any(Error));
      });
      consoleError.mockRestore();
    });
  });

  describe('peak operations', () => {
    it('adds peak with name and description and updates streak', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Gran Paradiso', 'A beautiful 4000m peak');
      });

      expect(result.current.peaks).toHaveLength(1);
      expect(result.current.peaks[0]).toEqual({
        id: 'test-id-1',
        name: 'Gran Paradiso',
        description: 'A beautiful 4000m peak',
        camps: [],
        createdAt: expect.any(String),
      });
      expect(result.current.streak).toBe(1);
      expect(result.current.lastActiveDate).toBeDefined();
    });

    it('adds peak without description', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Mont Blanc');
      });

      expect(result.current.peaks[0].name).toBe('Mont Blanc');
      expect(result.current.peaks[0].description).toBeUndefined();
    });

    it('deletes peak by id', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Peak 1');
        result.current.addPeak('Peak 2');
      });
      expect(result.current.peaks).toHaveLength(2);

      await act(async () => {
        result.current.deletePeak('test-id-1');
      });

      expect(result.current.peaks).toHaveLength(1);
      expect(result.current.peaks[0].id).toBe('test-id-2');

      // Non-matching id leaves peaks unchanged
      await act(async () => {
        result.current.deletePeak('non-existent-id');
      });
      expect(result.current.peaks).toHaveLength(1);
    });
  });

  describe('camp operations', () => {
    it('adds camp to matching peak and leaves other peaks unchanged', async () => {
      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addPeak('Peak 1');
        result.current.addPeak('Peak 2');
      });

      await act(async () => {
        result.current.addCamp('test-id-1', 'Base Camp');
      });

      const peak1 = result.current.peaks.find((p) => p.id === 'test-id-1');
      const peak2 = result.current.peaks.find((p) => p.id === 'test-id-2');

      expect(peak1?.camps).toHaveLength(1);
      expect(peak1?.camps[0]).toEqual({
        id: 'test-id-3',
        name: 'Base Camp',
        done: false,
        order: 0,
      });
      expect(peak2?.camps).toHaveLength(0);

      // Adding to non-existent peak leaves all peaks unchanged
      await act(async () => {
        result.current.addCamp('unknown-peak', 'Camp Nowhere');
      });
      expect(result.current.peaks.find((p) => p.id === 'test-id-1')?.camps).toHaveLength(1);
    });

    it('resets peak completedAt when a new camp is added to a completed peak', async () => {
      const completedPeak: Peak = {
        id: 'peak-done',
        name: 'Completed Peak',
        camps: [{ id: 'c1', name: 'Camp 1', done: true, order: 0 }],
        completedAt: '2026-10-10T00:00:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([completedPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addCamp('peak-done', 'New High Camp');
      });

      const updatedPeak = result.current.peaks[0];
      expect(updatedPeak.camps).toHaveLength(2);
      expect(updatedPeak.completedAt).toBeUndefined();
    });

    it('toggles camp done status and records completion date', async () => {
      const initialPeak: Peak = {
        id: 'peak-1',
        name: 'Peak 1',
        camps: [
          { id: 'c1', name: 'Camp 1', done: false, order: 0 },
          { id: 'c2', name: 'Camp 2', done: false, order: 1 },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([initialPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Toggle first camp done
      await act(async () => {
        result.current.toggleCamp('peak-1', 'c1');
      });

      let peak = result.current.peaks[0];
      expect(peak.camps[0].done).toBe(true);
      expect(peak.camps[0].completedAt).toBeDefined();
      expect(peak.completedAt).toBeUndefined(); // Peak not yet complete

      // Toggle second camp done -> peak becomes complete!
      await act(async () => {
        result.current.toggleCamp('peak-1', 'c2');
      });

      peak = result.current.peaks[0];
      expect(peak.camps[1].done).toBe(true);
      expect(peak.completedAt).toBeDefined();

      // Toggle second camp undone -> peak becomes incomplete again
      await act(async () => {
        result.current.toggleCamp('peak-1', 'c2');
      });

      peak = result.current.peaks[0];
      expect(peak.camps[1].done).toBe(false);
      expect(peak.camps[1].completedAt).toBeUndefined();
      expect(peak.completedAt).toBeUndefined();

      // Non-matching peakId does nothing
      await act(async () => {
        result.current.toggleCamp('non-matching-peak', 'c1');
      });

      // Non-matching campId does nothing
      await act(async () => {
        result.current.toggleCamp('peak-1', 'non-matching-camp');
      });
      expect(result.current.peaks[0].camps[0].done).toBe(true);
    });

    it('retains peak completedAt if toggle occurs when peak was already complete', async () => {
      const completedPeak: Peak = {
        id: 'peak-1',
        name: 'Peak 1',
        camps: [
          {
            id: 'c1',
            name: 'Camp 1',
            done: true,
            order: 0,
            completedAt: '2026-10-10T00:00:00.000Z',
          },
          {
            id: 'c2',
            name: 'Camp 2',
            done: true,
            order: 1,
            completedAt: '2026-10-10T00:00:00.000Z',
          },
        ],
        completedAt: '2026-10-10T00:00:00.000Z',
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([completedPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Toggle non-matching campId on a completed peak to exercise the untouched branch
      await act(async () => {
        result.current.toggleCamp('peak-1', 'unknown-camp');
      });
      expect(result.current.peaks[0].completedAt).toBe('2026-10-10T00:00:00.000Z');
    });

    it('deletes camp and reorders remaining camps', async () => {
      const initialPeak: Peak = {
        id: 'peak-1',
        name: 'Peak 1',
        camps: [
          { id: 'c1', name: 'Camp 1', done: true, order: 0 },
          { id: 'c2', name: 'Camp 2', done: false, order: 1 },
          { id: 'c3', name: 'Camp 3', done: true, order: 2 },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([initialPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Delete the only incomplete camp (c2) -> remaining camps are all done -> peak becomes complete!
      await act(async () => {
        result.current.deleteCamp('peak-1', 'c2');
      });

      let peak = result.current.peaks[0];
      expect(peak.camps).toHaveLength(2);
      expect(peak.camps[0].id).toBe('c1');
      expect(peak.camps[0].order).toBe(0);
      expect(peak.camps[1].id).toBe('c3');
      expect(peak.camps[1].order).toBe(1);
      expect(peak.completedAt).toBeDefined();

      // Non-matching peakId leaves peaks unchanged
      await act(async () => {
        result.current.deleteCamp('unknown-peak', 'c1');
      });
      expect(result.current.peaks[0].camps).toHaveLength(2);

      // Deleting remaining camps until 0 camps -> peak is no longer complete
      await act(async () => {
        result.current.deleteCamp('peak-1', 'c1');
        result.current.deleteCamp('peak-1', 'c3');
      });

      peak = result.current.peaks[0];
      expect(peak.camps).toHaveLength(0);
      expect(peak.completedAt).toBeUndefined();
    });

    it('edits camp name', async () => {
      const initialPeak: Peak = {
        id: 'peak-1',
        name: 'Peak 1',
        camps: [
          { id: 'c1', name: 'Camp 1', done: false, order: 0 },
          { id: 'c2', name: 'Camp 2', done: false, order: 1 },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([initialPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.editCamp('peak-1', 'c1', 'High Camp Renamed');
      });

      const peak = result.current.peaks[0];
      expect(peak.camps[0].name).toBe('High Camp Renamed');
      expect(peak.camps[1].name).toBe('Camp 2');

      // Non-matching peakId does nothing
      await act(async () => {
        result.current.editCamp('non-existent-peak', 'c1', 'Should Not Change');
      });
      expect(result.current.peaks[0].camps[0].name).toBe('High Camp Renamed');

      // Non-matching campId does nothing
      await act(async () => {
        result.current.editCamp('peak-1', 'non-existent-camp', 'Should Not Change');
      });
      expect(result.current.peaks[0].camps[0].name).toBe('High Camp Renamed');
    });

    it('reorders camps', async () => {
      const initialPeak: Peak = {
        id: 'peak-1',
        name: 'Peak 1',
        camps: [
          { id: 'c1', name: 'Camp 1', done: false, order: 0 },
          { id: 'c2', name: 'Camp 2', done: false, order: 1 },
        ],
        createdAt: '2026-10-01T00:00:00.000Z',
      };
      mockLoadPeaks.mockResolvedValueOnce([initialPeak]);

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newCamps: Camp[] = [
        { id: 'c2', name: 'Camp 2', done: false, order: 99 },
        { id: 'c1', name: 'Camp 1', done: false, order: 88 },
      ];

      await act(async () => {
        result.current.reorderCamps('peak-1', newCamps);
      });

      const peak = result.current.peaks[0];
      expect(peak.camps[0].id).toBe('c2');
      expect(peak.camps[0].order).toBe(0);
      expect(peak.camps[1].id).toBe('c1');
      expect(peak.camps[1].order).toBe(1);

      // Non-matching peakId leaves peaks unchanged
      await act(async () => {
        result.current.reorderCamps('non-existent-peak', newCamps);
      });
      expect(result.current.peaks[0].camps[0].id).toBe('c2');
    });
  });

  describe('hours & activity recording', () => {
    it('accumulates completed hours and triggers activity record', async () => {
      mockLoadStreak.mockResolvedValueOnce({
        streak: 1,
        lastActiveDate: '2026-10-14',
        totalCompletedHours: 10,
      });

      const { result } = await renderHook(() => usePeaks(), { wrapper });
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.addCompletedHours(3.5);
      });

      expect(result.current.totalCompletedHours).toBe(13.5);
      expect(result.current.lastActiveDate).toBeDefined();
    });
  });
});

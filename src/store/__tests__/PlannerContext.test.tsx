import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { PlannerProvider, usePlanner } from '../PlannerContext';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEventDescription,
} from '../../utils/calendar';
import {
  loadWeeklyPlan,
  saveWeeklyPlan,
  loadCategories,
  saveCategories,
  loadTemplates,
  saveTemplates,
} from '../plannerStorage';
import type { Category, ScheduledBlock, WeeklyPlan } from '../../types';
import * as weekUtils from '../../types/weekUtils';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../plannerStorage', () => {
  const actual = jest.requireActual('../plannerStorage');
  return {
    ...actual,
    saveWeeklyPlan: jest.fn(actual.saveWeeklyPlan),
    loadWeeklyPlan: jest.fn(actual.loadWeeklyPlan),
    saveCategories: jest.fn(actual.saveCategories),
    loadCategories: jest.fn(actual.loadCategories),
    saveTemplates: jest.fn(actual.saveTemplates),
    loadTemplates: jest.fn(actual.loadTemplates),
  };
});

let mockIdCounter = 1;
jest.mock('../../utils/id', () => ({
  generateId: jest.fn(() => `test-id-${mockIdCounter++}`),
}));

jest.mock('../../utils/calendar', () => ({
  createCalendarEvent: jest.fn().mockResolvedValue('event-123'),
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
  updateCalendarEventDescription: jest.fn().mockResolvedValue(undefined),
}));

const mockDeleteCalendarEvent = deleteCalendarEvent as jest.MockedFunction<
  typeof deleteCalendarEvent
>;
const mockCreateCalendarEvent = createCalendarEvent as jest.MockedFunction<
  typeof createCalendarEvent
>;
const mockUpdateCalendarEventDescription = updateCalendarEventDescription as jest.MockedFunction<
  typeof updateCalendarEventDescription
>;

describe('PlannerContext', () => {
  beforeEach(async () => {
    mockIdCounter = 1;
    jest.useFakeTimers();
    await AsyncStorage.clear();
    jest.clearAllMocks();
    (saveWeeklyPlan as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').saveWeeklyPlan
    );
    (loadWeeklyPlan as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').loadWeeklyPlan
    );
    (saveCategories as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').saveCategories
    );
    (loadCategories as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').loadCategories
    );
    (saveTemplates as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').saveTemplates
    );
    (loadTemplates as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').loadTemplates
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PlannerProvider>{children}</PlannerProvider>
  );

  describe('initialization & lifecycle', () => {
    it('throws error when usePlanner is used outside PlannerProvider', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      await expect(renderHook(() => usePlanner())).rejects.toThrow(
        'usePlanner must be used within PlannerProvider'
      );
      consoleError.mockRestore();
    });

    it('initializes with default categories when storage is empty', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(result.current.categories.length).toBeGreaterThan(0);
      expect(result.current.categories.some((c) => c.id === 'sonno')).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('migrates legacy category names and emojis on load', async () => {
      const legacyCats: Category[] = [
        {
          id: 'lettura',
          name: 'altro',
          color: '#F59E0B',
          emoji: '😴',
          targetHoursPerWeek: 3,
        },
        {
          id: 'progetto',
          name: 'other',
          color: '#EC4899',
          emoji: 'invalid-emoji-🔥',
          targetHoursPerWeek: 2,
        },
        {
          id: 'custom',
          name: 'Altro',
          color: '#10B981',
          emoji: 'shape',
          targetHoursPerWeek: 4,
          isCustomName: true,
        },
      ];
      await saveCategories(legacyCats);

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      const lettura = result.current.categories.find((c) => c.id === 'lettura');
      expect(lettura?.emoji).toBe('bed');
      expect(lettura?.name).not.toBe('altro');

      const custom = result.current.categories.find((c) => c.id === 'custom');
      expect(custom?.name).toBe('Altro');
    });

    it('handles app state change to active and refreshes real week', async () => {
      let appStateListener: ((state: AppStateStatus) => void) | undefined;
      jest.spyOn(AppState, 'addEventListener').mockImplementation((event, listener) => {
        if (event === 'change') {
          appStateListener = listener as (state: AppStateStatus) => void;
        }
        return { remove: jest.fn() } as any;
      });

      const getCurrentWeekIdSpy = jest.spyOn(weekUtils, 'getCurrentWeekId');
      getCurrentWeekIdSpy.mockReturnValue('2026-10-12');

      await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      getCurrentWeekIdSpy.mockReturnValue('2026-10-19');

      await act(async () => {
        appStateListener?.('active');
      });

      getCurrentWeekIdSpy.mockRestore();
    });

    it('handles 60s timer interval for real week check', async () => {
      const getCurrentWeekIdSpy = jest.spyOn(weekUtils, 'getCurrentWeekId');
      getCurrentWeekIdSpy.mockReturnValue('2026-10-12');

      await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(60000);
      });

      getCurrentWeekIdSpy.mockRestore();
    });

    it('logs error when refreshData fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (loadCategories as jest.Mock).mockRejectedValueOnce(new Error('Load failed'));

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Errore caricamento planner:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('refreshes data when current week differs from real week', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.changeWeek('2026-11-01');
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(result.current.currentWeekId).toBe('2026-11-01');
    });
  });

  describe('category management', () => {
    it('adds, edits, archives, unarchives and deletes categories', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addCategory('Climbing', 'mountain', '#EF4444', 6);
      });

      const added = result.current.categories.find((c) => c.name === 'Climbing');
      expect(added).toBeDefined();
      expect(added?.color).toBe('#EF4444');
      expect(added?.targetHoursPerWeek).toBe(6);

      const catId = added!.id;

      await act(async () => {
        result.current.editCategory(catId, { name: 'Indoor Climbing', targetHoursPerWeek: 8 });
      });

      expect(result.current.getCategoryById(catId)?.name).toBe('Indoor Climbing');
      expect(result.current.getCategoryById(catId)?.targetHoursPerWeek).toBe(8);

      await act(async () => {
        result.current.archiveCategory(catId);
      });
      expect(result.current.getCategoryById(catId)?.isArchived).toBe(true);

      await act(async () => {
        result.current.unarchiveCategory(catId);
      });
      expect(result.current.getCategoryById(catId)?.isArchived).toBe(false);

      await act(async () => {
        result.current.addTemplate('Bouldering', catId, 2);
      });
      const tpl = result.current.templates.find((t) => t.name === 'Bouldering');
      expect(tpl).toBeDefined();

      await act(async () => {
        result.current.scheduleBlock(tpl!.id, 'lun', '10:00');
        result.current.scheduleOneOffBlock('Free Climb', catId, 1, 'mar', '12:00');
      });

      expect(result.current.currentPlan.blocks).toHaveLength(2);

      await act(async () => {
        result.current.deleteCategory(catId);
      });

      expect(result.current.getCategoryById(catId)).toBeUndefined();
      expect(result.current.templates.find((t) => t.categoryId === catId)).toBeUndefined();
      expect(result.current.currentPlan.blocks).toHaveLength(0);
    });
  });

  describe('template management', () => {
    it('adds, archives, unarchives and deletes templates', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addTemplate('Guitar Practice', 'hobby', 1, 'peak-1');
      });

      const tpl = result.current.templates.find((t) => t.name === 'Guitar Practice');
      expect(tpl).toBeDefined();
      expect(tpl?.peakId).toBe('peak-1');

      const tplId = tpl!.id;

      await act(async () => {
        result.current.archiveTemplate(tplId);
      });
      expect(result.current.getTemplateById(tplId)?.isArchived).toBe(true);

      await act(async () => {
        result.current.unarchiveTemplate(tplId);
      });
      expect(result.current.getTemplateById(tplId)?.isArchived).toBe(false);

      await act(async () => {
        result.current.scheduleBlock(tplId, 'mer', '15:00');
      });
      expect(result.current.currentPlan.blocks.some((b) => b.templateId === tplId)).toBe(true);

      await act(async () => {
        result.current.deleteTemplate(tplId);
      });

      expect(result.current.getTemplateById(tplId)).toBeUndefined();
      expect(result.current.currentPlan.blocks.some((b) => b.templateId === tplId)).toBe(false);
    });
  });

  describe('scheduling & block operations', () => {
    it('schedules a template block and syncs calendar event', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addTemplate('Deep Work', 'cp', 2);
      });

      const tpl = result.current.templates.find((t) => t.name === 'Deep Work')!;

      await act(async () => {
        result.current.scheduleBlock(tpl.id, 'gio', '09:00', 3);
      });

      const scheduled = result.current.currentPlan.blocks.find((b) => b.templateId === tpl.id);
      expect(scheduled).toBeDefined();
      expect(scheduled?.customDuration).toBe(3);
      expect(mockCreateCalendarEvent).toHaveBeenCalled();
    });

    it('handles calendar event creation failure on scheduleBlock gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateCalendarEvent.mockRejectedValueOnce(new Error('Calendar offline'));

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addTemplate('Quick Task', 'libero', 1);
      });

      const tpl = result.current.templates.find((t) => t.name === 'Quick Task')!;

      await act(async () => {
        result.current.scheduleBlock(tpl.id, 'ven', '11:00');
      });

      expect(result.current.currentPlan.blocks.some((b) => b.templateId === tpl.id)).toBe(true);
      consoleErrorSpy.mockRestore();
    });

    it('schedules one-off block and syncs calendar event', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.scheduleOneOffBlock('Doctor Visit', 'libero', 1, 'sab', '16:00');
      });

      const oneOff = result.current.currentPlan.blocks.find((b) => b.oneOffName === 'Doctor Visit');
      expect(oneOff).toBeDefined();
      expect(oneOff?.isOneOff).toBe(true);
      expect(mockCreateCalendarEvent).toHaveBeenCalled();
    });

    it('handles calendar failure on scheduleOneOffBlock gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateCalendarEvent.mockRejectedValueOnce(new Error('Calendar error'));

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.scheduleOneOffBlock('Dentist', 'libero', 1, 'dom', '10:00');
      });

      expect(result.current.currentPlan.blocks.some((b) => b.oneOffName === 'Dentist')).toBe(true);
      consoleErrorSpy.mockRestore();
    });

    it('unschedules block and removes calendar event', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.scheduleOneOffBlock('Gym', 'hobby', 1.5, 'lun', '18:00');
      });

      const block = result.current.currentPlan.blocks.find((b) => b.oneOffName === 'Gym')!;

      await act(async () => {
        result.current.unscheduleBlock(block.id);
      });

      expect(result.current.currentPlan.blocks.find((b) => b.id === block.id)).toBeUndefined();
    });

    it('unscheduleBlock does nothing if block id is not found', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.unscheduleBlock('non-existent-block');
      });

      expect(result.current.currentPlan.blocks).toEqual([]);
    });

    it('toggles block done state', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.scheduleOneOffBlock('Meditate', 'hobby', 0.5, 'lun', '08:00');
      });

      const blockId = result.current.currentPlan.blocks[0].id;
      expect(result.current.currentPlan.blocks[0].done).toBe(false);

      await act(async () => {
        result.current.toggleBlockDone(blockId);
      });
      expect(result.current.currentPlan.blocks[0].done).toBe(true);

      await act(async () => {
        result.current.toggleBlockDone(blockId);
      });
      expect(result.current.currentPlan.blocks[0].done).toBe(false);

      await act(async () => {
        result.current.toggleBlockDone('non-existent-id');
      });
    });

    it('updates block description and syncs with calendar', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.scheduleOneOffBlock('Review', 'cp', 1, 'mar', '14:00');
      });

      const block = result.current.currentPlan.blocks[0];

      await act(async () => {
        result.current.updateBlockDescription(block.id, 'Detailed notes for PR review');
      });

      expect(result.current.currentPlan.blocks[0].description).toBe('Detailed notes for PR review');
      expect(mockUpdateCalendarEventDescription).toHaveBeenCalledWith(
        'event-123',
        'Detailed notes for PR review'
      );

      await act(async () => {
        result.current.updateBlockDescription('non-existent-id', 'test');
      });
    });
  });

  describe('week navigation & copying', () => {
    it('changes week and updates hasPreviousWeekBlocks', async () => {
      const currentWeek = '2026-10-12';
      const prevWeek = '2026-10-05';

      await saveWeeklyPlan({
        weekId: prevWeek,
        blocks: [{ id: 'b-prev', templateId: 't1', day: 'lun', startTime: '09:00', done: false }],
      });

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.changeWeek(currentWeek);
      });

      expect(result.current.currentWeekId).toBe(currentWeek);
      expect(result.current.hasPreviousWeekBlocks).toBe(true);
    });

    it('logs error when changeWeek fails', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (loadWeeklyPlan as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.changeWeek('2026-11-01');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Errore cambio settimana:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('copies recurring blocks from previous week, skipping one-offs', async () => {
      const currentWeek = '2026-10-12';
      const prevWeek = '2026-10-05';

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addTemplate('Lecture', 'uni', 2);
      });
      const tpl = result.current.templates.find((t) => t.name === 'Lecture')!;

      await saveWeeklyPlan({
        weekId: prevWeek,
        blocks: [
          {
            id: 'b-recurring',
            templateId: tpl.id,
            day: 'lun',
            startTime: '10:00',
            done: true,
            customDuration: 2,
          },
          {
            id: 'b-oneoff',
            day: 'mar',
            startTime: '11:00',
            done: false,
            isOneOff: true,
            oneOffName: 'OneOff',
            oneOffCategoryId: 'uni',
            oneOffDuration: 1,
          },
        ],
      });

      await act(async () => {
        await result.current.changeWeek(currentWeek);
      });

      await act(async () => {
        await result.current.copyPreviousWeek();
      });

      expect(result.current.currentPlan.blocks).toHaveLength(1);
      expect(result.current.currentPlan.blocks[0].templateId).toBe(tpl.id);
      expect(result.current.currentPlan.blocks[0].done).toBe(false);
    });

    it('handles empty previous week when copying gracefully', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.copyPreviousWeek();
      });

      expect(result.current.currentPlan.blocks).toEqual([]);
    });

    it('handles calendar event creation failure in copyPreviousWeek gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateCalendarEvent.mockRejectedValueOnce(new Error('Bulk cal error'));

      const currentWeek = '2026-10-12';
      const prevWeek = '2026-10-05';

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addTemplate('Seminar', 'uni', 1);
      });
      const tpl = result.current.templates.find((t) => t.name === 'Seminar')!;

      await saveWeeklyPlan({
        weekId: prevWeek,
        blocks: [
          {
            id: 'b-sem',
            templateId: tpl.id,
            day: 'mer',
            startTime: '14:00',
            done: false,
          },
        ],
      });

      await act(async () => {
        await result.current.changeWeek(currentWeek);
      });

      await act(async () => {
        await result.current.copyPreviousWeek();
      });

      expect(result.current.currentPlan.blocks).toHaveLength(1);
      consoleErrorSpy.mockRestore();
    });

    it('catches and logs error when copyPreviousWeek fails', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (loadWeeklyPlan as jest.Mock).mockRejectedValueOnce(new Error('Copy load error'));

      await act(async () => {
        await result.current.copyPreviousWeek();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Errore copia settimana precedente:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('hours & metrics calculation', () => {
    it('calculates scheduled, completed and target hours correctly for a category', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        result.current.addCategory('Reading Track', 'book', '#F59E0B', 10);
      });
      const cat = result.current.categories.find((c) => c.name === 'Reading Track')!;

      await act(async () => {
        result.current.addTemplate('Book Chapter', cat.id, 2);
      });
      const tpl = result.current.templates.find((t) => t.name === 'Book Chapter')!;

      await act(async () => {
        result.current.scheduleBlock(tpl.id, 'lun', '09:00', 3);
        result.current.scheduleBlock(tpl.id, 'mar', '09:00');
      });

      const block2 = result.current.currentPlan.blocks.find(
        (b) => b.day === 'mar' && b.templateId === tpl.id
      )!;

      await act(async () => {
        result.current.toggleBlockDone(block2.id);
      });

      const hours = result.current.getCategoryHours(cat.id);
      expect(hours.scheduled).toBe(5);
      expect(hours.completed).toBe(2);
      expect(hours.target).toBe(10);
    });

    it('returns 0 hours for non-existent category', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      const hours = result.current.getCategoryHours('unknown-category');
      expect(hours).toEqual({
        scheduled: 0,
        completed: 0,
        target: 0,
      });
    });
  });

  describe('clearCurrentWeek', () => {
    it('clears all scheduled blocks, removes calendar events, and persists empty plan', async () => {
      const weekId = '2026-10-12';
      const initialBlocks: ScheduledBlock[] = [
        {
          id: 'block-1',
          templateId: 'tpl-1',
          day: 'lun',
          startTime: '09:00',
          done: false,
          calendarEventId: 'cal-event-1',
        },
        {
          id: 'block-2',
          templateId: 'tpl-2',
          day: 'mar',
          startTime: '14:00',
          done: true,
          calendarEventId: 'cal-event-2',
        },
        {
          id: 'block-3',
          day: 'mer',
          startTime: '10:00',
          done: false,
          isOneOff: true,
          oneOffName: 'Meeting',
          oneOffCategoryId: 'cat-1',
          oneOffDuration: 1,
        },
      ];

      const plan: WeeklyPlan = {
        weekId,
        blocks: initialBlocks,
      };
      await saveWeeklyPlan(plan);

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.changeWeek(weekId);
      });

      expect(result.current.currentPlan.blocks).toHaveLength(3);

      await act(async () => {
        await result.current.clearCurrentWeek();
      });

      expect(result.current.currentPlan.blocks).toEqual([]);

      expect(mockDeleteCalendarEvent).toHaveBeenCalledTimes(2);
      expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('cal-event-1');
      expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('cal-event-2');

      const storedPlan = await loadWeeklyPlan(weekId);
      expect(storedPlan).toEqual({
        weekId,
        blocks: [],
      });
    });

    it('handles clearing an already empty week without errors', async () => {
      const weekId = '2026-10-12';
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.changeWeek(weekId);
      });

      expect(result.current.currentPlan.blocks).toEqual([]);

      await act(async () => {
        await result.current.clearCurrentWeek();
      });

      expect(result.current.currentPlan.blocks).toEqual([]);
      expect(mockDeleteCalendarEvent).not.toHaveBeenCalled();

      const storedPlan = await loadWeeklyPlan(weekId);
      expect(storedPlan).toEqual({
        weekId,
        blocks: [],
      });
    });

    it('handles clearing when plans for current week is not yet loaded', async () => {
      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.clearCurrentWeek();
      });

      expect(result.current.currentPlan.blocks).toEqual([]);
    });

    it('catches and logs error when saveWeeklyPlan fails during clearCurrentWeek', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (saveWeeklyPlan as jest.Mock).mockRejectedValue(new Error('Storage failure'));

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.clearCurrentWeek();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Errore cancellazione settimana:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });

    it('handles calendar event deletion failures gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteCalendarEvent.mockRejectedValueOnce(new Error('Calendar error'));

      const weekId = '2026-10-12';
      const plan: WeeklyPlan = {
        weekId,
        blocks: [
          {
            id: 'block-fail',
            templateId: 'tpl-1',
            day: 'lun',
            startTime: '09:00',
            done: false,
            calendarEventId: 'event-fail',
          },
        ],
      };
      await saveWeeklyPlan(plan);

      const { result } = await renderHook(() => usePlanner(), { wrapper });

      await act(async () => {
        await result.current.changeWeek(weekId);
      });

      await act(async () => {
        await result.current.clearCurrentWeek();
      });

      expect(mockDeleteCalendarEvent).toHaveBeenCalledWith('event-fail');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });
});

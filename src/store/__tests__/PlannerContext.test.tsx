import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlannerProvider, usePlanner } from '../PlannerContext';
import { deleteCalendarEvent } from '../../utils/calendar';
import { loadWeeklyPlan, saveWeeklyPlan } from '../plannerStorage';
import type { ScheduledBlock, WeeklyPlan } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../plannerStorage', () => {
  const actual = jest.requireActual('../plannerStorage');
  return {
    ...actual,
    saveWeeklyPlan: jest.fn(actual.saveWeeklyPlan),
  };
});

jest.mock('../../utils/calendar', () => ({
  createCalendarEvent: jest.fn().mockResolvedValue('event-123'),
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
  updateCalendarEventDescription: jest.fn().mockResolvedValue(undefined),
}));

const mockDeleteCalendarEvent = deleteCalendarEvent as jest.MockedFunction<
  typeof deleteCalendarEvent
>;

describe('PlannerContext - clearCurrentWeek', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PlannerProvider>{children}</PlannerProvider>
  );

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
    (saveWeeklyPlan as jest.Mock).mockImplementation(
      jest.requireActual('../plannerStorage').saveWeeklyPlan
    );
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

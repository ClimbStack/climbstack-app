import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockTemplate, ScheduledBlock, WeeklyPlan } from '../../types';
import { deleteCalendarEvent } from '../../utils/calendar';
import { scrubDeletedTemplates } from '../plannerStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../utils/calendar', () => ({
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
}));

const WEEK_COUNT = 30;

const templates: BlockTemplate[] = [
  { id: 'tpl-1', name: 'Deep work', categoryId: 'cat-1', durationHours: 2 },
  { id: 'tpl-2', name: 'Reading', categoryId: 'cat-1', durationHours: 1 },
];

const makeBlock = (id: string, templateId: string): ScheduledBlock => ({
  id,
  templateId,
  day: 'lun',
  startTime: '09:00',
  done: true,
});

const seedWeeks = async (count: number) => {
  for (let i = 0; i < count; i++) {
    const plan: WeeklyPlan = {
      weekId: `2026-W${String(i + 1).padStart(2, '0')}`,
      blocks: [makeBlock(`a-${i}`, 'tpl-1'), makeBlock(`b-${i}`, 'tpl-2')],
    };
    await AsyncStorage.setItem(`@levelup/week/${plan.weekId}`, JSON.stringify(plan));
  }
};

describe('scrubDeletedTemplates storage round-trips', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('reads and writes all plans in bounded batches regardless of week count', async () => {
    await seedWeeks(WEEK_COUNT);
    jest.clearAllMocks();

    const hours = await scrubDeletedTemplates(['tpl-1'], templates);

    expect(hours).toBe(2 * WEEK_COUNT);
    expect(AsyncStorage.getAllKeys).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiGet).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('writes every modified plan in a single multiSet call', async () => {
    await seedWeeks(WEEK_COUNT);
    jest.clearAllMocks();

    await scrubDeletedTemplates(['tpl-1'], templates);

    const [writtenEntries] = (AsyncStorage.multiSet as jest.Mock).mock.calls[0];
    expect(writtenEntries).toHaveLength(WEEK_COUNT);
    const firstWeek = (writtenEntries as [string, string][]).find(
      ([key]) => key === '@levelup/week/2026-W01'
    );
    const remaining = JSON.parse(firstWeek![1]) as WeeklyPlan;
    expect(remaining.blocks.map((b) => b.templateId)).toEqual(['tpl-2']);
  });

  it('skips multiSet when no plan is modified', async () => {
    await seedWeeks(WEEK_COUNT);
    jest.clearAllMocks();

    const hours = await scrubDeletedTemplates(['ghost'], templates);

    expect(hours).toBe(0);
    expect(AsyncStorage.multiGet).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  it('deletes calendar events only after the scrubbed plans are saved', async () => {
    const plan: WeeklyPlan = {
      weekId: '2026-W01',
      blocks: [{ ...makeBlock('a', 'tpl-1'), calendarEventId: 'evt-1' }],
    };
    await AsyncStorage.setItem('@levelup/week/2026-W01', JSON.stringify(plan));
    const order: string[] = [];
    (AsyncStorage.multiSet as jest.Mock).mockImplementationOnce(async () => {
      order.push('multiSet');
    });
    (deleteCalendarEvent as jest.Mock).mockImplementationOnce(async () => {
      order.push('deleteCalendarEvent');
    });

    await scrubDeletedTemplates(['tpl-1'], templates);

    expect(order).toEqual(['multiSet', 'deleteCalendarEvent']);
  });

  it('writes nothing and deletes no calendar event when a stored plan is corrupt', async () => {
    const plan: WeeklyPlan = {
      weekId: '2026-W01',
      blocks: [{ ...makeBlock('a', 'tpl-1'), calendarEventId: 'evt-1' }],
    };
    await AsyncStorage.setItem('@levelup/week/2026-W01', JSON.stringify(plan));
    await AsyncStorage.setItem('@levelup/week/2026-W02', '{not json');
    jest.clearAllMocks();

    await expect(scrubDeletedTemplates(['tpl-1'], templates)).rejects.toThrow(SyntaxError);
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    expect(deleteCalendarEvent).not.toHaveBeenCalled();
  });
});

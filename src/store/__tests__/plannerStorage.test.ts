import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BlockTemplate, Category, ScheduledBlock, WeeklyPlan } from '../../types';
import { deleteCalendarEvent } from '../../utils/calendar';
import {
  loadCategories,
  loadTemplates,
  loadWeeklyPlan,
  saveCategories,
  saveTemplates,
  saveWeeklyPlan,
  scrubDeletedTemplates,
} from '../plannerStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../utils/calendar', () => ({
  deleteCalendarEvent: jest.fn().mockResolvedValue(undefined),
}));

const deleteCalendarEventStub = deleteCalendarEvent as jest.MockedFunction<
  typeof deleteCalendarEvent
>;

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat-1',
  name: 'Study',
  color: '#ff0000',
  emoji: 'book',
  targetHoursPerWeek: 10,
  ...overrides,
});

const makeTemplate = (overrides: Partial<BlockTemplate> = {}): BlockTemplate => ({
  id: 'tpl-1',
  name: 'Deep work',
  categoryId: 'cat-1',
  durationHours: 2,
  ...overrides,
});

const makeBlock = (overrides: Partial<ScheduledBlock> = {}): ScheduledBlock => ({
  id: 'b-1',
  templateId: 'tpl-1',
  day: 'lun',
  startTime: '09:00',
  done: false,
  ...overrides,
});

const makePlan = (weekId: string, blocks: ScheduledBlock[]): WeeklyPlan => ({ weekId, blocks });

const blockIds = async (weekId: string) => (await loadWeeklyPlan(weekId))?.blocks.map((b) => b.id);

describe('plannerStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('categories', () => {
    test('returns empty array when nothing is stored', async () => {
      expect(await loadCategories()).toEqual([]);
    });

    test('round-trips categories', async () => {
      const categories = [makeCategory({ isArchived: true, isCustomName: true })];

      await saveCategories(categories);

      expect(await loadCategories()).toEqual(categories);
    });
  });

  describe('templates', () => {
    test('returns empty array when nothing is stored', async () => {
      expect(await loadTemplates()).toEqual([]);
    });

    test('round-trips templates with quotes in the name', async () => {
      const templates = [makeTemplate({ name: 'Reading "books"', durationHours: 1.5 })];

      await saveTemplates(templates);

      expect(await loadTemplates()).toEqual(templates);
    });
  });

  describe('weekly plans', () => {
    test('returns null when the week has no stored plan', async () => {
      expect(await loadWeeklyPlan('2026-10-05')).toBeNull();
    });

    test('stores the plan as JSON under a key derived from the week id', async () => {
      const plan = makePlan('2026-10-05', [makeBlock()]);

      await saveWeeklyPlan(plan);

      expect(await AsyncStorage.getItem('@climbstack/week/2026-10-05')).toBe(JSON.stringify(plan));
    });

    test('round-trips a plan', async () => {
      const plan = makePlan('2026-10-05', [
        makeBlock(),
        makeBlock({ id: 'b-2', isOneOff: true, oneOffName: 'Dentist', oneOffDuration: 1 }),
      ]);

      await saveWeeklyPlan(plan);

      expect(await loadWeeklyPlan('2026-10-05')).toEqual(plan);
    });

    test('keeps plans of different weeks separate', async () => {
      await saveWeeklyPlan(makePlan('2026-10-05', [makeBlock({ id: 'a' })]));
      await saveWeeklyPlan(makePlan('2026-10-12', [makeBlock({ id: 'b' })]));

      expect(await blockIds('2026-10-05')).toEqual(['a']);
      expect(await blockIds('2026-10-12')).toEqual(['b']);
    });
  });

  describe('scrubDeletedTemplates', () => {
    const templates = [
      makeTemplate({ id: 'tpl-1', durationHours: 2 }),
      makeTemplate({ id: 'tpl-2', durationHours: 3 }),
      makeTemplate({ id: 'tpl-3', durationHours: 5 }),
    ];

    const oneOff = (overrides: Partial<ScheduledBlock> = {}) =>
      makeBlock({
        templateId: undefined,
        isOneOff: true,
        oneOffCategoryId: 'cat-1',
        ...overrides,
      });

    test('returns 0 and changes nothing when there are no stored plans', async () => {
      const hours = await scrubDeletedTemplates(['tpl-1'], templates);

      expect(hours).toBe(0);
      expect(await AsyncStorage.getAllKeys()).toEqual([]);
    });

    test('returns 0 when no block matches the deleted templates', async () => {
      const plan = makePlan('2026-10-05', [makeBlock({ templateId: 'tpl-2', done: true })]);
      await saveWeeklyPlan(plan);

      const hours = await scrubDeletedTemplates(['tpl-1'], templates);

      expect(hours).toBe(0);
      expect(await loadWeeklyPlan('2026-10-05')).toEqual(plan);
    });

    test('removes blocks of the deleted template and keeps the others', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'keep', templateId: 'tpl-2' }),
          makeBlock({ id: 'drop', templateId: 'tpl-1' }),
        ])
      );

      await scrubDeletedTemplates(['tpl-1'], templates);

      expect(await blockIds('2026-10-05')).toEqual(['keep']);
    });

    test('removes blocks of every template in the deleted id list', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'a', templateId: 'tpl-1' }),
          makeBlock({ id: 'b', templateId: 'tpl-2' }),
          makeBlock({ id: 'c', templateId: 'tpl-3' }),
        ])
      );

      await scrubDeletedTemplates(['tpl-1', 'tpl-3'], templates);

      expect(await blockIds('2026-10-05')).toEqual(['b']);
    });

    test('sums hours only for done blocks using the template duration', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'done', templateId: 'tpl-1', done: true }),
          makeBlock({ id: 'todo', templateId: 'tpl-1', done: false }),
        ])
      );

      const hours = await scrubDeletedTemplates(['tpl-1'], templates);

      expect(hours).toBe(2);
      expect(await blockIds('2026-10-05')).toEqual([]);
    });

    test('does not count hours of removed blocks that are not done', async () => {
      await saveWeeklyPlan(makePlan('2026-10-05', [makeBlock({ templateId: 'tpl-1' })]));

      expect(await scrubDeletedTemplates(['tpl-1'], templates)).toBe(0);
    });

    test('prefers customDuration over the template duration', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'custom', templateId: 'tpl-1', done: true, customDuration: 0.5 }),
          makeBlock({ id: 'default', templateId: 'tpl-2', done: true }),
        ])
      );

      const hours = await scrubDeletedTemplates(['tpl-1', 'tpl-2'], templates);

      expect(hours).toBe(3.5);
    });

    test('counts 0 hours for a done block whose template is unknown', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [makeBlock({ templateId: 'ghost', done: true })])
      );

      const hours = await scrubDeletedTemplates(['ghost'], templates);

      expect(hours).toBe(0);
      expect(await blockIds('2026-10-05')).toEqual([]);
    });

    test('accumulates hours and removals across multiple weeks', async () => {
      await saveWeeklyPlan(
        makePlan('2026-09-28', [makeBlock({ id: 'w1', templateId: 'tpl-1', done: true })])
      );
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'w2a', templateId: 'tpl-1', done: true }),
          makeBlock({ id: 'w2b', templateId: 'tpl-2', done: true }),
        ])
      );
      await saveWeeklyPlan(
        makePlan('2026-10-12', [makeBlock({ id: 'w3', templateId: 'tpl-1', done: false })])
      );

      const hours = await scrubDeletedTemplates(['tpl-1'], templates);

      expect(hours).toBe(4);
      expect(await blockIds('2026-09-28')).toEqual([]);
      expect(await blockIds('2026-10-05')).toEqual(['w2b']);
      expect(await blockIds('2026-10-12')).toEqual([]);
    });

    test('removes one-off blocks of the deleted category only', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          oneOff({ id: 'mine', oneOffDuration: 1 }),
          oneOff({ id: 'other-cat', oneOffCategoryId: 'cat-2' }),
        ])
      );

      await scrubDeletedTemplates([], templates, 'cat-1');

      expect(await blockIds('2026-10-05')).toEqual(['other-cat']);
    });

    test('counts customDuration for done one-off blocks', async () => {
      await saveWeeklyPlan(makePlan('2026-10-05', [oneOff({ done: true, customDuration: 1.5 })]));

      expect(await scrubDeletedTemplates([], templates, 'cat-1')).toBe(1.5);
    });

    test('counts oneOffDuration for done one-off blocks', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          oneOff({ id: 'done', done: true, oneOffDuration: 2 }),
          oneOff({ id: 'todo', done: false, oneOffDuration: 4 }),
        ])
      );

      expect(await scrubDeletedTemplates([], templates, 'cat-1')).toBe(2);
    });

    test('handles template and category matches together in one call', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'tpl', templateId: 'tpl-1', done: true }),
          oneOff({ id: 'oneoff', done: true, customDuration: 1 }),
          makeBlock({ id: 'survivor', templateId: 'tpl-2' }),
        ])
      );

      const hours = await scrubDeletedTemplates(['tpl-1'], templates, 'cat-1');

      expect(hours).toBe(3);
      expect(await blockIds('2026-10-05')).toEqual(['survivor']);
    });

    test('ignores one-off blocks when no categoryId is given', async () => {
      const plan = makePlan('2026-10-05', [oneOff()]);
      await saveWeeklyPlan(plan);

      await scrubDeletedTemplates(['tpl-1'], templates);

      expect(await loadWeeklyPlan('2026-10-05')).toEqual(plan);
    });

    test('ignores stored keys that are not weekly plans', async () => {
      const categories = [makeCategory()];
      await saveCategories(categories);
      await saveTemplates(templates);
      await AsyncStorage.setItem('@climbstack/streak', '3');

      const hours = await scrubDeletedTemplates(['tpl-1'], templates);

      expect(hours).toBe(0);
      expect(await loadCategories()).toEqual(categories);
      expect(await loadTemplates()).toEqual(templates);
      expect(await AsyncStorage.getItem('@climbstack/streak')).toBe('3');
    });

    test('leaves unrelated plans byte-for-byte untouched', async () => {
      const unrelated = makePlan('2026-10-05', [makeBlock({ templateId: 'tpl-2', done: true })]);
      await saveWeeklyPlan(unrelated);
      await saveWeeklyPlan(makePlan('2026-10-12', [makeBlock({ templateId: 'tpl-1' })]));

      await scrubDeletedTemplates(['tpl-1'], templates);

      expect(await AsyncStorage.getItem('@climbstack/week/2026-10-05')).toBe(
        JSON.stringify(unrelated)
      );
    });

    test('deletes calendar events only for removed blocks that have one', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ id: 'a', templateId: 'tpl-1', calendarEventId: 'evt-a' }),
          makeBlock({ id: 'b', templateId: 'tpl-1' }),
          makeBlock({ id: 'c', templateId: 'tpl-2', calendarEventId: 'evt-c' }),
        ])
      );
      await saveWeeklyPlan(
        makePlan('2026-10-12', [
          makeBlock({ id: 'd', templateId: 'tpl-1', done: true, calendarEventId: 'evt-d' }),
        ])
      );

      await scrubDeletedTemplates(['tpl-1'], templates);

      expect(deleteCalendarEventStub).toHaveBeenCalledTimes(2);
      expect(deleteCalendarEventStub).toHaveBeenCalledWith('evt-a');
      expect(deleteCalendarEventStub).toHaveBeenCalledWith('evt-d');
      expect(deleteCalendarEventStub).not.toHaveBeenCalledWith('evt-c');
    });

    test('deletes calendar events of removed one-off blocks', async () => {
      await saveWeeklyPlan(makePlan('2026-10-05', [oneOff({ calendarEventId: 'evt-oneoff' })]));

      await scrubDeletedTemplates([], templates, 'cat-1');

      expect(deleteCalendarEventStub).toHaveBeenCalledWith('evt-oneoff');
    });

    test('never touches the calendar when nothing is removed', async () => {
      await saveWeeklyPlan(
        makePlan('2026-10-05', [makeBlock({ templateId: 'tpl-2', calendarEventId: 'evt' })])
      );

      await scrubDeletedTemplates(['tpl-1'], templates);

      expect(deleteCalendarEventStub).not.toHaveBeenCalled();
    });

    test('still completes and persists the plan when calendar deletion rejects', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      deleteCalendarEventStub.mockRejectedValueOnce(new Error('calendar unavailable'));
      await saveWeeklyPlan(
        makePlan('2026-10-05', [
          makeBlock({ templateId: 'tpl-1', done: true, calendarEventId: 'evt-x' }),
        ])
      );

      try {
        const hours = await scrubDeletedTemplates(['tpl-1'], templates);

        expect(hours).toBe(2);
        expect(await blockIds('2026-10-05')).toEqual([]);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });
});

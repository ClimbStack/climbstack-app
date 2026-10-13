import type { BlockTemplate, ScheduledBlock, WeeklyPlan } from '../../types';
import { sumCompletedHoursByCategory } from '../altitudeStats';

const makeTemplate = (overrides: Partial<BlockTemplate> = {}): BlockTemplate => ({
  id: 'tpl-1',
  name: 'Deep work',
  categoryId: 'cat-1',
  durationHours: 2,
  ...overrides,
});

const makeBlock = (overrides: Partial<ScheduledBlock> = {}): ScheduledBlock => ({
  id: 'blk-1',
  templateId: 'tpl-1',
  day: 'lun',
  startTime: '09:00',
  done: true,
  ...overrides,
});

const makePlan = (blocks: ScheduledBlock[], weekId = '2026-W01'): WeeklyPlan => ({
  weekId,
  blocks,
});

describe('sumCompletedHoursByCategory', () => {
  const templates = [
    makeTemplate({ id: 'tpl-1', categoryId: 'cat-1', durationHours: 2 }),
    makeTemplate({ id: 'tpl-2', categoryId: 'cat-2', durationHours: 3 }),
  ];

  it('returns an empty object when there are no plans', () => {
    expect(sumCompletedHoursByCategory([], templates)).toEqual({});
  });

  it('sums done template blocks per category across weeks', () => {
    const plans = [
      makePlan([makeBlock({ id: 'a' }), makeBlock({ id: 'b', templateId: 'tpl-2' })], 'w1'),
      makePlan([makeBlock({ id: 'c' })], 'w2'),
    ];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({ 'cat-1': 4, 'cat-2': 3 });
  });

  it('ignores blocks that are not done', () => {
    const plans = [makePlan([makeBlock({ done: false })])];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({});
  });

  it('uses the template duration and ignores customDuration', () => {
    const plans = [makePlan([makeBlock({ customDuration: 9 })])];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({ 'cat-1': 2 });
  });

  it('uses oneOffDuration and oneOffCategoryId for one-off blocks', () => {
    const plans = [
      makePlan([
        makeBlock({
          templateId: undefined,
          isOneOff: true,
          oneOffCategoryId: 'cat-3',
          oneOffDuration: 1.5,
        }),
      ]),
    ];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({ 'cat-3': 1.5 });
  });

  it('skips one-off blocks without a category or duration', () => {
    const plans = [
      makePlan([
        makeBlock({ id: 'a', templateId: undefined, isOneOff: true, oneOffDuration: 2 }),
        makeBlock({
          id: 'b',
          templateId: undefined,
          isOneOff: true,
          oneOffCategoryId: 'cat-1',
        }),
      ]),
    ];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({});
  });

  it('skips blocks whose template no longer exists', () => {
    const plans = [makePlan([makeBlock({ templateId: 'ghost' })])];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({});
  });

  it('prefers one-off data when a block has both isOneOff and a templateId', () => {
    const plans = [
      makePlan([makeBlock({ isOneOff: true, oneOffCategoryId: 'cat-9', oneOffDuration: 4 })]),
    ];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({ 'cat-9': 4 });
  });

  it('tolerates plans without a blocks array', () => {
    const plans = [{ weekId: 'w1' } as unknown as WeeklyPlan];

    expect(sumCompletedHoursByCategory(plans, templates)).toEqual({});
  });

  it('uses the first template when ids are duplicated', () => {
    const duplicated = [
      makeTemplate({ id: 'dup', categoryId: 'cat-1', durationHours: 1 }),
      makeTemplate({ id: 'dup', categoryId: 'cat-2', durationHours: 7 }),
    ];
    const plans = [makePlan([makeBlock({ templateId: 'dup' })])];

    expect(sumCompletedHoursByCategory(plans, duplicated)).toEqual({ 'cat-1': 1 });
  });
});

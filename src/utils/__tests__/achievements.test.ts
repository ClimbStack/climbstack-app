import type { Category, Peak, ScheduledBlock } from '../../types';
import * as after from '../achievements';
import type { AchievementSnapshot, AchievementProgress } from '../achievements';

const DATE = '2026-11-09T12:00:00.000Z';
const defaults = ['sleep', 'study'];
const snapshot = (changes: Partial<AchievementSnapshot> = {}): AchievementSnapshot => ({
  peaks: [],
  plans: [],
  categories: [],
  streak: 0,
  totalCompletedHours: 0,
  ...changes,
});
const peak = (id: string): Peak => ({
  id,
  name: id,
  createdAt: DATE,
  camps: [{ id: `${id}-camp`, name: id, done: true, order: 0 }],
});
const block = (id: string): ScheduledBlock => ({ id, day: 'lun', startTime: '09:00', done: false });
const category = (id: string): Category => ({
  id,
  name: id,
  emoji: 'shape',
  color: 'teal',
  targetHoursPerWeek: 1,
});

describe('achievement contract', () => {
  const implementation = after;
  const update = (
    data: AchievementSnapshot,
    previous = implementation.emptyAchievementProgress(),
    date = DATE
  ) => implementation.updateAchievements(previous, data, defaults, date);

  it.each(after.ACHIEVEMENTS)('unlocks $id only at its threshold', (achievement) => {
    const atValue = (value: number): AchievementSnapshot => {
      switch (achievement.metric) {
        case 'altitude':
          return snapshot({ totalCompletedHours: value });
        case 'peaks':
          return snapshot({ peaks: Array.from({ length: value }, (_, i) => peak(`p${i}`)) });
        case 'blocks':
          return snapshot({
            plans: [
              {
                weekId: '2026-11-02',
                blocks: Array.from({ length: value }, (_, i) => block(`b${i}`)),
              },
            ],
          });
        case 'categories':
          return snapshot({
            categories: Array.from({ length: value }, (_, i) => category(`c${i}`)),
          });
        case 'streak':
          return snapshot({ streak: value });
      }
    };
    const below = update(atValue(achievement.target - 1));
    expect(below.progress.unlocked[achievement.id]).toBeUndefined();
    const earned = update(atValue(achievement.target), below.progress);
    expect(earned.progress.unlocked[achievement.id]).toBe(DATE);
    expect(earned.newlyUnlocked).toContain(achievement.id);
  });

  it('keeps rewards, dates and high-water values after deletion or undo', () => {
    const initial = update(
      snapshot({
        peaks: [peak('p1')],
        totalCompletedHours: 1000,
        streak: 30,
        plans: [{ weekId: 'w1', blocks: [block('b1')] }],
      })
    );
    const result = update(snapshot(), initial.progress, '2026-11-10T12:00:00.000Z');
    expect(result.progress).toBe(initial.progress);
    expect(result.newlyUnlocked).toEqual([]);
  });

  it('counts each peak, category and block only once across repeated snapshots', () => {
    const data = snapshot({
      peaks: [peak('p1'), peak('p1')],
      categories: [category('c1'), category('c1')],
      plans: [
        { weekId: 'w1', blocks: [block('b1')] },
        { weekId: 'w2', blocks: [block('b1'), block('b2')] },
      ],
    });
    const first = update(data);
    const second = update(data, first.progress);
    expect(implementation.achievementValues(second.progress)).toMatchObject({
      peaks: 1,
      categories: 1,
      blocks: 2,
    });
    expect(second.progress).toBe(first.progress);
    expect(second.newlyUnlocked).toEqual([]);
  });

  it('ignores default categories and includes archived custom categories', () => {
    const result = update(
      snapshot({
        categories: [
          category('sleep'),
          category('study'),
          category('c1'),
          { ...category('c2'), isArchived: true },
        ],
      })
    );
    expect(result.progress.categoryIds).toEqual(['c1', 'c2']);
  });

  it('does not count empty or partially completed peaks as summits', () => {
    const incomplete = peak('p1');
    incomplete.camps.push({ id: 'todo', name: 'Todo', done: false, order: 1 });
    const result = update(snapshot({ peaks: [{ ...peak('empty'), camps: [] }, incomplete] }));
    expect(result.progress.completedPeakIds).toEqual([]);
    expect(result.progress.altitude).toBe(100);
  });

  it('combines camp altitude and fractional completed hours', () => {
    const result = update(snapshot({ peaks: [peak('p1')], totalCompletedHours: 709.5 }));
    expect(result.progress.altitude).toBe(809.5);
    expect(result.progress.unlocked.ventoux).toBeUndefined();
    expect(
      update(snapshot({ peaks: [peak('p1')], totalCompletedHours: 710 }), result.progress).progress
        .unlocked.ventoux
    ).toBe(DATE);
  });

  it('limits tracked identifiers at the largest relevant milestone', () => {
    const result = update(
      snapshot({
        peaks: Array.from({ length: 30 }, (_, i) => peak(`p${i}`)),
        categories: Array.from({ length: 20 }, (_, i) => category(`c${i}`)),
        plans: [{ weekId: 'w1', blocks: Array.from({ length: 2000 }, (_, i) => block(`b${i}`)) }],
      })
    );
    expect(implementation.achievementValues(result.progress)).toMatchObject({
      peaks: 25,
      categories: 10,
      blocks: 500,
    });
    expect(result.progress.scheduledBlockIds[499]).toBe('b499');
  });

  it('normalizes duplicate and oversized imported ID lists', () => {
    const previous: AchievementProgress = {
      ...implementation.emptyAchievementProgress(),
      completedPeakIds: ['p1', 'p1'],
      scheduledBlockIds: Array.from({ length: 600 }, (_, i) => `b${i % 520}`),
      categoryIds: ['c1', 'c1'],
    };
    const result = update(snapshot(), previous);
    expect(result.progress.completedPeakIds).toEqual(['p1']);
    expect(result.progress.categoryIds).toEqual(['c1']);
    expect(result.progress.scheduledBlockIds).toHaveLength(500);
  });

  it('does not mutate its input or previously saved progress', () => {
    const previous = implementation.emptyAchievementProgress();
    const data = snapshot({
      peaks: [peak('p1')],
      categories: [category('c1')],
      plans: [{ weekId: 'w1', blocks: [block('b1')] }],
    });
    const original = JSON.stringify({ previous, data });
    update(data, previous);
    expect(JSON.stringify({ previous, data })).toBe(original);
  });
});

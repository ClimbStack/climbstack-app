import React from 'react';
import { LayoutAnimation } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SkippedCard from '../SkippedCard';
import { useThemeColors } from '../../../utils/useThemeColors';
import { useLocale } from '../../../store/LocaleContext';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import type { WeeklyReview, ResolvedBlock } from '../../../utils/weeklyReview';
import type { Category, ScheduledBlock } from '../../../types';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

const defaultCategory: Category = {
  id: 'cat1',
  name: 'Work',
  color: '#3B82F6',
  emoji: 'briefcase',
  targetHoursPerWeek: 10,
};

const makeBlock = (id: string, startTime = '09:00'): ResolvedBlock => ({
  block: {
    id,
    templateId: 'tpl1',
    day: 'lun',
    startTime,
    done: false,
  } as ScheduledBlock,
  name: 'Focus Block',
  categoryId: 'cat1',
  hours: 2,
});

const makeReview = (overrides: Partial<WeeklyReview> = {}): WeeklyReview => ({
  weekId: '2026-10-05',
  hoursCompleted: 0,
  hoursScheduled: 10,
  blocksCompleted: 0,
  blocksScheduled: 5,
  completionRate: 0,
  categories: [],
  skippedByDay: [],
  streak: 0,
  streakStatus: 'broken',
  phase: 'past',
  campsCompleted: [],
  peaksReached: [],
  ...overrides,
});

describe('weeklyReview/SkippedCard', () => {
  beforeAll(() => {
    if (!LayoutAnimation.Presets) {
      (LayoutAnimation as any).Presets = { easeInEaseOut: {} };
    }
    if (typeof LayoutAnimation.configureNext !== 'function') {
      (LayoutAnimation as any).configureNext = jest.fn();
    } else {
      jest.spyOn(LayoutAnimation, 'configureNext').mockImplementation(() => {});
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    mockUseLocale.mockReturnValue({ locale: 'en', isReloading: false, changeLocale: jest.fn() });
  });

  it('renders section title', async () => {
    const review = makeReview();
    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText(t('review.skipped'))).toBeTruthy();
  });

  it('renders no-skipped message when no blocks are skipped', async () => {
    const review = makeReview({ skippedByDay: [] });
    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText(t('review.noSkipped'))).toBeTruthy();
  });

  it('renders skipped blocks grouped by day', async () => {
    const review = makeReview({
      skippedByDay: [
        { day: 'lun', blocks: [makeBlock('b1', '09:00')] },
        { day: 'mar', blocks: [makeBlock('b2', '10:00')] },
      ],
    });

    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText(t('days.lun'))).toBeTruthy();
    expect(getByText(t('days.mar'))).toBeTruthy();
  });

  it('renders block name in skipped row', async () => {
    const review = makeReview({
      skippedByDay: [{ day: 'lun', blocks: [makeBlock('b1')] }],
    });

    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText('Focus Block')).toBeTruthy();
  });

  it('does not show "show all" button when under preview limit', async () => {
    const blocks = Array.from({ length: 5 }, (_, i) =>
      makeBlock(`b${i}`, `${String(9 + i).padStart(2, '0')}:00`)
    );
    const review = makeReview({ skippedByDay: [{ day: 'lun', blocks }] });

    const { queryByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(queryByText(/review\.showAll/)).toBeNull();
  });

  it('shows "show all" button when blocks exceed preview limit', async () => {
    const blocks = Array.from({ length: 8 }, (_, i) =>
      makeBlock(`b${i}`, `${String(9 + i).padStart(2, '0')}:00`)
    );
    const review = makeReview({ skippedByDay: [{ day: 'lun', blocks }] });

    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText(t('review.showAll', { count: 8 }))).toBeTruthy();
  });

  it('hides "show all" button after pressing it', async () => {
    const blocks = Array.from({ length: 8 }, (_, i) =>
      makeBlock(`b${i}`, `${String(9 + i).padStart(2, '0')}:00`)
    );
    const review = makeReview({ skippedByDay: [{ day: 'lun', blocks }] });

    const { getByRole, queryByRole } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    await fireEvent.press(getByRole('button'));

    expect(queryByRole('button')).toBeNull();
  });

  it('falls back to category display name when block has no name', async () => {
    const block: ResolvedBlock = {
      block: {
        id: 'b1',
        templateId: 'tpl1',
        day: 'lun',
        startTime: '09:00',
        done: false,
      } as ScheduledBlock,
      name: '',
      categoryId: 'cat1',
      hours: 1,
    };
    const review = makeReview({ skippedByDay: [{ day: 'lun', blocks: [block] }] });

    const { getByText } = await render(
      <SkippedCard review={review} categories={[defaultCategory]} />
    );

    expect(getByText('Work')).toBeTruthy();
  });

  it('uses border color from category', async () => {
    const review = makeReview({
      skippedByDay: [{ day: 'lun', blocks: [makeBlock('b1')] }],
    });

    const { toJSON } = await render(<SkippedCard review={review} categories={[defaultCategory]} />);

    expect(toJSON()).toBeTruthy();
  });
});

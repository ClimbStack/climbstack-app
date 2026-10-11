import React from 'react';
import { render } from '@testing-library/react-native';
import HeroCard from '../HeroCard';
import { useThemeColors } from '../../../utils/useThemeColors';
import { useLocale } from '../../../store/LocaleContext';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import type { WeeklyInsight, WeeklyReview } from '../../../utils/weeklyReview';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

jest.mock('../../ProgressRing', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, label }: { children: React.ReactNode; label: string }) => (
      <View accessibilityLabel={label}>{children}</View>
    ),
  };
});

const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

const makeReview = (overrides: Partial<WeeklyReview> = {}): WeeklyReview => ({
  weekId: '2026-10-05',
  hoursCompleted: 8,
  hoursScheduled: 10,
  blocksCompleted: 4,
  blocksScheduled: 5,
  completionRate: 80,
  categories: [],
  skippedByDay: [],
  streak: 3,
  streakStatus: 'survived',
  phase: 'current',
  campsCompleted: [],
  peaksReached: [],
  ...overrides,
});

describe('weeklyReview/HeroCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    mockUseLocale.mockReturnValue({ locale: 'en', isReloading: false, changeLocale: jest.fn() });
  });

  it('renders future week empty state for upcoming insight', async () => {
    const review = makeReview();
    const insight: WeeklyInsight = { type: 'upcoming' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText(t('review.futureWeek'))).toBeTruthy();
  });

  it('renders empty week state for empty insight', async () => {
    const review = makeReview();
    const insight: WeeklyInsight = { type: 'empty' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText(t('review.emptyWeek'))).toBeTruthy();
  });

  it('does not render stats when insight is upcoming', async () => {
    const review = makeReview();
    const insight: WeeklyInsight = { type: 'upcoming' };

    const { queryByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(queryByText(t('review.hours'))).toBeNull();
    expect(queryByText(t('review.blocks'))).toBeNull();
  });

  it('does not render stats when insight is empty', async () => {
    const review = makeReview();
    const insight: WeeklyInsight = { type: 'empty' };

    const { queryByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(queryByText(t('review.hours'))).toBeNull();
    expect(queryByText(t('review.blocks'))).toBeNull();
  });

  it('renders stats labels for a standard insight', async () => {
    const review = makeReview({ completionRate: 85 });
    const insight: WeeklyInsight = { type: 'great' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText(t('review.hours'))).toBeTruthy();
    expect(getByText(t('review.blocks'))).toBeTruthy();
  });

  it('renders completion percentage', async () => {
    const review = makeReview({ completionRate: 75 });
    const insight: WeeklyInsight = { type: 'keepGoing' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText('75%')).toBeTruthy();
  });

  it('renders blocks completed / scheduled', async () => {
    const review = makeReview({ blocksCompleted: 3, blocksScheduled: 7 });
    const insight: WeeklyInsight = { type: 'keepGoing' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText('3 / 7')).toBeTruthy();
  });

  it('renders the InsightBanner for a keepGoing insight', async () => {
    const review = makeReview({ completionRate: 50 });
    const insight: WeeklyInsight = { type: 'keepGoing' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText(t('review.insightKeepGoing'))).toBeTruthy();
  });

  it('renders the InsightBanner for a perfect insight', async () => {
    const review = makeReview({ completionRate: 100 });
    const insight: WeeklyInsight = { type: 'perfect' };

    const { getByText } = await render(<HeroCard review={review} insight={insight} />);

    expect(getByText(t('review.insightPerfect'))).toBeTruthy();
  });
});

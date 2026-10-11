import React from 'react';
import { render } from '@testing-library/react-native';
import PeaksCard from '../PeaksCard';
import { useThemeColors } from '../../../utils/useThemeColors';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import type { WeeklyReview } from '../../../utils/weeklyReview';
import type { Peak, Camp } from '../../../types';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;

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

describe('weeklyReview/PeaksCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  it('returns null when no camps or peaks exist', async () => {
    const review = makeReview();
    const { toJSON } = await render(<PeaksCard review={review} />);
    expect(toJSON()).toBeNull();
  });

  it('renders section title when camps are completed', async () => {
    const camp: Camp = { id: 'c1', name: 'Base Camp', done: true, order: 0 };
    const peak: Peak = { id: 'p1', name: 'Everest', camps: [camp], createdAt: '2026-01-01' };
    const review = makeReview({ campsCompleted: [{ peak, camp }] });

    const { getByText } = await render(<PeaksCard review={review} />);

    expect(getByText(t('review.peaks'))).toBeTruthy();
  });

  it('renders camp name with peak name for completed camps', async () => {
    const camp: Camp = { id: 'c1', name: 'Base Camp', done: true, order: 0 };
    const peak: Peak = { id: 'p1', name: 'Everest', camps: [camp], createdAt: '2026-01-01' };
    const review = makeReview({ campsCompleted: [{ peak, camp }] });

    const { getByText } = await render(<PeaksCard review={review} />);

    expect(getByText('Base Camp · Everest')).toBeTruthy();
  });

  it('renders peak name for reached peaks', async () => {
    const peak: Peak = {
      id: 'p2',
      name: 'Mont Blanc',
      camps: [],
      createdAt: '2026-01-01',
      completedAt: '2026-10-07',
    };
    const review = makeReview({ peaksReached: [peak] });

    const { getByText } = await render(<PeaksCard review={review} />);

    expect(getByText('Mont Blanc')).toBeTruthy();
  });

  it('renders both completed camps and reached peaks together', async () => {
    const camp: Camp = { id: 'c1', name: 'Camp Alpha', done: true, order: 0 };
    const peak1: Peak = { id: 'p1', name: 'K2', camps: [camp], createdAt: '2026-01-01' };
    const peak2: Peak = {
      id: 'p2',
      name: 'Matterhorn',
      camps: [],
      createdAt: '2026-01-01',
      completedAt: '2026-10-06',
    };

    const review = makeReview({
      campsCompleted: [{ peak: peak1, camp }],
      peaksReached: [peak2],
    });

    const { getByText } = await render(<PeaksCard review={review} />);

    expect(getByText('Camp Alpha · K2')).toBeTruthy();
    expect(getByText('Matterhorn')).toBeTruthy();
  });

  it('renders multiple completed camps', async () => {
    const camp1: Camp = { id: 'c1', name: 'Camp 1', done: true, order: 0 };
    const camp2: Camp = { id: 'c2', name: 'Camp 2', done: true, order: 1 };
    const peak: Peak = { id: 'p1', name: 'Denali', camps: [camp1, camp2], createdAt: '2026-01-01' };

    const review = makeReview({
      campsCompleted: [
        { peak, camp: camp1 },
        { peak, camp: camp2 },
      ],
    });

    const { getByText } = await render(<PeaksCard review={review} />);

    expect(getByText('Camp 1 · Denali')).toBeTruthy();
    expect(getByText('Camp 2 · Denali')).toBeTruthy();
  });
});

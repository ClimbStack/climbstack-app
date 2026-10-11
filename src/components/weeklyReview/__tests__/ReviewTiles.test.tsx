import React from 'react';
import { render } from '@testing-library/react-native';
import ReviewTiles from '../ReviewTiles';
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

describe('weeklyReview/ReviewTiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
  });

  describe('StreakTile', () => {
    it('renders streak days count', async () => {
      const review = makeReview({ streak: 5 });
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText(t('review.streakDays', { count: 5 }))).toBeTruthy();
    });

    it('renders survived status label', async () => {
      const review = makeReview({ streakStatus: 'survived' });
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText(t('review.streakSurvived'))).toBeTruthy();
    });

    it('renders started status label', async () => {
      const review = makeReview({ streakStatus: 'started' });
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText(t('review.streakStarted'))).toBeTruthy();
    });

    it('renders broken status label', async () => {
      const review = makeReview({ streakStatus: 'broken' });
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText(t('review.streakBroken'))).toBeTruthy();
    });

    it('does not render status label for upcoming streak', async () => {
      const review = makeReview({ streakStatus: 'upcoming' });
      const { queryByText } = await render(<ReviewTiles review={review} />);

      expect(queryByText(t('review.streakSurvived'))).toBeNull();
      expect(queryByText(t('review.streakStarted'))).toBeNull();
      expect(queryByText(t('review.streakBroken'))).toBeNull();
    });
  });

  describe('PeaksTile', () => {
    it('renders camps completed count', async () => {
      const camp: Camp = { id: 'c1', name: 'Base', done: true, order: 0 };
      const peak: Peak = { id: 'p1', name: 'K2', camps: [camp], createdAt: '2026-01-01' };
      const review = makeReview({
        campsCompleted: [
          { peak, camp },
          { peak, camp: { ...camp, id: 'c2', name: 'Camp 2' } },
        ],
      });

      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText('2')).toBeTruthy();
    });

    it('renders camps completed label', async () => {
      const review = makeReview();
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText(t('review.campsCompleted'))).toBeTruthy();
    });

    it('renders zero camps completed when empty', async () => {
      const review = makeReview({ campsCompleted: [] });
      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText('0')).toBeTruthy();
    });

    it('shows peaks reached count when peaks are reached', async () => {
      const peak: Peak = {
        id: 'p1',
        name: 'Everest',
        camps: [],
        createdAt: '2026-01-01',
        completedAt: '2026-10-06',
      };
      const review = makeReview({ peaksReached: [peak] });

      const { getByText } = await render(<ReviewTiles review={review} />);

      expect(getByText('1 ' + t('review.peaksReached'))).toBeTruthy();
    });

    it('does not show peaks reached when none are reached', async () => {
      const review = makeReview({ peaksReached: [] });

      const { queryByText } = await render(<ReviewTiles review={review} />);

      expect(queryByText(t('review.peaksReached'))).toBeNull();
    });
  });
});

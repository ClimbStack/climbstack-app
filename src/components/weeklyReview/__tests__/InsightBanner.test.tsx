import React from 'react';
import { render } from '@testing-library/react-native';
import InsightBanner, { getInsightView } from '../InsightBanner';
import { useThemeColors } from '../../../utils/useThemeColors';
import { useLocale } from '../../../store/LocaleContext';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import type { WeeklyInsight, WeekPhase } from '../../../utils/weeklyReview';
import type { ThemeColors } from '../shared';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

describe('weeklyReview/InsightBanner', () => {
  const colors = Colors.light as unknown as ThemeColors;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    mockUseLocale.mockReturnValue({ locale: 'en', isReloading: false, changeLocale: jest.fn() });
  });

  describe('getInsightView', () => {
    const context = { phase: 'past' as WeekPhase, colors, locale: 'en' };

    it('returns trophy icon for perfect insight', () => {
      const result = getInsightView({ type: 'perfect' }, context);
      expect(result).toEqual({
        icon: 'trophy-outline',
        color: colors.success,
        text: t('review.insightPerfect'),
      });
    });

    it('returns thumb-up icon for great insight', () => {
      const result = getInsightView({ type: 'great' }, context);
      expect(result).toEqual({
        icon: 'thumb-up-outline',
        color: colors.success,
        text: t('review.insightGreat'),
      });
    });

    it('returns target icon for focus insight', () => {
      const category = {
        id: 'cat1',
        name: 'Work',
        color: '#3B82F6',
        emoji: 'briefcase',
        targetHoursPerWeek: 10,
      };
      const insight: WeeklyInsight = { type: 'focus', category, missingHours: 3 };
      const result = getInsightView(insight, context);
      expect(result).not.toBeNull();
      expect(result!.icon).toBe('target');
      expect(result!.color).toBe(colors.accent);
    });

    it('returns trending-up icon for keepGoing insight', () => {
      const result = getInsightView({ type: 'keepGoing' }, context);
      expect(result).toEqual({
        icon: 'trending-up',
        color: colors.primary,
        text: t('review.insightKeepGoing'),
      });
    });

    it('returns null for empty insight', () => {
      expect(getInsightView({ type: 'empty' }, context)).toBeNull();
    });

    it('returns null for upcoming insight', () => {
      expect(getInsightView({ type: 'upcoming' }, context)).toBeNull();
    });

    it('uses current-phase i18n key for focus insight in current week', () => {
      const category = {
        id: 'cat1',
        name: 'Work',
        color: '#3B82F6',
        emoji: 'briefcase',
        targetHoursPerWeek: 10,
      };
      const insight: WeeklyInsight = { type: 'focus', category, missingHours: 2 };
      const currentCtx = { ...context, phase: 'current' as WeekPhase };
      const result = getInsightView(insight, currentCtx);
      expect(result).not.toBeNull();
      expect(result!.text).toBeTruthy();
    });
  });

  describe('InsightBanner component', () => {
    it('renders banner text for a perfect insight', async () => {
      const { getByText } = await render(
        <InsightBanner insight={{ type: 'perfect' }} phase="past" locale="en" />
      );
      expect(getByText(t('review.insightPerfect'))).toBeTruthy();
    });

    it('renders banner text for a great insight', async () => {
      const { getByText } = await render(
        <InsightBanner insight={{ type: 'great' }} phase="past" locale="en" />
      );
      expect(getByText(t('review.insightGreat'))).toBeTruthy();
    });

    it('renders banner text for keepGoing insight', async () => {
      const { getByText } = await render(
        <InsightBanner insight={{ type: 'keepGoing' }} phase="past" locale="en" />
      );
      expect(getByText(t('review.insightKeepGoing'))).toBeTruthy();
    });

    it('renders nothing for empty insight', async () => {
      const { toJSON } = await render(
        <InsightBanner insight={{ type: 'empty' }} phase="past" locale="en" />
      );
      expect(toJSON()).toBeNull();
    });

    it('renders nothing for upcoming insight', async () => {
      const { toJSON } = await render(
        <InsightBanner insight={{ type: 'upcoming' }} phase="upcoming" locale="en" />
      );
      expect(toJSON()).toBeNull();
    });
  });
});

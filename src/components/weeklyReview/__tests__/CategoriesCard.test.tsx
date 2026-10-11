import React from 'react';
import { render } from '@testing-library/react-native';
import CategoriesCard from '../CategoriesCard';
import { useThemeColors } from '../../../utils/useThemeColors';
import { useLocale } from '../../../store/LocaleContext';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import type { CategoryReview } from '../../../utils/weeklyReview';
import type { Category } from '../../../types';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'cat1',
  name: 'Work',
  color: '#3B82F6',
  emoji: 'briefcase',
  targetHoursPerWeek: 10,
  ...overrides,
});

const makeCategoryReview = (overrides: Partial<CategoryReview> = {}): CategoryReview => ({
  category: makeCategory(),
  scheduled: 10,
  completed: 8,
  target: 10,
  metTarget: false,
  ...overrides,
});

describe('weeklyReview/CategoriesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    mockUseLocale.mockReturnValue({ locale: 'en', isReloading: false, changeLocale: jest.fn() });
  });

  it('returns null when categories list is empty', async () => {
    const { toJSON } = await render(<CategoriesCard categories={[]} phase="current" />);
    expect(toJSON()).toBeNull();
  });

  it('renders section title when categories exist', async () => {
    const categories = [makeCategoryReview()];
    const { getByText } = await render(<CategoriesCard categories={categories} phase="current" />);

    expect(getByText(t('review.categories'))).toBeTruthy();
  });

  it('renders category name', async () => {
    const categories = [makeCategoryReview()];
    const { getByText } = await render(<CategoriesCard categories={categories} phase="current" />);

    expect(getByText('Work')).toBeTruthy();
  });

  it('renders multiple categories', async () => {
    const categories = [
      makeCategoryReview(),
      makeCategoryReview({
        category: makeCategory({ id: 'cat2', name: 'Exercise', color: '#10B981', emoji: 'run' }),
      }),
    ];

    const { getByText } = await render(<CategoriesCard categories={categories} phase="current" />);

    expect(getByText('Work')).toBeTruthy();
    expect(getByText('Exercise')).toBeTruthy();
  });

  it('renders target met badge for met target in past phase', async () => {
    const categories = [makeCategoryReview({ metTarget: true })];

    const { getByLabelText } = await render(
      <CategoriesCard categories={categories} phase="past" />
    );

    expect(getByLabelText(t('review.targetMet'))).toBeTruthy();
  });

  it('renders target missed badge for unmet target in past phase', async () => {
    const categories = [makeCategoryReview({ metTarget: false, target: 10, completed: 5 })];

    const { getByLabelText } = await render(
      <CategoriesCard categories={categories} phase="past" />
    );

    expect(getByLabelText(t('review.targetMissed'))).toBeTruthy();
  });

  it('renders in-progress badge for unmet target in current phase', async () => {
    const categories = [makeCategoryReview({ metTarget: false, target: 10, completed: 5 })];

    const { getByLabelText } = await render(
      <CategoriesCard categories={categories} phase="current" />
    );

    expect(getByLabelText(t('review.targetInProgress'))).toBeTruthy();
  });

  it('does not render status badge when target is zero', async () => {
    const categories = [makeCategoryReview({ target: 0 })];

    const { queryByLabelText } = await render(
      <CategoriesCard categories={categories} phase="past" />
    );

    expect(queryByLabelText(t('review.targetMet'))).toBeNull();
    expect(queryByLabelText(t('review.targetMissed'))).toBeNull();
    expect(queryByLabelText(t('review.targetInProgress'))).toBeNull();
  });

  it('does not render status badge for upcoming phase', async () => {
    const categories = [makeCategoryReview({ target: 10, metTarget: false })];

    const { queryByLabelText } = await render(
      <CategoriesCard categories={categories} phase="upcoming" />
    );

    expect(queryByLabelText(t('review.targetMet'))).toBeNull();
    expect(queryByLabelText(t('review.targetMissed'))).toBeNull();
    expect(queryByLabelText(t('review.targetInProgress'))).toBeNull();
  });

  it('renders category accessible label with name and hours', async () => {
    const categories = [makeCategoryReview()];
    const { getByLabelText } = await render(
      <CategoriesCard categories={categories} phase="current" />
    );

    const row = getByLabelText(/Work/);
    expect(row).toBeTruthy();
  });
});

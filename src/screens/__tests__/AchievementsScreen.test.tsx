import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AchievementsScreen from '../AchievementsScreen';
import HomeScreen from '../HomeScreen';
import { useAchievements } from '../../store/AchievementsContext';
import { emptyAchievementProgress } from '../../utils/achievements';
import i18n, { t } from '../../utils/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@expo/vector-icons', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MaterialCommunityIcons: ({ name }: { name: string }) => React.createElement(Text, null, name),
  };
});
jest.mock('../../store/AchievementsContext', () => ({ useAchievements: jest.fn() }));
jest.mock('../../store/LocaleContext', () => ({
  useLocale: () => ({ locale: jest.requireActual('../../utils/i18n').default.locale }),
}));
jest.mock('../../store/PeaksContext', () => ({
  usePeaks: () => ({ peaks: [], streak: 0, totalCompletedHours: 0, addPeak: jest.fn() }),
}));
jest.mock('../../store/PlannerContext', () => ({
  usePlanner: () => ({ categories: [], templates: [] }),
}));
jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: () => ({ colors: jest.requireActual('../../utils/theme').Colors.dark }),
}));

const navigation = { setOptions: jest.fn(), navigate: jest.fn() };
const props = {
  navigation: navigation as unknown as Parameters<typeof AchievementsScreen>[0]['navigation'],
  route: { name: 'Achievements', key: 'achievements' } as const,
};

describe('achievement screen', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    i18n.locale = 'en';
    await AsyncStorage.setItem('@climbstack/onboarding_done', 'true');
    (useAchievements as jest.Mock).mockReturnValue({
      progress: emptyAchievementProgress(),
      isLoading: false,
      hasError: false,
      retry: jest.fn(),
    });
  });
  afterEach(() => {
    i18n.locale = 'en';
  });

  it('shows all 18 locked milestones with their progress', async () => {
    const view = await render(<AchievementsScreen {...props} />);
    expect(view.getByText('0 / 18 unlocked')).toBeTruthy();
    expect(view.getAllByRole('progressbar')).toHaveLength(18);
    expect(view.getAllByText(t('achievements.locked'))).toHaveLength(18);
    expect(view.getByRole('progressbar', { name: 'Mont Ventoux' })).toHaveAccessibilityValue({
      now: 0,
      max: 810,
    });
  });

  it('updates unlocked states, dates, totals and progress from the context', async () => {
    const view = await render(<AchievementsScreen {...props} />);
    (useAchievements as jest.Mock).mockReturnValue({
      progress: {
        ...emptyAchievementProgress(),
        altitude: 900,
        unlocked: { ventoux: '2026-11-09T12:00:00.000Z' },
      },
      isLoading: false,
      hasError: false,
    });
    await view.rerender(<AchievementsScreen {...props} />);
    expect(view.getByText('1 / 18 unlocked')).toBeTruthy();
    expect(view.getByText('Unlocked on Nov 9, 2026')).toBeTruthy();
    expect(view.getByRole('progressbar', { name: 'Mont Ventoux' })).toHaveAccessibilityValue({
      now: 810,
      max: 810,
    });
    expect(view.getByRole('progressbar', { name: 'Mount Etna' })).toHaveAccessibilityValue({
      now: 900,
      max: 3357,
    });
  });

  it('shows loading instead of inventing empty progress', async () => {
    (useAchievements as jest.Mock).mockReturnValue({
      progress: null,
      isLoading: true,
      hasError: false,
    });
    const view = await render(<AchievementsScreen {...props} />);
    expect(view.getByRole('progressbar')).toBeTruthy();
    expect(view.queryByText('0 / 18 unlocked')).toBeNull();
  });

  it('allows retry after a storage error', async () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    (useAchievements as jest.Mock).mockReturnValue({
      progress: null,
      isLoading: false,
      hasError: true,
      retry,
    });
    const view = await render(<AchievementsScreen {...props} />);
    expect(view.getByText(t('achievements.storageError'))).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: t('achievements.retry') }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(view.queryByText('0 / 18 unlocked')).toBeNull();
  });

  it.each([
    ['en', 'Achievements'],
    ['it', 'Traguardi'],
    ['de', 'Erfolge'],
    ['fr', 'Succès'],
    ['es', 'Logros'],
  ])('has registered translations for every badge in %s', async (locale, title) => {
    i18n.locale = locale;
    const view = await render(<AchievementsScreen {...props} />);
    expect(navigation.setOptions).toHaveBeenCalledWith(expect.objectContaining({ title }));
    expect(view.queryAllByText(/\[missing|%\{/)).toEqual([]);
    expect(view.getAllByRole('progressbar')).toHaveLength(18);
  });

  it('opens the collection through the compact home header button', async () => {
    const view = await render(
      <HomeScreen
        navigation={navigation as unknown as Parameters<typeof HomeScreen>[0]['navigation']}
        route={{ name: 'Home', key: 'home' }}
      />
    );
    expect(view.queryByText(t('achievements.title'))).toBeNull();
    const header = await render(navigation.setOptions.mock.calls.at(-1)![0].headerRight());
    await fireEvent.press(header.getByRole('button', { name: t('achievements.title') }));
    expect(navigation.navigate).toHaveBeenCalledWith('Achievements');
  });
});

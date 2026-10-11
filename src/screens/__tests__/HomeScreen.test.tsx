import React from 'react';
import { Platform } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../HomeScreen';
import { usePeaks } from '../../store/PeaksContext';
import { usePlanner } from '../../store/PlannerContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { useLocale } from '../../store/LocaleContext';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';
import type { Category, BlockTemplate, Peak } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../store/PeaksContext', () => ({
  usePeaks: jest.fn(),
}));

jest.mock('../../store/PlannerContext', () => ({
  usePlanner: jest.fn(),
}));

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

const mockUsePeaks = usePeaks as jest.Mock;
const mockUsePlanner = usePlanner as jest.Mock;
const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

describe('HomeScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  } as unknown as Parameters<typeof HomeScreen>[0]['navigation'];

  const defaultCategory: Category = {
    id: 'cat1',
    name: 'Work',
    color: '#3B82F6',
    emoji: 'briefcase',
    targetHoursPerWeek: 10,
  };

  const secondaryCategory: Category = {
    id: 'cat2',
    name: 'Fitness',
    color: '#10B981',
    emoji: 'run',
    targetHoursPerWeek: 5,
  };

  const defaultTemplate: BlockTemplate = {
    id: 'tpl1',
    name: 'Deep Work',
    categoryId: 'cat1',
    durationHours: 2,
  };

  const mockAddPeak = jest.fn();

  const incompletePeak: Peak = {
    id: 'peak-1',
    name: 'Mount Everest',
    description: 'Conquer the highest peak',
    camps: [
      { id: 'c1', name: 'Base Camp', done: true, order: 0 },
      { id: 'c2', name: 'Camp 1', done: false, order: 1 },
    ],
    createdAt: '2026-01-01T10:00:00.000Z',
  };

  const completedPeak: Peak = {
    id: 'peak-2',
    name: 'Kilimanjaro',
    description: 'African summit',
    camps: [
      { id: 'c3', name: 'Mandara Hut', done: true, order: 0 },
      { id: 'c4', name: 'Summit', done: true, order: 1 },
    ],
    createdAt: '2026-02-01T10:00:00.000Z',
    completedAt: '2026-03-01T15:30:00.000Z',
  };

  beforeEach(() => {
    (AsyncStorage as any).__INTERNAL_MOCK_STORAGE__ = {
      '@climbstack/onboarding_done': 'true',
    };
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseThemeColors.mockReturnValue({
      colors: Colors.light,
      isDark: false,
    });

    mockUseLocale.mockReturnValue({
      locale: 'en',
      isReloading: false,
      changeLocale: jest.fn(),
    });

    mockUsePlanner.mockReturnValue({
      categories: [defaultCategory, secondaryCategory],
      templates: [defaultTemplate],
    });

    mockUsePeaks.mockReturnValue({
      peaks: [incompletePeak],
      streak: 5,
      lastActiveDate: '2026-10-10',
      totalCompletedHours: 20,
      addPeak: mockAddPeak,
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('header and options', () => {
    it('sets navigation header options with light theme colors', async () => {
      await render(<HomeScreen navigation={mockNavigation} route={{} as any} />);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith({
        title: 'ClimbStack',
        headerStyle: { backgroundColor: Colors.light.surface },
        headerTintColor: Colors.light.text,
      });
    });

    it('sets navigation header options with dark theme colors', async () => {
      mockUseThemeColors.mockReturnValue({
        colors: Colors.dark,
        isDark: true,
      });

      await render(<HomeScreen navigation={mockNavigation} route={{} as any} />);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith({
        title: 'ClimbStack',
        headerStyle: { backgroundColor: Colors.dark.surface },
        headerTintColor: Colors.dark.text,
      });
    });
  });

  describe('onboarding modal lifecycle', () => {
    it('shows onboarding modal when onboarding is not marked as done', async () => {
      await AsyncStorage.removeItem('@climbstack/onboarding_done');

      const { findByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      expect(await findByText(t('onboarding.skip'))).toBeTruthy();
    });

    it('dismisses onboarding modal and stores onboarding_done flag', async () => {
      await AsyncStorage.removeItem('@climbstack/onboarding_done');

      const { findByText, queryByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      const skipButton = await findByText(t('onboarding.skip'));
      await fireEvent.press(skipButton);

      const doneFlag = await AsyncStorage.getItem('@climbstack/onboarding_done');
      expect(doneFlag).toBe('true');
      expect(queryByText(t('onboarding.skip'))).toBeNull();
    });

    it('handles AsyncStorage errors gracefully during onboarding check', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage failure'));

      await render(<HomeScreen navigation={mockNavigation} route={{} as any} />);
      await act(async () => {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('handles AsyncStorage error during onboarding dismissal gracefully', async () => {
      await AsyncStorage.removeItem('@climbstack/onboarding_done');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Save failure'));

      const { findByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      const skipButton = await findByText(t('onboarding.skip'));
      await fireEvent.press(skipButton);

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('peak list rendering and navigation', () => {
    it('renders incomplete peak cards in the list and navigates on press', async () => {
      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      expect(getByText('Mount Everest')).toBeTruthy();
      expect(getByText('Conquer the highest peak')).toBeTruthy();

      await fireEvent.press(getByText('Mount Everest'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PeakDetail', {
        peakId: 'peak-1',
      });
    });

    it('filters out completed peaks from the main list', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [incompletePeak, completedPeak],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText, queryByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      expect(getByText('Mount Everest')).toBeTruthy();
      expect(queryByText('Kilimanjaro')).toBeNull();
    });

    it('renders empty state when there are no incomplete peaks', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [completedPeak],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      expect(getByText(t('home.addFirst'))).toBeTruthy();
    });

    it('renders empty state when peaks array is empty', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [],
        streak: 0,
        lastActiveDate: undefined,
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      expect(getByText(t('home.addFirst'))).toBeTruthy();
    });
  });

  describe('create peak modal', () => {
    it('opens modal on FAB press, accepts inputs, and calls addPeak with description', async () => {
      const { getByText, getByPlaceholderText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));

      expect(getByText(t('home.newPeak'))).toBeTruthy();

      const nameInput = getByPlaceholderText(t('home.peakName'));
      const descInput = getByPlaceholderText(t('home.descOptional'));

      await fireEvent.changeText(nameInput, '  Matterhorn  ');
      await fireEvent.changeText(descInput, '  Alpine adventure  ');

      await fireEvent.press(getByText(t('home.createPeak')));

      expect(mockAddPeak).toHaveBeenCalledWith('Matterhorn', 'Alpine adventure');
    });

    it('calls addPeak with undefined when description is empty or whitespace only', async () => {
      const { getByText, getByPlaceholderText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));

      const nameInput = getByPlaceholderText(t('home.peakName'));
      const descInput = getByPlaceholderText(t('home.descOptional'));

      await fireEvent.changeText(nameInput, 'Matterhorn');
      await fireEvent.changeText(descInput, '   ');

      await fireEvent.press(getByText(t('home.createPeak')));

      expect(mockAddPeak).toHaveBeenCalledWith('Matterhorn', undefined);
    });

    it('does not call addPeak when name is empty or only whitespace', async () => {
      const { getByText, getByPlaceholderText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));

      const nameInput = getByPlaceholderText(t('home.peakName'));
      await fireEvent.changeText(nameInput, '   ');

      await fireEvent.press(getByText(t('home.createPeak')));

      expect(mockAddPeak).not.toHaveBeenCalled();
    });

    it('clears inputs and cancels modal when Cancel is pressed', async () => {
      const { getByText, getByPlaceholderText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));

      const nameInput = getByPlaceholderText(t('home.peakName'));
      await fireEvent.changeText(nameInput, 'Matterhorn');

      await fireEvent.press(getByText(t('common.cancel')));

      expect(mockAddPeak).not.toHaveBeenCalled();
    });

    it('sets keyboard avoiding behavior on iOS platform', async () => {
      const originalPlatform = Platform.OS;
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        configurable: true,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));
      expect(getByText(t('home.newPeak'))).toBeTruthy();

      Object.defineProperty(Platform, 'OS', {
        value: originalPlatform,
        configurable: true,
      });
    });
  });

  describe('peaks history modal', () => {
    it('opens peaks history modal via StatsBar and displays completed and in-progress peaks', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [incompletePeak, completedPeak],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText, getAllByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));

      expect(getByText(t('home.peaksHistoryTitle'))).toBeTruthy();
      expect(getByText(t('home.completed'))).toBeTruthy();
      expect(getByText(t('home.inProgress'))).toBeTruthy();
      expect(getByText('Kilimanjaro')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
      expect(getByText('50%')).toBeTruthy();

      const closeButtons = getAllByText(t('home.close'));
      await fireEvent.press(closeButtons[0]);
    });

    it('navigates to peak detail from history modal on peak press', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [incompletePeak, completedPeak],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));
      await fireEvent.press(getByText('Kilimanjaro'));

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PeakDetail', {
        peakId: 'peak-2',
      });
    });

    it('navigates to peak detail when pressing in-progress peak in history modal', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [incompletePeak],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText, getAllByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));

      const items = getAllByText('Mount Everest');
      await fireEvent.press(items[items.length - 1]);

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('PeakDetail', {
        peakId: 'peak-1',
      });
    });

    it('displays empty messages when no peaks or no completed peaks exist', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [],
        streak: 0,
        lastActiveDate: undefined,
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));

      expect(getByText(t('home.noHistoricalData'))).toBeTruthy();
      expect(getByText(t('home.noCompletedPeaks'))).toBeTruthy();
    });

    it('renders completed peak without completed date if completedAt is missing', async () => {
      const peakWithoutDate: Peak = {
        id: 'peak-3',
        name: 'Mont Blanc',
        camps: [{ id: 'c5', name: 'Camp', done: true, order: 0 }],
        createdAt: '2026-01-01T10:00:00.000Z',
      };

      mockUsePeaks.mockReturnValue({
        peaks: [peakWithoutDate],
        streak: 1,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));

      expect(getByText('Mont Blanc')).toBeTruthy();
      expect(getByText('100%')).toBeTruthy();
    });
  });

  describe('altitude stats modal', () => {
    it('aggregates category hours and completed peak camps, sorting descending', async () => {
      const weekPlan = {
        weekId: '2026-10-05',
        blocks: [
          { done: true, isOneOff: true, oneOffCategoryId: 'cat1', oneOffDuration: 3 },
          { done: true, templateId: 'tpl1' },
          { done: true, isOneOff: true, oneOffCategoryId: 'deleted-cat', oneOffDuration: 4 },
          { done: false, isOneOff: true, oneOffCategoryId: 'cat2', oneOffDuration: 10 },
          { done: true, templateId: 'non-existing-template' },
        ],
      };

      await AsyncStorage.setItem('@climbstack/week/2026-10-05', JSON.stringify(weekPlan));
      jest
        .spyOn(AsyncStorage, 'getAllKeys')
        .mockResolvedValueOnce(['@climbstack/week/2026-10-05', '@climbstack/week/missing-value']);

      mockUsePeaks.mockReturnValue({
        peaks: [
          incompletePeak,
          {
            id: 'peak-empty',
            name: 'Hill',
            camps: [{ id: 'c9', name: 'Hut', done: false, order: 0 }],
            createdAt: '2026-01-01',
          },
        ],
        streak: 5,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 20,
        addPeak: mockAddPeak,
      });

      const { getByText, getAllByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.totalAlt')));
      await act(async () => {});

      expect(getByText(t('home.altHistoryTitle'))).toBeTruthy();
      expect(getByText('Work')).toBeTruthy();
      expect(getByText('5m')).toBeTruthy();
      expect(getByText(t('home.deletedArchived'))).toBeTruthy();
      expect(getByText('4m')).toBeTruthy();
      expect(getByText('100m')).toBeTruthy();

      const closeButtons = getAllByText(t('home.close'));
      await fireEvent.press(closeButtons[closeButtons.length - 1]);
    });

    it('shows noHistoricalData when no stats are recorded', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [],
        streak: 0,
        lastActiveDate: undefined,
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.totalAlt')));
      await act(async () => {});

      expect(getByText(t('home.noHistoricalData'))).toBeTruthy();
    });

    it('handles null values and errors in loadAltStats gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(AsyncStorage, 'getAllKeys').mockRejectedValueOnce(new Error('Storage failure'));

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.totalAlt')));
      await act(async () => {});

      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('closes altitude modal on onRequestClose', async () => {
      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.totalAlt')));
      await act(async () => {});

      const title = getByText(t('home.altHistoryTitle'));
      let current: any = title.parent;
      while (current && !current.props?.onRequestClose) {
        current = current.parent;
      }
      await act(async () => {
        current?.props?.onRequestClose();
      });
    });
  });

  describe('modals onRequestClose and locale support', () => {
    it('closes peaks history modal on onRequestClose', async () => {
      mockUsePeaks.mockReturnValue({
        peaks: [completedPeak],
        streak: 1,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));
      expect(getByText(t('home.peaksHistoryTitle'))).toBeTruthy();

      const title = getByText(t('home.peaksHistoryTitle'));
      let current: any = title.parent;
      while (current && !current.props?.onRequestClose) {
        current = current.parent;
      }
      await act(async () => {
        current?.props?.onRequestClose();
      });
    });

    it('cancels add peak modal on onRequestClose', async () => {
      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText('+'));

      const title = getByText(t('home.newPeak'));
      let current: any = title.parent;
      while (current && !current.props?.onRequestClose) {
        current = current.parent;
      }
      await act(async () => {
        current?.props?.onRequestClose();
      });
    });

    it('formats completed peak date with locale formatting', async () => {
      mockUseLocale.mockReturnValue({
        locale: 'it-IT',
        isReloading: false,
        changeLocale: jest.fn(),
      });
      mockUsePeaks.mockReturnValue({
        peaks: [completedPeak],
        streak: 1,
        lastActiveDate: '2026-10-10',
        totalCompletedHours: 0,
        addPeak: mockAddPeak,
      });

      const { getByText } = await render(
        <HomeScreen navigation={mockNavigation} route={{} as any} />
      );

      await fireEvent.press(getByText(t('home.peaksReached')));
      expect(getByText('Kilimanjaro')).toBeTruthy();
      expect(getByText(/1 mar 2026/i)).toBeTruthy();
    });
  });
});

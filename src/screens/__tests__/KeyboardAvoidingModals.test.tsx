import React from 'react';
import { Platform, KeyboardAvoidingView } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import PeakDetailScreen from '../PeakDetailScreen';
import IconPicker from '../../components/IconPicker';
import HomeScreen from '../HomeScreen';
import ManageBlocksScreen from '../ManageBlocksScreen';
import PlannerScreen from '../PlannerScreen';
import { usePeaks } from '../../store/PeaksContext';
import { usePlanner } from '../../store/PlannerContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { useLocale } from '../../store/LocaleContext';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';
import type { Category, BlockTemplate, Peak, WeeklyPlan } from '../../types';

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

describe('KeyboardAvoidingView on Android and iOS across modals', () => {
  const originalPlatform = Platform.OS;

  const defaultCategory: Category = {
    id: 'cat1',
    name: 'Work',
    color: '#3B82F6',
    emoji: 'briefcase',
    targetHoursPerWeek: 10,
  };

  const defaultTemplate: BlockTemplate = {
    id: 'tpl1',
    name: 'Deep Work',
    categoryId: 'cat1',
    durationHours: 2,
  };

  const defaultPeak: Peak = {
    id: 'peak1',
    name: 'Mount Everest',
    camps: [],
    createdAt: '2026-10-01',
  };

  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
  };

  let capturedProps: any[] = [];
  let kavSpy: jest.SpyInstance;

  beforeEach(() => {
    capturedProps = [];
    kavSpy = jest.spyOn(KeyboardAvoidingView.prototype, 'render').mockImplementation(function (
      this: any
    ) {
      capturedProps.push(this.props);
      return this.props.children ?? null;
    });

    mockUseThemeColors.mockReturnValue({
      colors: Colors.light,
      isDark: false,
    });

    mockUseLocale.mockReturnValue({
      locale: 'en',
      changeLocale: jest.fn(),
    });

    mockUsePeaks.mockReturnValue({
      peaks: [defaultPeak],
      streak: 5,
      lastActiveDate: '2026-10-14',
      totalCompletedHours: 20,
      addPeak: jest.fn(),
      addCamp: jest.fn(),
      toggleCamp: jest.fn(),
      deleteCamp: jest.fn(),
      addCompletedHours: jest.fn(),
    });

    mockUsePlanner.mockReturnValue({
      currentPlan: {
        weekId: '2026-10-12',
        blocks: [
          {
            id: 'block1',
            templateId: 'tpl1',
            day: 'lun',
            startTime: '09:00',
            done: false,
            description: 'My task',
          },
        ],
      } as WeeklyPlan,
      currentWeekId: '2026-10-12',
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      changeWeek: jest.fn(),
      copyPreviousWeek: jest.fn(),
      clearCurrentWeek: jest.fn(),
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 2, completed: 0, target: 10 }),
    });
  });

  afterEach(() => {
    kavSpy?.mockRestore();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it('configures KeyboardAvoidingView with height behavior and 0 offset on Android for PeakDetailScreen', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const route = { params: { peakId: 'peak1' } } as any;
    await render(<PeakDetailScreen navigation={mockNavigation as any} route={route} />);

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
          keyboardVerticalOffset: 0,
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with padding behavior and 100 offset on iOS for PeakDetailScreen', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const route = { params: { peakId: 'peak1' } } as any;
    await render(<PeakDetailScreen navigation={mockNavigation as any} route={route} />);

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'padding',
          keyboardVerticalOffset: 100,
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with height behavior on Android for IconPicker', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    await render(<IconPicker visible={true} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with height behavior on Android in HomeScreen modal', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText } = await render(
      <HomeScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await fireEvent.press(getByText('+'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with height behavior on Android in ManageBlocksScreen modals', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText } = await render(<ManageBlocksScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('+'));
    await fireEvent.press(getByText(t('manage.categoryBtn')));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with height behavior on Android in PlannerScreen edit modal', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText } = await render(<PlannerScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('Deep Work'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );
  });
});

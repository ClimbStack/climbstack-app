import React from 'react';
import { Platform, KeyboardAvoidingView } from 'react-native';
import { render, fireEvent, act, cleanup } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return jest.fn((props) => React.createElement(View, props));
});

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

  const secondaryCategory: Category = {
    id: 'cat2',
    name: 'Study',
    color: '#10B981',
    emoji: 'school',
    targetHoursPerWeek: 15,
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
  let mockPlannerActions: any;
  let mockPeakActions: any;

  beforeEach(() => {
    (AsyncStorage as any).__INTERNAL_MOCK_STORAGE__ = {
      '@climbstack/onboarding_done': 'true',
    };

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

    mockPeakActions = {
      peaks: [defaultPeak],
      streak: 5,
      lastActiveDate: '2026-10-14',
      totalCompletedHours: 20,
      addPeak: jest.fn(),
      addCamp: jest.fn(),
      toggleCamp: jest.fn(),
      deleteCamp: jest.fn(),
      addCompletedHours: jest.fn(),
    };
    mockUsePeaks.mockReturnValue(mockPeakActions);

    mockPlannerActions = {
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
      categories: [defaultCategory, secondaryCategory],
      templates: [defaultTemplate],
      changeWeek: jest.fn(),
      copyPreviousWeek: jest.fn(),
      clearCurrentWeek: jest.fn(),
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      addCategory: jest.fn(),
      editCategory: jest.fn(),
      deleteCategory: jest.fn(),
      archiveCategory: jest.fn(),
      unarchiveCategory: jest.fn(),
      addTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      archiveTemplate: jest.fn(),
      unarchiveTemplate: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn(
        (id: string) =>
          [defaultCategory, secondaryCategory].find((c) => c.id === id) || defaultCategory
      ),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 2, completed: 0, target: 10 }),
    };
    mockUsePlanner.mockReturnValue(mockPlannerActions);
  });

  afterEach(async () => {
    await act(async () => {});
    cleanup();
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

  it('configures KeyboardAvoidingView with padding behavior on iOS for IconPicker', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const onClose = jest.fn();
    const { getByText } = await render(
      <IconPicker visible={true} onSelect={jest.fn()} onClose={onClose} />
    );

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'padding',
        }),
      ])
    );

    await fireEvent.press(getByText(t('common.cancel')));
    expect(onClose).toHaveBeenCalled();
  });

  it('configures KeyboardAvoidingView with height behavior on Android in HomeScreen modal', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText } = await render(
      <HomeScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await act(async () => {});
    await fireEvent.press(getByText('+'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with padding behavior on iOS in HomeScreen modal', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const { getByText } = await render(
      <HomeScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await act(async () => {});
    await fireEvent.press(getByText('+'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'padding',
        }),
      ])
    );
  });

  it('configures KeyboardAvoidingView with height behavior on Android in PlannerScreen edit modal and handles cancel', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText, getByDisplayValue } = await render(
      <PlannerScreen navigation={mockNavigation as any} />
    );
    await fireEvent.press(getByText('Deep Work'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'height',
        }),
      ])
    );

    const descInput = getByDisplayValue('My task');
    await fireEvent.changeText(descInput, 'Updated task');

    const title = getByText(t('planner.blockDetails'));
    let current: any = title.parent;
    while (current && !current.props?.onRequestClose) {
      current = current.parent;
    }
    await act(async () => {
      current?.props?.onRequestClose?.();
    });

    // Re-open and cancel via button
    await fireEvent.press(getByText('Deep Work'));
    await fireEvent.press(getByText(t('common.cancel')));
  });

  it('configures KeyboardAvoidingView with padding behavior on iOS and supports save on PlannerScreen', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const { getByText } = await render(<PlannerScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('Deep Work'));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'padding',
        }),
      ])
    );

    await fireEvent.press(getByText(t('common.save')));
    expect(mockPlannerActions.updateBlockDescription).toHaveBeenCalledWith('block1', 'My task');
  });

  it('renders PlannerScreen edit modal and handles delete', async () => {
    const { getByText } = await render(<PlannerScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('Deep Work'));
    await fireEvent.press(getByText(t('common.delete')));
    expect(mockPlannerActions.unscheduleBlock).toHaveBeenCalledWith('block1');
  });

  it('renders PlannerScreen edit modal and toggles done when block is incomplete', async () => {
    const { getByText } = await render(<PlannerScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('Deep Work'));

    const doneButton = getByText('✓ ' + t('planner.markDone'));
    expect(doneButton).toBeTruthy();
    await fireEvent.press(doneButton);
    expect(mockPlannerActions.toggleBlockDone).toHaveBeenCalledWith('block1');
    expect(mockPeakActions.addCompletedHours).toHaveBeenCalledWith(2);
  });

  it('renders PlannerScreen edit modal and toggles undone when block is already done', async () => {
    mockPlannerActions.currentPlan = {
      weekId: '2026-10-12',
      blocks: [
        {
          id: 'block1',
          templateId: 'tpl1',
          day: 'lun',
          startTime: '09:00',
          done: true,
          description: 'Finished task',
        },
      ],
    };

    const { getByText } = await render(<PlannerScreen navigation={mockNavigation as any} />);
    await fireEvent.press(getByText('Deep Work'));

    const todoButton = getByText('✕ ' + t('planner.markTodo'));
    expect(todoButton).toBeTruthy();
    await fireEvent.press(todoButton);
    expect(mockPlannerActions.toggleBlockDone).toHaveBeenCalledWith('block1');
    expect(mockPeakActions.addCompletedHours).toHaveBeenCalledWith(-2);
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

  it('configures KeyboardAvoidingView with padding behavior on iOS and handles Category modal interactions', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true, configurable: true });

    const { getByText, findByText, getByDisplayValue, getAllByText, root } = await render(
      <ManageBlocksScreen navigation={mockNavigation as any} />
    );

    await fireEvent.press(getByText('+'));
    await fireEvent.press(getByText(t('manage.categoryBtn')));

    expect(capturedProps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          behavior: 'padding',
        }),
      ])
    );

    const targetInput = getByDisplayValue('10');
    await fireEvent.changeText(targetInput, '14');

    const tapToChange = getByText(t('manage.tapToChange'));
    await fireEvent.press(tapToChange);

    // Cancel IconPicker (covers line 611: onClose)
    const selectIconTitle = await findByText(t('manage.selectIcon'));
    const closeBtn = (selectIconTitle.parent as any).children[3];
    await fireEvent.press(closeBtn);

    // Re-open IconPicker to select icon (covers lines 608, 609: onSelect)
    await fireEvent.press(tapToChange);
    const title2 = await findByText(t('manage.selectIcon'));
    const scrollView = (title2.parent as any).children[2];
    const row = scrollView?.children?.[0]?.children?.[0]?.children?.[0];
    const firstCell = row?.children?.[0];
    if (firstCell) {
      await fireEvent.press(firstCell);
    }

    const colorChips = (root as any).queryAll(
      (node: any) =>
        node.props?.style?.backgroundColor === '#10B981' && node.props?.style?.width === 32
    );
    if (colorChips.length > 0) {
      await fireEvent.press(colorChips[0]);
    }

    // Cancel Category modal (covers line 657)
    const cancelButtons = getAllByText(t('common.cancel'));
    await fireEvent.press(cancelButtons[cancelButtons.length - 1]);

    // Also test editing an existing category to cover the editCatId branch (line 560)
    const workCategory = getAllByText('Work')[0];
    await fireEvent.press(workCategory);
    expect(getByText(t('manage.editCategory'))).toBeTruthy();
    const cancelButtonsAfterEdit = getAllByText(t('common.cancel'));
    await fireEvent.press(cancelButtonsAfterEdit[cancelButtonsAfterEdit.length - 1]);
  });

  it('handles New Block modal with category chips, duration selection, cancel and creation', async () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true, configurable: true });

    const { getByText, getByPlaceholderText, getAllByText } = await render(
      <ManageBlocksScreen navigation={mockNavigation as any} />
    );

    await fireEvent.press(getByText('+'));
    await fireEvent.press(getByText(t('manage.blockBtn')));

    expect(getByText(t('manage.newBlock'))).toBeTruthy();

    const workChips = getAllByText(/Work/);
    const studyChips = getAllByText(/Study/);
    const workChip = workChips[workChips.length - 1];
    const studyChip = studyChips[studyChips.length - 1];

    await fireEvent.press(workChip);
    expect(getByPlaceholderText(t('manage.blockName')).props.value).toBe('Work');

    await fireEvent.press(studyChip);
    expect(getByPlaceholderText(t('manage.blockName')).props.value).toBe('Study');

    const blockInput = getByPlaceholderText(t('manage.blockName'));
    await fireEvent.changeText(blockInput, 'Math Homework');
    await fireEvent.press(workChip);
    expect(getByPlaceholderText(t('manage.blockName')).props.value).toBe('Math Homework');

    await fireEvent.press(getByText('2h'));

    await fireEvent.press(getByText(t('common.cancel')));

    await fireEvent.press(getByText('+'));
    await fireEvent.press(getByText(t('manage.blockBtn')));

    const newWorkChips = getAllByText(/Work/);
    await fireEvent.press(newWorkChips[newWorkChips.length - 1]);
    await fireEvent.press(getByText('3h'));
    await fireEvent.press(getByText(t('common.create')));

    expect(mockPlannerActions.addTemplate).toHaveBeenCalledWith('Work', 'cat1', 3);
  });
});

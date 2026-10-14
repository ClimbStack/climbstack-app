import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import PlannerScreen from '../PlannerScreen';
import { usePlanner } from '../../store/PlannerContext';
import { usePeaks } from '../../store/PeaksContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';
import type { Category, BlockTemplate, ScheduledBlock, WeeklyPlan } from '../../types';

jest.mock('../../store/PlannerContext', () => ({
  usePlanner: jest.fn(),
}));

jest.mock('../../store/PeaksContext', () => ({
  usePeaks: jest.fn(),
}));

jest.mock('../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

const mockUsePlanner = usePlanner as jest.Mock;
const mockUsePeaks = usePeaks as jest.Mock;
const mockUseThemeColors = useThemeColors as jest.Mock;

describe('PlannerScreen - Clear Week', () => {
  jest.setTimeout(15000);

  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };

  const defaultCategory: Category = {
    id: 'cat1',
    name: 'Study',
    color: '#3B82F6',
    emoji: 'bookshelf',
    targetHoursPerWeek: 10,
  };

  const defaultTemplate: BlockTemplate = {
    id: 'tpl1',
    name: 'Reading',
    categoryId: 'cat1',
    durationHours: 1,
  };

  const scheduledBlock: ScheduledBlock = {
    id: 'b1',
    templateId: 'tpl1',
    day: 'lun',
    startTime: '09:00',
    done: false,
  };

  const mockClearCurrentWeek = jest.fn();
  const mockCopyPreviousWeek = jest.fn();
  const mockChangeWeek = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseThemeColors.mockReturnValue({
      colors: Colors.light,
      isDark: false,
    });

    mockUsePeaks.mockReturnValue({
      addCompletedHours: jest.fn(),
    });
  });

  it('does not display Clear Week button when current week has no blocks', async () => {
    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 0, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { queryByText, queryByLabelText, getByText } = await render(
      <PlannerScreen navigation={mockNavigation} />
    );

    expect(getByText(t('planner.emptyWeek'))).toBeTruthy();
    expect(queryByText(t('planner.clearWeekBtn'))).toBeNull();
    expect(queryByLabelText(t('planner.clearWeekBtn'))).toBeNull();
  });

  it('displays Clear Week button when current week has scheduled blocks', async () => {
    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [scheduledBlock] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 1, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { getByText, getByLabelText, queryByText } = await render(
      <PlannerScreen navigation={mockNavigation} />
    );

    expect(queryByText(t('planner.emptyWeek'))).toBeNull();
    expect(getByText(t('planner.clearWeekBtn'))).toBeTruthy();
    expect(getByLabelText(t('planner.clearWeekBtn'))).toBeTruthy();
  });

  it('triggers confirmation dialog when Clear Week button is tapped', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [scheduledBlock] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 1, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);

    await fireEvent.press(getByLabelText(t('planner.clearWeekBtn')));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      t('planner.clearWeekTitle'),
      t('planner.clearWeekMsg'),
      expect.arrayContaining([
        expect.objectContaining({ text: t('common.cancel'), style: 'cancel' }),
        expect.objectContaining({
          text: t('planner.clearWeekConfirm'),
          style: 'destructive',
          onPress: expect.any(Function),
        }),
      ])
    );
  });

  it('calls clearCurrentWeek upon alert confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [scheduledBlock] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 1, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);

    await fireEvent.press(getByLabelText(t('planner.clearWeekBtn')));

    const alertButtons = alertSpy.mock.calls[0][2];
    const confirmButton = alertButtons?.find((b) => b.text === t('planner.clearWeekConfirm'));
    expect(confirmButton).toBeDefined();

    confirmButton?.onPress?.();

    expect(mockClearCurrentWeek).toHaveBeenCalledTimes(1);
  });

  it('renders Clear Week button with dark theme styling', async () => {
    mockUseThemeColors.mockReturnValue({
      colors: Colors.dark,
      isDark: true,
    });

    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [scheduledBlock] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 1, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
    const clearBtn = getByLabelText(t('planner.clearWeekBtn'));
    expect(clearBtn).toBeTruthy();
  });

  it('applies pressed opacity style when Clear Week button is pressed', async () => {
    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: { weekId: '2026-10-12', blocks: [scheduledBlock] } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory],
      templates: [defaultTemplate],
      scheduleBlock: jest.fn(),
      unscheduleBlock: jest.fn(),
      toggleBlockDone: jest.fn(),
      updateBlockDescription: jest.fn(),
      getTemplateById: jest.fn().mockReturnValue(defaultTemplate),
      getCategoryById: jest.fn().mockReturnValue(defaultCategory),
      getCategoryHours: jest.fn().mockReturnValue({ scheduled: 1, completed: 0, target: 10 }),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
    });

    const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
    const clearBtn = getByLabelText(t('planner.clearWeekBtn'));
    await fireEvent(clearBtn, 'responderGrant', { nativeEvent: {}, persist: () => {} });
    expect(clearBtn.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.7 })])
    );
  });
});

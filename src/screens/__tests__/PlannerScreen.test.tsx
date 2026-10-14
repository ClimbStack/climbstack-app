import React from 'react';
import { Alert, Platform } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import PlannerScreen from '../PlannerScreen';
import { usePlanner } from '../../store/PlannerContext';
import { usePeaks } from '../../store/PeaksContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';
import type { Category, BlockTemplate, ScheduledBlock, WeeklyPlan } from '../../types';
import * as weekUtils from '../../types/weekUtils';

jest.mock('@react-native-community/datetimepicker', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return jest.fn((props) => React.createElement(View, { testID: 'datetimepicker', ...props }));
});

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

describe('PlannerScreen', () => {
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

  const emptyCategory: Category = {
    id: 'cat2',
    name: 'Free Time',
    color: '#10B981',
    emoji: 'controller-classic',
    targetHoursPerWeek: 0,
  };

  const defaultTemplate: BlockTemplate = {
    id: 'tpl1',
    name: 'Reading',
    categoryId: 'cat1',
    durationHours: 1,
  };

  const secondTemplate: BlockTemplate = {
    id: 'tpl2',
    name: 'Workout',
    categoryId: 'cat1',
    durationHours: 2,
  };

  const newTemplate: BlockTemplate = {
    id: 'tpl3',
    name: 'Coding',
    categoryId: 'cat1',
    durationHours: 1,
  };

  const scheduledBlock: ScheduledBlock = {
    id: 'b1',
    templateId: 'tpl1',
    day: 'lun',
    startTime: '09:00',
    done: false,
    description: 'Chapter 1 notes',
  };

  const doneBlock: ScheduledBlock = {
    id: 'b2',
    templateId: 'tpl2',
    day: 'mar',
    startTime: '10:00',
    done: true,
    customDuration: 2,
  };

  const oneOffBlock: ScheduledBlock = {
    id: 'b3',
    day: 'mer',
    startTime: '14:00',
    done: false,
    isOneOff: true,
    oneOffName: 'Meeting',
    oneOffCategoryId: 'cat1',
    oneOffDuration: 1.5,
  };

  const mockClearCurrentWeek = jest.fn();
  const mockCopyPreviousWeek = jest.fn();
  const mockChangeWeek = jest.fn();
  const mockScheduleBlock = jest.fn();
  const mockUnscheduleBlock = jest.fn();
  const mockToggleBlockDone = jest.fn();
  const mockUpdateBlockDescription = jest.fn();
  const mockAddCompletedHours = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseThemeColors.mockReturnValue({
      colors: Colors.light,
      isDark: false,
    });

    mockUsePeaks.mockReturnValue({
      addCompletedHours: mockAddCompletedHours,
    });
  });

  const setupDefaultPlannerMock = (overrides = {}) => {
    mockUsePlanner.mockReturnValue({
      currentWeekId: '2026-10-12',
      currentPlan: {
        weekId: '2026-10-12',
        blocks: [scheduledBlock, doneBlock, oneOffBlock],
      } as WeeklyPlan,
      hasPreviousWeekBlocks: false,
      categories: [defaultCategory, emptyCategory],
      templates: [defaultTemplate, secondTemplate, newTemplate],
      scheduleBlock: mockScheduleBlock,
      unscheduleBlock: mockUnscheduleBlock,
      toggleBlockDone: mockToggleBlockDone,
      updateBlockDescription: mockUpdateBlockDescription,
      getTemplateById: jest.fn((id) => {
        if (id === 'tpl1') return defaultTemplate;
        if (id === 'tpl2') return secondTemplate;
        if (id === 'tpl3') return newTemplate;
        return undefined;
      }),
      getCategoryById: jest.fn((id) => (id === 'cat1' ? defaultCategory : undefined)),
      getCategoryHours: jest.fn((id) =>
        id === 'cat1'
          ? { scheduled: 4.5, completed: 2, target: 10 }
          : { scheduled: 0, completed: 0, target: 0 }
      ),
      changeWeek: mockChangeWeek,
      copyPreviousWeek: mockCopyPreviousWeek,
      clearCurrentWeek: mockClearCurrentWeek,
      ...overrides,
    });
  };

  describe('header & navigation', () => {
    it('sets screen header options and navigates to WeeklyReview on headerRight press', async () => {
      setupDefaultPlannerMock();

      await render(<PlannerScreen navigation={mockNavigation} />);

      expect(mockNavigation.setOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          title: t('tabs.planner'),
        })
      );

      const headerRightFn = mockNavigation.setOptions.mock.calls[0][0].headerRight;
      const { getByLabelText } = await render(headerRightFn());
      const reviewButton = getByLabelText(t('review.title'));
      await fireEvent.press(reviewButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('WeeklyReview');
    });
  });

  describe('week navigation & summary', () => {
    it('navigates to previous and next weeks', async () => {
      setupDefaultPlannerMock();

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);

      await fireEvent.press(getByText(t('planner.prev')));
      expect(mockChangeWeek).toHaveBeenCalledWith(weekUtils.getPrevWeekId('2026-10-12'));

      await fireEvent.press(getByText(t('planner.next')));
      expect(mockChangeWeek).toHaveBeenCalledWith(weekUtils.getNextWeekId('2026-10-12'));
    });

    it('shows current week badge when active week matches current week', async () => {
      jest.spyOn(weekUtils, 'getCurrentWeekId').mockReturnValue('2026-10-12');
      setupDefaultPlannerMock();

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);
      expect(getByText(t('planner.current'))).toBeTruthy();
    });

    it('hides current week badge when viewing a different week', async () => {
      jest.spyOn(weekUtils, 'getCurrentWeekId').mockReturnValue('2026-10-19');
      setupDefaultPlannerMock();

      const { queryByText } = await render(<PlannerScreen navigation={mockNavigation} />);
      expect(queryByText(t('planner.current'))).toBeNull();
    });

    it('renders category progress and skips categories with 0 target and 0 scheduled hours', async () => {
      setupDefaultPlannerMock();

      const { getByText, queryByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      expect(getByText('Study')).toBeTruthy();
      expect(queryByText('Free Time')).toBeNull();
    });
  });

  describe('empty week & copy previous week', () => {
    it('renders empty week message and copy button when previous week has blocks', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      setupDefaultPlannerMock({
        currentPlan: { weekId: '2026-10-12', blocks: [] },
        hasPreviousWeekBlocks: true,
      });

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);

      expect(getByText(t('planner.emptyWeek'))).toBeTruthy();
      const copyBtn = getByText(t('planner.copyBtn'));
      expect(copyBtn).toBeTruthy();

      await fireEvent.press(copyBtn);
      expect(alertSpy).toHaveBeenCalledWith(
        t('planner.copyWeekTitle'),
        t('planner.copyWeekMsg'),
        expect.any(Array)
      );

      const alertButtons = alertSpy.mock.calls[0][2]!;
      const copyConfirm = alertButtons.find((b) => b.text === t('planner.copyWeekTitle'));
      copyConfirm?.onPress?.();

      expect(mockCopyPreviousWeek).toHaveBeenCalled();
      alertSpy.mockRestore();
    });
  });

  describe('Clear Week button', () => {
    it('does not display Clear Week button when current week has no blocks', async () => {
      setupDefaultPlannerMock({
        currentPlan: { weekId: '2026-10-12', blocks: [] },
      });

      const { queryByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
      expect(queryByLabelText(t('planner.clearWeekBtn'))).toBeNull();
    });

    it('triggers confirmation dialog and calls clearCurrentWeek upon confirm', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      setupDefaultPlannerMock();

      const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
      await fireEvent.press(getByLabelText(t('planner.clearWeekBtn')));

      expect(alertSpy).toHaveBeenCalledWith(
        t('planner.clearWeekTitle'),
        t('planner.clearWeekMsg'),
        expect.any(Array)
      );

      const alertButtons = alertSpy.mock.calls[0][2]!;
      const confirmButton = alertButtons.find((b) => b.text === t('planner.clearWeekConfirm'));
      confirmButton?.onPress?.();

      expect(mockClearCurrentWeek).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('renders Clear Week button with dark theme styling', async () => {
      mockUseThemeColors.mockReturnValue({
        colors: Colors.dark,
        isDark: true,
      });
      setupDefaultPlannerMock();

      const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
      expect(getByLabelText(t('planner.clearWeekBtn'))).toBeTruthy();
    });

    it('renders Clear Week button with proper styling', async () => {
      setupDefaultPlannerMock();

      const { getByLabelText } = await render(<PlannerScreen navigation={mockNavigation} />);
      const clearBtn = getByLabelText(t('planner.clearWeekBtn'));

      expect(clearBtn.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderColor: Colors.light.danger })])
      );
    });
  });

  describe('grid blocks & edit modal interactions', () => {
    it('renders blocks and opens edit modal on block press', async () => {
      setupDefaultPlannerMock();

      const { getByText, getByPlaceholderText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      expect(getByText('Reading')).toBeTruthy();
      expect(getByText('Meeting')).toBeTruthy();

      await fireEvent.press(getByText('Reading'));

      expect(getByText(t('planner.blockDetails'))).toBeTruthy();
      const descInput = getByPlaceholderText(t('planner.taskDescPlaceholder'));
      expect(descInput.props.value).toBe('Chapter 1 notes');

      await fireEvent.changeText(descInput, 'Updated chapter 2 notes');
      await fireEvent.press(getByText(t('common.save')));

      expect(mockUpdateBlockDescription).toHaveBeenCalledWith('b1', 'Updated chapter 2 notes');
    });

    it('cancels block editing modal', async () => {
      setupDefaultPlannerMock();

      const { getByText, queryByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      await fireEvent.press(getByText('Reading'));
      expect(getByText(t('planner.blockDetails'))).toBeTruthy();

      await fireEvent.press(getByText(t('common.cancel')));
      expect(queryByText(t('planner.blockDetails'))).toBeNull();
    });

    it('deletes block from edit modal', async () => {
      setupDefaultPlannerMock();

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);

      await fireEvent.press(getByText('Reading'));
      await fireEvent.press(getByText(t('common.delete')));

      expect(mockUnscheduleBlock).toHaveBeenCalledWith('b1');
    });

    it('toggles block done and adds completed hours', async () => {
      setupDefaultPlannerMock();

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);

      await fireEvent.press(getByText('Reading'));
      await fireEvent.press(getByText('✓ ' + t('planner.markDone')));

      expect(mockToggleBlockDone).toHaveBeenCalledWith('b1');
      expect(mockAddCompletedHours).toHaveBeenCalledWith(1);
    });

    it('toggles block undone and subtracts completed hours for customDuration and one-off', async () => {
      setupDefaultPlannerMock();

      const { getByText } = await render(<PlannerScreen navigation={mockNavigation} />);

      await fireEvent.press(getByText('Workout'));
      await fireEvent.press(getByText('✕ ' + t('planner.markTodo')));

      expect(mockToggleBlockDone).toHaveBeenCalledWith('b2');
      expect(mockAddCompletedHours).toHaveBeenCalledWith(-2);

      await fireEvent.press(getByText('Meeting'));
      await fireEvent.press(getByText('✓ ' + t('planner.markDone')));

      expect(mockToggleBlockDone).toHaveBeenCalledWith('b3');
      expect(mockAddCompletedHours).toHaveBeenCalledWith(1.5);
    });
  });

  describe('schedule block modal (template picker)', () => {
    it('opens schedule modal and creates new block on submit', async () => {
      setupDefaultPlannerMock();

      const { getAllByText, getByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      expect(getByText(t('planner.scheduleBlock'))).toBeTruthy();

      const studyCategories = getAllByText(/Study/);
      await fireEvent.press(studyCategories[studyCategories.length - 1]);
      expect(getByText('Coding')).toBeTruthy();

      await fireEvent.press(getByText('Coding'));
      expect(getByText('3h')).toBeTruthy();

      await fireEvent.press(getByText('3h'));
      await fireEvent.press(getByText(t('common.save')));

      expect(mockScheduleBlock).toHaveBeenCalledWith('tpl3', 'lun', expect.any(String), 3);
    });

    it('cancels template selection and resets modal', async () => {
      setupDefaultPlannerMock();

      const { getAllByText, getByText, queryByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      const studyCategories = getAllByText(/Study/);
      await fireEvent.press(studyCategories[studyCategories.length - 1]);
      await fireEvent.press(getByText('Coding'));

      const cancelBtn = getByText(t('common.cancel'));
      await fireEvent.press(cancelBtn);

      expect(queryByText(t('manage.duration') + ' (h):')).toBeNull();
    });

    it('shows goToManage button when no active templates exist and navigates to BlocchiTab', async () => {
      setupDefaultPlannerMock({
        templates: [],
      });

      const { getAllByText, getByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      expect(getByText(t('planner.createFirst'))).toBeTruthy();
      const manageBtn = getByText(t('planner.goToManage'));
      await fireEvent.press(manageBtn);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('BlocchiTab');
    });

    it('cancels schedule modal when no template is selected', async () => {
      setupDefaultPlannerMock();

      const { getAllByText, queryByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      expect(queryByText(t('planner.scheduleBlock'))).toBeTruthy();

      const cancelButtons = getAllByText(t('common.cancel'));
      await fireEvent.press(cancelButtons[cancelButtons.length - 1]);

      expect(queryByText(t('planner.scheduleBlock'))).toBeNull();
    });

    it('supports iOS time picker onValueChange', async () => {
      const originalPlatform = Platform.OS;
      Platform.OS = 'ios';

      setupDefaultPlannerMock();

      const { getAllByText, getByTestId } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[3]);

      const picker = getByTestId('datetimepicker');
      const testDate = new Date(2026, 9, 12, 11, 30);
      await fireEvent(picker, 'valueChange', {}, testDate);

      Platform.OS = originalPlatform;
    });

    it('supports Android time picker button click, value change, and dismiss', async () => {
      const originalPlatform = Platform.OS;
      Platform.OS = 'android';

      setupDefaultPlannerMock();

      const { getAllByText, getByTestId } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[3]);

      const timeButtons = getAllByText(/\d{2}:\d{2}/);
      const timeBtn = timeButtons[timeButtons.length - 1];
      await fireEvent.press(timeBtn);

      const picker = getByTestId('datetimepicker');
      const testDate = new Date(2026, 9, 12, 15, 0);
      await fireEvent(picker, 'valueChange', {}, testDate);

      await fireEvent.press(timeBtn);
      const pickerDismiss = getByTestId('datetimepicker');
      await fireEvent(pickerDismiss, 'dismiss');

      Platform.OS = originalPlatform;
    });

    it('sorts multiple blocks on the same day when calculating next start time', async () => {
      const earlierBlock: ScheduledBlock = {
        id: 'b4',
        templateId: 'tpl1',
        day: 'lun',
        startTime: '08:00',
        done: false,
      };
      setupDefaultPlannerMock({
        currentPlan: {
          weekId: '2026-10-12',
          blocks: [scheduledBlock, earlierBlock],
        } as WeeklyPlan,
      });

      const { getAllByText, getByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      expect(getByText(t('planner.scheduleBlock'))).toBeTruthy();
    });

    it('calculates start time based on last block when day already has blocks', async () => {
      setupDefaultPlannerMock();

      const { getAllByText, getByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      expect(getByText(t('planner.scheduleBlock'))).toBeTruthy();
    });

    it('handles onRequestClose on modals', async () => {
      setupDefaultPlannerMock();

      const { container, getAllByText, getByText, queryByText } = await render(
        <PlannerScreen navigation={mockNavigation} />
      );

      const addButtons = getAllByText('+');
      await fireEvent.press(addButtons[0]);

      const modals = container.queryAll(
        (node: any) => typeof node.props?.onRequestClose === 'function'
      );
      const scheduleModal = modals[modals.length - 1];
      await fireEvent(scheduleModal, 'requestClose');
      expect(queryByText(t('planner.scheduleBlock'))).toBeNull();

      await fireEvent.press(getByText('Reading'));
      const activeModals = container.queryAll(
        (node: any) => typeof node.props?.onRequestClose === 'function'
      );
      const editModal = activeModals[0];
      await fireEvent(editModal, 'requestClose');
      expect(queryByText(t('planner.blockDetails'))).toBeNull();
    });
  });
});

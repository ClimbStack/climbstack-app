import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WeekHeader from '../WeekHeader';
import { useThemeColors } from '../../../utils/useThemeColors';
import { useLocale } from '../../../store/LocaleContext';
import { Colors } from '../../../utils/theme';
import { t } from '../../../utils/i18n';
import { getNextWeekId, getPrevWeekId } from '../../../types/weekUtils';

jest.mock('../../../utils/useThemeColors', () => ({
  useThemeColors: jest.fn(),
}));

jest.mock('../../../store/LocaleContext', () => ({
  useLocale: jest.fn(),
}));

const mockUseThemeColors = useThemeColors as jest.Mock;
const mockUseLocale = useLocale as jest.Mock;

describe('weeklyReview/WeekHeader', () => {
  const mockOnChangeWeek = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeColors.mockReturnValue({ colors: Colors.light, isDark: false });
    mockUseLocale.mockReturnValue({ locale: 'en', isReloading: false, changeLocale: jest.fn() });
  });

  it('calls onChangeWeek with previous week when prev button is pressed', async () => {
    const { getByLabelText } = await render(
      <WeekHeader
        weekId="2026-10-05"
        phase="current"
        isLoading={false}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    await fireEvent.press(getByLabelText(t('review.prevWeek')));

    expect(mockOnChangeWeek).toHaveBeenCalledWith(getPrevWeekId('2026-10-05'));
  });

  it('calls onChangeWeek with next week when next button is pressed', async () => {
    const { getByLabelText } = await render(
      <WeekHeader
        weekId="2026-10-05"
        phase="current"
        isLoading={false}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    await fireEvent.press(getByLabelText(t('review.nextWeek')));

    expect(mockOnChangeWeek).toHaveBeenCalledWith(getNextWeekId('2026-10-05'));
  });

  it('does not fire onChangeWeek when buttons are disabled during loading', async () => {
    const { getByLabelText } = await render(
      <WeekHeader
        weekId="2026-10-05"
        phase="current"
        isLoading={true}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    await fireEvent.press(getByLabelText(t('review.prevWeek')));
    await fireEvent.press(getByLabelText(t('review.nextWeek')));

    expect(mockOnChangeWeek).not.toHaveBeenCalled();
  });

  it('shows current week pill when phase is current', async () => {
    const { getByText } = await render(
      <WeekHeader
        weekId="2026-10-05"
        phase="current"
        isLoading={false}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    expect(getByText(t('review.currentWeek'))).toBeTruthy();
  });

  it('does not show current week pill for past phase', async () => {
    const { queryByText } = await render(
      <WeekHeader
        weekId="2026-09-28"
        phase="past"
        isLoading={false}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    expect(queryByText(t('review.currentWeek'))).toBeNull();
  });

  it('does not show current week pill for upcoming phase', async () => {
    const { queryByText } = await render(
      <WeekHeader
        weekId="2026-10-12"
        phase="upcoming"
        isLoading={false}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    expect(queryByText(t('review.currentWeek'))).toBeNull();
  });

  it('marks nav buttons with disabled accessibility state when loading', async () => {
    const { getByLabelText } = await render(
      <WeekHeader
        weekId="2026-10-05"
        phase="current"
        isLoading={true}
        onChangeWeek={mockOnChangeWeek}
      />
    );

    const prevBtn = getByLabelText(t('review.prevWeek'));
    const nextBtn = getByLabelText(t('review.nextWeek'));

    expect(prevBtn.props.accessibilityState.disabled).toBe(true);
    expect(nextBtn.props.accessibilityState.disabled).toBe(true);
  });
});

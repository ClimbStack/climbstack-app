import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import AchievementCelebration from '../AchievementCelebration';
import { useAchievements } from '../../store/AchievementsContext';
import { t } from '../../utils/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../store/AchievementsContext', () => ({ useAchievements: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

describe('achievement celebration', () => {
  const dismiss = jest.fn();
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    (useAchievements as jest.Mock).mockReturnValue({
      pending: ['firstBlock'],
      dismissCelebration: dismiss,
    });
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('does not announce anything when no reward was just earned', async () => {
    (useAchievements as jest.Mock).mockReturnValue({ pending: [], dismissCelebration: dismiss });
    const view = await render(<AchievementCelebration />);
    expect(view.toJSON()).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('shows the first reward and allows immediate dismissal', async () => {
    (useAchievements as jest.Mock).mockReturnValue({
      pending: ['firstBlock', 'firstSummit'],
      dismissCelebration: dismiss,
    });
    const view = await render(<AchievementCelebration />);
    expect(view.getByText(t('achievements.names.firstBlock'))).toBeTruthy();
    expect(view.queryByText(t('achievements.names.firstSummit'))).toBeNull();
    await fireEvent.press(view.getByRole('button'));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses automatically after the display interval with reduced motion enabled', async () => {
    await render(<AchievementCelebration />);
    await act(async () => {
      jest.advanceTimersByTime(3999);
    });
    expect(dismiss).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer for the next reward and cancels it on unmount', async () => {
    const view = await render(<AchievementCelebration />);
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    (useAchievements as jest.Mock).mockReturnValue({
      pending: ['firstSummit'],
      dismissCelebration: dismiss,
    });
    await view.rerender(<AchievementCelebration />);
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(dismiss).not.toHaveBeenCalled();
    expect(view.getByText(t('achievements.names.firstSummit'))).toBeTruthy();
    await view.unmount();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('shows and dismisses the reward when motion is enabled', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(false);
    const view = await render(<AchievementCelebration />);
    expect(view.getByText(t('achievements.names.firstBlock'))).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('ignores an accessibility response that arrives after the banner unmounts', async () => {
    let respond!: (value: boolean) => void;
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockReturnValue(
      new Promise<boolean>((resolve) => {
        respond = resolve;
      })
    );
    const view = await render(<AchievementCelebration />);
    await view.unmount();
    await act(async () => {
      respond(false);
      jest.advanceTimersByTime(5000);
    });
    expect(dismiss).not.toHaveBeenCalled();
  });
});

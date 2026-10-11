import { renderHook } from '@testing-library/react-native';
import useRestorePlannerWeek from '../useRestorePlannerWeek';

describe('useRestorePlannerWeek', () => {
  it('does not call changeWeek on unmount when weekId never changed', async () => {
    const changeWeek = jest.fn();

    const { unmount } = await renderHook(() => useRestorePlannerWeek('2026-10-05', changeWeek));

    await unmount();

    expect(changeWeek).not.toHaveBeenCalled();
  });

  it('calls changeWeek with initial weekId on unmount when weekId changed', async () => {
    const changeWeek = jest.fn();

    const { rerender, unmount } = await renderHook<void, { weekId: string }>(
      ({ weekId }) => useRestorePlannerWeek(weekId, changeWeek),
      { initialProps: { weekId: '2026-10-05' } }
    );

    await rerender({ weekId: '2026-09-28' });

    await unmount();

    expect(changeWeek).toHaveBeenCalledWith('2026-10-05');
  });

  it('restores the first weekId even after multiple changes', async () => {
    const changeWeek = jest.fn();

    const { rerender, unmount } = await renderHook<void, { weekId: string }>(
      ({ weekId }) => useRestorePlannerWeek(weekId, changeWeek),
      { initialProps: { weekId: '2026-10-05' } }
    );

    await rerender({ weekId: '2026-09-28' });
    await rerender({ weekId: '2026-09-21' });

    await unmount();

    expect(changeWeek).toHaveBeenCalledTimes(1);
    expect(changeWeek).toHaveBeenCalledWith('2026-10-05');
  });

  it('does not call changeWeek if weekId reverts to the initial value before unmount', async () => {
    const changeWeek = jest.fn();

    const { rerender, unmount } = await renderHook<void, { weekId: string }>(
      ({ weekId }) => useRestorePlannerWeek(weekId, changeWeek),
      { initialProps: { weekId: '2026-10-05' } }
    );

    await rerender({ weekId: '2026-09-28' });
    await rerender({ weekId: '2026-10-05' });

    await unmount();

    expect(changeWeek).not.toHaveBeenCalled();
  });
});

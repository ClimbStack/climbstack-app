import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import { useThemeColors } from '../useThemeColors';
import { ThemeProvider } from '../../store/ThemeContext';
import { Colors } from '../theme';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

describe('useThemeColors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  it('falls back to system light scheme when used outside ThemeProvider', async () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = await renderHook(() => useThemeColors());

    expect(result.current.isDark).toBe(false);
    expect(result.current.colors).toEqual(Colors.light);
    expect(result.current.themeMode).toBe('system');
    expect(typeof result.current.setThemeMode).toBe('function');
  });

  it('falls back to system dark scheme when used outside ThemeProvider', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useThemeColors());

    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toEqual(Colors.dark);
    expect(result.current.themeMode).toBe('system');
  });

  it('uses ThemeContext values when wrapped in ThemeProvider', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ThemeProvider>{children}</ThemeProvider>
    );

    const { result } = await renderHook(() => useThemeColors(), { wrapper });

    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors).toEqual(Colors.light);
  });
});

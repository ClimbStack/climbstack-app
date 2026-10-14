import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from '../ThemeContext';
import { Colors } from '../../utils/theme';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

describe('ThemeContext', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue('light');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it('throws error when useTheme is used outside ThemeProvider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useTheme())).rejects.toThrow(
      'useTheme must be used within ThemeProvider'
    );
    consoleError.mockRestore();
  });

  it('defaults to system theme when no preference is saved', async () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors).toEqual(Colors.light);
  });

  it('respects system dark mode when themeMode is system', async () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toEqual(Colors.dark);
  });

  it('loads saved theme preference from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'dark');
    mockUseColorScheme.mockReturnValue('light');

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('dark');
    });
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toEqual(Colors.dark);
  });

  it('ignores invalid theme preference from AsyncStorage', async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, 'invalid_mode');
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(result.current.themeMode).toBe('system');
    });
  });

  it('handles error when loading theme fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('Storage failure'));

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith('Errore caricamento tema:', expect.any(Error));
    });
    expect(result.current.themeMode).toBe('system');
    consoleError.mockRestore();
  });

  it('updates and persists themeMode via setThemeMode', async () => {
    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors).toEqual(Colors.dark);

    const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    expect(saved).toBe('dark');

    await act(async () => {
      await result.current.setThemeMode('light');
    });

    expect(result.current.themeMode).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors).toEqual(Colors.light);

    const savedLight = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    expect(savedLight).toBe('light');
  });

  it('handles error when saving theme fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('Save failure'));

    const { result } = await renderHook(() => useTheme(), { wrapper });

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(consoleError).toHaveBeenCalledWith('Errore salvataggio tema:', expect.any(Error));
    consoleError.mockRestore();
  });
});

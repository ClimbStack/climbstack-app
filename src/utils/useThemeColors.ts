import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from './theme';
import { ThemeContext, type ThemeMode } from '../store/ThemeContext';

export type { ThemeMode };

/** Hook che ritorna la palette corretta in base al tema selezionato o di sistema */
export function useThemeColors() {
  const context = useContext(ThemeContext);
  const scheme = useColorScheme();

  if (context) {
    return context;
  }

  const isDark = scheme === 'dark';
  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
    themeMode: 'system' as ThemeMode,
    setThemeMode: async () => {},
  };
}

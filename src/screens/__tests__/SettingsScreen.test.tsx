import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import { usePeaks } from '../../store/PeaksContext';
import { usePlanner } from '../../store/PlannerContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { useLocale } from '../../store/LocaleContext';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
  },
  documentDirectory: 'file:///test-doc-dir/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

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

describe('SettingsScreen', () => {
  const mockChangeLocale = jest.fn();
  const mockRefreshPeaks = jest.fn();
  const mockRefreshPlanner = jest.fn();
  const mockSetThemeMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseThemeColors.mockReturnValue({
      colors: Colors.light,
      isDark: false,
      themeMode: 'system',
      setThemeMode: mockSetThemeMode,
    });

    mockUseLocale.mockReturnValue({
      locale: 'en',
      changeLocale: mockChangeLocale,
    });

    mockUsePeaks.mockReturnValue({
      refreshData: mockRefreshPeaks,
    });

    mockUsePlanner.mockReturnValue({
      refreshData: mockRefreshPlanner,
    });
  });

  it('renders settings screen with sections and about info', async () => {
    const { getByText } = await render(<SettingsScreen />);

    expect(getByText(t('settings.langTitle'))).toBeTruthy();
    expect(getByText(t('settings.themeTitle'))).toBeTruthy();
    expect(getByText(t('settings.backupTitle'))).toBeTruthy();
    expect(getByText(t('settings.aboutTitle'))).toBeTruthy();
  });

  it('opens Google Play Store when pressing the review button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const { getByText } = await render(<SettingsScreen />);
    const reviewBtn = getByText(t('settings.feedbackPlayStore'));
    await fireEvent.press(reviewBtn);

    expect(openURLSpy).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.gizano.levelup'
    );
    openURLSpy.mockRestore();
  });

  it('opens GitHub repo when pressing Star on GitHub button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const { getByText } = await render(<SettingsScreen />);
    const githubBtn = getByText(t('settings.starGithub'));
    await fireEvent.press(githubBtn);

    expect(openURLSpy).toHaveBeenCalledWith('https://github.com/ClimbStack/climbstack-app');
    openURLSpy.mockRestore();
  });

  it('opens GitHub issues when pressing Submit an Issue button', async () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

    const { getByText } = await render(<SettingsScreen />);
    const issueBtn = getByText(t('settings.submitIssue'));
    await fireEvent.press(issueBtn);

    expect(openURLSpy).toHaveBeenCalledWith('https://github.com/ClimbStack/climbstack-app/issues');
    openURLSpy.mockRestore();
  });

  it('opens language modal and allows selecting a language', async () => {
    const { getByText, queryByText } = await render(<SettingsScreen />);

    const langBtn = getByText('English');
    await fireEvent.press(langBtn);

    expect(getByText('Italiano')).toBeTruthy();
    await fireEvent.press(getByText('Italiano'));

    expect(mockChangeLocale).toHaveBeenCalledWith('it');
    expect(queryByText(t('common.cancel'))).toBeNull();
  });

  it('opens theme modal and allows selecting a theme mode', async () => {
    const { getByText, queryByText } = await render(<SettingsScreen />);

    const themeTile = getByText(t('settings.themeSystem'));
    await fireEvent.press(themeTile);

    expect(getByText(t('settings.selectTheme'))).toBeTruthy();
    expect(getByText(t('settings.themeDark'))).toBeTruthy();
    expect(getByText(t('settings.themeLight'))).toBeTruthy();

    await fireEvent.press(getByText(t('settings.themeDark')));

    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
    expect(queryByText(t('settings.selectTheme'))).toBeNull();
  });

  it('opens and closes replay tutorial onboarding modal', async () => {
    const { getByText } = await render(<SettingsScreen />);

    const replayBtn = getByText(t('settings.replayTutorial'));
    await fireEvent.press(replayBtn);

    expect(getByText(t('onboarding.skip'))).toBeTruthy();
  });
});

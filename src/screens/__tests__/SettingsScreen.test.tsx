import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import SettingsScreen from '../SettingsScreen';
import { usePeaks } from '../../store/PeaksContext';
import { usePlanner } from '../../store/PlannerContext';
import { useThemeColors } from '../../utils/useThemeColors';
import { useLocale } from '../../store/LocaleContext';
import { Colors } from '../../utils/theme';
import { t } from '../../utils/i18n';
import { emptyAchievementProgress } from '../../utils/achievements';

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

jest.mock('../../store/AchievementsContext', () => ({
  useAchievements: () => ({ restoreBackup: mockRestoreBackup }),
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
const mockRestoreBackup = jest.fn((restore: () => Promise<void>) => restore());

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

  it('closes theme modal via close button', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    expect(getByTestId('theme-modal')).toBeTruthy();

    await fireEvent.press(getByTestId('theme-modal-close'));
    expect(queryByTestId('theme-modal-close')).toBeNull();
  });

  it('closes theme modal via overlay click', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    expect(getByTestId('theme-modal')).toBeTruthy();

    await fireEvent.press(getByTestId('theme-modal-overlay'));
    expect(queryByTestId('theme-modal-overlay')).toBeNull();
  });

  it('stops propagation when clicking modal content', async () => {
    const { getByText, getByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    const content = getByTestId('theme-modal-content');
    const stopPropagation = jest.fn();

    await fireEvent.press(content, { stopPropagation });
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('handles onRequestClose on theme modal', async () => {
    const { getByText, getByTestId, queryByTestId } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    const modal = getByTestId('theme-modal');

    await fireEvent(modal, 'requestClose');
    expect(queryByTestId('theme-modal-close')).toBeNull();
  });

  it('closes theme modal without calling setThemeMode if current theme is pressed', async () => {
    const { getByText, getAllByText, queryByText } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    expect(getByText(t('settings.selectTheme'))).toBeTruthy();

    const systemOptions = getAllByText(t('settings.themeSystem'));
    await fireEvent.press(systemOptions[1]);

    expect(mockSetThemeMode).not.toHaveBeenCalled();
    expect(queryByText(t('settings.selectTheme'))).toBeNull();
  });

  it('handles selecting theme when setThemeMode is undefined', async () => {
    mockUseThemeColors.mockReturnValueOnce({
      colors: Colors.light,
      isDark: false,
      themeMode: 'system',
      setThemeMode: undefined,
    });

    const { getByText, queryByText } = await render(<SettingsScreen />);

    await fireEvent.press(getByText(t('settings.themeSystem')));
    expect(getByText(t('settings.selectTheme'))).toBeTruthy();

    await fireEvent.press(getByText(t('settings.themeLight')));
    expect(queryByText(t('settings.selectTheme'))).toBeNull();
  });

  it('falls back to default theme option when themeMode is unknown or missing', async () => {
    mockUseThemeColors.mockReturnValueOnce({
      colors: Colors.light,
      isDark: false,
      themeMode: 'unknown-mode' as any,
      setThemeMode: mockSetThemeMode,
    });

    const { getByText } = await render(<SettingsScreen />);
    expect(getByText(t('settings.themeSystem'))).toBeTruthy();
  });

  it('renders correctly when themeMode and setThemeMode are not provided by useThemeColors', async () => {
    mockUseThemeColors.mockReturnValueOnce({
      colors: Colors.light,
      isDark: false,
    });

    const { getByText } = await render(<SettingsScreen />);
    expect(getByText(t('settings.themeSystem'))).toBeTruthy();
  });

  describe('restoring achievement backups', () => {
    const restoredData = {
      '@climbstack/achievements': JSON.stringify({
        ...emptyAchievementProgress(),
        unlocked: { firstBlock: '2026-11-09T12:00:00.000Z' },
      }),
      '@climbstack/peaks': '[]',
      '@climbstack/empty': null,
    };

    beforeEach(async () => {
      jest.useFakeTimers();
      await AsyncStorage.clear();
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'file:///backup.json' }],
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({ data: restoredData })
      );
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    const confirmImport = async () => {
      const view = await render(<SettingsScreen />);
      await fireEvent.press(view.getByText(t('settings.importBtn')));
      const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const confirm = buttons.find((button: { text: string }) => button.text === 'OK');
      let importing!: Promise<void>;
      await act(async () => {
        importing = confirm.onPress();
      });
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await importing;
      });
      return view;
    };

    it('replaces current and legacy app data inside the achievement restore boundary', async () => {
      await AsyncStorage.multiSet([
        ['@climbstack/achievements', 'old achievements'],
        ['@levelup/week/2026-01-05', 'old week'],
        ['other-app/preference', 'keep'],
      ]);
      await confirmImport();
      expect(mockRestoreBackup).toHaveBeenCalledTimes(1);
      expect(await AsyncStorage.getItem('@climbstack/achievements')).toBe(
        restoredData['@climbstack/achievements']
      );
      expect(await AsyncStorage.getItem('@levelup/week/2026-01-05')).toBeNull();
      expect(await AsyncStorage.getItem('other-app/preference')).toBe('keep');
      expect(await AsyncStorage.getItem('@climbstack/empty')).toBeNull();
      expect(mockRefreshPeaks).toHaveBeenCalledTimes(1);
      expect(mockRefreshPlanner).toHaveBeenCalledWith(true);
      expect(Alert.alert).toHaveBeenLastCalledWith(
        t('settings.importConfirmTitle'),
        t('settings.importSuccess')
      );
    });

    it('restores into an empty store without removing unrelated preferences', async () => {
      await AsyncStorage.setItem('other-app/preference', 'keep');
      const remove = AsyncStorage.multiRemove as jest.Mock;
      remove.mockClear();
      await confirmImport();
      expect(remove).not.toHaveBeenCalled();
      expect(await AsyncStorage.getItem('@climbstack/peaks')).toBe('[]');
      expect(await AsyncStorage.getItem('other-app/preference')).toBe('keep');
      expect(mockRefreshPlanner).toHaveBeenCalledWith(true);
    });

    it('leaves progress untouched when the file picker is cancelled', async () => {
      await AsyncStorage.setItem('@climbstack/achievements', 'existing progress');
      (DocumentPicker.getDocumentAsync as jest.Mock).mockResolvedValue({ canceled: true });
      await confirmImport();
      expect(mockRestoreBackup).not.toHaveBeenCalled();
      expect(await AsyncStorage.getItem('@climbstack/achievements')).toBe('existing progress');
      expect(mockRefreshPlanner).not.toHaveBeenCalled();
    });

    it('reports a failed restore and leaves the import control usable', async () => {
      mockRestoreBackup.mockRejectedValueOnce(new Error('Restore failed'));
      const view = await confirmImport();
      expect(Alert.alert).toHaveBeenLastCalledWith(
        t('settings.exportErrorTitle'),
        expect.stringContaining('Restore failed')
      );
      expect(mockRefreshPlanner).not.toHaveBeenCalled();
      expect(view.getByText(t('settings.importBtn'))).toBeTruthy();
    });
  });

  it('opens and closes replay tutorial onboarding modal', async () => {
    const { getByText, queryByText } = await render(<SettingsScreen />);

    const replayBtn = getByText(t('settings.replayTutorial'));
    await fireEvent.press(replayBtn);

    const skipBtn = getByText(t('onboarding.skip'));
    expect(skipBtn).toBeTruthy();

    await fireEvent.press(skipBtn);
    expect(queryByText(t('onboarding.skip'))).toBeNull();
  });
});

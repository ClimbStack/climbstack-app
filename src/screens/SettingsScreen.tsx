import React, { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors, type ThemeMode } from '../utils/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '../utils/theme';
import { t, SUPPORTED_LANGUAGES, getSupportedLocale } from '../utils/i18n';
import { useLocale } from '../store/LocaleContext';
import { usePeaks } from '../store/PeaksContext';
import { usePlanner } from '../store/PlannerContext';
import OnboardingModal from '../components/OnboardingModal';

interface ThemeOption {
  mode: ThemeMode;
  labelKey: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const THEME_OPTIONS: ThemeOption[] = [
  { mode: 'system', labelKey: 'settings.themeSystem', icon: 'theme-light-dark' },
  { mode: 'light', labelKey: 'settings.themeLight', icon: 'white-balance-sunny' },
  { mode: 'dark', labelKey: 'settings.themeDark', icon: 'weather-night' },
];

export default function SettingsScreen() {
  const { colors, themeMode = 'system', setThemeMode } = useThemeColors();
  const [isImporting, setIsImporting] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const { locale, changeLocale } = useLocale();
  const { refreshData: refreshPeaks } = usePeaks();
  const { refreshData: refreshPlanner } = usePlanner();
  const activeLang = getSupportedLocale(locale);
  const currentLanguageItem =
    SUPPORTED_LANGUAGES.find((item) => item.code === activeLang) ?? SUPPORTED_LANGUAGES[0];
  const currentThemeOption =
    THEME_OPTIONS.find((opt) => opt.mode === themeMode) ?? THEME_OPTIONS[0];
  const currentThemeLabel = t(currentThemeOption.labelKey);

  const changeLanguage = async (lang: string) => {
    await changeLocale(lang);
  };

  const exportBackup = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const appKeys = keys.filter((k) => k.startsWith('@climbstack/') || k.startsWith('@levelup/'));
      const pairs = await AsyncStorage.multiGet(appKeys);
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: Object.fromEntries(pairs),
      };

      const jsonStr = JSON.stringify(backupData, null, 2);

      if (Platform.OS === 'android') {
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const uri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            'climbstack_backup.json',
            'application/json'
          );
          await FileSystem.writeAsStringAsync(uri, jsonStr, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          Alert.alert(t('settings.exportSuccessTitle'), t('settings.exportSuccessMsg'));
          return;
        }
      }

      // Fallback to sharing for iOS or if user cancels SAF on Android
      const fileUri = FileSystem.documentDirectory + 'climbstack_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'ClimbStack Backup',
      });
    } catch {
      Alert.alert(t('settings.exportErrorTitle'), t('settings.exportErrorMsg'));
    }
  };

  const importBackup = async () => {
    Alert.alert(t('settings.importConfirmTitle'), t('settings.importConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: 'OK',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await DocumentPicker.getDocumentAsync({
              type: ['application/json', 'text/plain', '*/*'],
            });
            if (res.canceled || !res.assets || res.assets.length === 0) return;
            setIsImporting(true);
            await new Promise((r) => setTimeout(r, 1000));
            const fileUri = res.assets[0].uri;
            let fileContent = '';
            try {
              fileContent = await FileSystem.readAsStringAsync(fileUri);
            } catch {
              const response = await fetch(fileUri);
              fileContent = await response.text();
            }
            const backupData = JSON.parse(fileContent);

            if (backupData && backupData.data) {
              const entries = Object.entries(backupData.data).filter(([_, v]) => v !== null) as [
                string,
                string,
              ][];

              const allKeys = await AsyncStorage.getAllKeys();
              const appKeys = allKeys.filter(
                (k) => k.startsWith('@climbstack/') || k.startsWith('@levelup/')
              );
              if (appKeys.length > 0) {
                await AsyncStorage.multiRemove(appKeys);
              }

              await AsyncStorage.multiSet(entries);
              await refreshPeaks();
              await refreshPlanner();
              Alert.alert(
                t('settings.importConfirmTitle'),
                t('settings.importSuccess') || 'Import successful!'
              );
            } else {
              throw new Error('Invalid format');
            }
          } catch (e) {
            Alert.alert(
              t('settings.exportErrorTitle'),
              (t('settings.importError') || 'Failed to import data') + ': ' + String(e)
            );
          } finally {
            setIsImporting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
            <MaterialCommunityIcons
              name="translate"
              size={24}
              color={colors.primary}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
              {t('settings.langTitle')}
            </Text>
          </View>
          <Pressable
            style={[
              styles.languageTile,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
            onPress={() => setShowLanguageModal(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('settings.langTitle')}: ${currentLanguageItem.label}`}
          >
            <Text style={[styles.languageTileLabel, { color: colors.text }]}>
              {currentLanguageItem.label}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: Spacing.xl },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
            <MaterialCommunityIcons
              name="theme-light-dark"
              size={24}
              color={colors.primary}
              style={{ marginRight: Spacing.sm }}
            />
            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
              {t('settings.themeTitle')}
            </Text>
          </View>
          <Pressable
            style={[
              styles.languageTile,
              { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
            ]}
            onPress={() => setShowThemeModal(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('settings.themeTitle')}: ${currentThemeLabel}`}
          >
            <Text style={[styles.languageTileLabel, { color: colors.text }]}>
              {currentThemeLabel}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: Spacing.xl },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons
              name="content-save-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
              {t('settings.backupTitle')}
            </Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('settings.backupDesc')}
          </Text>
          <Pressable
            style={[styles.linkBtn, { backgroundColor: colors.surfaceAlt, marginTop: Spacing.md }]}
            onPress={exportBackup}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="export"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={[{ fontWeight: 'bold' }, { color: colors.text }]}>
                {t('settings.exportBtn')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={[
              styles.linkBtn,
              {
                backgroundColor: colors.surfaceAlt,
                marginTop: Spacing.sm,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
            onPress={importBackup}
            disabled={isImporting}
          >
            {isImporting ? (
              <ActivityIndicator color={colors.primary} style={{ marginRight: 8 }} />
            ) : null}
            {isImporting ? (
              <Text style={[{ fontWeight: 'bold' }, { color: colors.text }]}>
                {t('settings.importing')}
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="import"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[{ fontWeight: 'bold' }, { color: colors.text }]}>
                  {t('settings.importBtn')}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border, marginTop: Spacing.xl },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color={colors.primary}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>
              {t('settings.aboutTitle')}
            </Text>
          </View>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('settings.aboutDesc1')}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
            {t('settings.aboutDesc2')}
          </Text>

          <Pressable
            style={[styles.linkBtn, { backgroundColor: colors.surfaceAlt }]}
            onPress={() => Linking.openURL('https://github.com/ClimbStack/climbstack-app')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="github"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {t('settings.starGithub')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.linkBtn, { backgroundColor: colors.surfaceAlt, marginTop: Spacing.sm }]}
            onPress={() => Linking.openURL('https://github.com/ClimbStack/climbstack-app/issues')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="bug"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {t('settings.submitIssue')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.linkBtn, { backgroundColor: colors.surfaceAlt, marginTop: Spacing.sm }]}
            onPress={() =>
              Linking.openURL('https://play.google.com/store/apps/details?id=com.gizano.levelup')
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="google-play"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {t('settings.feedbackPlayStore')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.linkBtn, { backgroundColor: colors.surfaceAlt, marginTop: Spacing.sm }]}
            onPress={() => setShowOnboarding(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name="presentation-play"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                {t('settings.replayTutorial')}
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('settings.selectLanguage')}
              </Text>
              <Pressable
                onPress={() => setShowLanguageModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.languagesList}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = activeLang === lang.code;
                return (
                  <Pressable
                    key={lang.code}
                    style={[
                      styles.langOption,
                      {
                        backgroundColor: isSelected ? colors.surfaceAlt : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={async () => {
                      setShowLanguageModal(false);
                      if (!isSelected) {
                        await changeLanguage(lang.code);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        {
                          color: isSelected ? colors.primary : colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {lang.label}
                    </Text>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
        testID="theme-modal"
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowThemeModal(false)}
          testID="theme-modal-overlay"
        >
          <Pressable
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
            testID="theme-modal-content"
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('settings.selectTheme')}
              </Text>
              <Pressable
                onPress={() => setShowThemeModal(false)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                testID="theme-modal-close"
              >
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.languagesList}>
              {THEME_OPTIONS.map((opt) => {
                const isSelected = themeMode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    style={[
                      styles.langOption,
                      {
                        backgroundColor: isSelected ? colors.surfaceAlt : 'transparent',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={async () => {
                      setShowThemeModal(false);
                      if (!isSelected && setThemeMode) {
                        await setThemeMode(opt.mode);
                      }
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons
                        name={opt.icon}
                        size={20}
                        color={isSelected ? colors.primary : colors.textSecondary}
                        style={{ marginRight: Spacing.sm }}
                      />
                      <Text
                        style={[
                          styles.langOptionText,
                          {
                            color: isSelected ? colors.primary : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {t(opt.labelKey)}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <OnboardingModal visible={showOnboarding} onDismiss={() => setShowOnboarding(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md },
  card: { padding: Spacing.lg, borderRadius: BorderRadius.md, borderWidth: 1 },
  title: { fontSize: FontSize.lg, fontWeight: 'bold', marginBottom: Spacing.md },
  body: { fontSize: FontSize.md, lineHeight: 22 },
  languageTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  languageTileLabel: { fontSize: FontSize.md, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  languagesList: {
    gap: Spacing.sm,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  langOptionText: {
    fontSize: FontSize.md,
  },
  linkBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
});

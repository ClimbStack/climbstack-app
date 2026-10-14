import { MaterialCommunityIcons } from '@expo/vector-icons';
import { t } from '../utils/i18n';
import React, { useLayoutEffect, useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useThemeColors } from '../utils/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '../utils/theme';
import { usePeaks } from '../store/PeaksContext';
import { peakProgress, isPeakComplete } from '../utils/stats';
import CampItem from '../components/CampItem';
import MountainSvg from '../components/MountainSvg';
import type { RootStackParamList } from '../types/navigation';
import { formatCompletionDate } from '../utils/date';
import { useLocale } from '../store/LocaleContext';

type PeakDetailProps = NativeStackScreenProps<RootStackParamList, 'PeakDetail'>;

export default function PeakDetailScreen({ navigation, route }: PeakDetailProps) {
  const { peakId } = route.params;
  const { colors } = useThemeColors();
  const { locale } = useLocale();
  const { peaks, addCamp, toggleCamp, deleteCamp, deletePeak, editCamp } = usePeaks();

  const [campName, setCampName] = useState('');
  const [editingCampId, setEditingCampId] = useState<string | null>(null);

  const peak = peaks.find((p) => p.id === peakId);

  const handleDeletePeak = useCallback(() => {
    Alert.alert(t('peakDetail.deleteTitle'), `${t('peakDetail.deleteMsg')} (${peak?.name})`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          deletePeak(peakId);
          navigation.goBack();
        },
      },
    ]);
  }, [peak?.name, peakId, navigation, deletePeak]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: peak?.name ?? t('peakDetail.peak'),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable onPress={handleDeletePeak} hitSlop={8}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={colors.danger} />
        </Pressable>
      ),
    });
  }, [navigation, colors, peak?.name, handleDeletePeak]);

  if (!peak) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontSize: FontSize.md }}>
          {t('peakDetail.notFound')}
        </Text>
      </View>
    );
  }

  const progress = peakProgress(peak);
  const complete = isPeakComplete(peak);
  const totalCamps = peak.camps.length;
  const doneCamps = peak.camps.filter((c) => c.done).length;
  const pct = totalCamps > 0 ? Math.round((doneCamps / totalCamps) * 100) : 0;
  const completedDate = complete ? formatCompletionDate(peak.completedAt, locale) : null;

  const handleSaveCamp = () => {
    const trimmed = campName.trim();
    if (!trimmed) {
      if (editingCampId) {
        setEditingCampId(null);
        setCampName('');
      }
      return;
    }

    if (editingCampId) {
      editCamp(peakId, editingCampId, trimmed);
      setEditingCampId(null);
    } else {
      addCamp(peakId, trimmed);
    }
    setCampName('');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <FlatList
        data={peak.camps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.mountainWrapper}>
              <MountainSvg progress={progress} isComplete={complete} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>{peak?.name}</Text>

            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {doneCamps}/{totalCamps} {t('peakDetail.camps')} • {pct}%
            </Text>

            {complete && (
              <View
                style={[
                  styles.banner,
                  {
                    backgroundColor: colors.primary + '20',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="flag-checkered"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.bannerText, { color: colors.primary }]}>
                  {completedDate
                    ? t('peakDetail.conqueredOn', { date: completedDate })
                    : t('peakDetail.conquered')}
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <CampItem
            camp={item}
            onToggle={() => toggleCamp(peakId, item.id)}
            onDelete={() => deleteCamp(peakId, item.id)}
            onEdit={() => {
              setEditingCampId(item.id);
              setCampName(item.name);
            }}
          />
        )}
      />

      {/* Bottom input bar */}
      <View
        style={[styles.inputBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {editingCampId && (
          <Pressable
            onPress={() => {
              setEditingCampId(null);
              setCampName('');
            }}
            style={{ padding: Spacing.xs }}
          >
            <MaterialCommunityIcons name="close" size={24} color={colors.textTertiary} />
          </Pressable>
        )}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder={editingCampId ? t('common.edit') + '...' : t('peakDetail.addCamp')}
          placeholderTextColor={colors.textSecondary}
          value={campName}
          onChangeText={setCampName}
          onSubmitEditing={handleSaveCamp}
          returnKeyType="done"
        />
        <Pressable
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleSaveCamp}
        >
          <Text style={styles.addButtonText}>
            {editingCampId ? t('common.save') : t('peakDetail.add')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  mountainWrapper: {
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  progressText: {
    fontSize: FontSize.md,
    marginBottom: Spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
  },
  addButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  addButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});

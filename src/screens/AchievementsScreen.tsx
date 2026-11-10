import React, { useLayoutEffect } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { useAchievements } from '../store/AchievementsContext';
import { useLocale } from '../store/LocaleContext';
import {
  ACHIEVEMENTS,
  achievementValues,
  type AchievementMetric,
  type AchievementProgress,
} from '../utils/achievements';
import { t } from '../utils/i18n';
import { useThemeColors } from '../utils/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;
const GROUPS: AchievementMetric[] = ['altitude', 'peaks', 'blocks', 'categories', 'streak'];
const BADGE_SIZE = Spacing.xxl + Spacing.md;
const BADGE_POINTS = [
  [BADGE_SIZE / 2, Spacing.xs],
  [BADGE_SIZE - Spacing.xs, BADGE_SIZE / 4],
  [BADGE_SIZE - Spacing.xs, (BADGE_SIZE * 3) / 4],
  [BADGE_SIZE / 2, BADGE_SIZE - Spacing.xs],
  [Spacing.xs, (BADGE_SIZE * 3) / 4],
  [Spacing.xs, BADGE_SIZE / 4],
]
  .map((point) => point.join(','))
  .join(' ');

function AchievementCard({
  achievement,
  progress,
  value,
  locale,
}: {
  achievement: (typeof ACHIEVEMENTS)[number];
  progress: AchievementProgress;
  value: number;
  locale: string;
}) {
  const { colors } = useThemeColors();
  const unlockedAt = progress.unlocked[achievement.id];
  const current = unlockedAt ? achievement.target : Math.min(Math.floor(value), achievement.target);
  const status = unlockedAt
    ? t('achievements.unlockedOn', {
        date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(unlockedAt)),
      })
    : t('achievements.locked');

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: unlockedAt ? colors.accent : colors.border,
        },
      ]}
    >
      <View style={styles.badge}>
        <Svg width={BADGE_SIZE} height={BADGE_SIZE} style={StyleSheet.absoluteFill}>
          <Polygon
            points={BADGE_POINTS}
            fill={unlockedAt ? colors.accentLight : colors.surfaceAlt}
            stroke={unlockedAt ? colors.accent : colors.border}
            strokeWidth={StyleSheet.hairlineWidth}
          />
        </Svg>
        <MaterialCommunityIcons
          name={achievement.icon}
          size={FontSize.xxl}
          color={unlockedAt ? colors.accent : colors.textTertiary}
        />
      </View>
      <Text style={[styles.name, { color: colors.text }]}>
        {t(`achievements.names.${achievement.id}`)}
      </Text>
      <Text style={[styles.requirement, { color: colors.textSecondary }]}>
        {t(`achievements.requirements.${achievement.metric}`, { count: achievement.target })}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={unlockedAt ? 'check-decagram' : 'lock-outline'}
            size={FontSize.sm}
            color={unlockedAt ? colors.success : colors.textTertiary}
          />
          <Text
            style={[styles.status, { color: unlockedAt ? colors.success : colors.textSecondary }]}
          >
            {status}
          </Text>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t(`achievements.names.${achievement.id}`)}
          accessibilityValue={{ min: 0, max: achievement.target, now: current }}
          style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${(current / achievement.target) * 100}%`,
                backgroundColor: unlockedAt ? colors.accent : colors.primary,
              },
            ]}
          />
        </View>
        {!unlockedAt && (
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {t('achievements.progress', { current, target: achievement.target })}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function AchievementsScreen({ navigation }: Props) {
  const { colors } = useThemeColors();
  const { locale } = useLocale();
  const { progress, isLoading, hasError, retry } = useAchievements();
  const { width, fontScale } = useWindowDimensions();
  const columns = width - Spacing.md * 2 >= Spacing.xxl * 6 * fontScale + Spacing.sm ? 2 : 1;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('achievements.title'),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
    });
  }, [navigation, colors, locale]);

  const values = progress ? achievementValues(progress) : null;
  const unlockedCount = ACHIEVEMENTS.filter(
    (achievement) => progress?.unlocked[achievement.id]
  ).length;

  return (
    <SafeAreaView
      edges={['bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {isLoading ? (
        <ActivityIndicator
          accessible
          accessibilityRole="progressbar"
          style={styles.loading}
          color={colors.primary}
          size="large"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {hasError && (
            <View
              style={[
                styles.errorCard,
                { backgroundColor: colors.surface, borderColor: colors.danger },
              ]}
            >
              <Text style={[styles.body, { color: colors.text }]}>
                {t('achievements.storageError')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void retry()}
                style={styles.retry}
              >
                <Text style={[styles.body, { color: colors.primary }]}>
                  {t('achievements.retry')}
                </Text>
              </Pressable>
            </View>
          )}
          {progress && values && (
            <>
              <View style={[styles.summaryCard, { backgroundColor: colors.surfaceAlt }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.summary, { color: colors.text }]}>
                    {t('achievements.summary', {
                      count: unlockedCount,
                      total: ACHIEVEMENTS.length,
                    })}
                  </Text>
                  <MaterialCommunityIcons
                    name="trophy-outline"
                    size={FontSize.xl}
                    color={colors.accent}
                  />
                </View>
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  {t('achievements.description')}
                </Text>
              </View>
              {GROUPS.map((group) => {
                const achievements = ACHIEVEMENTS.filter(
                  (achievement) => achievement.metric === group
                );
                const earned = achievements.filter(
                  (achievement) => progress.unlocked[achievement.id]
                ).length;
                return (
                  <View key={group} style={styles.group}>
                    <View style={styles.sectionHeader}>
                      <Text
                        accessibilityRole="header"
                        style={[styles.heading, { color: colors.text }]}
                      >
                        {t(`achievements.groups.${group}`)}
                      </Text>
                      <Text style={[styles.groupCount, { color: colors.textSecondary }]}>
                        {t('achievements.progress', {
                          current: earned,
                          target: achievements.length,
                        })}
                      </Text>
                    </View>
                    {Array.from({ length: Math.ceil(achievements.length / columns) }, (_, row) => (
                      <View key={row} style={styles.row}>
                        {achievements
                          .slice(row * columns, (row + 1) * columns)
                          .map((achievement) => (
                            <AchievementCard
                              key={achievement.id}
                              achievement={achievement}
                              progress={progress}
                              value={values[group]}
                              locale={locale}
                            />
                          ))}
                        {columns === 2 &&
                          achievements.slice(row * columns, (row + 1) * columns).length === 1 && (
                            <View style={styles.spacer} />
                          )}
                      </View>
                    ))}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg },
  summaryCard: { padding: Spacing.md, borderRadius: BorderRadius.lg, gap: Spacing.md },
  summary: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: FontSize.lg },
  heading: { flex: 1, fontFamily: 'Outfit_700Bold', fontSize: FontSize.md },
  group: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupCount: { fontFamily: 'Outfit_500Medium', fontSize: FontSize.xs },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  spacer: { flex: 1 },
  badge: { width: BADGE_SIZE, height: BADGE_SIZE, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Outfit_700Bold', fontSize: FontSize.md, textAlign: 'center' },
  requirement: {
    fontFamily: 'Outfit_400Regular',
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: FontSize.md,
  },
  cardFooter: { alignSelf: 'stretch', marginTop: 'auto', paddingTop: Spacing.xs, gap: Spacing.sm },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  body: { fontFamily: 'Outfit_400Regular', fontSize: FontSize.sm },
  status: {
    flexShrink: 1,
    fontFamily: 'Outfit_400Regular',
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
  progressTrack: { height: Spacing.xs, borderRadius: BorderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: BorderRadius.full },
  progressLabel: { fontFamily: 'Outfit_500Medium', fontSize: FontSize.xs, textAlign: 'center' },
  errorCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retry: { paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
});

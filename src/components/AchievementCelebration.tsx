import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAchievements } from '../store/AchievementsContext';
import { t } from '../utils/i18n';
import { useThemeColors } from '../utils/useThemeColors';
import { BorderRadius, FontSize, Spacing } from '../utils/theme';

export default function AchievementCelebration() {
  const { pending, dismissCelebration } = useAchievements();
  const { colors } = useThemeColors();
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(1));
  const current = pending[0];

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled || reduceMotion) return;
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
    const timer = setTimeout(dismissCelebration, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      opacity.stopAnimation();
      opacity.setValue(1);
    };
  }, [current, dismissCelebration, opacity]);

  if (!current) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          top: insets.top + Spacing.md,
          backgroundColor: colors.surface,
          borderColor: colors.accent,
          opacity,
        },
      ]}
    >
      <Pressable
        style={styles.content}
        onPress={dismissCelebration}
        accessibilityRole="button"
        accessibilityLabel={`${t('achievements.unlocked')} ${t(`achievements.names.${current}`)}. ${t('achievements.dismiss')}`}
      >
        <MaterialCommunityIcons name="trophy-outline" size={FontSize.xxl} color={colors.accent} />
        <View style={styles.text} accessibilityLiveRegion="polite">
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('achievements.unlocked')}
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {t(`achievements.names.${current}`)}
          </Text>
        </View>
        <MaterialCommunityIcons name="close" size={FontSize.lg} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
  },
  content: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  text: { flex: 1, gap: Spacing.xs },
  label: { fontFamily: 'Outfit_400Regular', fontSize: FontSize.sm },
  name: { fontFamily: 'Outfit_700Bold', fontSize: FontSize.md },
});

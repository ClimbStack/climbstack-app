import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../utils/useThemeColors';
import { t } from '../utils/i18n';
import { Spacing, BorderRadius } from '../utils/theme';

const ICONS = [
  'star',
  'heart',
  'school',
  'bookshelf',
  'laptop',
  'chess-pawn',
  'book-open-page-variant',
  'rocket-launch',
  'controller-classic',
  'bed',
  'briefcase',
  'coffee',
  'dumbbell',
  'music',
  'palette',
  'camera',
  'airplane',
  'car',
  'bike',
  'bus',
  'walk',
  'run',
  'swim',
  'basketball',
  'soccer',
  'tennis',
  'yin-yang',
  'meditation',
  'tree',
  'flower',
  'leaf',
  'food',
  'food-apple',
  'pizza',
  'hamburger',
  'cupcake',
  'glass-wine',
  'cash',
  'chart-bar',
  'chart-line',
  'code-braces',
  'code-tags',
  'database',
  'pencil',
  'brush',
  'draw',
  'hammer',
  'wrench',
  'lightbulb',
  'flash',
  'fire',
  'water',
  'weather-sunny',
  'weather-night',
  'weather-cloudy',
  'weather-rainy',
  'earth',
  'map',
  'compass',
  'navigation',
  'home',
  'office-building',
  'store',
  'cart',
  'gift',
  'tag',
  'ticket',
  'bookmark',
  'calendar',
  'clock',
  'alarm',
  'timer',
  'bell',
  'check',
  'close',
  'plus',
  'minus',
  'information',
  'help-circle',
];

interface IconPickerProps {
  visible: boolean;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export default function IconPicker({ visible, onSelect, onClose }: IconPickerProps) {
  const { colors } = useThemeColors();
  const [search, setSearch] = useState('');

  const filteredIcons = ICONS.filter((i) => i.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t('manage.selectIcon')}</Text>

          <TextInput
            style={[
              styles.search,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={t('manage.searchIcon') || 'Search'}
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />

          <FlatList
            data={filteredIcons}
            keyExtractor={(item) => item}
            numColumns={5}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.iconCell, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => onSelect(item)}
              >
                <MaterialCommunityIcons name={item as any} size={28} color={colors.text} />
              </TouchableOpacity>
            )}
            style={styles.list}
          />

          <Pressable
            style={[styles.closeBtn, { backgroundColor: colors.background }]}
            onPress={onClose}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>
              {t('common.cancel')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    height: '70%',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  search: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  list: {
    flex: 1,
  },
  row: {
    justifyContent: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconCell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: '18%',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
});

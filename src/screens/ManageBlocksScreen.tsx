import { t } from '../utils/i18n';
import React, { useState, useLayoutEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import IconPicker from '../components/IconPicker';
import {
  LayoutAnimation,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../utils/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '../utils/theme';
import { usePlanner } from '../store/PlannerContext';
import { usePeaks } from '../store/PeaksContext';
import { scrubDeletedTemplates } from '../store/plannerStorage';
import { getCategoryDisplayName } from '../utils/categoryUtils';
import type { Category } from '../types';

const DURATION_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 8];

export default function ManageBlocksScreen({ navigation }: any) {
  const { colors } = useThemeColors();
  const {
    categories,
    templates,
    addTemplate,
    getCategoryById,
    editCategory,
    addCategory,
    archiveCategory,
    archiveTemplate,
    unarchiveCategory,
    unarchiveTemplate,
    deleteCategory,
    deleteTemplate,
  } = usePlanner();
  const { addCompletedHours } = usePeaks();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('manage.title'),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
    });
  }, [navigation, colors]);

  const [modalVisible, setModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [blockName, setBlockName] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  const [selectorModalVisible, setSelectorModalVisible] = useState(false);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [catTargetHours, setCatTargetHours] = useState('');
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('star');
  const [catColor, setCatColor] = useState('#EF4444');
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const CATEGORY_COLORS = [
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#6B7280',
  ];
  const activeCategories = categories.filter((c) => !c.isArchived);
  const activeTemplates = templates.filter((t) => !t.isArchived);
  const archivedCategories = categories.filter((c) => c.isArchived);
  const archivedTemplates = templates.filter((t) => t.isArchived);
  const totalHours = activeCategories.reduce((sum, c) => sum + c.targetHoursPerWeek, 0);

  const resetModal = () => {
    setBlockName('');
    setSelectedCategoryId(null);
    setSelectedDuration(1);
    setModalVisible(false);
  };

  const handleCreateBlock = () => {
    if (blockName.trim() && selectedCategoryId) {
      addTemplate(blockName.trim(), selectedCategoryId, selectedDuration);
      resetModal();
    }
  };

  const handleDeleteBlock = (id: string, name: string) => {
    Alert.alert(t('manage.archiveBlockTitle'), `${t('manage.archiveBlockMsg')} "${name}"?`, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('manage.archiveBtn'), style: 'destructive', onPress: () => archiveTemplate(id) },
    ]);
  };

  const openNewCategory = () => {
    setEditCatId(null);
    setCatName('');
    setCatEmoji('star');
    setCatColor('#EF4444');
    setCatTargetHours('10');
    setCatModalVisible(true);
  };

  const openEditCategory = (cat: Category) => {
    setEditCatId(cat.id);
    setCatName(getCategoryDisplayName(cat));
    setCatEmoji(cat.emoji);
    setCatColor(cat.color);
    setCatTargetHours(String(cat.targetHoursPerWeek));
    setCatModalVisible(true);
  };

  const saveCategory = () => {
    const hours = parseInt(catTargetHours, 10);
    if (!isNaN(hours)) {
      if (editCatId) {
        const existingCat = categories.find((c) => c.id === editCatId);
        const nameChanged = existingCat
          ? catName.trim() !== getCategoryDisplayName(existingCat)
          : false;

        editCategory(editCatId, {
          name: catName.trim() || undefined,
          emoji: catEmoji,
          color: catColor,
          targetHoursPerWeek: hours,
          ...(nameChanged ? { isCustomName: true } : {}),
        });
      } else if (catName.trim()) {
        addCategory(catName.trim(), catEmoji, catColor, hours);
      }
    }
    setCatModalVisible(false);
  };

  const handleUnarchiveTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      const cat = getCategoryById(template.categoryId);
      if (cat?.isArchived) {
        unarchiveCategory(cat.id);
      }
      unarchiveTemplate(templateId);
    }
  };

  const handleArchiveCategory = (id: string, name: string) => {
    Alert.alert(t('manage.archiveCategoryTitle'), `${t('manage.archiveCategoryMsg')} (${name})`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('manage.archiveBtn'),
        style: 'destructive',
        onPress: () => {
          archiveCategory(id);
          if (editCatId === id) setCatModalVisible(false);
        },
      },
    ]);
  };

  const handleHardDeleteCategory = (id: string, name: string) => {
    if (isDeleting) return;
    Alert.alert(t('manage.deleteCategoryTitle'), `${t('manage.deleteCategoryMsg')} (${name})`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            const templateIds = templates.filter((t) => t.categoryId === id).map((t) => t.id);
            const hoursToSubtract = await scrubDeletedTemplates(templateIds, templates, id);
            if (hoursToSubtract > 0) addCompletedHours(-hoursToSubtract);
            deleteCategory(id);
            if (editCatId === id) setCatModalVisible(false);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const handleHardDeleteTemplate = (id: string, name: string) => {
    if (isDeleting) return;
    Alert.alert(t('manage.deleteBlockTitlePerm'), `${t('manage.deleteBlockMsgPerm')} (${name})`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            const hoursToSubtract = await scrubDeletedTemplates([id], templates);
            if (hoursToSubtract > 0) addCompletedHours(-hoursToSubtract);
            deleteTemplate(id);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  // Group templates by category
  const templatesByCategory = activeCategories.map((c) => ({
    categoryId: c.id,
    items: activeTemplates.filter((t) => t.categoryId === c.id),
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Categories Section */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: Spacing.sm,
          }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('manage.title')}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: Spacing.xs }}>
          {t('manage.categoriesInfo')}
        </Text>
        <Text
          style={{
            color: colors.primary,
            fontSize: 13,
            fontWeight: 'bold',
            marginBottom: Spacing.md,
          }}
        >
          {t('manage.targetHoursWeekly')} {totalHours}h / 168h ({168 - totalHours}h{' '}
          {t('manage.freeHours')})
        </Text>

        {activeCategories.map((c) => (
          <View key={c.id} style={[styles.catRow, { backgroundColor: colors.surface }]}>
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
              onPress={() => openEditCategory(c)}
            >
              <MaterialCommunityIcons
                name={c.emoji as any}
                size={24}
                color={c.color}
                style={styles.catEmoji}
              />
              <Text style={[styles.catName, { color: c.color }]}>{getCategoryDisplayName(c)}</Text>
              <Text
                style={[styles.catTarget, { color: colors.textSecondary, marginRight: Spacing.sm }]}
              >
                {c.targetHoursPerWeek} {t('manage.targetHours')}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => handleArchiveCategory(c.id, c.name)}
                hitSlop={8}
                style={{ padding: Spacing.xs, marginRight: Spacing.xs }}
              >
                <MaterialCommunityIcons name="archive" size={20} color={colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => handleHardDeleteCategory(c.id, c.name)}
                hitSlop={8}
                style={{ padding: Spacing.xs }}
              >
                <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.xl }]}>
          {t('manage.activityBlocks')}
        </Text>

        {activeTemplates.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('manage.noBlocks')}
          </Text>
        )}

        {templatesByCategory.map(({ categoryId, items }) => {
          if (items.length === 0) return null;
          const cat = getCategoryById(categoryId);
          const isExpanded = expandedCategories[categoryId];
          return (
            <View key={categoryId} style={styles.group}>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: Spacing.xs,
                  paddingVertical: Spacing.xs,
                }}
                onPress={() =>
                  setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }))
                }
              >
                <Text style={[{ marginRight: 6, fontSize: 14, color: colors.textSecondary }]}>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </Text>
                <Text
                  style={[styles.groupHeader, { color: colors.textSecondary, marginBottom: 0 }]}
                >
                  <MaterialCommunityIcons
                    name={cat?.emoji as any}
                    size={16}
                    color={cat?.color ?? colors.textSecondary}
                  />{' '}
                  <Text style={{ color: cat?.color ?? colors.textSecondary }}>
                    {getCategoryDisplayName(cat) || t('categories.other')}
                  </Text>
                </Text>
              </Pressable>
              {isExpanded &&
                items.map((t) => (
                  <View key={t.id} style={[styles.blockRow, { backgroundColor: colors.surface }]}>
                    <View
                      style={[styles.blockColor, { backgroundColor: cat?.color ?? colors.primary }]}
                    />
                    <Text style={[styles.blockName, { color: colors.text }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={[styles.blockDur, { color: colors.textSecondary }]}>
                      {t.durationHours}h
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Pressable
                        onPress={() => handleDeleteBlock(t.id, t.name)}
                        hitSlop={8}
                        style={{ padding: Spacing.xs, marginRight: Spacing.xs }}
                      >
                        <MaterialCommunityIcons name="archive" size={20} color={colors.accent} />
                      </Pressable>
                      <Pressable
                        onPress={() => handleHardDeleteTemplate(t.id, t.name)}
                        hitSlop={8}
                        style={{ padding: Spacing.xs }}
                      >
                        <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
            </View>
          );
        })}

        {/* Archive Section */}
        {(archivedCategories.length > 0 || archivedTemplates.length > 0) && (
          <View style={{ marginTop: Spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <MaterialCommunityIcons
                name="archive-outline"
                size={24}
                color={colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
                {t('manage.archive') || 'Archivio'}
              </Text>
            </View>

            {archivedCategories.map((c) => (
              <View key={c.id} style={[styles.catRow, { backgroundColor: colors.surfaceAlt }]}>
                <MaterialCommunityIcons
                  name={c.emoji as any}
                  size={24}
                  color={c.color}
                  style={[styles.catEmoji, { opacity: 0.5 }]}
                />
                <Text
                  style={[
                    styles.catName,
                    { color: c.color, textDecorationLine: 'line-through', opacity: 0.5 },
                  ]}
                >
                  {getCategoryDisplayName(c)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    onPress={() => unarchiveCategory(c.id)}
                    hitSlop={8}
                    style={{ padding: Spacing.xs, marginRight: Spacing.xs }}
                  >
                    <MaterialCommunityIcons name="restore" size={20} color={colors.primary} />
                  </Pressable>
                  <Pressable
                    onPress={() => handleHardDeleteCategory(c.id, c.name)}
                    hitSlop={8}
                    style={{ padding: Spacing.xs }}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            ))}

            {archivedTemplates.map((t) => {
              const cat = getCategoryById(t.categoryId);
              return (
                <View key={t.id} style={[styles.blockRow, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.blockColor,
                      { backgroundColor: cat?.color ?? colors.textSecondary, opacity: 0.5 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.blockName,
                      { color: colors.textSecondary, textDecorationLine: 'line-through' },
                    ]}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        handleUnarchiveTemplate(t.id);
                      }}
                      hitSlop={8}
                      style={{ padding: Spacing.xs, marginRight: Spacing.xs }}
                    >
                      <MaterialCommunityIcons name="restore" size={20} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleHardDeleteTemplate(t.id, t.name)}
                      hitSlop={8}
                      style={{ padding: Spacing.xs }}
                    >
                      <MaterialCommunityIcons name="delete" size={20} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB - New Block */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setSelectorModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* Selector Modal */}
      <Modal
        visible={selectorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.surface, padding: Spacing.xl }]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, textAlign: 'center', marginBottom: Spacing.xl },
              ]}
            >
              {t('manage.whatToCreate')}
            </Text>

            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  marginBottom: Spacing.md,
                  paddingVertical: Spacing.lg,
                },
              ]}
              onPress={() => {
                setSelectorModalVisible(false);
                openNewCategory();
              }}
            >
              <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '600' }}>
                {t('manage.categoryBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: colors.surfaceAlt, paddingVertical: Spacing.lg },
              ]}
              onPress={() => {
                setSelectorModalVisible(false);
                setModalVisible(true);
              }}
            >
              <Text style={{ color: colors.text, fontSize: FontSize.lg, fontWeight: '600' }}>
                {t('manage.blockBtn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: Spacing.xl, alignItems: 'center' }}
              onPress={() => setSelectorModalVisible(false)}
            >
              <Text style={{ color: colors.textSecondary, fontSize: FontSize.md }}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal
        visible={catModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editCatId ? t('manage.editCategory') : t('manage.newCategory')}
              </Text>

              <>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('manage.blockName')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={catName}
                  onChangeText={setCatName}
                />

                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('manage.iconLabel')}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                  ]}
                  onPress={() => setIconPickerVisible(true)}
                >
                  <MaterialCommunityIcons
                    name={catEmoji as any}
                    size={24}
                    color={colors.text}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: colors.textSecondary }}>{t('manage.tapToChange')}</Text>
                </TouchableOpacity>
                <IconPicker
                  visible={iconPickerVisible}
                  onSelect={(i) => {
                    setCatEmoji(i);
                    setIconPickerVisible(false);
                  }}
                  onClose={() => setIconPickerVisible(false)}
                />

                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  {t('manage.colorLabel')}
                </Text>
                <View style={[styles.chipsRow, { marginBottom: Spacing.md }]}>
                  {CATEGORY_COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setCatColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: c,
                        borderWidth: 2,
                        borderColor: catColor === c ? colors.text : 'transparent',
                        marginRight: 8,
                        marginBottom: 8,
                      }}
                    />
                  ))}
                </View>
              </>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('manage.targetHoursInput')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                keyboardType="numeric"
                value={catTargetHours}
                onChangeText={setCatTargetHours}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: colors.background }]}
                  onPress={() => setCatModalVisible(false)}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={saveCategory}
                >
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    {t('common.save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* New Block Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={resetModal}>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('manage.newBlock')}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={t('manage.blockName')}
                placeholderTextColor={colors.textSecondary}
                value={blockName}
                onChangeText={setBlockName}
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('manage.category')}
              </Text>
              <View style={styles.chipsRow}>
                {activeCategories.map((c) => {
                  const selected = selectedCategoryId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected ? c.color : colors.surfaceAlt,
                          borderColor: selected ? c.color : colors.border,
                        },
                      ]}
                      onPress={() => {
                        const prevCat = selectedCategoryId
                          ? getCategoryById(selectedCategoryId)
                          : null;
                        const prevCatName = prevCat ? getCategoryDisplayName(prevCat) : '';

                        if (!blockName.trim() || blockName.trim() === prevCatName) {
                          setBlockName(getCategoryDisplayName(c));
                        }
                        setSelectedCategoryId(c.id);
                      }}
                    >
                      <Text
                        style={[styles.chipText, { color: selected ? '#fff' : colors.text }]}
                        numberOfLines={1}
                      >
                        <MaterialCommunityIcons
                          name={c.emoji as any}
                          size={16}
                          color={selected ? '#fff' : colors.text}
                        />{' '}
                        {getCategoryDisplayName(c)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {t('manage.duration')}
              </Text>
              <View style={styles.chipsRow}>
                {DURATION_OPTIONS.map((d) => {
                  const selected = selectedDuration === d;
                  return (
                    <Pressable
                      key={d}
                      style={[
                        styles.durChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surfaceAlt,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedDuration(d)}
                    >
                      <Text
                        style={[styles.durChipText, { color: selected ? '#fff' : colors.text }]}
                      >
                        {d}h
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.modalButtons}>
                <Pressable
                  style={[styles.modalButton, { backgroundColor: colors.background }]}
                  onPress={resetModal}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: colors.primary,
                      opacity: blockName.trim() && selectedCategoryId ? 1 : 0.5,
                    },
                  ]}
                  onPress={handleCreateBlock}
                  disabled={!blockName.trim() || !selectedCategoryId}
                >
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>
                    {t('common.create')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.md, paddingBottom: 100 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  catEmoji: { fontSize: FontSize.lg, marginRight: Spacing.sm },
  catName: { fontSize: FontSize.md, flex: 1, fontWeight: '500' },
  catTarget: { fontSize: FontSize.sm },
  group: { marginBottom: Spacing.md },
  groupHeader: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  blockColor: { width: 4, height: 28, borderRadius: 2, marginRight: Spacing.sm },
  blockName: { fontSize: FontSize.md, flex: 1 },
  blockDur: { fontSize: FontSize.sm, marginRight: Spacing.sm },
  deleteIcon: { fontSize: 18 },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', paddingVertical: Spacing.lg },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalScrollView: {
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modalContent: { borderRadius: BorderRadius.lg, padding: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.md },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: Spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: FontSize.sm },
  durChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  durChipText: { fontSize: FontSize.sm, fontWeight: '600' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  modalButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  modalButtonText: { fontSize: FontSize.md, fontWeight: '600' },
});

import { t } from '../utils/i18n';
import React, { useLayoutEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from '../utils/useThemeColors';
import { Spacing, FontSize, BorderRadius } from '../utils/theme';
import { usePlanner } from '../store/PlannerContext';
import { usePeaks } from '../store/PeaksContext';
import CategoryProgress from '../components/CategoryProgress';
import BlockChip from '../components/BlockChip';
import { DAYS_OF_WEEK, DayOfWeek } from '../types';
import {
  getDatesOfWeek,
  getNextWeekId,
  getPrevWeekId,
  getCurrentWeekId,
  getTodayDayOfWeek,
} from '../types/weekUtils';
import { getCategoryDisplayName } from '../utils/categoryUtils';

export default function PlannerScreen({ navigation }: any) {
  const { colors, isDark } = useThemeColors();
  const {
    currentWeekId,
    currentPlan,
    hasPreviousWeekBlocks,
    categories,
    templates,
    scheduleBlock,
    unscheduleBlock,
    toggleBlockDone,
    updateBlockDescription,
    getTemplateById,
    getCategoryById,
    getCategoryHours,
    changeWeek,
    copyPreviousWeek,
    clearCurrentWeek,
  } = usePlanner();
  const { addCompletedHours } = usePeaks();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(9, 0, 0, 0)));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  const [editBlockId, setEditBlockId] = useState<string | null>(null);
  const [editBlockDesc, setEditBlockDesc] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const editBlock = editBlockId ? currentPlan.blocks.find((b) => b.id === editBlockId) : null;
  const isDone = editBlock?.done;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('tabs.planner'),
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('WeeklyReview')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('review.title')}
        >
          <MaterialCommunityIcons
            name="clipboard-text-clock-outline"
            size={24}
            color={colors.text}
          />
        </Pressable>
      ),
    });
  }, [navigation, colors]);

  const handleBlockPress = (block: any) => {
    setEditBlockId(block.id);
    setEditBlockDesc(block.description || '');
  };

  const saveBlockDesc = () => {
    if (editBlockId) {
      updateBlockDescription(editBlockId, editBlockDesc.trim());
      setEditBlockId(null);
    }
  };

  const handleDeleteBlock = () => {
    if (editBlockId) {
      unscheduleBlock(editBlockId);
      setEditBlockId(null);
    }
  };

  const handleToggleBlock = () => {
    if (editBlockId) {
      const block = currentPlan.blocks.find((b) => b.id === editBlockId);
      if (block) {
        let duration = 0;
        if (block.isOneOff) duration = block.oneOffDuration || 0;
        else {
          const template = getTemplateById(block.templateId!);
          duration = block.customDuration ?? (template?.durationHours || 0);
        }
        toggleBlockDone(block.id);
        if (!block.done) addCompletedHours(duration);
        else addCompletedHours(-duration);
      }
      setEditBlockId(null);
    }
  };

  const handleClearWeek = () => {
    Alert.alert(t('planner.clearWeekTitle'), t('planner.clearWeekMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('planner.clearWeekConfirm'),
        style: 'destructive',
        onPress: () => {
          void clearCurrentWeek();
        },
      },
    ]);
  };

  const handleAddPress = (day: DayOfWeek) => {
    setSelectedDay(day);

    const dayBlocks = currentPlan.blocks
      .filter((b) => b.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (dayBlocks.length > 0) {
      const lastBlock = dayBlocks[dayBlocks.length - 1];
      let dur = 0;
      if (lastBlock.isOneOff && lastBlock.oneOffDuration) dur = lastBlock.oneOffDuration;
      else if (lastBlock.templateId)
        dur = lastBlock.customDuration ?? getTemplateById(lastBlock.templateId)?.durationHours ?? 0;

      const [hh, mm] = lastBlock.startTime.split(':').map(Number);
      const startMs = new Date().setHours(hh, mm, 0, 0);
      const endMs = startMs + dur * 60 * 60 * 1000;
      setStartTime(new Date(endMs));
    } else {
      setStartTime(new Date(new Date().setHours(9, 0, 0, 0)));
    }

    setModalVisible(true);
  };

  const formatTime = (d: Date) => {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handlePickTemplate = (templateId: string) => {
    const tmpl = getTemplateById(templateId);
    if (tmpl) setSelectedDuration(tmpl.durationHours);
    setSelectedTemplateId(templateId);
  };

  const confirmSchedule = () => {
    if (selectedDay && selectedTemplateId) {
      scheduleBlock(selectedTemplateId, selectedDay, formatTime(startTime), selectedDuration);
    }
    setModalVisible(false);
    setSelectedDay(null);
    setSelectedTemplateId(null);
  };

  const datesOfWeek = getDatesOfWeek(currentWeekId);
  const realCurrentWeekId = getCurrentWeekId();
  const todayDay = getTodayDayOfWeek();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Categorie summary */}
      <View
        style={[
          styles.summaryContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.xs,
          }}
        >
          <Pressable
            onPress={() => changeWeek(getPrevWeekId(currentWeekId))}
            style={{ padding: Spacing.sm }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{t('planner.prev')}</Text>
          </Pressable>

          <View style={{ alignItems: 'center' }}>
            {currentWeekId === realCurrentWeekId && (
              <Text
                style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', marginBottom: 2 }}
              >
                {t('planner.current')}
              </Text>
            )}
            <Text style={[styles.weekText, { color: colors.textSecondary, marginBottom: 0 }]}>
              {t('planner.week')} {currentWeekId.split('-').reverse().join('-')}
            </Text>
          </View>

          <Pressable
            onPress={() => changeWeek(getNextWeekId(currentWeekId))}
            style={{ padding: Spacing.sm }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{t('planner.next')}</Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryList}
        >
          {categories.map((cat) => {
            const hours = getCategoryHours(cat.id);
            if (hours.scheduled === 0 && cat.targetHoursPerWeek === 0) return null;
            return (
              <View key={cat.id} style={{ marginRight: Spacing.sm }}>
                <CategoryProgress
                  emoji={cat.emoji}
                  name={getCategoryDisplayName(cat)}
                  scheduled={hours.scheduled}
                  completed={hours.completed}
                  target={cat.targetHoursPerWeek}
                  color={cat.color}
                />
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Grid */}
      {currentPlan.blocks.length === 0 ? (
        <View style={{ padding: Spacing.md, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, marginBottom: Spacing.sm }}>
            {t('planner.emptyWeek')}
          </Text>
          {hasPreviousWeekBlocks && (
            <Pressable
              onPress={() => {
                Alert.alert(t('planner.copyWeekTitle'), t('planner.copyWeekMsg'), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('planner.copyWeekTitle'), onPress: copyPreviousWeek },
                ]);
              }}
              style={[styles.btn, { backgroundColor: colors.primary }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('planner.copyBtn')}</Text>
              </View>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.clearWeekContainer}>
          <Pressable
            onPress={handleClearWeek}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('planner.clearWeekBtn')}
            style={({ pressed }) => [
              styles.clearWeekBtn,
              {
                backgroundColor: isDark ? colors.surfaceAlt : colors.dangerLight,
                borderColor: colors.danger,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="calendar-remove-outline"
              size={16}
              color={colors.danger}
              style={{ marginRight: Spacing.xs }}
            />
            <Text style={[styles.clearWeekBtnText, { color: colors.danger }]}>
              {t('planner.clearWeekBtn')}
            </Text>
          </Pressable>
        </View>
      )}

      <ScrollView style={styles.gridScroll}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.grid}>
            {DAYS_OF_WEEK.map((day, idx) => {
              const blocks = currentPlan.blocks
                .filter((b) => b.day === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
              const dateObj = datesOfWeek[idx];
              const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
              const isToday = currentWeekId === realCurrentWeekId && day === todayDay;

              return (
                <View
                  key={day}
                  style={[
                    styles.dayCol,
                    { borderRightColor: colors.border },
                    isToday && { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayHeader,
                      { color: isToday ? colors.primary : colors.text },
                      isToday && { fontWeight: '900' },
                    ]}
                  >
                    {t('days.' + day).substring(0, 3)} {dateStr}
                  </Text>

                  <View style={styles.slotContainer}>
                    {blocks.map((block) => {
                      let name, catColor, catEmoji, duration;
                      if (block.isOneOff) {
                        name = block.oneOffName!;
                        duration = block.oneOffDuration!;
                        const cat = getCategoryById(block.oneOffCategoryId!);
                        catColor = cat?.color || colors.primary;
                        catEmoji = cat?.emoji || 'shape';
                      } else {
                        const tmpl = block.templateId
                          ? getTemplateById(block.templateId)
                          : undefined;
                        const cat = tmpl ? getCategoryById(tmpl.categoryId) : undefined;
                        name = tmpl?.name || t('common.unknown');
                        duration = block.customDuration ?? (tmpl?.durationHours || 0);
                        catColor = cat?.color || colors.primary;
                        catEmoji = cat?.emoji || 'shape';
                      }

                      return (
                        <View key={block.id} style={{ marginBottom: Spacing.sm }}>
                          <Text
                            style={{ fontSize: 10, color: colors.textTertiary, marginBottom: 2 }}
                          >
                            {block.startTime}
                          </Text>
                          <BlockChip
                            name={name}
                            categoryColor={catColor}
                            categoryEmoji={catEmoji}
                            durationHours={duration}
                            done={block.done}
                            onPress={() => handleBlockPress(block)}
                          />
                        </View>
                      );
                    })}
                    <Pressable
                      style={[styles.addSlotBtn, { backgroundColor: colors.surfaceAlt }]}
                      onPress={() => handleAddPress(day)}
                    >
                      <Text style={{ color: colors.textSecondary }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Edit Block Modal */}
      <Modal
        visible={!!editBlockId}
        transparent
        animationType="fade"
        onRequestClose={() => setEditBlockId(null)}
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
                {t('planner.blockDetails')}
              </Text>

              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  marginBottom: 4,
                  color: colors.textSecondary,
                }}
              >
                {t('planner.taskDescription')}
              </Text>
              <TextInput
                style={[
                  { borderWidth: 1, borderRadius: 12, padding: 8, fontSize: 16, marginBottom: 16 },
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder={t('planner.taskDescPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={editBlockDesc}
                onChangeText={setEditBlockDesc}
              />

              <View style={{ flexDirection: 'column', gap: 12, marginTop: 16 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: colors.danger,
                      alignItems: 'center',
                    }}
                    onPress={handleDeleteBlock}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      {t('common.delete')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: isDone ? colors.danger : colors.success,
                      alignItems: 'center',
                    }}
                    onPress={handleToggleBlock}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      {isDone ? '✕ ' + t('planner.markTodo') : '✓ ' + t('planner.markDone')}
                    </Text>
                  </Pressable>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      alignItems: 'center',
                    }}
                    onPress={() => setEditBlockId(null)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textSecondary }}>
                      {t('common.cancel')}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      backgroundColor: colors.primary,
                      alignItems: 'center',
                    }}
                    onPress={saveBlockDesc}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                      {t('common.save')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Template Picker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedTemplateId(null);
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('planner.scheduleBlock')}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md }}>
              <Text style={{ color: colors.text, fontSize: FontSize.md, marginRight: Spacing.sm }}>
                {t('planner.startTime')}
              </Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display="default"
                  onValueChange={(_, date) => {
                    if (date) setStartTime(date);
                  }}
                />
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    style={{
                      padding: Spacing.sm,
                      backgroundColor: colors.background,
                      borderRadius: BorderRadius.sm,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: FontSize.md }}>
                      {formatTime(startTime)}
                    </Text>
                  </Pressable>
                  {showTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      is24Hour={true}
                      display="default"
                      onValueChange={(_, date) => {
                        setShowTimePicker(false);
                        if (date) setStartTime(date);
                      }}
                      onDismiss={() => setShowTimePicker(false)}
                    />
                  )}
                </>
              )}
            </View>

            {selectedTemplateId ? (
              <View style={{ paddingVertical: Spacing.md }}>
                <Text style={{ color: colors.textSecondary, marginBottom: Spacing.sm }}>
                  {t('manage.duration')} (h):
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: Spacing.lg,
                  }}
                >
                  {[0.5, 1, 1.5, 2, 2.5, 3, 4, 8].map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setSelectedDuration(d)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: selectedDuration === d ? colors.primary : colors.border,
                        backgroundColor: selectedDuration === d ? colors.primary : 'transparent',
                      }}
                    >
                      <Text style={{ color: selectedDuration === d ? '#fff' : colors.text }}>
                        {d}h
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                  <Pressable onPress={() => setSelectedTemplateId(null)} style={{ padding: 12 }}>
                    <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmSchedule}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('common.save')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : templates.filter((t) => !t.isArchived && !getCategoryById(t.categoryId)?.isArchived)
                .length === 0 ? (
              <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, marginBottom: Spacing.md }}>
                  {t('planner.createFirst')}
                </Text>
                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedTemplateId(null);
                    navigation.navigate('BlocchiTab');
                  }}
                  style={[styles.btn, { backgroundColor: colors.primary }]}
                >
                  <Text style={{ color: '#fff' }}>{t('planner.goToManage')}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {categories
                  .filter((c) => !c.isArchived)
                  .map((cat) => {
                    const catTemplates = templates.filter(
                      (t) => !t.isArchived && t.categoryId === cat.id
                    );
                    if (catTemplates.length === 0) return null;
                    const isExpanded = expandedCategories[cat.id];

                    return (
                      <View key={cat.id} style={{ marginBottom: 8 }}>
                        <Pressable
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
                          onPress={() =>
                            setExpandedCategories((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                          }
                        >
                          <Text
                            style={{ marginRight: 8, fontSize: 14, color: colors.textSecondary }}
                          >
                            <MaterialCommunityIcons
                              name={isExpanded ? 'chevron-down' : 'chevron-right'}
                              size={24}
                              color={colors.textSecondary}
                            />
                          </Text>
                          <Text style={{ fontSize: 16, fontWeight: '600', color: cat.color }}>
                            <MaterialCommunityIcons
                              name={cat.emoji as any}
                              size={16}
                              color={cat.color}
                            />{' '}
                            {getCategoryDisplayName(cat)}
                          </Text>
                        </Pressable>
                        {isExpanded &&
                          catTemplates.map((t) => (
                            <Pressable
                              key={t.id}
                              style={[
                                styles.templateItem,
                                { borderBottomColor: colors.border, marginLeft: 24 },
                              ]}
                              onPress={() => handlePickTemplate(t.id)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '600' }}>
                                  {t.name}
                                </Text>
                              </View>
                              <Text style={{ color: colors.textSecondary }}>
                                {t.durationHours}h
                              </Text>
                            </Pressable>
                          ))}
                      </View>
                    );
                  })}
              </ScrollView>
            )}

            {!selectedTemplateId && (
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  setSelectedTemplateId(null);
                }}
                style={{ padding: Spacing.md, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textSecondary }}>{t('common.cancel')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryContainer: { padding: Spacing.md, borderBottomWidth: 1 },
  weekText: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  summaryList: { paddingBottom: Spacing.xs },
  gridScroll: { flex: 1 },
  grid: { flexDirection: 'row', paddingVertical: Spacing.md },
  dayCol: { width: 140, borderRightWidth: 1, paddingHorizontal: Spacing.xs },
  dayHeader: { textAlign: 'center', fontWeight: 'bold', marginBottom: Spacing.sm },
  slotContainer: { minHeight: 120 },
  addSlotBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalScrollView: { width: '100%' },
  modalScrollContent: { flexGrow: 1, justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: FontSize.xl, fontWeight: 'bold', marginBottom: Spacing.md },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  btn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  clearWeekContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  clearWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  clearWeekBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
});

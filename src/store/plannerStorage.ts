import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category, BlockTemplate, ScheduledBlock, WeeklyPlan } from '../types';
import { deleteCalendarEvent } from '../utils/calendar';

const KEYS = {
  CATEGORIES: '@climbstack/categories',
  TEMPLATES: '@climbstack/templates',
  WEEKLY_PLAN_PREFIX: '@climbstack/week/',
} as const;

const LEGACY_KEYS = {
  CATEGORIES: '@levelup/categories',
  TEMPLATES: '@levelup/templates',
  WEEKLY_PLAN_PREFIX: '@levelup/week/',
} as const;

// ── Categories ──

export async function saveCategories(categories: Category[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
}

export async function loadCategories(): Promise<Category[]> {
  let raw = await AsyncStorage.getItem(KEYS.CATEGORIES);
  if (!raw) {
    raw = await AsyncStorage.getItem(LEGACY_KEYS.CATEGORIES);
  }
  if (!raw) return [];
  return JSON.parse(raw) as Category[];
}

// ── Block Templates ──

export async function saveTemplates(templates: BlockTemplate[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
}

export async function loadTemplates(): Promise<BlockTemplate[]> {
  let raw = await AsyncStorage.getItem(KEYS.TEMPLATES);
  if (!raw) {
    raw = await AsyncStorage.getItem(LEGACY_KEYS.TEMPLATES);
  }
  if (!raw) return [];
  return JSON.parse(raw) as BlockTemplate[];
}

// ── Weekly Plans ──

export async function saveWeeklyPlan(plan: WeeklyPlan): Promise<void> {
  const key = KEYS.WEEKLY_PLAN_PREFIX + plan.weekId;
  await AsyncStorage.setItem(key, JSON.stringify(plan));
}

export async function loadWeeklyPlan(weekId: string): Promise<WeeklyPlan | null> {
  const key = KEYS.WEEKLY_PLAN_PREFIX + weekId;
  let raw = await AsyncStorage.getItem(key);
  if (!raw) {
    raw = await AsyncStorage.getItem(LEGACY_KEYS.WEEKLY_PLAN_PREFIX + weekId);
  }
  if (!raw) return null;
  return JSON.parse(raw) as WeeklyPlan;
}

function scrubPlanBlocks(
  blocks: ScheduledBlock[],
  templateIds: string[],
  templates: BlockTemplate[],
  categoryId?: string
): { blocks: ScheduledBlock[]; hoursSubtracted: number; calendarEventIds: string[] } {
  let hoursSubtracted = 0;
  const keptBlocks: ScheduledBlock[] = [];
  const calendarEventIds: string[] = [];

  for (const b of blocks) {
    const matchesTemplate = b.templateId && templateIds.includes(b.templateId);
    const matchesOneOffCat = categoryId && b.oneOffCategoryId === categoryId;

    if (!matchesTemplate && !matchesOneOffCat) {
      keptBlocks.push(b);
      continue;
    }
    if (b.done) {
      let duration = b.customDuration ?? b.oneOffDuration ?? 0;
      if (matchesTemplate && !b.customDuration) {
        const template = templates.find((t) => t.id === b.templateId);
        duration = template?.durationHours ?? 0;
      }
      hoursSubtracted += duration;
    }
    if (b.calendarEventId) {
      calendarEventIds.push(b.calendarEventId);
    }
  }

  return { blocks: keptBlocks, hoursSubtracted, calendarEventIds };
}

export async function scrubDeletedTemplates(
  templateIds: string[],
  templates: BlockTemplate[],
  categoryId?: string
): Promise<number> {
  let totalHoursSubtracted = 0;

  const allKeys = await AsyncStorage.getAllKeys();
  const planKeys = allKeys.filter(
    (k) => k.startsWith(KEYS.WEEKLY_PLAN_PREFIX) || k.startsWith(LEGACY_KEYS.WEEKLY_PLAN_PREFIX)
  );
  const entries = await AsyncStorage.multiGet(planKeys);
  const modifiedEntries: [string, string][] = [];
  const calendarEventIds: string[] = [];

  for (const [key, raw] of entries) {
    if (!raw) continue;
    const plan = JSON.parse(raw) as WeeklyPlan;
    const scrubbed = scrubPlanBlocks(plan.blocks, templateIds, templates, categoryId);
    totalHoursSubtracted += scrubbed.hoursSubtracted;
    calendarEventIds.push(...scrubbed.calendarEventIds);
    if (scrubbed.blocks.length !== plan.blocks.length) {
      modifiedEntries.push([key, JSON.stringify({ ...plan, blocks: scrubbed.blocks })]);
    }
  }

  if (modifiedEntries.length > 0) {
    await AsyncStorage.multiSet(modifiedEntries);
  }
  calendarEventIds.forEach((id) => deleteCalendarEvent(id).catch(console.error));

  return totalHoursSubtracted;
}

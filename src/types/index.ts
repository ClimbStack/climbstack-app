import { t } from '../utils/i18n';
/**
 * ClimbStack — Core type definitions
 *
 * Modello dati basato sulla metafora alpinistica:
 * - Peak (Vetta): obiettivo a lungo termine
 * - Camp (Campo): sotto-obiettivo / milestone lungo il percorso
 */

export interface Camp {
  id: string;
  name: string;
  done: boolean;
  completedAt?: string; // ISO 8601
  order: number;
}

export interface Peak {
  id: string;
  name: string;
  description?: string;
  camps: Camp[];
  createdAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
}

export interface WeeklyBlock {
  id: string;
  name: string;
  category: string;
  color: string;
  estimatedHours: number;
  peakId?: string;
  isArchived?: boolean;
}

export interface UserStats {
  totalAltitude: number; // 100m per completed camp + 1m per completed hour
  peaksReached: number;
  currentStreak: number;
  lastActiveDate?: string; // ISO 8601 (solo data, YYYY-MM-DD)
  totalCompletedHours: number; // Incremented when a block is completed
}

// ── Weekly Planner types ──

export type DayOfWeek = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom';

export const DAYS_OF_WEEK: DayOfWeek[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  lun: t('days.lun'),
  mar: t('days.mar'),
  mer: t('days.mer'),
  gio: t('days.gio'),
  ven: t('days.ven'),
  sab: t('days.sab'),
  dom: t('days.dom'),
};

export interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
  targetHoursPerWeek: number;
  isArchived?: boolean;
  isCustomName?: boolean;
}

export interface BlockTemplate {
  id: string;
  name: string;
  categoryId: string;
  durationHours: number;
  peakId?: string;
  isArchived?: boolean;
}

export interface ScheduledBlock {
  id: string;
  templateId?: string; // optional if it's one-off
  day: DayOfWeek;
  startTime: string; // format "HH:mm", e.g. "09:30" or "22:00"
  done: boolean;
  description?: string; // Optional instance-specific description
  calendarEventId?: string; // Google Calendar event ID to allow deletion
  customDuration?: number; // Override template duration
  // Fields for temporary one-off blocks
  isOneOff?: boolean;
  oneOffName?: string;
  oneOffCategoryId?: string;
  oneOffDuration?: number;
}

/** Settimana identificata da ISO week string, es. "2026-W39" */
export interface WeeklyPlan {
  weekId: string;
  blocks: ScheduledBlock[];
}

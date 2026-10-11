import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import { DayOfWeek } from '../types';

async function getDefaultCalendarSource() {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

async function getOrCreateCategoryCalendar(
  catName: string,
  catColor: string
): Promise<string | null> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calName = `ClimbStack - ${catName}`;
  const legacyCalName = `LevelUp - ${catName}`;
  const existing = calendars.find((c) => c.title === calName || c.title === legacyCalName);
  if (existing) {
    // If the color changed, we could update it, but keep it simple for now
    return existing.id;
  }

  let source;
  if (Platform.OS === 'ios') {
    source = await getDefaultCalendarSource();
  } else {
    const primaryCal =
      calendars.find((c) => c.isPrimary) || calendars.find((c) => c.source.name.includes('@'));
    source = primaryCal?.source;
  }

  if (!source) return calendars.find((c) => c.isPrimary)?.id || null;

  try {
    const newCalId = await Calendar.createCalendarAsync({
      title: calName,
      color: catColor,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: source.id,
      source: source,
      name: calName,
      ownerAccount: source.name,
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
    return newCalId;
  } catch (e) {
    console.error('Errore creazione calendario:', e);
    return calendars.find((c) => c.isPrimary)?.id || null; // Fallback to primary
  }
}

export async function createCalendarEvent(
  title: string,
  day: DayOfWeek,
  startTime: string,
  durationHours: number,
  catName: string,
  catColor: string,
  weekId?: string
) {
  try {
    const calendarId = await getOrCreateCategoryCalendar(catName, catColor);
    if (!calendarId) return null;

    const targetDays = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
    const targetDayIdx = targetDays.indexOf(day);

    let targetDate = new Date();
    if (weekId) {
      const [y, m, d] = weekId.split('-').map(Number);
      targetDate = new Date(y, m - 1, d); // This is the Monday of the week
      targetDate.setDate(targetDate.getDate() + targetDayIdx);
    } else {
      const currentDay = targetDate.getDay() === 0 ? 6 : targetDate.getDay() - 1; // 0=Mon, 6=Sun
      const diff = targetDayIdx - currentDay;
      targetDate.setDate(targetDate.getDate() + diff);
    }

    const [hh, mm] = startTime.split(':').map(Number);
    targetDate.setHours(hh, mm, 0, 0);

    const endDate = new Date(targetDate);
    const durationMs = durationHours * 60 * 60 * 1000;
    endDate.setTime(targetDate.getTime() + durationMs);

    const eventId = await Calendar.createEventAsync(calendarId, {
      title,
      startDate: targetDate,
      endDate,
      timeZone: 'Europe/Rome',
      alarms: [{ relativeOffset: -10 }], // Notify 10 mins before
    });
    return eventId;
  } catch (e) {
    console.error('Errore creazione evento:', e);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return;
    await Calendar.deleteEventAsync(eventId);
  } catch (e) {
    console.error('Errore cancellazione calendario:', e);
  }
}

export async function updateCalendarEventDescription(eventId: string, description: string) {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return;
    await Calendar.updateEventAsync(eventId, {
      notes: description,
    });
  } catch (e) {
    console.error('Failed to update calendar event description', e);
  }
}

import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEventDescription,
} from '../calendar';

jest.mock('expo-calendar/legacy', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getDefaultCalendarAsync: jest.fn(),
  createCalendarAsync: jest.fn(),
  createEventAsync: jest.fn(),
  deleteEventAsync: jest.fn(),
  updateEventAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
  CalendarAccessLevel: { OWNER: 'owner' },
}));

const calendarStub = jest.mocked(Calendar);

type StubCalendar = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];

const makeCalendar = (overrides: Record<string, unknown> = {}): StubCalendar =>
  ({
    id: 'cal-1',
    title: 'Personal',
    isPrimary: false,
    source: { id: 'src-1', name: 'me@example.com', type: 'com.google' },
    ...overrides,
  }) as unknown as StubCalendar;

const grantPermission = () =>
  calendarStub.requestCalendarPermissionsAsync.mockResolvedValue({
    status: 'granted',
  } as Awaited<ReturnType<typeof Calendar.requestCalendarPermissionsAsync>>);

const denyPermission = () =>
  calendarStub.requestCalendarPermissionsAsync.mockResolvedValue({
    status: 'denied',
  } as Awaited<ReturnType<typeof Calendar.requestCalendarPermissionsAsync>>);

const originalOS = Platform.OS;

const setPlatform = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};

describe('calendar utils', () => {
  let consoleErrorMock: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    setPlatform('android');
    grantPermission();
    calendarStub.getCalendarsAsync.mockResolvedValue([
      makeCalendar({ id: 'cal-existing', title: 'ClimbStack - Study' }),
    ]);
    calendarStub.createEventAsync.mockResolvedValue('evt-123');
  });

  afterEach(() => {
    consoleErrorMock.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOS });
    jest.useRealTimers();
  });

  describe('createCalendarEvent', () => {
    test('creates an event with start and end computed from week, day, time and duration', async () => {
      const eventId = await createCalendarEvent(
        'Deep work',
        'mer',
        '09:30',
        1.5,
        'Study',
        '#ff0000',
        '2026-10-05'
      );

      expect(eventId).toBe('evt-123');
      expect(calendarStub.createEventAsync).toHaveBeenCalledTimes(1);
      expect(calendarStub.createEventAsync).toHaveBeenCalledWith('cal-existing', {
        title: 'Deep work',
        startDate: new Date(2026, 9, 7, 9, 30, 0, 0),
        endDate: new Date(2026, 9, 7, 11, 0, 0, 0),
        timeZone: 'Europe/Rome',
        alarms: [{ relativeOffset: -10 }],
      });
    });

    test('places Monday on the week start and Sunday six days later', async () => {
      await createCalendarEvent('A', 'lun', '08:00', 1, 'Study', '#fff', '2026-10-05');
      await createCalendarEvent('B', 'dom', '08:00', 1, 'Study', '#fff', '2026-10-05');

      const [, mondayEvent] = calendarStub.createEventAsync.mock.calls[0] as [
        string,
        Calendar.Event,
      ];
      const [, sundayEvent] = calendarStub.createEventAsync.mock.calls[1] as [
        string,
        Calendar.Event,
      ];
      expect(mondayEvent.startDate).toEqual(new Date(2026, 9, 5, 8, 0));
      expect(sundayEvent.startDate).toEqual(new Date(2026, 9, 11, 8, 0));
    });

    test('rolls over into the next month when the day exceeds the month end', async () => {
      await createCalendarEvent('Edge', 'dom', '23:30', 1, 'Study', '#fff', '2026-10-26');

      const [, event] = calendarStub.createEventAsync.mock.calls[0] as [string, Calendar.Event];
      expect(event.startDate).toEqual(new Date(2026, 10, 1, 23, 30));
      expect(event.endDate).toEqual(new Date(2026, 10, 2, 0, 30));
    });

    test('uses the current week when no week id is given', async () => {
      jest.useFakeTimers({ now: new Date(2026, 9, 8, 15, 0) });

      await createCalendarEvent('Today-ish', 'lun', '07:15', 2, 'Study', '#fff');

      const [, event] = calendarStub.createEventAsync.mock.calls[0] as [string, Calendar.Event];
      expect(event.startDate).toEqual(new Date(2026, 9, 5, 7, 15));
      expect(event.endDate).toEqual(new Date(2026, 9, 5, 9, 15));
    });

    test('treats Sunday as the last day of the current week when no week id is given', async () => {
      jest.useFakeTimers({ now: new Date(2026, 9, 11, 12, 0) });

      await createCalendarEvent('Sunday', 'lun', '10:00', 1, 'Study', '#fff');

      const [, event] = calendarStub.createEventAsync.mock.calls[0] as [string, Calendar.Event];
      expect(event.startDate).toEqual(new Date(2026, 9, 5, 10, 0));
    });

    test('returns null and creates nothing when calendar permission is denied', async () => {
      denyPermission();

      const eventId = await createCalendarEvent(
        'X',
        'lun',
        '09:00',
        1,
        'Study',
        '#fff',
        '2026-10-05'
      );

      expect(eventId).toBeNull();
      expect(calendarStub.getCalendarsAsync).not.toHaveBeenCalled();
      expect(calendarStub.createEventAsync).not.toHaveBeenCalled();
    });

    test('returns null and logs when creating the event fails', async () => {
      const failure = new Error('native failure');
      calendarStub.createEventAsync.mockRejectedValue(failure);

      const eventId = await createCalendarEvent(
        'X',
        'lun',
        '09:00',
        1,
        'Study',
        '#fff',
        '2026-10-05'
      );

      expect(eventId).toBeNull();
      expect(consoleErrorMock).toHaveBeenCalledWith('Errore creazione evento:', failure);
    });

    test('does not create a new calendar when one with the category title exists', async () => {
      await createCalendarEvent('X', 'lun', '09:00', 1, 'Study', '#fff', '2026-10-05');

      expect(calendarStub.createCalendarAsync).not.toHaveBeenCalled();
    });

    test('requests only event calendars', async () => {
      await createCalendarEvent('X', 'lun', '09:00', 1, 'Study', '#fff', '2026-10-05');

      expect(calendarStub.getCalendarsAsync).toHaveBeenCalledWith('event');
    });

    describe('creating a category calendar on Android', () => {
      beforeEach(() => {
        calendarStub.createCalendarAsync.mockResolvedValue('cal-new');
      });

      test('creates the calendar using the primary calendar source', async () => {
        const primary = makeCalendar({
          id: 'cal-primary',
          title: 'Main',
          isPrimary: true,
          source: { id: 'src-main', name: 'main@example.com' },
        });
        calendarStub.getCalendarsAsync.mockResolvedValue([makeCalendar(), primary]);

        await createCalendarEvent('X', 'lun', '09:00', 1, 'Sport', '#00ff00', '2026-10-05');

        expect(calendarStub.createCalendarAsync).toHaveBeenCalledWith({
          title: 'ClimbStack - Sport',
          color: '#00ff00',
          entityType: 'event',
          sourceId: 'src-main',
          source: primary.source,
          name: 'ClimbStack - Sport',
          ownerAccount: 'main@example.com',
          accessLevel: 'owner',
        });
        expect(calendarStub.createEventAsync).toHaveBeenCalledWith('cal-new', expect.any(Object));
      });

      test('falls back to an account calendar whose source name contains an at-sign', async () => {
        calendarStub.getCalendarsAsync.mockResolvedValue([
          makeCalendar({ id: 'local', source: { id: 'src-local', name: 'Phone' } }),
          makeCalendar({ id: 'acct', source: { id: 'src-acct', name: 'user@gmail.com' } }),
        ]);

        await createCalendarEvent('X', 'lun', '09:00', 1, 'Sport', '#fff', '2026-10-05');

        expect(calendarStub.createCalendarAsync).toHaveBeenCalledWith(
          expect.objectContaining({ sourceId: 'src-acct' })
        );
      });

      test('returns null when no usable source and no primary calendar exist', async () => {
        calendarStub.getCalendarsAsync.mockResolvedValue([
          makeCalendar({ source: { id: 'src-local', name: 'Phone' } }),
        ]);

        const eventId = await createCalendarEvent(
          'X',
          'lun',
          '09:00',
          1,
          'Sport',
          '#fff',
          '2026-10-05'
        );

        expect(eventId).toBeNull();
        expect(calendarStub.createCalendarAsync).not.toHaveBeenCalled();
        expect(calendarStub.createEventAsync).not.toHaveBeenCalled();
      });

      test('uses the primary calendar id when it has no source', async () => {
        calendarStub.getCalendarsAsync.mockResolvedValue([
          makeCalendar({ id: 'cal-primary', isPrimary: true, source: undefined }),
        ]);

        await createCalendarEvent('X', 'lun', '09:00', 1, 'Sport', '#fff', '2026-10-05');

        expect(calendarStub.createCalendarAsync).not.toHaveBeenCalled();
        expect(calendarStub.createEventAsync).toHaveBeenCalledWith(
          'cal-primary',
          expect.any(Object)
        );
      });

      test('falls back to the primary calendar when calendar creation fails', async () => {
        const failure = new Error('cannot create');
        calendarStub.createCalendarAsync.mockRejectedValue(failure);
        calendarStub.getCalendarsAsync.mockResolvedValue([
          makeCalendar({ id: 'cal-primary', isPrimary: true }),
        ]);

        const eventId = await createCalendarEvent(
          'X',
          'lun',
          '09:00',
          1,
          'Sport',
          '#fff',
          '2026-10-05'
        );

        expect(eventId).toBe('evt-123');
        expect(consoleErrorMock).toHaveBeenCalledWith('Errore creazione calendario:', failure);
        expect(calendarStub.createEventAsync).toHaveBeenCalledWith(
          'cal-primary',
          expect.any(Object)
        );
      });

      test('returns null when calendar creation fails and there is no primary calendar', async () => {
        calendarStub.createCalendarAsync.mockRejectedValue(new Error('cannot create'));
        calendarStub.getCalendarsAsync.mockResolvedValue([
          makeCalendar({ id: 'acct', source: { id: 's', name: 'user@gmail.com' } }),
        ]);

        const eventId = await createCalendarEvent(
          'X',
          'lun',
          '09:00',
          1,
          'Sport',
          '#fff',
          '2026-10-05'
        );

        expect(eventId).toBeNull();
        expect(calendarStub.createEventAsync).not.toHaveBeenCalled();
      });
    });

    describe('creating a category calendar on iOS', () => {
      test('creates the calendar using the default calendar source', async () => {
        setPlatform('ios');
        const defaultSource = { id: 'src-ios', name: 'iCloud' };
        calendarStub.getCalendarsAsync.mockResolvedValue([]);
        calendarStub.getDefaultCalendarAsync.mockResolvedValue({
          source: defaultSource,
        } as Awaited<ReturnType<typeof Calendar.getDefaultCalendarAsync>>);
        calendarStub.createCalendarAsync.mockResolvedValue('cal-ios');

        await createCalendarEvent('X', 'lun', '09:00', 1, 'Sport', '#123456', '2026-10-05');

        expect(calendarStub.getDefaultCalendarAsync).toHaveBeenCalledTimes(1);
        expect(calendarStub.createCalendarAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceId: 'src-ios',
            ownerAccount: 'iCloud',
            color: '#123456',
          })
        );
        expect(calendarStub.createEventAsync).toHaveBeenCalledWith('cal-ios', expect.any(Object));
      });
    });
  });

  describe('deleteCalendarEvent', () => {
    test('deletes the event by id when permission is granted', async () => {
      await deleteCalendarEvent('evt-9');

      expect(calendarStub.deleteEventAsync).toHaveBeenCalledTimes(1);
      expect(calendarStub.deleteEventAsync).toHaveBeenCalledWith('evt-9');
    });

    test('does nothing when permission is denied', async () => {
      denyPermission();

      await deleteCalendarEvent('evt-9');

      expect(calendarStub.deleteEventAsync).not.toHaveBeenCalled();
    });

    test('logs instead of throwing when deletion fails', async () => {
      const failure = new Error('gone');
      calendarStub.deleteEventAsync.mockRejectedValue(failure);

      await expect(deleteCalendarEvent('evt-9')).resolves.toBeUndefined();

      expect(consoleErrorMock).toHaveBeenCalledWith('Errore cancellazione calendario:', failure);
    });

    test('logs instead of throwing when the permission request fails', async () => {
      calendarStub.requestCalendarPermissionsAsync.mockRejectedValue(new Error('no perms api'));

      await expect(deleteCalendarEvent('evt-9')).resolves.toBeUndefined();

      expect(calendarStub.deleteEventAsync).not.toHaveBeenCalled();
      expect(consoleErrorMock).toHaveBeenCalled();
    });
  });

  describe('updateCalendarEventDescription', () => {
    test('updates the event notes with the description', async () => {
      await updateCalendarEventDescription('evt-5', 'Bring laptop');

      expect(calendarStub.updateEventAsync).toHaveBeenCalledTimes(1);
      expect(calendarStub.updateEventAsync).toHaveBeenCalledWith('evt-5', {
        notes: 'Bring laptop',
      });
    });

    test('passes an empty description through unchanged', async () => {
      await updateCalendarEventDescription('evt-5', '');

      expect(calendarStub.updateEventAsync).toHaveBeenCalledWith('evt-5', { notes: '' });
    });

    test('does nothing when permission is denied', async () => {
      denyPermission();

      await updateCalendarEventDescription('evt-5', 'x');

      expect(calendarStub.updateEventAsync).not.toHaveBeenCalled();
    });

    test('logs instead of throwing when the update fails', async () => {
      const failure = new Error('read only');
      calendarStub.updateEventAsync.mockRejectedValue(failure);

      await expect(updateCalendarEventDescription('evt-5', 'x')).resolves.toBeUndefined();

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Failed to update calendar event description',
        failure
      );
    });
  });
});

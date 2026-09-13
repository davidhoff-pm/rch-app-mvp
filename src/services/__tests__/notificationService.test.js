/**
 * Tests du service de notifications natif.
 *
 * Point critique : depuis le SDK 52, expo-notifications exige un champ `type`
 * sur chaque trigger. Sans lui, la notification part immédiatement au lieu de
 * l'heure demandée. Ces tests garantissent qu'aucun appel ne repasse à l'ancien
 * format.
 */
import * as Notifications from 'expo-notifications';
import storage from '../../utils/storage';
import {
  dailyTrigger,
  dateTrigger,
  secondsTrigger,
  ANDROID_CHANNEL_ID,
  scheduleStoolReminder,
  scheduleTreatmentReminders,
  refreshDailyNotifications,
  sendTestBilanNotification,
  sendTestStoolNotification,
  sendTestNotification,
} from '../notificationService';

const { SchedulableTriggerInputTypes } = Notifications;

const enableSettings = () => {
  storage.set('notificationSettings', JSON.stringify({
    enabled: true,
    stoolReminder: { enabled: true, hour: 20, minute: 30 },
    treatmentRemindersEnabled: true,
  }));
};

const setDailySchema = () => {
  storage.set('medications', JSON.stringify({ med1: { id: 'med1', name: 'Pentasa' } }));
  storage.set('therapeuticSchemas', JSON.stringify([{
    id: 's1',
    medicationId: 'med1',
    startDate: '2026-01-01',
    endDate: null,
    frequency: { type: 'daily', doses: { matin: 1, midi: 0, soir: 1 } },
  }]));
  storage.set('intakes', '[]');
  storage.set('treatmentReminderTimes', JSON.stringify({ matin: '08:15', midi: '12:00', soir: '19:45' }));
};

const setIntervalSchema = () => {
  storage.set('medications', JSON.stringify({ med2: { id: 'med2', name: 'Entyvio' } }));
  storage.set('therapeuticSchemas', JSON.stringify([{
    id: 's2',
    medicationId: 'med2',
    startDate: '2026-01-01',
    endDate: null,
    frequency: { type: 'interval', intervalDays: 56, doses: 1 },
  }]));
  // Dernière prise il y a 10 jours → prochaine prise dans 46 jours, rappel stock 3 j avant
  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  storage.set('intakes', JSON.stringify([{
    id: 'i1', medicationId: 'med2', schemaId: 's2', doses: 1, timestamp: tenDaysAgo,
  }]));
  storage.set('treatmentReminderTimes', JSON.stringify({
    interval: '09:00', stockReminderEnabled: true, stockReminderDays: 3,
  }));
};

const scheduledTriggers = () =>
  Notifications.scheduleNotificationAsync.mock.calls.map(([arg]) => arg.trigger);

beforeEach(() => {
  jest.clearAllMocks();
  ['notificationSettings', 'medications', 'therapeuticSchemas', 'intakes',
    'treatmentReminderTimes', 'dailySells', 'trackingMode', 'wellbeingCheckins']
    .forEach((k) => storage.delete(k));
});

describe('constructeurs de triggers', () => {
  it('dailyTrigger porte le type DAILY, l\'heure et le canal Android', () => {
    expect(dailyTrigger(20, 30)).toEqual({
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 30,
      channelId: ANDROID_CHANNEL_ID,
    });
  });

  it('dateTrigger porte le type DATE', () => {
    const d = new Date(2026, 9, 1, 9, 0);
    expect(dateTrigger(d)).toEqual({
      type: SchedulableTriggerInputTypes.DATE,
      date: d,
      channelId: ANDROID_CHANNEL_ID,
    });
  });

  it('secondsTrigger porte le type TIME_INTERVAL', () => {
    expect(secondsTrigger(5)).toEqual({
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: ANDROID_CHANNEL_ID,
    });
  });
});

describe('planification', () => {
  it('le rappel du soir est quotidien à l\'heure réglée', async () => {
    enableSettings();
    await scheduleStoolReminder(20, 30);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const [{ trigger, identifier }] = Notifications.scheduleNotificationAsync.mock.calls[0];
    expect(identifier).toBe('stool-reminder-evening');
    expect(trigger).toMatchObject({ type: SchedulableTriggerInputTypes.DAILY, hour: 20, minute: 30 });
  });

  it('le rappel du soir n\'est pas planifié si les notifications sont désactivées', async () => {
    storage.set('notificationSettings', JSON.stringify({ enabled: false }));
    await scheduleStoolReminder(20, 0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('un schéma quotidien matin+soir donne deux rappels DAILY aux bonnes heures', async () => {
    enableSettings();
    setDailySchema();
    await scheduleTreatmentReminders();

    const triggers = scheduledTriggers();
    expect(triggers).toHaveLength(2);
    expect(triggers).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 15 }),
      expect.objectContaining({ type: SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 45 }),
    ]));
  });

  it('un schéma à intervalle donne un rappel DATE de prise et un rappel DATE de stock', async () => {
    enableSettings();
    setIntervalSchema();
    await scheduleTreatmentReminders();

    const triggers = scheduledTriggers();
    expect(triggers).toHaveLength(2);
    triggers.forEach((t) => {
      expect(t.type).toBe(SchedulableTriggerInputTypes.DATE);
      expect(t.date).toBeInstanceOf(Date);
      expect(t.date.getTime()).toBeGreaterThan(Date.now());
      expect(t.date.getHours()).toBe(9);
    });
    const ids = Notifications.scheduleNotificationAsync.mock.calls.map(([a]) => a.identifier);
    expect(ids).toEqual(expect.arrayContaining(['treatment-s2-interval', 'treatment-s2-stock']));
  });

  it('en rémission, le rappel du soir est annulé mais les rappels traitement restent', async () => {
    enableSettings();
    setDailySchema();
    storage.set('trackingMode', 'remission');
    await refreshDailyNotifications();

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stool-reminder-evening');
    const ids = Notifications.scheduleNotificationAsync.mock.calls.map(([a]) => a.identifier);
    expect(ids).not.toContain('stool-reminder-evening');
    expect(ids.filter((id) => id.startsWith('treatment-'))).toHaveLength(2);
  });

  it('aucun appel ne repasse à l\'ancien format sans `type`', async () => {
    enableSettings();
    setDailySchema();
    await refreshDailyNotifications();
    await sendTestBilanNotification();
    await sendTestStoolNotification();
    await sendTestNotification();

    const triggers = scheduledTriggers();
    expect(triggers.length).toBeGreaterThanOrEqual(6);
    triggers.forEach((t) => {
      expect(typeof t.type).toBe('string');
      expect(Object.values(SchedulableTriggerInputTypes)).toContain(t.type);
    });
  });
});

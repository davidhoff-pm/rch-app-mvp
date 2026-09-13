import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import storage from '../utils/storage';
import {
  getActiveTherapeuticSchemas,
  getMedications,
  getDoses,
  getNextIntake,
  getTreatmentReminderTimes,
} from '../utils/treatmentUtils';
import { isTodayCheckinComplete } from '../utils/wellbeingUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NOTIFICATION_IDS = {
  STOOL_REMINDER: 'stool-reminder-evening',
};

// Canal Android obligatoire (Android 8+) : sans canal, les notifications planifiées
// sont livrées avec une importance par défaut ou pas du tout. Créé une seule fois.
export const ANDROID_CHANNEL_ID = 'rappels';
let channelReady = false;

export async function ensureNotificationChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Rappels',
      description: 'Rappels de traitement et de bilan du jour',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
    channelReady = true;
  } catch (error) {
    console.error('❌ Erreur création du canal de notification:', error);
  }
}

// Constructeurs de triggers. Depuis le SDK 52, expo-notifications exige un champ
// `type` explicite : sans lui, le trigger est ignoré et la notification part
// immédiatement au lieu de l'heure demandée.
const { SchedulableTriggerInputTypes } = Notifications;

export function dailyTrigger(hour, minute) {
  return { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: ANDROID_CHANNEL_ID };
}

export function dateTrigger(date) {
  return { type: SchedulableTriggerInputTypes.DATE, date, channelId: ANDROID_CHANNEL_ID };
}

export function secondsTrigger(seconds) {
  return { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: ANDROID_CHANNEL_ID };
}

/**
 * Demander les permissions pour les notifications
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permission de notification refusée');
      return false;
    }
    
    console.log('✅ Permission de notification accordée');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la demande de permission:', error);
    return false;
  }
}

/**
 * Vérifier si au moins une selle a été saisie aujourd'hui
 */
function isStoolLoggedToday() {
  const json = storage.getString('dailySells');
  if (!json) return false;
  try {
    const stools = JSON.parse(json);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return stools.some(s => s.timestamp >= start && s.timestamp < end);
  } catch {
    return false;
  }
}

/**
 * Vérifier si le mode rémission est actif
 */
function isRemissionMode() {
  return storage.getString('trackingMode') === 'remission';
}

/**
 * Vérifier si la saisie du soir (selles + bilan léger) est déjà complète pour aujourd'hui.
 * Le rappel du soir est fusionné : il ne se déclenche que s'il reste quelque chose à faire.
 */
function isEveningCheckinComplete() {
  return isStoolLoggedToday() && isTodayCheckinComplete();
}

/**
 * Planifier le rappel du soir (selles + bilan léger fusionnés)
 */
export async function scheduleStoolReminder(hour, minute) {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STOOL_REMINDER);
    const settings = getNotificationSettings();
    if (!settings.enabled || !settings.stoolReminder.enabled) return null;

    await ensureNotificationChannel();
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 Bilan du jour',
        body: "N'oubliez pas de saisir vos selles et votre bilan du jour (humeur, sommeil, fatigue...).",
        data: { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' },
        sound: true,
      },
      trigger: dailyTrigger(hour, minute),
      identifier: NOTIFICATION_IDS.STOOL_REMINDER,
    });
    return notificationId;
  } catch (error) {
    console.error('❌ Erreur planification rappel selles:', error);
    return null;
  }
}

/**
 * Annuler le rappel selles
 */
export async function cancelStoolReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STOOL_REMINDER);
  } catch (error) {
    console.error("Erreur annulation rappel selles:", error);
  }
}

/**
 * Réévaluer et (re)planifier les notifications du jour selon l'état actuel.
 * À appeler à l'ouverture / au focus de l'app.
 */
export async function refreshDailyNotifications() {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const remission = isRemissionMode();

  if (remission || isEveningCheckinComplete()) {
    await cancelStoolReminder();
  } else if (settings.stoolReminder?.enabled) {
    await scheduleStoolReminder(settings.stoolReminder.hour, settings.stoolReminder.minute);
  }

  // Rappels traitement — actifs même en rémission
  await scheduleTreatmentReminders();
}

/**
 * Annuler tous les rappels traitement
 */
export async function cancelTreatmentReminders() {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier?.startsWith('treatment-')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (error) {
    console.error('Erreur annulation rappels traitement:', error);
  }
}

/**
 * Planifier les rappels traitement pour tous les traitements actifs
 */
export async function scheduleTreatmentReminders() {
  const settings = getNotificationSettings();
  if (!settings.enabled || settings.treatmentRemindersEnabled === false) return;

  await cancelTreatmentReminders();
  await ensureNotificationChannel();

  const schemas = getActiveTherapeuticSchemas();
  const medications = getMedications();
  const times = getTreatmentReminderTimes();

  const parseTime = (str) => {
    const [h, m] = (str || '08:00').split(':').map(Number);
    return { hour: h, minute: m };
  };

  for (const schema of schemas) {
    const med = medications[schema.medicationId];
    if (!med) continue;

    if (schema.frequency.type === 'daily') {
      const doses = getDoses(schema.frequency);
      const moments = [
        { key: 'matin', count: doses.matin },
        { key: 'midi', count: doses.midi },
        { key: 'soir', count: doses.soir },
      ];

      for (const { key, count } of moments) {
        if (count <= 0) continue;
        const { hour, minute } = parseTime(times[key]);
        const id = `treatment-${schema.id}-${key}`;

        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `💊 ${med.name}`,
              body: `C'est l'heure de votre traitement (${count} prise${count > 1 ? 's' : ''})`,
              data: { type: 'TREATMENT_REMINDER', action: 'OPEN_TREATMENT', schemaId: schema.id },
              sound: true,
            },
            trigger: dailyTrigger(hour, minute),
            identifier: id,
          });
        } catch (e) {
          console.error(`Erreur planification rappel ${id}:`, e);
        }
      }
    } else if (schema.frequency.type === 'interval') {
      // NB : ne pas filtrer sur isIntervalIntakeDone() ici. Cette fonction renvoie
      // true dès que la prochaine prise est dans le futur, c'est-à-dire exactement
      // le cas où il faut planifier le rappel du jour J et le rappel de stock.
      const { nextDate } = getNextIntake(schema);
      const now = new Date();

      const { hour, minute } = parseTime(times.interval || '08:00');

      // Rappel le jour de la prise (si l'heure du rappel n'est pas déjà passée)
      {
        const triggerDate = new Date(nextDate);
        triggerDate.setHours(hour, minute, 0, 0);
        if (triggerDate > now) {
          const id = `treatment-${schema.id}-interval`;
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `💊 ${med.name}`,
                body: `C'est le jour de votre traitement`,
                data: { type: 'TREATMENT_REMINDER', action: 'OPEN_TREATMENT', schemaId: schema.id },
                sound: true,
              },
              trigger: dateTrigger(triggerDate),
              identifier: id,
            });
          } catch (e) {
            console.error(`Erreur planification rappel interval ${id}:`, e);
          }
        }
      }

      // Rappel stock X jours avant (uniquement si intervalle >= 7 jours)
      if (times.stockReminderEnabled !== false && schema.frequency.intervalDays >= 7) {
        const daysBefore = times.stockReminderDays || 3;
        const stockDate = new Date(nextDate);
        stockDate.setDate(stockDate.getDate() - daysBefore);
        stockDate.setHours(hour, minute, 0, 0);

        if (stockDate > now) {
          const stockId = `treatment-${schema.id}-stock`;
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `📦 ${med.name}`,
                body: `Vous devez prendre votre traitement dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''}, vérifiez votre stock`,
                data: { type: 'STOCK_REMINDER', action: 'OPEN_TREATMENT', schemaId: schema.id },
                sound: true,
              },
              trigger: dateTrigger(stockDate),
              identifier: stockId,
            });
          } catch (e) {
            console.error(`Erreur planification rappel stock ${stockId}:`, e);
          }
        }
      }
    }
  }
}

/**
 * Annuler toutes les notifications planifiées
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ Toutes les notifications annulées');
  } catch (error) {
    console.error('Erreur lors de l\'annulation des notifications:', error);
  }
}

/**
 * Récupérer les paramètres de notification
 */
export function getNotificationSettings() {
  const json = storage.getString('notificationSettings');
  
  const defaults = {
    enabled: false,
    surveyReminder1: { enabled: true, hour: 9, minute: 0 },
    stoolReminder: { enabled: true, hour: 20, minute: 0 },
    treatmentRemindersEnabled: true,
  };

  if (!json) return defaults;

  try {
    const saved = JSON.parse(json);
    if (saved.surveyReminder2 && !saved.stoolReminder) {
      saved.stoolReminder = saved.surveyReminder2;
      delete saved.surveyReminder2;
    }
    return { ...defaults, ...saved };
  } catch (error) {
    console.error('Erreur lors de la lecture des paramètres:', error);
    return defaults;
  }
}

/**
 * Sauvegarder les paramètres de notification
 */
export function saveNotificationSettings(settings) {
  try {
    storage.set('notificationSettings', JSON.stringify(settings));
    console.log('💾 Paramètres de notification sauvegardés');
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des paramètres:', error);
  }
}

/**
 * Activer les notifications
 */
export async function enableNotifications() {
  const hasPermission = await requestNotificationPermissions();
  
  if (!hasPermission) {
    return false;
  }
  
  const settings = getNotificationSettings();
  settings.enabled = true;
  saveNotificationSettings(settings);
  
  // Planifier les notifications
  await scheduleAllReminders();
  
  return true;
}

/**
 * Désactiver les notifications
 */
export async function disableNotifications() {
  const settings = getNotificationSettings();
  settings.enabled = false;
  saveNotificationSettings(settings);
  
  // Annuler toutes les notifications
  await cancelAllNotifications();
}

/**
 * Planifier tous les rappels configurés
 */
export async function scheduleAllReminders() {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  const remission = isRemissionMode();

  if (!remission && settings.stoolReminder?.enabled) {
    await scheduleStoolReminder(settings.stoolReminder.hour, settings.stoolReminder.minute);
  }

  // Rappels traitement — actifs même en rémission
  await scheduleTreatmentReminders();
}

/**
 * Envoyer une notification de test selles (dans 5s, pour dev)
 */
export async function sendTestStoolNotification() {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) throw new Error('Permission refusée.');

  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 Selles du jour [TEST]',
      body: "N'oubliez pas de saisir vos selles d'aujourd'hui.",
      data: { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' },
      sound: true,
    },
    trigger: secondsTrigger(5),
  });
}

/**
 * Envoyer une notification de test "bilan du jour" (dans 5s, pour dev)
 */
export async function sendTestBilanNotification() {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) throw new Error('Permission refusée.');

  await ensureNotificationChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 Bilan du jour [TEST]',
      body: "N'oubliez pas de saisir vos selles et votre bilan du jour.",
      data: { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' },
      sound: true,
    },
    trigger: secondsTrigger(5),
  });
}

/**
 * Envoyer une notification de test
 */
export async function sendTestNotification() {
  try {
    console.log('🧪 Début du test de notification...');
    
    // Vérifier la plateforme
    console.log('📱 Plateforme:', Platform.OS);
    
    const hasPermission = await requestNotificationPermissions();
    console.log('🔐 Permission:', hasPermission);
    
    if (!hasPermission) {
      throw new Error('Permission de notification refusée. Veuillez autoriser les notifications dans les paramètres de votre appareil.');
    }
    
    // Sur web, les notifications ne fonctionnent pas de la même manière
    if (Platform.OS === 'web') {
      console.log('⚠️ Les notifications sur web sont limitées. Testez sur mobile pour une expérience complète.');
      
      // Essayer quand même d'envoyer une notification web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🧪 Notification de test', {
          body: 'Vos notifications fonctionnent correctement !',
          icon: '/favicon.png',
        });
        console.log('✅ Notification web native envoyée');
        return true;
      }
    }
    
    await ensureNotificationChannel();
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Notification de test',
        body: 'Vos notifications fonctionnent correctement !',
        data: { type: 'TEST' },
        sound: true,
      },
      trigger: secondsTrigger(2),
    });
    
    console.log('✅ Notification de test planifiée avec ID:', notificationId);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification de test:', error);
    throw error;
  }
}

/**
 * Obtenir toutes les notifications planifiées (pour debug)
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📋 Notifications planifiées:', notifications);
    return notifications;
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return [];
  }
}


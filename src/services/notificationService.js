import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import storage from '../utils/storage';
import { getSurveyDayKey } from '../utils/dayKey';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// IDs des notifications pour pouvoir les annuler
const NOTIFICATION_IDS = {
  SURVEY_REMINDER_1: 'survey-reminder-1',
  STOOL_REMINDER: 'stool-reminder-evening',
};

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
 * Vérifier si le bilan du jour est complété
 */
function isSurveyCompletedToday() {
  const todayKey = getSurveyDayKey(new Date(), 0);
  const json = storage.getString('dailySurvey');
  if (!json) return false;
  try {
    const surveys = JSON.parse(json);
    return surveys && surveys[todayKey] !== undefined;
  } catch {
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
 * Planifier le rappel bilan du matin
 */
export async function scheduleSurveyReminder(hour, minute) {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.SURVEY_REMINDER_1);
    const settings = getNotificationSettings();
    if (!settings.enabled || !settings.surveyReminder1.enabled) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Bilan du jour',
        body: 'Comment ça va ? Prenez 2 minutes pour compléter votre bilan.',
        data: { type: 'SURVEY_REMINDER', action: 'OPEN_SURVEY' },
        sound: true,
      },
      trigger: { hour, minute, repeats: true },
      identifier: NOTIFICATION_IDS.SURVEY_REMINDER_1,
    });
    return notificationId;
  } catch (error) {
    console.error('❌ Erreur planification rappel bilan:', error);
    return null;
  }
}

/**
 * Planifier le rappel selles du soir
 */
export async function scheduleStoolReminder(hour, minute) {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STOOL_REMINDER);
    const settings = getNotificationSettings();
    if (!settings.enabled || !settings.stoolReminder.enabled) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📝 Selles du jour',
        body: "N'oubliez pas de saisir vos selles d'aujourd'hui.",
        data: { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' },
        sound: true,
      },
      trigger: { hour, minute, repeats: true },
      identifier: NOTIFICATION_IDS.STOOL_REMINDER,
    });
    return notificationId;
  } catch (error) {
    console.error('❌ Erreur planification rappel selles:', error);
    return null;
  }
}

/**
 * Annuler le rappel bilan
 */
export async function cancelSurveyReminder() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.SURVEY_REMINDER_1);
  } catch (error) {
    console.error("Erreur annulation rappel bilan:", error);
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

  // Rappel bilan matin
  if (remission || isSurveyCompletedToday()) {
    await cancelSurveyReminder();
  } else if (settings.surveyReminder1.enabled) {
    await scheduleSurveyReminder(settings.surveyReminder1.hour, settings.surveyReminder1.minute);
  }

  // Rappel selles soir
  if (remission || isStoolLoggedToday()) {
    await cancelStoolReminder();
  } else if (settings.stoolReminder?.enabled) {
    await scheduleStoolReminder(settings.stoolReminder.hour, settings.stoolReminder.minute);
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
  };

  if (!json) return defaults;

  try {
    const saved = JSON.parse(json);
    // Migration: ancien champ surveyReminder2 → stoolReminder
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

  if (!remission && settings.surveyReminder1.enabled) {
    await scheduleSurveyReminder(settings.surveyReminder1.hour, settings.surveyReminder1.minute);
  }
  if (!remission && settings.stoolReminder?.enabled) {
    await scheduleStoolReminder(settings.stoolReminder.hour, settings.stoolReminder.minute);
  }
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
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Notification de test',
        body: 'Vos notifications fonctionnent correctement !',
        data: { type: 'TEST' },
        sound: true,
      },
      trigger: {
        seconds: 2,
      },
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


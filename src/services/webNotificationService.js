/**
 * Service de notifications pour le Web (PWA)
 * Utilise l'API Notification native du navigateur
 */

import storage from '../utils/storage';
import {
  getActiveTherapeuticSchemas,
  getMedications,
  getDoses,
  getNextIntake,
  isIntervalIntakeDone,
  getTreatmentReminderTimes,
} from '../utils/treatmentUtils';

/**
 * Vérifier si les notifications sont supportées par le navigateur
 */
export function areNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Demander les permissions pour les notifications web
 */
export async function requestNotificationPermissions() {
  if (!areNotificationsSupported()) {
    console.log('❌ Notifications non supportées par ce navigateur');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('🔐 Permission de notification:', permission);
    return permission === 'granted';
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
 * Envoyer une notification web
 */
export function showWebNotification(title, body, data = {}) {
  if (!areNotificationsSupported()) {
    console.log('❌ Notifications non supportées');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('❌ Permission de notification non accordée');
    return;
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      tag: data.tag || 'rch-notification',
      requireInteraction: true,
      data,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      
      // Si c'est un rappel de bilan, ouvrir la page d'accueil
      if (data.action === 'OPEN_SURVEY') {
        window.location.href = '/';
      }
    };

    console.log('✅ Notification web affichée');
  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage de la notification:', error);
  }
}

/**
 * Envoyer une notification de test selles (pour dev)
 */
export async function sendTestStoolNotification() {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) throw new Error('Permission refusée.');
  showWebNotification(
    '📝 Selles du jour [TEST]',
    "N'oubliez pas de saisir vos selles d'aujourd'hui.",
    { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' }
  );
}

/**
 * Envoyer une notification de test
 */
export async function sendTestNotification() {
  console.log('🧪 Test de notification web...');
  
  const hasPermission = await requestNotificationPermissions();
  
  if (!hasPermission) {
    throw new Error('Permission de notification refusée. Veuillez autoriser les notifications dans les paramètres de votre navigateur.');
  }

  showWebNotification(
    '🧪 Notification de test',
    'Vos notifications fonctionnent correctement !',
    { type: 'TEST' }
  );

  return true;
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
  console.log('🔔 Activation des notifications web...');
  
  const hasPermission = await requestNotificationPermissions();
  
  if (!hasPermission) {
    return false;
  }
  
  const settings = getNotificationSettings();
  settings.enabled = true;
  saveNotificationSettings(settings);
  
  // Planifier les rappels
  scheduleAllReminders();
  
  return true;
}

/**
 * Désactiver les notifications
 */
export function disableNotifications() {
  console.log('🔕 Désactivation des notifications web...');
  
  const settings = getNotificationSettings();
  settings.enabled = false;
  saveNotificationSettings(settings);
  
  // Annuler tous les timers
  cancelAllReminders();
}

// Timers des rappels
let stoolReminderTimer = null;
let treatmentReminderTimers = [];

/**
 * Calculer le délai en millisecondes jusqu'à une heure donnée
 */
function getDelayUntilTime(hour, minute) {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

/**
 * Planifier le rappel selles (soir)
 */
function scheduleStoolReminderWeb(hour, minute) {
  if (stoolReminderTimer) clearTimeout(stoolReminderTimer);

  const scheduleNext = () => {
    const delay = getDelayUntilTime(hour, minute);
    stoolReminderTimer = setTimeout(() => {
      if (!isRemissionMode() && !isStoolLoggedToday()) {
        showWebNotification(
          '📝 Selles du jour',
          "N'oubliez pas de saisir vos selles d'aujourd'hui.",
          { type: 'STOOL_REMINDER', action: 'OPEN_STOOL_BATCH' }
        );
      }
      scheduleNext();
    }, delay);
  };

  scheduleNext();
}

/**
 * Planifier les rappels traitement web
 */
function scheduleTreatmentRemindersWeb() {
  cancelTreatmentRemindersWeb();

  const settings = getNotificationSettings();
  if (!settings.enabled || settings.treatmentRemindersEnabled === false) return;

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

        const scheduleNext = () => {
          const delay = getDelayUntilTime(hour, minute);
          const timer = setTimeout(() => {
            showWebNotification(
              `💊 ${med.name}`,
              `C'est l'heure de votre traitement (${count} prise${count > 1 ? 's' : ''})`,
              { type: 'TREATMENT_REMINDER', action: 'OPEN_TREATMENT', tag: `treatment-${schema.id}-${key}` }
            );
            scheduleNext();
          }, delay);
          treatmentReminderTimers.push(timer);
        };

        scheduleNext();
      }
    } else if (schema.frequency.type === 'interval') {
      if (isIntervalIntakeDone(schema)) continue;
      const { nextDate } = getNextIntake(schema);
      const now = new Date();
      const { hour, minute } = parseTime(times.interval || '08:00');

      // Rappel le jour de la prise
      if (nextDate >= now) {
        const triggerDate = new Date(nextDate);
        triggerDate.setHours(hour, minute, 0, 0);
        if (triggerDate > now) {
          const delay = triggerDate.getTime() - now.getTime();
          const timer = setTimeout(() => {
            showWebNotification(
              `💊 ${med.name}`,
              `C'est le jour de votre traitement`,
              { type: 'TREATMENT_REMINDER', action: 'OPEN_TREATMENT', tag: `treatment-${schema.id}-interval` }
            );
          }, delay);
          treatmentReminderTimers.push(timer);
        }
      }

      // Rappel stock X jours avant (intervalle >= 7 jours)
      if (times.stockReminderEnabled !== false && schema.frequency.intervalDays >= 7) {
        const daysBefore = times.stockReminderDays || 3;
        const stockDate = new Date(nextDate);
        stockDate.setDate(stockDate.getDate() - daysBefore);
        stockDate.setHours(hour, minute, 0, 0);

        if (stockDate > now) {
          const delay = stockDate.getTime() - now.getTime();
          const timer = setTimeout(() => {
            showWebNotification(
              `📦 ${med.name}`,
              `Vous devez prendre votre traitement dans ${daysBefore} jour${daysBefore > 1 ? 's' : ''}, vérifiez votre stock`,
              { type: 'STOCK_REMINDER', action: 'OPEN_TREATMENT', tag: `treatment-${schema.id}-stock` }
            );
          }, delay);
          treatmentReminderTimers.push(timer);
        }
      }
    }
  }
}

function cancelTreatmentRemindersWeb() {
  treatmentReminderTimers.forEach(t => clearTimeout(t));
  treatmentReminderTimers = [];
}

/**
 * Planifier tous les rappels
 */
export function scheduleAllReminders() {
  const settings = getNotificationSettings();
  if (!settings.enabled) return;

  cancelAllReminders();

  if (settings.stoolReminder?.enabled) {
    scheduleStoolReminderWeb(settings.stoolReminder.hour, settings.stoolReminder.minute);
  }

  scheduleTreatmentRemindersWeb();
}

/**
 * Annuler tous les rappels
 */
export function cancelAllReminders() {
  if (stoolReminderTimer) { clearTimeout(stoolReminderTimer); stoolReminderTimer = null; }
  cancelTreatmentRemindersWeb();
}

// Initialiser les rappels au chargement de la page
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const settings = getNotificationSettings();
    if (settings.enabled) {
      console.log('🔄 Initialisation des rappels de notification...');
      scheduleAllReminders();
    }
  });
}


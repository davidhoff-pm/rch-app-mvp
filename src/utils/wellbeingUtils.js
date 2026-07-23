import storage from './storage';

// ========================================
// Bilan léger quotidien (humeur / sommeil / fatigue)
// ========================================
// Voir docs/FEATURE_SUIVI_LEGER.md pour le cadrage complet.
// Contrairement aux selles/scores, ce bilan ne concerne QUE le jour courant :
// pas de saisie rétroactive (anti-biais mémoire).

export const MOOD_LABELS = {
  0: 'Très difficile',
  1: 'Difficile',
  2: 'Plutôt difficile',
  3: 'Plutôt bonne',
  4: 'Bonne',
  5: 'Très bonne',
};

export const SLEEP_LABELS = {
  0: 'Très mauvais',
  1: 'Mauvais',
  2: 'Moyen -',
  3: 'Moyen +',
  4: 'Bon',
  5: 'Très bon',
};

export const FATIGUE_LABELS = {
  0: 'Épuisé',
  1: 'Très fatigué',
  2: 'Fatigué',
  3: 'Un peu fatigué',
  4: 'En forme',
  5: 'Pleine forme',
};

export const WELLBEING_SCALE_MIN = 0;
export const WELLBEING_SCALE_MAX = 5;
export const WELLBEING_SCALE_DEFAULT = 3;

const CHECKINS_KEY = 'wellbeingCheckins';
const SETTINGS_KEY = 'wellbeingSettings';

// ========================================
// Réglages (activation globale + par sous-partie)
// ========================================

const DEFAULT_SETTINGS = {
  enabled: true,
  moodEnabled: true,
  sleepEnabled: true,
  fatigueEnabled: true,
  chipsEnabled: true,
};

export const getWellbeingSettings = () => {
  const json = storage.getString(SETTINGS_KEY);
  if (!json) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveWellbeingSettings = (settings) => {
  storage.set(SETTINGS_KEY, JSON.stringify(settings));
};

/**
 * Vérifie si la carte "Bilan du jour" doit être affichée (feature activée
 * ET au moins une sous-partie active). Centralise la logique utilisée par
 * WellbeingCard et par l'ordonnancement des tâches sur HomeScreen.
 */
export const shouldShowWellbeingCard = () => {
  const settings = getWellbeingSettings();
  if (!settings.enabled) return false;
  return settings.moodEnabled || settings.sleepEnabled || settings.fatigueEnabled || settings.chipsEnabled;
};

// ========================================
// Storage des bilans
// ========================================

export const getCheckins = () => {
  const json = storage.getString(CHECKINS_KEY);
  return json ? JSON.parse(json) : [];
};

export const saveCheckins = (checkins) => {
  storage.set(CHECKINS_KEY, JSON.stringify(checkins));
};

/**
 * Formate une date en YYYY-MM-DD
 */
export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDateString = () => formatDate(new Date());

/**
 * Récupère le bilan d'une date donnée (YYYY-MM-DD), ou null s'il n'existe pas
 */
export const getCheckinByDate = (dateStr) => {
  const checkins = getCheckins();
  return checkins.find(c => c.date === dateStr) || null;
};

/**
 * Récupère le bilan du jour courant
 */
export const getTodayCheckin = () => getCheckinByDate(getTodayDateString());

/**
 * Crée ou met à jour le bilan du jour courant.
 * Volontairement limité à aujourd'hui : pas de paramètre de date, pour éviter
 * toute saisie rétroactive (cf. décision produit — anti-biais mémoire).
 * @param {{mood?: 0|1|2|3|4|5|null, sleep?: 0|1|2|3|4|5|null, fatigue?: 0|1|2|3|4|5|null}} updates
 */
export const saveTodayCheckin = (updates) => {
  const dateStr = getTodayDateString();
  const checkins = getCheckins();
  const index = checkins.findIndex(c => c.date === dateStr);

  if (index === -1) {
    const newCheckin = {
      date: dateStr,
      timestamp: Date.now(),
      mood: updates.mood ?? null,
      sleep: updates.sleep ?? null,
      fatigue: updates.fatigue ?? null,
    };
    checkins.push(newCheckin);
    saveCheckins(checkins);
    return newCheckin;
  }

  const existing = checkins[index];
  const updated = {
    ...existing,
    ...updates,
    timestamp: Date.now(),
  };
  checkins[index] = updated;
  saveCheckins(checkins);
  return updated;
};

/**
 * Supprime le bilan d'une date donnée (YYYY-MM-DD), s'il existe.
 */
export const deleteCheckin = (dateStr) => {
  const checkins = getCheckins().filter(c => c.date !== dateStr);
  saveCheckins(checkins);
};

/**
 * Récupère les bilans sur une plage de dates (inclusive), triés par date croissante
 * @param {Date} startDate
 * @param {Date} endDate
 */
export const getCheckinsByDateRange = (startDate, endDate) => {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return getCheckins()
    .filter(c => c.date >= startStr && c.date <= endStr)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Vérifie si le bilan du jour est "complet" au regard des sous-parties activées
 * (utilisé par le service de notification pour décider d'envoyer le rappel du soir)
 */
export const isTodayCheckinComplete = () => {
  const settings = getWellbeingSettings();
  if (!settings.enabled) return true;

  const checkin = getTodayCheckin();
  if (!checkin) {
    // Si aucune sous-partie n'est activée, rien à compléter
    return !settings.moodEnabled && !settings.sleepEnabled && !settings.fatigueEnabled;
  }

  if (settings.moodEnabled && checkin.mood == null) return false;
  if (settings.sleepEnabled && checkin.sleep == null) return false;
  if (settings.fatigueEnabled && checkin.fatigue == null) return false;
  return true;
};

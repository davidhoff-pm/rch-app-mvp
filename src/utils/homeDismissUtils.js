import storage from './storage';

// ========================================
// Masquage journalier des cartes "questionnaire" sur l'accueil
// ========================================
// Permet à l'utilisateur de swiper une carte pour la masquer de l'accueil pour
// la journée en cours (elle reste disponible dans l'onglet Bilan). Réinitialisation
// automatique le lendemain, sans action de l'utilisateur.

const STORAGE_KEY = 'homeDismissedToday';

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const readMap = () => {
  const json = storage.getString(STORAGE_KEY);
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
};

/**
 * Vérifie si une carte a été masquée par l'utilisateur pour la journée en cours.
 * @param {string} taskKey identifiant de la carte (ex: 'psccai', 'ibdisk', 'wellbeing')
 */
export const isDismissedToday = (taskKey) => readMap()[taskKey] === getTodayKey();

/**
 * Marque une carte comme masquée sur l'accueil pour la journée en cours.
 */
export const dismissForToday = (taskKey) => {
  const map = readMap();
  map[taskKey] = getTodayKey();
  storage.set(STORAGE_KEY, JSON.stringify(map));
};

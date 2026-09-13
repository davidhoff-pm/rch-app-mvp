/**
 * Registre unique des clés de stockage local (MMKV sur mobile, localStorage sur web).
 *
 * Toute nouvelle donnée persistée DOIT être déclarée ici : c'est ce registre qui
 * alimente la sauvegarde, la restauration, l'effacement complet et les migrations.
 * Une clé absente d'ici n'est ni sauvegardée ni effacée.
 */

export const STORAGE_KEYS = Object.freeze({
  // Version du schéma de données (voir migrations.js)
  dataSchemaVersion: 'dataSchemaVersion',

  // Suivi quotidien
  dailySells: 'dailySells', // selles (tableau d'entrées horodatées)
  scoresHistory: 'scoresHistory', // score PRO-2 par jour
  noStoolDay: 'noStoolDay', // jour où l'utilisateur a déclaré "pas de selles"
  normalStoolCount: 'normalStoolCount', // nb de selles "normal" servant de base au PRO-2
  symptoms: 'symptoms',
  notes: 'notes',

  // Bilan léger (humeur / sommeil / fatigue) et facteurs (chips)
  wellbeingCheckins: 'wellbeingCheckins',
  wellbeingSettings: 'wellbeingSettings',
  factorChips: 'factorChips',
  factorChipLogs: 'factorChipLogs',

  // Questionnaires
  psccaiHistory: 'psccaiHistory',
  psccaiLastUsed: 'psccaiLastUsed',
  ibdiskHistory: 'ibdiskHistory',
  ibdiskLastUsed: 'ibdiskLastUsed',
  ibdiskCurrentAnswers: 'ibdiskCurrentAnswers', // questionnaire en cours (brouillon)

  // Traitements
  medications: 'medications',
  therapeuticSchemas: 'therapeuticSchemas',
  intakes: 'intakes',
  treatmentReminderTimes: 'treatmentReminderTimes',

  // Réglages et état de l'app
  trackingMode: 'trackingMode', // 'active' | 'remission'
  notificationSettings: 'notificationSettings',
  homeDismissedToday: 'homeDismissedToday',
  suggestionDismissedAt: 'suggestionDismissedAt',
  suggestionActiveDismissedAt: 'suggestionActiveDismissedAt',
  devModeEnabled: 'devModeEnabled',

  // Clés héritées (ancien modèle Lichtiger / ancien modèle de traitement).
  // Conservées pour ne pas perdre d'anciennes données lors d'une restauration.
  dailySurvey: 'dailySurvey',
  treatments: 'treatments',
});

/** Toutes les clés de données utilisateur (hors version de schéma). */
export const USER_DATA_KEYS = Object.freeze(
  Object.values(STORAGE_KEYS).filter((k) => k !== STORAGE_KEYS.dataSchemaVersion)
);

/**
 * Clés incluses dans une sauvegarde. Tout sauf le mode développeur, qui est un
 * réglage de l'appareil et non une donnée du patient.
 */
export const BACKUP_KEYS = Object.freeze(
  USER_DATA_KEYS.filter((k) => k !== STORAGE_KEYS.devModeEnabled)
);

/** Clés effacées par "Effacer toutes les données". Tout, mode développeur compris. */
export const WIPE_KEYS = USER_DATA_KEYS;

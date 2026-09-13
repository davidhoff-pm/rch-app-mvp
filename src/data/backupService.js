/**
 * Sauvegarde / restauration / effacement complets des données locales.
 *
 * Format de fichier (v2) :
 * {
 *   app: 'rch-suivi',
 *   format: 2,
 *   appVersion: '1.2.0',
 *   schemaVersion: 1,
 *   exportedAt: '2026-09-13T10:00:00.000Z',
 *   data: { <clé>: <valeur JSON ou chaîne>, ... }
 * }
 *
 * Les anciens fichiers (v1.3.0, produits par l'export web historique) ont les
 * clés à plat à la racine avec des valeurs sérialisées en chaîne : ils sont
 * acceptés et convertis.
 *
 * Ce module est volontairement sans dépendance native (pas de fichier, pas de
 * partage) pour rester testable : l'entrée/sortie est dans backupFiles.js.
 */
import { z } from 'zod';
import storage from '../utils/storage';
import { STORAGE_KEYS, BACKUP_KEYS, WIPE_KEYS } from './storageKeys';
import { DATA_SCHEMA_VERSION, runMigrations, setStoredSchemaVersion } from './migrations';

export const BACKUP_FORMAT = 2;
export const BACKUP_APP_ID = 'rch-suivi';

const LEGACY_KEYS = [
  'scoresHistory', 'dailySells', 'dailySurvey', 'treatments',
  'ibdiskHistory', 'ibdiskLastUsed', 'psccaiHistory', 'psccaiLastUsed',
];

const SnapshotSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  format: z.number().int().positive(),
  appVersion: z.string().optional(),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.record(z.string(), z.unknown()),
});

const LegacySnapshotSchema = z.object({
  version: z.string(),
  exportDate: z.string().optional(),
  scoresHistory: z.string(),
}).passthrough();

/** Lit une clé et renvoie sa valeur parsée si c'est du JSON, sinon la chaîne brute. */
function readValue(key) {
  const raw = storage.getString(key);
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** Écrit une valeur : les chaînes telles quelles, le reste sérialisé en JSON. */
function writeValue(key, value) {
  if (value === undefined || value === null) {
    storage.delete(key);
    return;
  }
  storage.set(key, typeof value === 'string' ? value : JSON.stringify(value));
}

export function getBackupFileName(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `rch-suivi-sauvegarde-${yyyy}-${mm}-${dd}.json`;
}

/**
 * Construit l'instantané complet des données (toutes les clés de BACKUP_KEYS
 * présentes dans le stockage).
 */
export function createSnapshot({ appVersion = 'inconnue', now = new Date() } = {}) {
  const data = {};
  for (const key of BACKUP_KEYS) {
    const value = readValue(key);
    if (value !== undefined) data[key] = value;
  }
  return {
    app: BACKUP_APP_ID,
    format: BACKUP_FORMAT,
    appVersion,
    schemaVersion: DATA_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

export function serializeSnapshot(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

/**
 * Valide un contenu de sauvegarde (objet ou texte JSON). Accepte le format
 * courant et le format hérité. Retourne { ok: true, snapshot } ou
 * { ok: false, error }.
 */
export function parseSnapshot(input) {
  let obj = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      return { ok: false, error: 'Le fichier n\'est pas un JSON valide.' };
    }
  }
  if (!obj || typeof obj !== 'object') {
    return { ok: false, error: 'Le fichier ne contient pas de données.' };
  }

  const current = SnapshotSchema.safeParse(obj);
  if (current.success) {
    if (current.data.schemaVersion > DATA_SCHEMA_VERSION) {
      return {
        ok: false,
        error: 'Cette sauvegarde vient d\'une version plus récente de l\'app. Mettez l\'app à jour avant de restaurer.',
      };
    }
    const unknown = Object.keys(current.data.data).filter((k) => !BACKUP_KEYS.includes(k));
    return { ok: true, snapshot: current.data, ignoredKeys: unknown };
  }

  const legacy = LegacySnapshotSchema.safeParse(obj);
  if (legacy.success) {
    const data = {};
    for (const key of LEGACY_KEYS) {
      const raw = legacy.data[key];
      if (typeof raw !== 'string' || raw === '') continue;
      try {
        data[key] = JSON.parse(raw);
      } catch {
        data[key] = raw;
      }
    }
    return {
      ok: true,
      snapshot: {
        app: BACKUP_APP_ID,
        format: 1,
        appVersion: legacy.data.version,
        schemaVersion: 1,
        exportedAt: legacy.data.exportDate || new Date(0).toISOString(),
        data,
      },
      ignoredKeys: [],
      legacy: true,
    };
  }

  return { ok: false, error: 'Ce fichier n\'est pas une sauvegarde RCH Suivi.' };
}

/**
 * Restaure un instantané : remplace TOUTES les données de BACKUP_KEYS (les clés
 * absentes du fichier sont effacées, pour retrouver exactement l'état sauvegardé),
 * puis rejoue les migrations si le fichier vient d'un schéma plus ancien.
 */
export function restoreSnapshot(snapshot) {
  for (const key of BACKUP_KEYS) {
    writeValue(key, snapshot.data[key]);
  }
  setStoredSchemaVersion(snapshot.schemaVersion);
  const migration = runMigrations();
  return { restoredKeys: Object.keys(snapshot.data).filter((k) => BACKUP_KEYS.includes(k)), migration };
}

/** Efface toutes les données utilisateur et remet la version de schéma courante. */
export function wipeAllData() {
  for (const key of WIPE_KEYS) {
    storage.delete(key);
  }
  setStoredSchemaVersion(DATA_SCHEMA_VERSION);
}

/** Petit résumé lisible d'un instantané (pour l'écran de confirmation). */
export function describeSnapshot(snapshot) {
  const d = snapshot.data || {};
  const count = (v) => (Array.isArray(v) ? v.length : 0);
  return {
    exportedAt: snapshot.exportedAt,
    appVersion: snapshot.appVersion,
    stools: count(d[STORAGE_KEYS.dailySells]),
    scores: count(d[STORAGE_KEYS.scoresHistory]),
    psccai: count(d[STORAGE_KEYS.psccaiHistory]),
    ibdisk: count(d[STORAGE_KEYS.ibdiskHistory]),
    schemas: count(d[STORAGE_KEYS.therapeuticSchemas]),
    notes: count(d[STORAGE_KEYS.notes]),
    symptoms: count(d[STORAGE_KEYS.symptoms]),
    checkins: count(d[STORAGE_KEYS.wellbeingCheckins]),
  };
}

/**
 * Versionnement du schéma de données local.
 *
 * Chaque fois que la forme d'une donnée persistée change (nouveau champ
 * obligatoire, renommage de clé, changement de format), on incrémente
 * DATA_SCHEMA_VERSION et on ajoute une migration dans MIGRATIONS. Au démarrage,
 * runMigrations() applique dans l'ordre celles qui manquent, ce qui permet de
 * faire évoluer l'app sans casser les données déjà présentes chez les patients.
 */
import storage from '../utils/storage';
import { STORAGE_KEYS } from './storageKeys';

export const DATA_SCHEMA_VERSION = 1;

/**
 * Liste ordonnée des migrations : { to: <version cible>, run: () => void }.
 * La version 1 correspond aux données telles qu'elles existent avant
 * l'introduction du versionnement : aucune transformation nécessaire.
 */
export const MIGRATIONS = [];

export function getStoredSchemaVersion() {
  const raw = storage.getString(STORAGE_KEYS.dataSchemaVersion);
  const n = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function setStoredSchemaVersion(version) {
  storage.set(STORAGE_KEYS.dataSchemaVersion, String(version));
}

/**
 * Applique les migrations manquantes. Retourne { from, to, applied }.
 * Idempotent : sans rien à faire, ne touche pas au stockage sauf pour
 * enregistrer la version courante la première fois.
 */
export function runMigrations() {
  const stored = getStoredSchemaVersion();
  // Première ouverture avec versionnement : les données existantes sont en v1.
  const from = stored ?? 1;
  let current = from;
  const applied = [];

  for (const migration of MIGRATIONS) {
    if (migration.to > current && migration.to <= DATA_SCHEMA_VERSION) {
      migration.run();
      current = migration.to;
      applied.push(migration.to);
    }
  }

  if (stored !== DATA_SCHEMA_VERSION) {
    setStoredSchemaVersion(DATA_SCHEMA_VERSION);
  }

  return { from, to: DATA_SCHEMA_VERSION, applied };
}

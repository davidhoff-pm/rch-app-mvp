import storage from '../../utils/storage';
import { STORAGE_KEYS, BACKUP_KEYS, WIPE_KEYS } from '../storageKeys';
import { DATA_SCHEMA_VERSION, runMigrations, getStoredSchemaVersion } from '../migrations';
import {
  createSnapshot,
  serializeSnapshot,
  parseSnapshot,
  restoreSnapshot,
  wipeAllData,
  describeSnapshot,
  getBackupFileName,
  BACKUP_FORMAT,
} from '../backupService';

const stools = [
  { id: 's1', timestamp: 1700000000000, bristolScale: 4, hasBlood: false, bloodOnly: false },
  { id: 's2', timestamp: 1700003600000, bristolScale: 6, hasBlood: true, bloodOnly: false },
];
const schemas = [{ id: 'sch1', medicationId: 'm1', startDate: '2026-01-01', endDate: null, frequency: { type: 'daily', doses: { matin: 1, midi: 0, soir: 1 } } }];

function seedFullDataset() {
  storage.set(STORAGE_KEYS.dailySells, JSON.stringify(stools));
  storage.set(STORAGE_KEYS.scoresHistory, JSON.stringify([{ date: '2023-11-14', score: 2 }]));
  storage.set(STORAGE_KEYS.normalStoolCount, '2');
  storage.set(STORAGE_KEYS.trackingMode, 'remission');
  storage.set(STORAGE_KEYS.medications, JSON.stringify({ m1: { id: 'm1', name: 'Pentasa' } }));
  storage.set(STORAGE_KEYS.therapeuticSchemas, JSON.stringify(schemas));
  storage.set(STORAGE_KEYS.intakes, JSON.stringify([{ id: 'i1', medicationId: 'm1', schemaId: 'sch1', doses: 1, timestamp: 1700000000000 }]));
  storage.set(STORAGE_KEYS.notes, JSON.stringify([{ id: 'n1', content: 'Voyage', timestamp: 1700000000000 }]));
  storage.set(STORAGE_KEYS.symptoms, JSON.stringify([{ id: 'sy1', type: 'fatigue', intensity: 2, timestamp: 1700000000000 }]));
  storage.set(STORAGE_KEYS.wellbeingCheckins, JSON.stringify([{ date: '2023-11-14', timestamp: 1700000000000, mood: 2, sleep: 1, fatigue: 3 }]));
  storage.set(STORAGE_KEYS.wellbeingSettings, JSON.stringify({ enabled: true, moodEnabled: false, sleepEnabled: true, fatigueEnabled: true, chipsEnabled: true }));
  storage.set(STORAGE_KEYS.factorChips, JSON.stringify([{ id: 'c1', label: 'Café', category: 'alimentation', isDefault: true, active: true, archived: false, createdAt: 1700000000000 }]));
  storage.set(STORAGE_KEYS.factorChipLogs, JSON.stringify([{ chipId: 'c1', date: '2023-11-14', timestamp: 1700000000000 }]));
  storage.set(STORAGE_KEYS.psccaiHistory, JSON.stringify([{ date: '2023-11-14', timestamp: 1700000000000, total: 3 }]));
  storage.set(STORAGE_KEYS.psccaiLastUsed, '1700000000000');
  storage.set(STORAGE_KEYS.ibdiskHistory, JSON.stringify([{ date: '2023-11-01', timestamp: 1698800000000, answers: {}, completed: true }]));
  storage.set(STORAGE_KEYS.ibdiskLastUsed, '1698800000000');
  storage.set(STORAGE_KEYS.notificationSettings, JSON.stringify({ enabled: true, stoolReminder: { enabled: true, hour: 21, minute: 0 } }));
  storage.set(STORAGE_KEYS.treatmentReminderTimes, JSON.stringify({ matin: '07:30', midi: '12:00', soir: '20:00' }));
  storage.set(STORAGE_KEYS.devModeEnabled, 'true');
}

function dumpAll(keys) {
  const out = {};
  for (const k of keys) out[k] = storage.getString(k);
  return out;
}

beforeEach(() => {
  for (const k of Object.values(STORAGE_KEYS)) storage.delete(k);
});

describe('registre des clés', () => {
  it('la sauvegarde couvre toutes les données sauf le mode développeur', () => {
    expect(BACKUP_KEYS).not.toContain(STORAGE_KEYS.devModeEnabled);
    expect(BACKUP_KEYS).not.toContain(STORAGE_KEYS.dataSchemaVersion);
    for (const k of ['dailySells', 'medications', 'therapeuticSchemas', 'intakes', 'symptoms', 'notes',
      'wellbeingCheckins', 'wellbeingSettings', 'factorChips', 'factorChipLogs', 'psccaiHistory',
      'ibdiskHistory', 'notificationSettings', 'treatmentReminderTimes', 'trackingMode', 'normalStoolCount']) {
      expect(BACKUP_KEYS).toContain(k);
    }
  });

  it("l'effacement couvre le mode développeur en plus", () => {
    expect(WIPE_KEYS).toContain(STORAGE_KEYS.devModeEnabled);
  });
});

describe('migrations', () => {
  it('enregistre la version courante au premier lancement sans rien appliquer', () => {
    expect(getStoredSchemaVersion()).toBeNull();
    const r = runMigrations();
    expect(r).toEqual({ from: 1, to: DATA_SCHEMA_VERSION, applied: [] });
    expect(getStoredSchemaVersion()).toBe(DATA_SCHEMA_VERSION);
  });

  it('est idempotent', () => {
    runMigrations();
    const r = runMigrations();
    expect(r.applied).toEqual([]);
    expect(getStoredSchemaVersion()).toBe(DATA_SCHEMA_VERSION);
  });
});

describe('sauvegarde et restauration', () => {
  it('nom de fichier daté', () => {
    expect(getBackupFileName(new Date(2026, 8, 13))).toBe('rch-suivi-sauvegarde-2026-09-13.json');
  });

  it('un aller-retour sur un jeu de données complet redonne exactement le même stockage', () => {
    seedFullDataset();
    runMigrations();
    const before = dumpAll(BACKUP_KEYS);

    const snapshot = createSnapshot({ appVersion: '1.2.0', now: new Date('2026-09-13T10:00:00Z') });
    expect(snapshot.app).toBe('rch-suivi');
    expect(snapshot.format).toBe(BACKUP_FORMAT);
    expect(snapshot.schemaVersion).toBe(DATA_SCHEMA_VERSION);
    expect(snapshot.data.dailySells).toEqual(stools);
    expect(snapshot.data.trackingMode).toBe('remission');
    expect(snapshot.data.devModeEnabled).toBeUndefined();

    const text = serializeSnapshot(snapshot);
    wipeAllData();
    expect(storage.getString(STORAGE_KEYS.dailySells)).toBeUndefined();

    const parsed = parseSnapshot(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.ignoredKeys).toEqual([]);
    restoreSnapshot(parsed.snapshot);

    const after = dumpAll(BACKUP_KEYS);
    for (const k of BACKUP_KEYS) {
      const a = before[k];
      const b = after[k];
      if (a === undefined) {
        expect(b).toBeUndefined();
      } else {
        // comparaison sémantique (le JSON peut être re-sérialisé sans espaces)
        let pa; let pb;
        try { pa = JSON.parse(a); pb = JSON.parse(b); } catch { pa = a; pb = b; }
        expect(pb).toEqual(pa);
      }
    }
    expect(getStoredSchemaVersion()).toBe(DATA_SCHEMA_VERSION);
  });

  it('la restauration remplace tout : les données absentes du fichier sont effacées', () => {
    seedFullDataset();
    const snapshot = createSnapshot();
    delete snapshot.data.notes;
    storage.set(STORAGE_KEYS.symptoms, JSON.stringify([{ id: 'nouveau' }]));
    restoreSnapshot(snapshot);
    expect(storage.getString(STORAGE_KEYS.notes)).toBeUndefined();
    expect(JSON.parse(storage.getString(STORAGE_KEYS.symptoms))[0].id).toBe('sy1');
  });

  it('accepte un ancien fichier v1.3.0 (export web historique)', () => {
    const legacy = {
      scoresHistory: JSON.stringify([{ date: '2025-01-01', score: 3 }]),
      dailySells: JSON.stringify(stools),
      dailySurvey: '{}',
      treatments: '[]',
      ibdiskHistory: '[]',
      ibdiskLastUsed: '',
      psccaiHistory: JSON.stringify([{ date: '2025-01-01', total: 4 }]),
      psccaiLastUsed: '1735689600000',
      exportDate: '2025-01-02T00:00:00.000Z',
      version: '1.3.0',
    };
    const parsed = parseSnapshot(JSON.stringify(legacy));
    expect(parsed.ok).toBe(true);
    expect(parsed.legacy).toBe(true);
    restoreSnapshot(parsed.snapshot);
    expect(JSON.parse(storage.getString(STORAGE_KEYS.dailySells))).toEqual(stools);
    expect(storage.getString(STORAGE_KEYS.psccaiLastUsed)).toBe('1735689600000');
    expect(storage.getString(STORAGE_KEYS.ibdiskLastUsed)).toBeUndefined();
    expect(getStoredSchemaVersion()).toBe(DATA_SCHEMA_VERSION);
  });

  it('refuse un JSON invalide, un fichier étranger et une version future, sans toucher aux données', () => {
    seedFullDataset();
    const before = dumpAll(BACKUP_KEYS);

    expect(parseSnapshot('{ pas du json').ok).toBe(false);
    expect(parseSnapshot('42').ok).toBe(false);
    expect(parseSnapshot(JSON.stringify({ foo: 'bar' })).ok).toBe(false);

    const future = createSnapshot();
    future.schemaVersion = DATA_SCHEMA_VERSION + 1;
    const r = parseSnapshot(JSON.stringify(future));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/plus récente/);

    expect(dumpAll(BACKUP_KEYS)).toEqual(before);
  });

  it('signale les clés inconnues sans les restaurer', () => {
    const snapshot = createSnapshot();
    snapshot.data.cleInconnue = [1, 2, 3];
    const parsed = parseSnapshot(snapshot);
    expect(parsed.ok).toBe(true);
    expect(parsed.ignoredKeys).toEqual(['cleInconnue']);
    restoreSnapshot(parsed.snapshot);
    expect(storage.getString('cleInconnue')).toBeUndefined();
  });

  it('describeSnapshot résume les volumes', () => {
    seedFullDataset();
    const d = describeSnapshot(createSnapshot());
    expect(d).toMatchObject({ stools: 2, scores: 1, psccai: 1, ibdisk: 1, schemas: 1, notes: 1, symptoms: 1, checkins: 1 });
  });
});

describe('effacement', () => {
  it('vide toutes les clés utilisateur, mode développeur compris, et garde la version de schéma', () => {
    seedFullDataset();
    wipeAllData();
    for (const k of WIPE_KEYS) expect(storage.getString(k)).toBeUndefined();
    expect(getStoredSchemaVersion()).toBe(DATA_SCHEMA_VERSION);
  });
});

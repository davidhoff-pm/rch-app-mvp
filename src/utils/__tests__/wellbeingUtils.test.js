import storage from '../storage';
import {
  getWellbeingSettings,
  saveWellbeingSettings,
  getCheckins,
  saveCheckins,
  formatDate,
  getTodayDateString,
  getCheckinByDate,
  getTodayCheckin,
  saveTodayCheckin,
  getCheckinsByDateRange,
  isTodayCheckinComplete,
} from '../wellbeingUtils';

const CHECKINS_KEY = 'wellbeingCheckins';
const SETTINGS_KEY = 'wellbeingSettings';

beforeEach(() => {
  storage.delete(CHECKINS_KEY);
  storage.delete(SETTINGS_KEY);
});

describe('formatDate / getTodayDateString', () => {
  it('formate une date au format YYYY-MM-DD', () => {
    expect(formatDate(new Date(2025, 10, 7))).toBe('2025-11-07');
  });

  it("getTodayDateString retourne la date du jour formatée", () => {
    expect(getTodayDateString()).toBe(formatDate(new Date()));
  });
});

describe('getWellbeingSettings / saveWellbeingSettings', () => {
  it('retourne les réglages par défaut si rien en storage', () => {
    const settings = getWellbeingSettings();
    expect(settings).toEqual({
      enabled: true,
      moodEnabled: true,
      sleepEnabled: true,
      fatigueEnabled: true,
      chipsEnabled: true,
    });
  });

  it('sauvegarde puis relit des réglages personnalisés', () => {
    saveWellbeingSettings({
      enabled: true,
      moodEnabled: false,
      sleepEnabled: true,
      fatigueEnabled: false,
      chipsEnabled: true,
    });

    expect(getWellbeingSettings()).toEqual({
      enabled: true,
      moodEnabled: false,
      sleepEnabled: true,
      fatigueEnabled: false,
      chipsEnabled: true,
    });
  });

  it('complète avec les valeurs par défaut si le JSON stocké est partiel', () => {
    storage.set(SETTINGS_KEY, JSON.stringify({ enabled: false }));

    expect(getWellbeingSettings()).toEqual({
      enabled: false,
      moodEnabled: true,
      sleepEnabled: true,
      fatigueEnabled: true,
      chipsEnabled: true,
    });
  });

  it('retourne les valeurs par défaut si le JSON stocké est corrompu', () => {
    storage.set(SETTINGS_KEY, 'not valid json');

    expect(getWellbeingSettings()).toEqual({
      enabled: true,
      moodEnabled: true,
      sleepEnabled: true,
      fatigueEnabled: true,
      chipsEnabled: true,
    });
  });
});

describe('getCheckins / saveCheckins', () => {
  it('retourne un tableau vide si rien en storage', () => {
    expect(getCheckins()).toEqual([]);
  });

  it('sauvegarde puis relit une liste de bilans', () => {
    const checkins = [
      { date: '2025-11-07', timestamp: 1, mood: 3, sleep: 2, fatigue: 1 },
    ];
    saveCheckins(checkins);
    expect(getCheckins()).toEqual(checkins);
  });
});

describe('getCheckinByDate / getTodayCheckin', () => {
  it('retourne null si aucun bilan pour la date demandée', () => {
    expect(getCheckinByDate('2025-11-07')).toBeNull();
  });

  it('retourne le bilan correspondant à la date demandée', () => {
    const checkin = { date: '2025-11-07', timestamp: 1, mood: 3, sleep: 2, fatigue: 1 };
    saveCheckins([checkin]);
    expect(getCheckinByDate('2025-11-07')).toEqual(checkin);
  });

  it("getTodayCheckin retourne null si aucun bilan aujourd'hui", () => {
    expect(getTodayCheckin()).toBeNull();
  });
});

describe('saveTodayCheckin', () => {
  it("crée le bilan du jour s'il n'existe pas", () => {
    const created = saveTodayCheckin({ mood: 3 });

    expect(created.date).toBe(getTodayDateString());
    expect(created.mood).toBe(3);
    expect(created.sleep).toBeNull();
    expect(created.fatigue).toBeNull();
    expect(getCheckins()).toHaveLength(1);
  });

  it("met à jour le bilan du jour existant sans écraser les autres champs", () => {
    saveTodayCheckin({ mood: 3 });
    const updated = saveTodayCheckin({ sleep: 2 });

    expect(updated.mood).toBe(3);
    expect(updated.sleep).toBe(2);
    expect(getCheckins()).toHaveLength(1);
  });
});

describe('getCheckinsByDateRange', () => {
  it('filtre et trie les bilans dans la plage de dates (inclusive)', () => {
    saveCheckins([
      { date: '2025-11-05', timestamp: 1, mood: 1, sleep: 1, fatigue: 1 },
      { date: '2025-11-08', timestamp: 2, mood: 2, sleep: 2, fatigue: 2 },
      { date: '2025-11-01', timestamp: 3, mood: 3, sleep: 3, fatigue: 3 },
      { date: '2025-11-10', timestamp: 4, mood: 1, sleep: 1, fatigue: 1 },
    ]);

    const result = getCheckinsByDateRange(new Date(2025, 10, 5), new Date(2025, 10, 8));
    expect(result.map(c => c.date)).toEqual(['2025-11-05', '2025-11-08']);
  });
});

describe('isTodayCheckinComplete', () => {
  it('retourne true si le bilan léger est désactivé globalement', () => {
    saveWellbeingSettings({
      enabled: false,
      moodEnabled: true,
      sleepEnabled: true,
      fatigueEnabled: true,
      chipsEnabled: true,
    });

    expect(isTodayCheckinComplete()).toBe(true);
  });

  it("retourne true si aucune sous-partie n'est activée et aucun bilan saisi", () => {
    saveWellbeingSettings({
      enabled: true,
      moodEnabled: false,
      sleepEnabled: false,
      fatigueEnabled: false,
      chipsEnabled: true,
    });

    expect(isTodayCheckinComplete()).toBe(true);
  });

  it('retourne false si une sous-partie activée manque dans le bilan du jour', () => {
    saveWellbeingSettings({
      enabled: true,
      moodEnabled: true,
      sleepEnabled: true,
      fatigueEnabled: true,
      chipsEnabled: true,
    });
    saveTodayCheckin({ mood: 3 });

    expect(isTodayCheckinComplete()).toBe(false);
  });

  it('retourne true si toutes les sous-parties activées sont renseignées', () => {
    saveWellbeingSettings({
      enabled: true,
      moodEnabled: true,
      sleepEnabled: false,
      fatigueEnabled: true,
      chipsEnabled: true,
    });
    saveTodayCheckin({ mood: 3, fatigue: 2 });

    expect(isTodayCheckinComplete()).toBe(true);
  });
});

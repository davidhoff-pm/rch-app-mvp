import storage from '../storage';
import {
  MAX_ACTIVE_CHIPS,
  getFactorChips,
  saveFactorChips,
  getChipById,
  getActiveChips,
  getManageableChips,
  getArchivedChips,
  createCustomChip,
  toggleChipActive,
  updateChip,
  archiveChip,
  unarchiveChip,
  getFactorChipLogs,
  saveFactorChipLogs,
  getLogsByDate,
  getActiveChipIdsForDate,
  toggleChipLogForToday,
  isChipActiveToday,
  getChipLogsGroupedByDate,
} from '../factorChipsUtils';
import { getTodayDateString } from '../wellbeingUtils';

const CHIPS_KEY = 'factorChips';
const LOGS_KEY = 'factorChipLogs';

beforeEach(() => {
  storage.delete(CHIPS_KEY);
  storage.delete(LOGS_KEY);
});

const makeChip = (overrides = {}) => ({
  id: 'chip-1',
  label: 'Test',
  category: 'autre',
  isDefault: false,
  active: true,
  archived: false,
  createdAt: 1,
  ...overrides,
});

describe('getFactorChips', () => {
  it('amorce des suggestions par défaut (désactivées) si rien en storage', () => {
    const chips = getFactorChips();
    expect(chips.length).toBeGreaterThan(0);
    expect(chips.every(c => c.active === false)).toBe(true);
    expect(chips.every(c => c.isDefault === true)).toBe(true);
  });

  it('ne réamorce pas si des chips existent déjà', () => {
    saveFactorChips([makeChip()]);
    const chips = getFactorChips();
    expect(chips).toHaveLength(1);
    expect(chips[0].id).toBe('chip-1');
  });
});

describe('getChipById', () => {
  it('retourne la chip correspondante', () => {
    saveFactorChips([makeChip({ id: 'a' }), makeChip({ id: 'b' })]);
    expect(getChipById('b').id).toBe('b');
  });

  it('retourne null si la chip est introuvable', () => {
    saveFactorChips([makeChip({ id: 'a' })]);
    expect(getChipById('zzz')).toBeNull();
  });
});

describe('getActiveChips / getManageableChips / getArchivedChips', () => {
  beforeEach(() => {
    saveFactorChips([
      makeChip({ id: 'a', active: true, archived: false, createdAt: 3 }),
      makeChip({ id: 'b', active: false, archived: false, createdAt: 1 }),
      makeChip({ id: 'c', active: true, archived: true, createdAt: 2 }),
    ]);
  });

  it('getActiveChips ne retourne que les chips actives et non archivées, triées par création', () => {
    expect(getActiveChips().map(c => c.id)).toEqual(['a']);
  });

  it('getManageableChips retourne toutes les chips non archivées, triées par création', () => {
    expect(getManageableChips().map(c => c.id)).toEqual(['b', 'a']);
  });

  it('getArchivedChips ne retourne que les chips archivées', () => {
    expect(getArchivedChips().map(c => c.id)).toEqual(['c']);
  });
});

describe('createCustomChip', () => {
  it('crée une chip active si sous la limite', () => {
    const { chip, error } = createCustomChip('  Nouveau facteur  ', 'comportement');
    expect(error).toBeNull();
    expect(chip.label).toBe('Nouveau facteur');
    expect(chip.category).toBe('comportement');
    expect(chip.active).toBe(true);
    expect(chip.isDefault).toBe(false);
    expect(getFactorChips().some(c => c.id === chip.id)).toBe(true);
  });

  it('rejette un label vide', () => {
    const { chip, error } = createCustomChip('   ');
    expect(chip).toBeNull();
    expect(error).toBe('empty_label');
  });

  it('crée la chip mais inactive et retourne une erreur si la limite est atteinte', () => {
    const chips = Array.from({ length: MAX_ACTIVE_CHIPS }, (_, i) =>
      makeChip({ id: `chip-${i}`, active: true, archived: false })
    );
    saveFactorChips(chips);

    const { chip, error } = createCustomChip('Un de plus');
    expect(chip.active).toBe(false);
    expect(error).toBe('max_active_reached');
  });

  it('utilise "autre" comme catégorie par défaut', () => {
    const { chip } = createCustomChip('Sans catégorie');
    expect(chip.category).toBe('autre');
  });
});

describe('toggleChipActive', () => {
  it('active une chip inactive sous la limite', () => {
    saveFactorChips([makeChip({ id: 'a', active: false })]);
    const { success, error } = toggleChipActive('a');
    expect(success).toBe(true);
    expect(error).toBeNull();
    expect(getChipById('a').active).toBe(true);
  });

  it('désactive une chip active', () => {
    saveFactorChips([makeChip({ id: 'a', active: true })]);
    const { success } = toggleChipActive('a');
    expect(success).toBe(true);
    expect(getChipById('a').active).toBe(false);
  });

  it('refuse d\'activer une chip au-delà de MAX_ACTIVE_CHIPS', () => {
    const chips = Array.from({ length: MAX_ACTIVE_CHIPS }, (_, i) =>
      makeChip({ id: `chip-${i}`, active: true })
    );
    chips.push(makeChip({ id: 'extra', active: false }));
    saveFactorChips(chips);

    const { success, error } = toggleChipActive('extra');
    expect(success).toBe(false);
    expect(error).toBe('max_active_reached');
    expect(getChipById('extra').active).toBe(false);
  });

  it('retourne une erreur si la chip est introuvable', () => {
    saveFactorChips([]);
    const { success, error } = toggleChipActive('zzz');
    expect(success).toBe(false);
    expect(error).toBe('not_found');
  });
});

describe('updateChip', () => {
  it('renomme et recatégorise une chip existante', () => {
    saveFactorChips([makeChip({ id: 'a', label: 'Ancien', category: 'autre' })]);
    updateChip('a', { label: '  Nouveau  ', category: 'alimentation' });

    const chip = getChipById('a');
    expect(chip.label).toBe('Nouveau');
    expect(chip.category).toBe('alimentation');
  });

  it('ne fait rien si la chip est introuvable', () => {
    saveFactorChips([makeChip({ id: 'a' })]);
    expect(() => updateChip('zzz', { label: 'X' })).not.toThrow();
  });
});

describe('archiveChip / unarchiveChip', () => {
  it('archive une chip et la désactive', () => {
    saveFactorChips([makeChip({ id: 'a', active: true, archived: false })]);
    archiveChip('a');

    const chip = getChipById('a');
    expect(chip.archived).toBe(true);
    expect(chip.active).toBe(false);
  });

  it('désarchive une chip (reste inactive)', () => {
    saveFactorChips([makeChip({ id: 'a', active: false, archived: true })]);
    unarchiveChip('a');

    expect(getChipById('a').archived).toBe(false);
  });
});

describe('logs quotidiens', () => {
  it('getFactorChipLogs retourne un tableau vide si rien en storage', () => {
    expect(getFactorChipLogs()).toEqual([]);
  });

  it('toggleChipLogForToday ajoute un log puis le retire (toggle)', () => {
    const first = toggleChipLogForToday('chip-1');
    expect(first).toBe(true);
    expect(getFactorChipLogs()).toHaveLength(1);
    expect(isChipActiveToday('chip-1')).toBe(true);

    const second = toggleChipLogForToday('chip-1');
    expect(second).toBe(false);
    expect(getFactorChipLogs()).toHaveLength(0);
    expect(isChipActiveToday('chip-1')).toBe(false);
  });

  it('getLogsByDate / getActiveChipIdsForDate filtrent par date', () => {
    const today = getTodayDateString();
    saveFactorChipLogs([
      { chipId: 'a', date: today, timestamp: 1 },
      { chipId: 'b', date: '2000-01-01', timestamp: 2 },
    ]);

    expect(getLogsByDate(today)).toHaveLength(1);
    expect(getActiveChipIdsForDate(today)).toEqual(['a']);
  });

  it('getChipLogsGroupedByDate regroupe les logs par date sur une plage', () => {
    saveFactorChipLogs([
      { chipId: 'a', date: '2025-11-05', timestamp: 1 },
      { chipId: 'b', date: '2025-11-05', timestamp: 2 },
      { chipId: 'c', date: '2025-11-08', timestamp: 3 },
      { chipId: 'd', date: '2025-11-01', timestamp: 4 },
    ]);

    const grouped = getChipLogsGroupedByDate(new Date(2025, 10, 5), new Date(2025, 10, 8));
    expect(grouped).toEqual({
      '2025-11-05': ['a', 'b'],
      '2025-11-08': ['c'],
    });
  });
});

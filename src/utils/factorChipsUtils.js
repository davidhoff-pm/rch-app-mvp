import storage from './storage';
import { formatDate, getTodayDateString } from './wellbeingUtils';

// ========================================
// Chips de suivi de facteurs personnalisables
// ========================================
// Voir docs/FEATURE_SUIVI_LEGER.md pour le cadrage complet.
// Une chip = un facteur à tracker (alimentation, comportement...).
// Tap quotidien uniquement (booléen), pas de notion de durée ni d'intensité :
// un régime suivi sur 5 jours nécessite 5 taps distincts, un par jour.

const CHIPS_KEY = 'factorChips';
const LOGS_KEY = 'factorChipLogs';

// Nombre maximum de chips actives affichées simultanément (anti-surcharge visuelle)
export const MAX_ACTIVE_CHIPS = 8;

/**
 * Suggestions par défaut, reprises de l'ancienne base de tags (src/utils/tagDefinitions.js,
 * non utilisée en production) comme simple contenu de départ. Proposées désactivées :
 * l'utilisateur choisit lui-même celles qu'il veut suivre.
 */
const SUGGESTED_CHIP_LABELS = [
  { label: 'Produits laitiers', category: 'alimentation' },
  { label: 'Alcool', category: 'alimentation' },
  { label: 'Fast food', category: 'alimentation' },
  { label: 'Café', category: 'alimentation' },
  { label: 'Aliments fermentés', category: 'alimentation' },
  { label: 'Hydratation importante', category: 'alimentation' },
  { label: 'Régime sans résidu', category: 'alimentation' },
  { label: 'Stress travail', category: 'comportement' },
  { label: 'Sommeil perturbé', category: 'comportement' },
  { label: 'Sport modéré', category: 'comportement' },
  { label: 'Relaxation', category: 'comportement' },
  { label: 'Méditation', category: 'comportement' },
];

const generateChipId = () => `chip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ========================================
// Storage — définitions des chips
// ========================================

const seedDefaultChips = () => {
  const now = Date.now();
  const seeded = SUGGESTED_CHIP_LABELS.map((suggestion, index) => ({
    id: generateChipId(),
    label: suggestion.label,
    category: suggestion.category,
    isDefault: true,
    active: false,
    archived: false,
    createdAt: now + index, // ordre stable
  }));
  saveFactorChips(seeded);
  return seeded;
};

export const getFactorChips = () => {
  const json = storage.getString(CHIPS_KEY);
  if (!json) {
    return seedDefaultChips();
  }
  return JSON.parse(json);
};

export const saveFactorChips = (chips) => {
  storage.set(CHIPS_KEY, JSON.stringify(chips));
};

export const getChipById = (id) => {
  return getFactorChips().find(c => c.id === id) || null;
};

/**
 * Chips actives et non archivées, dans l'ordre de création — celles affichées sur le widget.
 */
export const getActiveChips = () => {
  return getFactorChips()
    .filter(c => c.active && !c.archived)
    .sort((a, b) => a.createdAt - b.createdAt);
};

/**
 * Chips visibles dans l'écran de gestion (tout sauf archivées)
 */
export const getManageableChips = () => {
  return getFactorChips()
    .filter(c => !c.archived)
    .sort((a, b) => a.createdAt - b.createdAt);
};

export const getArchivedChips = () => {
  return getFactorChips().filter(c => c.archived);
};

/**
 * Crée une chip personnalisée.
 * @returns {{chip: object|null, error: string|null}}
 */
export const createCustomChip = (label, category = 'autre') => {
  const trimmed = (label || '').trim();
  if (!trimmed) {
    return { chip: null, error: 'empty_label' };
  }

  const chips = getFactorChips();
  const activeCount = chips.filter(c => c.active && !c.archived).length;

  const newChip = {
    id: generateChipId(),
    label: trimmed,
    category,
    isDefault: false,
    active: activeCount < MAX_ACTIVE_CHIPS,
    archived: false,
    createdAt: Date.now(),
  };

  chips.push(newChip);
  saveFactorChips(chips);

  return { chip: newChip, error: activeCount >= MAX_ACTIVE_CHIPS ? 'max_active_reached' : null };
};

/**
 * Active ou désactive une chip (visible sur le widget du jour).
 * Bloque l'activation au-delà de MAX_ACTIVE_CHIPS.
 * @returns {{success: boolean, error: string|null}}
 */
export const toggleChipActive = (id) => {
  const chips = getFactorChips();
  const chip = chips.find(c => c.id === id);
  if (!chip) return { success: false, error: 'not_found' };

  if (!chip.active) {
    const activeCount = chips.filter(c => c.active && !c.archived).length;
    if (activeCount >= MAX_ACTIVE_CHIPS) {
      return { success: false, error: 'max_active_reached' };
    }
  }

  chip.active = !chip.active;
  saveFactorChips(chips);
  return { success: true, error: null };
};

/**
 * Renomme / recatégorise une chip existante (les logs passés restent inchangés).
 */
export const updateChip = (id, updates) => {
  const chips = getFactorChips();
  const chip = chips.find(c => c.id === id);
  if (!chip) return;

  if (updates.label !== undefined) chip.label = updates.label.trim();
  if (updates.category !== undefined) chip.category = updates.category;

  saveFactorChips(chips);
};

/**
 * Archive une chip (soft-delete) : elle disparaît du widget et de l'écran de gestion,
 * mais son historique de logs est conservé pour l'intégrité des données passées.
 */
export const archiveChip = (id) => {
  const chips = getFactorChips();
  const chip = chips.find(c => c.id === id);
  if (!chip) return;

  chip.archived = true;
  chip.active = false;
  saveFactorChips(chips);
};

export const unarchiveChip = (id) => {
  const chips = getFactorChips();
  const chip = chips.find(c => c.id === id);
  if (!chip) return;

  chip.archived = false;
  saveFactorChips(chips);
};

// ========================================
// Storage — logs quotidiens (occurrences de tap)
// ========================================

export const getFactorChipLogs = () => {
  const json = storage.getString(LOGS_KEY);
  return json ? JSON.parse(json) : [];
};

export const saveFactorChipLogs = (logs) => {
  storage.set(LOGS_KEY, JSON.stringify(logs));
};

export const getLogsByDate = (dateStr) => {
  return getFactorChipLogs().filter(l => l.date === dateStr);
};

/**
 * IDs des chips actives (tapées) pour une date donnée.
 */
export const getActiveChipIdsForDate = (dateStr) => {
  return getLogsByDate(dateStr).map(l => l.chipId);
};

/**
 * Tap sur une chip pour le jour courant : ajoute le log s'il n'existe pas,
 * le retire sinon (toggle). Retourne le nouvel état (true = actif aujourd'hui).
 */
export const toggleChipLogForToday = (chipId) => {
  const dateStr = getTodayDateString();
  const logs = getFactorChipLogs();
  const index = logs.findIndex(l => l.chipId === chipId && l.date === dateStr);

  if (index === -1) {
    logs.push({ chipId, date: dateStr, timestamp: Date.now() });
    saveFactorChipLogs(logs);
    return true;
  }

  logs.splice(index, 1);
  saveFactorChipLogs(logs);
  return false;
};

export const isChipActiveToday = (chipId) => {
  return getActiveChipIdsForDate(getTodayDateString()).some(id => id === chipId);
};

/**
 * Logs sur une plage de dates, groupés par date (YYYY-MM-DD -> [chipId, ...]).
 * Utilisé pour l'overlay visuel sur les graphiques (StatsScreen).
 */
export const getChipLogsGroupedByDate = (startDate, endDate) => {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  const logs = getFactorChipLogs().filter(l => l.date >= startStr && l.date <= endStr);

  const grouped = {};
  logs.forEach(log => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log.chipId);
  });
  return grouped;
};

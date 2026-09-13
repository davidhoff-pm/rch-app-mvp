import storage from './storage';

const COOLDOWN_DAYS = 7;

/**
 * Calcule les 3 items auto du P-SCCAI à partir des selles des 7 derniers jours.
 */
export function computeAutoItems(referenceDate = new Date()) {
  const stoolsJson = storage.getString('dailySells');
  const stools = stoolsJson ? JSON.parse(stoolsJson) : [];

  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const windowStools = stools.filter(
    s => s.timestamp >= start.getTime() && s.timestamp <= end.getTime()
  );

  const daysWithData = new Set();
  windowStools.forEach(s => {
    const d = new Date(s.timestamp);
    daysWithData.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  });
  const activeDays = Math.max(daysWithData.size, 1);

  // Item 1 — Fréquence diurne (0-3)
  const avgPerDay = windowStools.length / activeDays;
  let dayFrequencyScore;
  if (avgPerDay <= 3) dayFrequencyScore = 0;
  else if (avgPerDay <= 6) dayFrequencyScore = 1;
  else if (avgPerDay <= 9) dayFrequencyScore = 2;
  else dayFrequencyScore = 3;

  // Item 2 — Fréquence nocturne (0-2)
  const nocturnalCount = windowStools.filter(s => s.nocturnal === true).length;
  const avgNocturnal = nocturnalCount / activeDays;
  let nightFrequencyScore;
  if (avgNocturnal < 0.5) nightFrequencyScore = 0;
  else if (avgNocturnal <= 3) nightFrequencyScore = 1;
  else nightFrequencyScore = 2;

  // Item 3 — Sang dans les selles (0-3)
  const totalStools = windowStools.length;
  const bloodCount = windowStools.filter(s => s.hasBlood || s.bloodOnly).length;
  const bloodPercent = totalStools > 0 ? (bloodCount / totalStools) * 100 : 0;
  let bloodScore;
  if (bloodPercent === 0) bloodScore = 0;
  else if (bloodPercent <= 20) bloodScore = 1;
  else if (bloodPercent <= 50) bloodScore = 2;
  else bloodScore = 3;

  return {
    dayFrequency: { raw: Math.round(avgPerDay * 10) / 10, score: dayFrequencyScore },
    nightFrequency: { raw: Math.round(avgNocturnal * 10) / 10, score: nightFrequencyScore, overridden: false },
    bloodInStool: { raw: Math.round(bloodPercent), score: bloodScore },
    activeDays,
    totalStools,
  };
}

/**
 * Score item 4 — Urgence (0-3)
 * canHold15min: false → ≥1, adaptActivities: true → ≥2, stoolInUnderwear: true → 3
 * Score = max atteint
 */
export function scoreUrgency({ canHold15min, adaptActivities, stoolInUnderwear }) {
  let score = 0;
  if (canHold15min === false) score = Math.max(score, 1);
  if (adaptActivities === true) score = Math.max(score, 2);
  if (stoolInUnderwear === true) score = Math.max(score, 3);
  return score;
}

/**
 * Score item 5 — Bien-être général (0-4)
 * Slider 1-10 → ≥7→0, 6→1, 5→2, 4→3, ≤3→4
 */
export function scoreWellbeing(rating) {
  if (rating >= 7) return 0;
  if (rating === 6) return 1;
  if (rating === 5) return 2;
  if (rating === 4) return 3;
  return 4;
}

/**
 * Score item 6 — Manifestations extra-coliques (0-4)
 */
export function scoreExtracolonic({ jointPain, erythemaNodosum, pyodermaGangrenosum, uveitis }) {
  let score = 0;
  if (jointPain) score += 1;
  if (erythemaNodosum === 'yes') score += 1;
  if (pyodermaGangrenosum === 'yes') score += 1;
  if (uveitis === 'yes') score += 1;
  return Math.min(score, 4);
}

/**
 * Calcul du score total P-SCCAI (0-19)
 */
export function computeTotalScore(computed, answers) {
  return (
    computed.dayFrequency.score +
    computed.nightFrequency.score +
    computed.bloodInStool.score +
    answers.urgency.score +
    answers.generalWellbeing.score +
    answers.extracolonic.score
  );
}

/**
 * Interprétation du score
 */
export function interpretScore(score) {
  if (score <= 2) return { label: 'Rémission', color: 'excellent' };
  if (score <= 5) return { label: 'Activité légère', color: 'moderate' };
  return { label: 'Activité modérée à sévère', color: 'danger' };
}

/**
 * Vérifie si le P-SCCAI est disponible (cooldown 7 jours expiré)
 */
export function checkPSCCAICooldown() {
  const lastUsedStr = storage.getString('psccaiLastUsed');
  if (!lastUsedStr) return { available: true, daysRemaining: 0 };

  const lastUsed = parseInt(lastUsedStr);
  const daysSince = Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24));

  if (daysSince >= COOLDOWN_DAYS) return { available: true, daysRemaining: 0 };
  return { available: false, daysRemaining: COOLDOWN_DAYS - daysSince };
}

/**
 * Récupère un résultat P-SCCAI sauvegardé par date (YYYY-MM-DD)
 */
export function getPSCCAIResult(date) {
  const historyJson = storage.getString('psccaiHistory');
  const history = historyJson ? JSON.parse(historyJson) : [];
  return history.find(h => h.date === date) || null;
}

/**
 * Sauvegarde un résultat P-SCCAI. Si un résultat existe déjà pour la même
 * date, il est remplacé (édition). isEdit=true évite de réinitialiser le
 * cooldown hebdomadaire.
 */
export function savePSCCAIResult(result, { isEdit = false } = {}) {
  const historyJson = storage.getString('psccaiHistory');
  const history = historyJson ? JSON.parse(historyJson) : [];
  const existingIndex = history.findIndex(h => h.date === result.date);
  if (existingIndex >= 0) {
    history[existingIndex] = result;
  } else {
    history.unshift(result);
  }
  storage.set('psccaiHistory', JSON.stringify(history));
  if (!isEdit) {
    storage.set('psccaiLastUsed', String(Date.now()));
  }
}

/**
 * Supprime un résultat P-SCCAI par date (YYYY-MM-DD). Recalcule le cooldown
 * hebdomadaire (psccaiLastUsed) à partir du bilan restant le plus récent, pour
 * que le questionnaire redevienne disponible si le bilan supprimé était le
 * dernier en date (sinon le cooldown du bilan restant continue de s'appliquer).
 */
export function deletePSCCAIResult(date) {
  const historyJson = storage.getString('psccaiHistory');
  const history = historyJson ? JSON.parse(historyJson) : [];
  const remaining = history.filter(h => h.date !== date);
  storage.set('psccaiHistory', JSON.stringify(remaining));

  if (remaining.length > 0) {
    const mostRecentTimestamp = Math.max(...remaining.map(h => h.timestamp || 0));
    storage.set('psccaiLastUsed', String(mostRecentTimestamp));
  } else {
    storage.delete('psccaiLastUsed');
  }
}

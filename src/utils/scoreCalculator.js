function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

function isNight(timestamp, startMinutes, endMinutes) {
  if (startMinutes == null || endMinutes == null) return false;
  const d = new Date(timestamp);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes < endMinutes;
  }
  return minutes >= startMinutes || minutes < endMinutes;
}

export function calculateLichtigerScore(dateStr, storage) {
  try {
    if (!dateStr) return null;
    // Minuit -> minuit pour la date locale passée
    const stoolsJson = storage.getString('dailySells');
    const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
    // Créer la date en heure locale (pas UTC) pour éviter les décalages de fuseau horaire
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayStools = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);

    // Fenêtre nocturne en dur: 23:00 -> 06:00
    const nightStartStr = '23:00';
    const nightEndStr = '06:00';
    const nightStartMin = parseTimeToMinutes(nightStartStr);
    const nightEndMin = parseTimeToMinutes(nightEndStr);

    const stoolsCount = dayStools.length;
    const nocturnalCount = dayStools.filter(s =>
      s.nocturnal != null ? s.nocturnal : isNight(s.timestamp, nightStartMin, nightEndMin)
    ).length;
    const bloodCount = dayStools.filter(s => s.hasBlood).length;

    // Sous-scores "stools" selon les règles fournies
    // Nombre de selles par jour
    let stoolsScore = 0;
    if (stoolsCount >= 10) stoolsScore = 4;
    else if (stoolsCount >= 7) stoolsScore = 3;
    else if (stoolsCount >= 5) stoolsScore = 2;
    else if (stoolsCount >= 3) stoolsScore = 1;
    else stoolsScore = 0; // 0-2

    // Selles nocturnes: 0 ou 1
    const nocturnalScore = nocturnalCount > 0 ? 1 : 0;

    // Saignement rectal: ratio sur les selles du jour
    let bloodScore = 0;
    if (stoolsCount > 0) {
      const ratio = bloodCount / stoolsCount; // 0..1
      if (ratio === 0) bloodScore = 0;
      else if (ratio < 0.5) bloodScore = 1;
      else if (ratio < 1) bloodScore = 2; // ≥50% et <100%
      else bloodScore = 3; // 100%
    } else {
      bloodScore = 0; // pas de selles ⇒ considéré absent
    }

    // 2) Read daily survey
    const surveyJson = storage.getString('dailySurvey');
    const surveyMap = surveyJson ? JSON.parse(surveyJson) : {};
    const survey = surveyMap[dateStr];
    if (!survey) {
      return null; // pas de bilan ⇒ score incomplet
    }

    // Mappings qualitatifs -> score selon tes règles
    const incontScore = survey.fecalIncontinence === 'oui' ? 1 : 0; // 0-1
    const painMap = { aucune: 0, legeres: 1, moyennes: 2, intenses: 3 };
    const painScore = painMap[survey.abdominalPain] ?? 0;
    const generalMap = { parfait: 0, tres_bon: 1, bon: 2, moyen: 3, mauvais: 4, tres_mauvais: 5 };
    const generalScore = generalMap[survey.generalState] ?? 0;
    const antiScore = survey.antidiarrheal === 'oui' ? 1 : 0; // 0-1

    const total = stoolsScore + nocturnalScore + bloodScore + incontScore + painScore + generalScore + antiScore;
    return total;
  } catch (e) {
    return null;
  }
}

export default calculateLichtigerScore;


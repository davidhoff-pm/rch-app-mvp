export function calculatePRO2Score(dateStr, storage) {
  try {
    if (!dateStr) return null;

    const stoolsJson = storage.getString('dailySells');
    const stools = stoolsJson ? JSON.parse(stoolsJson) : [];

    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayStools = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);

    if (dayStools.length === 0) return null;

    // SF — Stool Frequency (0-3)
    const normalStr = storage.getString('normalStoolCount');
    const normalCount = normalStr != null ? parseInt(normalStr, 10) : 1;
    const excess = dayStools.length - normalCount;

    let sf = 0;
    if (excess >= 5) sf = 3;
    else if (excess >= 3) sf = 2;
    else if (excess >= 1) sf = 1;

    // RB — Rectal Bleeding (0-3)
    let rb = 0;
    if (dayStools.some(s => s.bloodOnly === true)) {
      rb = 3;
    } else {
      const bloodCount = dayStools.filter(s => s.hasBlood).length;
      if (bloodCount > 0) {
        const ratio = bloodCount / dayStools.length;
        rb = ratio < 0.5 ? 1 : 2;
      }
    }

    return sf + rb;
  } catch (e) {
    return null;
  }
}

export { calculatePRO2Score as calculateLichtigerScore };
export default calculatePRO2Score;

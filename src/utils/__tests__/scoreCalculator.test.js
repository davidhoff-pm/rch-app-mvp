import { calculatePRO2Score, calculateLichtigerScore } from '../scoreCalculator';

function makeStorage(stools, normalStoolCount = '1') {
  const data = {};
  if (stools) data.dailySells = JSON.stringify(stools);
  if (normalStoolCount != null) data.normalStoolCount = normalStoolCount;
  return {
    getString: (key) => data[key] ?? null,
  };
}

function makeStool(hour, opts = {}) {
  const d = new Date(2025, 5, 15, hour, 0, 0, 0);
  return {
    id: `s-${hour}-${Math.random()}`,
    timestamp: d.getTime(),
    bristolScale: opts.bloodOnly ? null : (opts.bristol || 4),
    hasBlood: opts.hasBlood || opts.bloodOnly || false,
    bloodOnly: opts.bloodOnly || false,
  };
}

const DATE = '2025-06-15';

describe('calculatePRO2Score', () => {
  describe('Cas limites', () => {
    it('retourne null si dateStr est null', () => {
      expect(calculatePRO2Score(null, makeStorage([]))).toBeNull();
    });

    it('retourne null si aucune selle stockée', () => {
      expect(calculatePRO2Score(DATE, makeStorage(null))).toBeNull();
    });

    it('retourne null si aucune selle ce jour', () => {
      const otherDay = [{ ...makeStool(10), timestamp: new Date(2025, 5, 14, 10).getTime() }];
      expect(calculatePRO2Score(DATE, makeStorage(otherDay))).toBeNull();
    });

    it('retourne null si la liste de selles est vide', () => {
      expect(calculatePRO2Score(DATE, makeStorage([]))).toBeNull();
    });
  });

  describe('SF — Stool Frequency', () => {
    it('excédent ≤ 0 → SF = 0 (1 selle, normal = 1)', () => {
      const stools = [makeStool(10)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(0);
    });

    it('excédent ≤ 0 → SF = 0 (2 selles, normal = 3)', () => {
      const stools = [makeStool(8), makeStool(12)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '3'))).toBe(0);
    });

    it('excédent 1 → SF = 1', () => {
      const stools = [makeStool(8), makeStool(12)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(1);
    });

    it('excédent 2 → SF = 1', () => {
      const stools = [makeStool(8), makeStool(10), makeStool(12)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(1);
    });

    it('excédent 3 → SF = 2', () => {
      const stools = [makeStool(8), makeStool(10), makeStool(12), makeStool(14)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(2);
    });

    it('excédent 4 → SF = 2', () => {
      const stools = [makeStool(7), makeStool(9), makeStool(11), makeStool(13), makeStool(15)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(2);
    });

    it('excédent 5 → SF = 3', () => {
      const stools = Array.from({ length: 6 }, (_, i) => makeStool(8 + i));
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('excédent 8 → SF = 3 (plafonné)', () => {
      const stools = Array.from({ length: 9 }, (_, i) => makeStool(6 + i));
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('normalStoolCount = 0 : 1 selle → excédent 1 → SF = 1', () => {
      const stools = [makeStool(10)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '0'))).toBe(1);
    });

    it('normalStoolCount absent → défaut 1', () => {
      const stools = [makeStool(8), makeStool(12)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, null))).toBe(1);
    });
  });

  describe('RB — Rectal Bleeding', () => {
    it('0% sang → RB = 0', () => {
      const stools = [makeStool(10), makeStool(14)];
      expect(calculatePRO2Score(DATE, makeStorage(stools, '2'))).toBe(0);
    });

    it('<50% sang → RB = 1 (1/3 avec sang)', () => {
      const stools = [
        makeStool(8, { hasBlood: true }),
        makeStool(10),
        makeStool(14),
      ];
      // SF: 3-1=2 → SF=1, RB: 1/3=33% → RB=1
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(2);
    });

    it('≥50% sang → RB = 2 (2/3 avec sang)', () => {
      const stools = [
        makeStool(8, { hasBlood: true }),
        makeStool(10, { hasBlood: true }),
        makeStool(14),
      ];
      // SF: 3-1=2 → SF=1, RB: 2/3=67% → RB=2
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('100% sang → RB = 2 (pas de bloodOnly)', () => {
      const stools = [
        makeStool(8, { hasBlood: true }),
        makeStool(12, { hasBlood: true }),
      ];
      // SF: 2-1=1 → SF=1, RB: 2/2=100% → RB=2
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('bloodOnly → RB = 3 (priorité sur le ratio)', () => {
      const stools = [
        makeStool(8),
        makeStool(10, { bloodOnly: true }),
        makeStool(14),
      ];
      // SF: 3-1=2 → SF=1, RB: bloodOnly → RB=3
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(4);
    });

    it('bloodOnly seul → SF compte aussi cette entrée', () => {
      const stools = [makeStool(10, { bloodOnly: true })];
      // SF: 1-1=0 → SF=0, RB: bloodOnly → RB=3
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('bloodOnly + autres sans sang → RB = 3 quand même', () => {
      const stools = [
        makeStool(8),
        makeStool(10),
        makeStool(12),
        makeStool(14, { bloodOnly: true }),
      ];
      // SF: 4-1=3 → SF=2, RB: bloodOnly → RB=3
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(5);
    });
  });

  describe('Combinaisons SF + RB', () => {
    it('score minimum = 0 (1 selle, normal=1, pas de sang)', () => {
      expect(calculatePRO2Score(DATE, makeStorage([makeStool(10)], '1'))).toBe(0);
    });

    it('score maximum = 6 (SF=3 + RB=3)', () => {
      const stools = Array.from({ length: 7 }, (_, i) =>
        i === 0 ? makeStool(6 + i, { bloodOnly: true }) : makeStool(6 + i)
      );
      // SF: 7-1=6 → SF=3, RB: bloodOnly → RB=3
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(6);
    });

    it('SF=2 + RB=1 = 3', () => {
      const stools = [
        makeStool(8, { hasBlood: true }),
        makeStool(10),
        makeStool(12),
        makeStool(14),
      ];
      // SF: 4-1=3 → SF=2, RB: 1/4=25% → RB=1
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });

    it('SF=1 + RB=2 = 3', () => {
      const stools = [
        makeStool(8, { hasBlood: true }),
        makeStool(12, { hasBlood: true }),
      ];
      // SF: 2-1=1 → SF=1, RB: 2/2=100% → RB=2
      expect(calculatePRO2Score(DATE, makeStorage(stools, '1'))).toBe(3);
    });
  });

  describe('Gestion des erreurs', () => {
    it('retourne null si storage lance une erreur', () => {
      const badStorage = {
        getString: () => { throw new Error('boom'); },
      };
      expect(calculatePRO2Score(DATE, badStorage)).toBeNull();
    });

    it('retourne null si dailySells contient du JSON invalide', () => {
      const badStorage = {
        getString: (key) => key === 'dailySells' ? 'not-json' : null,
      };
      expect(calculatePRO2Score(DATE, badStorage)).toBeNull();
    });
  });

  describe('Alias backward-compat', () => {
    it('calculateLichtigerScore est un alias de calculatePRO2Score', () => {
      expect(calculateLichtigerScore).toBe(calculatePRO2Score);
    });
  });
});

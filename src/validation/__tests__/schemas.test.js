import {
  StoolSchema,
  DailySurveySchema,
  TreatmentSchema,
  IBDiskAnswersSchema,
  IBDiskQuestionnaireSchema,
  DateInputSchema,
  TimeInputSchema,
  WellbeingCheckinSchema,
  FactorChipSchema,
  FactorChipLogSchema,
  validateData,
  isValidDateString,
  isValidTimestamp,
} from '../schemas';

describe('Schemas de validation', () => {
  describe('StoolSchema', () => {
    it('devrait valider une selle correcte', () => {
      const validStool = {
        id: '123',
        timestamp: 1699999999999,
        bristolScale: 4,
        hasBlood: false,
      };

      const result = validateData(StoolSchema, validStool);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validStool);
    });

    it('devrait rejeter une échelle de Bristol invalide (< 1)', () => {
      const invalidStool = {
        id: '123',
        timestamp: 1699999999999,
        bristolScale: 0,
        hasBlood: false,
      };

      const result = validateData(StoolSchema, invalidStool);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('devrait rejeter une échelle de Bristol invalide (> 7)', () => {
      const invalidStool = {
        id: '123',
        timestamp: 1699999999999,
        bristolScale: 8,
        hasBlood: false,
      };

      const result = validateData(StoolSchema, invalidStool);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un timestamp négatif', () => {
      const invalidStool = {
        id: '123',
        timestamp: -1,
        bristolScale: 4,
        hasBlood: false,
      };

      const result = validateData(StoolSchema, invalidStool);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter des propriétés supplémentaires', () => {
      const invalidStool = {
        id: '123',
        timestamp: 1699999999999,
        bristolScale: 4,
        hasBlood: false,
        extraProp: 'should not be here',
      };

      const result = validateData(StoolSchema, invalidStool);
      expect(result.success).toBe(false);
    });
  });

  describe('DailySurveySchema', () => {
    it('devrait valider un bilan quotidien correct', () => {
      const validSurvey = {
        date: '2025-11-07',
        fecalIncontinence: 'non',
        abdominalPain: 'legeres',
        generalState: 'bon',
        antidiarrheal: 'non',
      };

      const result = validateData(DailySurveySchema, validSurvey);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validSurvey);
    });

    it('devrait rejeter un format de date invalide', () => {
      const invalidSurvey = {
        date: '07/11/2025',
        fecalIncontinence: 'non',
        abdominalPain: 'aucune',
        generalState: 'parfait',
        antidiarrheal: 'non',
      };

      const result = validateData(DailySurveySchema, invalidSurvey);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une valeur d\'incontinence invalide', () => {
      const invalidSurvey = {
        date: '2025-11-07',
        fecalIncontinence: 'maybe',
        abdominalPain: 'aucune',
        generalState: 'parfait',
        antidiarrheal: 'non',
      };

      const result = validateData(DailySurveySchema, invalidSurvey);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une valeur de douleur invalide', () => {
      const invalidSurvey = {
        date: '2025-11-07',
        fecalIncontinence: 'non',
        abdominalPain: 'tres_intenses',
        generalState: 'parfait',
        antidiarrheal: 'non',
      };

      const result = validateData(DailySurveySchema, invalidSurvey);
      expect(result.success).toBe(false);
    });
  });

  describe('TreatmentSchema', () => {
    it('devrait valider un traitement correct', () => {
      const validTreatment = {
        id: '123',
        name: 'Pentasa 500mg',
        timestamp: 1699999999999,
      };

      const result = validateData(TreatmentSchema, validTreatment);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validTreatment);
    });

    it('devrait rejeter un nom de traitement vide', () => {
      const invalidTreatment = {
        id: '123',
        name: '',
        timestamp: 1699999999999,
      };

      const result = validateData(TreatmentSchema, invalidTreatment);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un nom de traitement trop long', () => {
      const invalidTreatment = {
        id: '123',
        name: 'A'.repeat(101),
        timestamp: 1699999999999,
      };

      const result = validateData(TreatmentSchema, invalidTreatment);
      expect(result.success).toBe(false);
    });
  });

  describe('IBDiskAnswersSchema', () => {
    it('devrait valider des réponses IBDisk correctes', () => {
      const validAnswers = {
        abdominal_pain: 3,
        bowel_regulation: 5,
        social_life: 2,
        work_school: 4,
        sleep: 6,
        energy: 3,
        stress: 7,
        body_image: 2,
        sexual_life: 4,
        joint_pain: 5,
      };

      const result = validateData(IBDiskAnswersSchema, validAnswers);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validAnswers);
    });

    it('devrait rejeter un score < 0', () => {
      const invalidAnswers = {
        abdominal_pain: -1,
        bowel_regulation: 5,
        social_life: 2,
        work_school: 4,
        sleep: 6,
        energy: 3,
        stress: 7,
        body_image: 2,
        sexual_life: 4,
        joint_pain: 5,
      };

      const result = validateData(IBDiskAnswersSchema, invalidAnswers);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un score > 10', () => {
      const invalidAnswers = {
        abdominal_pain: 11,
        bowel_regulation: 5,
        social_life: 2,
        work_school: 4,
        sleep: 6,
        energy: 3,
        stress: 7,
        body_image: 2,
        sexual_life: 4,
        joint_pain: 5,
      };

      const result = validateData(IBDiskAnswersSchema, invalidAnswers);
      expect(result.success).toBe(false);
    });
  });

  describe('IBDiskQuestionnaireSchema', () => {
    it('devrait valider un questionnaire IBDisk complet', () => {
      const validQuestionnaire = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        completed: true,
        answers: {
          abdominal_pain: 3,
          bowel_regulation: 5,
          social_life: 2,
          work_school: 4,
          sleep: 6,
          energy: 3,
          stress: 7,
          body_image: 2,
          sexual_life: 4,
          joint_pain: 5,
        },
      };

      const result = validateData(IBDiskQuestionnaireSchema, validQuestionnaire);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validQuestionnaire);
    });

    it('devrait rejeter un questionnaire avec des réponses invalides', () => {
      const invalidQuestionnaire = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        completed: true,
        answers: {
          abdominal_pain: 11, // Invalide
          bowel_regulation: 5,
          social_life: 2,
          work_school: 4,
          sleep: 6,
          energy: 3,
          stress: 7,
          body_image: 2,
          sexual_life: 4,
          joint_pain: 5,
        },
      };

      const result = validateData(IBDiskQuestionnaireSchema, invalidQuestionnaire);
      expect(result.success).toBe(false);
    });
  });

  describe('WellbeingCheckinSchema', () => {
    it('devrait valider un bilan léger correct', () => {
      const validCheckin = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        mood: 3,
        sleep: 2,
        fatigue: 1,
      };

      const result = validateData(WellbeingCheckinSchema, validCheckin);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validCheckin);
    });

    it('devrait valider un bilan léger avec des valeurs null (non renseignées)', () => {
      const validCheckin = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        mood: null,
        sleep: null,
        fatigue: null,
      };

      const result = validateData(WellbeingCheckinSchema, validCheckin);
      expect(result.success).toBe(true);
    });

    it('devrait rejeter une valeur de mood hors échelle (0-3)', () => {
      const invalidCheckin = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        mood: 4,
        sleep: 2,
        fatigue: 1,
      };

      const result = validateData(WellbeingCheckinSchema, invalidCheckin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter une valeur de mood négative', () => {
      const invalidCheckin = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        mood: -1,
        sleep: 2,
        fatigue: 1,
      };

      const result = validateData(WellbeingCheckinSchema, invalidCheckin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un format de date invalide', () => {
      const invalidCheckin = {
        date: '07/11/2025',
        timestamp: 1699999999999,
        mood: 1,
        sleep: 1,
        fatigue: 1,
      };

      const result = validateData(WellbeingCheckinSchema, invalidCheckin);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter des propriétés supplémentaires', () => {
      const invalidCheckin = {
        date: '2025-11-07',
        timestamp: 1699999999999,
        mood: 1,
        sleep: 1,
        fatigue: 1,
        extraProp: 'nope',
      };

      const result = validateData(WellbeingCheckinSchema, invalidCheckin);
      expect(result.success).toBe(false);
    });
  });

  describe('FactorChipSchema', () => {
    it('devrait valider une chip correcte', () => {
      const validChip = {
        id: 'chip-123',
        label: 'Produits laitiers',
        category: 'alimentation',
        isDefault: true,
        active: false,
        archived: false,
        createdAt: 1699999999999,
      };

      const result = validateData(FactorChipSchema, validChip);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validChip);
    });

    it('devrait rejeter une catégorie invalide', () => {
      const invalidChip = {
        id: 'chip-123',
        label: 'Produits laitiers',
        category: 'inconnue',
        isDefault: true,
        active: false,
        archived: false,
        createdAt: 1699999999999,
      };

      const result = validateData(FactorChipSchema, invalidChip);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un label vide', () => {
      const invalidChip = {
        id: 'chip-123',
        label: '',
        category: 'autre',
        isDefault: false,
        active: false,
        archived: false,
        createdAt: 1699999999999,
      };

      const result = validateData(FactorChipSchema, invalidChip);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un label trop long (> 60 caractères)', () => {
      const invalidChip = {
        id: 'chip-123',
        label: 'A'.repeat(61),
        category: 'autre',
        isDefault: false,
        active: false,
        archived: false,
        createdAt: 1699999999999,
      };

      const result = validateData(FactorChipSchema, invalidChip);
      expect(result.success).toBe(false);
    });
  });

  describe('FactorChipLogSchema', () => {
    it('devrait valider un log de chip correct', () => {
      const validLog = {
        chipId: 'chip-123',
        date: '2025-11-07',
        timestamp: 1699999999999,
      };

      const result = validateData(FactorChipLogSchema, validLog);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validLog);
    });

    it('devrait rejeter un chipId vide', () => {
      const invalidLog = {
        chipId: '',
        date: '2025-11-07',
        timestamp: 1699999999999,
      };

      const result = validateData(FactorChipLogSchema, invalidLog);
      expect(result.success).toBe(false);
    });

    it('devrait rejeter un format de date invalide', () => {
      const invalidLog = {
        chipId: 'chip-123',
        date: '07/11/2025',
        timestamp: 1699999999999,
      };

      const result = validateData(FactorChipLogSchema, invalidLog);
      expect(result.success).toBe(false);
    });
  });

  describe('DateInputSchema', () => {
    it('devrait valider un format de date DD/MM/YYYY correct', () => {
      expect(DateInputSchema.safeParse('07/11/2025').success).toBe(true);
    });

    it('devrait rejeter un format de date incorrect', () => {
      expect(DateInputSchema.safeParse('2025-11-07').success).toBe(false);
    });

    it('devrait rejeter une date invalide (jour > 31)', () => {
      expect(DateInputSchema.safeParse('32/11/2025').success).toBe(false);
    });

    it('devrait rejeter une date invalide (mois > 12)', () => {
      expect(DateInputSchema.safeParse('07/13/2025').success).toBe(false);
    });
  });

  describe('TimeInputSchema', () => {
    it('devrait valider un format d\'heure HH:MM correct', () => {
      expect(TimeInputSchema.safeParse('14:30').success).toBe(true);
    });

    it('devrait valider minuit', () => {
      expect(TimeInputSchema.safeParse('00:00').success).toBe(true);
    });

    it('devrait valider 23:59', () => {
      expect(TimeInputSchema.safeParse('23:59').success).toBe(true);
    });

    it('devrait rejeter une heure > 23', () => {
      expect(TimeInputSchema.safeParse('24:00').success).toBe(false);
    });

    it('devrait rejeter des minutes > 59', () => {
      expect(TimeInputSchema.safeParse('14:60').success).toBe(false);
    });
  });

  describe('isValidDateString', () => {
    it('devrait valider une date YYYY-MM-DD correcte', () => {
      expect(isValidDateString('2025-11-07')).toBe(true);
    });

    it('devrait rejeter un format invalide', () => {
      expect(isValidDateString('07/11/2025')).toBe(false);
    });

    it('devrait rejeter une date invalide (31 février)', () => {
      expect(isValidDateString('2025-02-31')).toBe(false);
    });

    it('devrait rejeter null', () => {
      expect(isValidDateString(null)).toBe(false);
    });

    it('devrait rejeter undefined', () => {
      expect(isValidDateString(undefined)).toBe(false);
    });
  });

  describe('isValidTimestamp', () => {
    it('devrait valider un timestamp positif', () => {
      expect(isValidTimestamp(1699999999999)).toBe(true);
    });

    it('devrait rejeter un timestamp négatif', () => {
      expect(isValidTimestamp(-1)).toBe(false);
    });

    it('devrait rejeter zéro', () => {
      expect(isValidTimestamp(0)).toBe(false);
    });

    it('devrait rejeter une string', () => {
      expect(isValidTimestamp('1699999999999')).toBe(false);
    });

    it('devrait rejeter null', () => {
      expect(isValidTimestamp(null)).toBe(false);
    });
  });
});

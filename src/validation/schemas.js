import { z } from 'zod';

/**
 * Schéma de validation pour une selle
 */
export const StoolSchema = z.object({
  id: z.string().min(1, 'ID requis'),
  timestamp: z.number().int().positive('Timestamp doit être positif'),
  bristolScale: z.number().int().min(1, 'Échelle de Bristol min: 1').max(7, 'Échelle de Bristol max: 7'),
  hasBlood: z.boolean(),
}).strict();

/**
 * Schéma de validation pour un bilan quotidien
 */
export const DailySurveySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  fecalIncontinence: z.enum(['oui', 'non'], {
    errorMap: () => ({ message: 'Incontinence fécale doit être "oui" ou "non"' }),
  }),
  abdominalPain: z.enum(['aucune', 'legeres', 'moyennes', 'intenses'], {
    errorMap: () => ({ message: 'Douleur abdominale invalide' }),
  }),
  generalState: z.enum(['parfait', 'tres_bon', 'bon', 'moyen', 'mauvais', 'tres_mauvais'], {
    errorMap: () => ({ message: 'État général invalide' }),
  }),
  antidiarrheal: z.enum(['oui', 'non'], {
    errorMap: () => ({ message: 'Antidiarrhéique doit être "oui" ou "non"' }),
  }),
}).strict();

/**
 * Schéma de validation pour le bilan léger quotidien (humeur / sommeil / fatigue)
 * Chaque champ est nullable : l'utilisateur peut désactiver une sous-partie dans les réglages.
 */
export const WellbeingCheckinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  timestamp: z.number().int().positive('Timestamp doit être positif'),
  mood: z.union([z.number().int().min(0).max(3, 'Score doit être entre 0 et 3'), z.null()]),
  sleep: z.union([z.number().int().min(0).max(3, 'Score doit être entre 0 et 3'), z.null()]),
  fatigue: z.union([z.number().int().min(0).max(3, 'Score doit être entre 0 et 3'), z.null()]),
}).strict();

/**
 * Schéma de validation pour une chip de suivi de facteur (définition)
 */
export const FactorChipSchema = z.object({
  id: z.string().min(1, 'ID requis'),
  label: z.string().min(1, 'Label requis').max(60, 'Label trop long (max 60 caractères)'),
  category: z.enum(['alimentation', 'comportement', 'autre'], {
    errorMap: () => ({ message: 'Catégorie invalide' }),
  }),
  isDefault: z.boolean(),
  active: z.boolean(),
  archived: z.boolean(),
  createdAt: z.number().int().positive('Timestamp doit être positif'),
}).strict();

/**
 * Schéma de validation pour une occurrence quotidienne de chip (tap)
 */
export const FactorChipLogSchema = z.object({
  chipId: z.string().min(1, 'chipId requis'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  timestamp: z.number().int().positive('Timestamp doit être positif'),
}).strict();

/**
 * Schéma de validation pour un traitement
 */
export const TreatmentSchema = z.object({
  id: z.string().min(1, 'ID requis'),
  name: z.string().min(1, 'Nom du traitement requis').max(100, 'Nom trop long (max 100 caractères)'),
  timestamp: z.number().int().positive('Timestamp doit être positif'),
}).strict();

/**
 * Schéma de validation pour les réponses IBDisk
 */
export const IBDiskAnswersSchema = z.object({
  abdominal_pain: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  bowel_regulation: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  social_life: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  work_school: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  sleep: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  energy: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  stress: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  body_image: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  sexual_life: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
  joint_pain: z.number().int().min(0).max(10, 'Score doit être entre 0 et 10'),
}).strict();

/**
 * Schéma de validation pour un questionnaire IBDisk complet
 */
export const IBDiskQuestionnaireSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)'),
  timestamp: z.number().int().positive('Timestamp doit être positif'),
  answers: IBDiskAnswersSchema,
  completed: z.boolean(),
}).strict();

/**
 * Schéma de validation pour la date et l'heure
 */
export const DateInputSchema = z.string().regex(
  /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/,
  'Format de date invalide (DD/MM/YYYY)'
);

export const TimeInputSchema = z.string().regex(
  /^([01][0-9]|2[0-3]):([0-5][0-9])$/,
  'Format d\'heure invalide (HH:MM)'
);

/**
 * Fonction utilitaire pour valider des données avec un schéma Zod
 * @param {z.ZodSchema} schema - Le schéma Zod
 * @param {any} data - Les données à valider
 * @returns {{ success: boolean, data?: any, errors?: Array }} - Résultat de la validation
 */
export function validateData(schema, data) {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = (error.issues || error.errors || []).map(err => ({
        path: Array.isArray(err.path) ? err.path.join('.') : String(err.path || 'unknown'),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return { success: false, errors: [{ path: 'unknown', message: error?.message || 'Unknown error' }] };
  }
}

/**
 * Fonction utilitaire pour valider de manière asynchrone
 * @param {z.ZodSchema} schema - Le schéma Zod
 * @param {any} data - Les données à valider
 * @returns {Promise<{ success: boolean, data?: any, errors?: Array }>}
 */
export async function validateDataAsync(schema, data) {
  try {
    const validatedData = await schema.parseAsync(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return { success: false, errors };
    }
    return { success: false, errors: [{ path: 'unknown', message: error.message }] };
  }
}

/**
 * Fonction pour valider une date au format YYYY-MM-DD
 * @param {string} dateStr - La date à valider
 * @returns {boolean}
 */
export function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Fonction pour valider un timestamp
 * @param {number} timestamp - Le timestamp à valider
 * @returns {boolean}
 */
export function isValidTimestamp(timestamp) {
  if (typeof timestamp !== 'number') return false;
  if (timestamp <= 0) return false;

  // Vérifier que c'est une date valide
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

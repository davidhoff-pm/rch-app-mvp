import storage from './storage';

/**
 * Utilitaires pour la gestion des traitements
 */

// ========================================
// HELPERS - Utilitaires
// ========================================

/**
 * Formate une date en YYYY-MM-DD (local, pas UTC)
 * @param {Date} date
 * @returns {string}
 */
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalise une date à minuit (00:00:00.000)
 * @param {Date} date
 * @returns {Date}
 */
const normalizeDateToMidnight = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

// ========================================
// GETTERS - Récupération des données
// ========================================

export const getMedications = () => {
  const json = storage.getString('medications');
  return json ? JSON.parse(json) : {};
};

export const getTherapeuticSchemas = () => {
  const json = storage.getString('therapeuticSchemas');
  return json ? JSON.parse(json) : [];
};

export const getIntakes = () => {
  const json = storage.getString('intakes');
  return json ? JSON.parse(json) : [];
};

// ========================================
// SETTERS - Sauvegarde des données
// ========================================

export const saveMedications = (medications) => {
  storage.set('medications', JSON.stringify(medications));
};

export const saveTherapeuticSchemas = (schemas) => {
  storage.set('therapeuticSchemas', JSON.stringify(schemas));
};

export const saveIntakes = (intakes) => {
  storage.set('intakes', JSON.stringify(intakes));
};

// ========================================
// CALCULS - Observance
// ========================================

/**
 * Calcule l'observance d'un schéma thérapeutique
 * @param {object} schema - Le schéma thérapeutique
 * @returns {number} - Observance en % (0-100+)
 */
export const calculateAdherence = (schema) => {
  const intakes = getIntakes();

  // Normaliser les dates à minuit pour éviter les problèmes d'heures
  const startDate = normalizeDateToMidnight(new Date(schema.startDate));
  const endDate = normalizeDateToMidnight(schema.endDate ? new Date(schema.endDate) : new Date());

  // Récupérer toutes les prises de ce schéma spécifique dans la période
  const schemaIntakes = intakes.filter(intake => {
    const intakeDate = normalizeDateToMidnight(new Date(intake.timestamp));
    return intake.schemaId === schema.id &&
           intakeDate >= startDate &&
           intakeDate <= endDate;
  });

  // Calculer le nombre de jours (en normalisant à minuit)
  const daysDuration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  let expectedIntakes = 0;

  if (schema.frequency.type === 'daily') {
    expectedIntakes = daysDuration * getDosesPerDay(schema.frequency);
  } else if (schema.frequency.type === 'interval') {
    expectedIntakes = Math.floor(daysDuration / schema.frequency.intervalDays) + 1;
  }

  const actualIntakes = schemaIntakes.reduce((sum, intake) => sum + intake.doses, 0);

  if (expectedIntakes === 0) return 0;

  const adherence = Math.round((actualIntakes / expectedIntakes) * 100);
  return adherence;
};

/**
 * Vérifie s'il y a un surdosage
 * @param {object} schema - Le schéma thérapeutique
 * @returns {object} - { hasOverdose: boolean, excess: number }
 */
export const checkOverdose = (schema) => {
  const intakes = getIntakes();

  // Normaliser les dates à minuit
  const startDate = normalizeDateToMidnight(new Date(schema.startDate));
  const endDate = normalizeDateToMidnight(schema.endDate ? new Date(schema.endDate) : new Date());

  const schemaIntakes = intakes.filter(intake => {
    const intakeDate = normalizeDateToMidnight(new Date(intake.timestamp));
    return intake.schemaId === schema.id &&
           intakeDate >= startDate &&
           intakeDate <= endDate;
  });

  const daysDuration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  let expectedIntakes = 0;

  if (schema.frequency.type === 'daily') {
    expectedIntakes = daysDuration * getDosesPerDay(schema.frequency);
  } else if (schema.frequency.type === 'interval') {
    expectedIntakes = Math.floor(daysDuration / schema.frequency.intervalDays) + 1;
  }

  const actualIntakes = schemaIntakes.reduce((sum, intake) => sum + intake.doses, 0);
  const excess = actualIntakes - expectedIntakes;

  return {
    hasOverdose: excess > 0,
    excess: excess > 0 ? excess : 0
  };
};

// ========================================
// CALCULS - Prochaine prise et retard
// ========================================

/**
 * Calcule la prochaine prise pour un schéma
 * @param {object} schema - Le schéma thérapeutique
 * @returns {object} - { nextDate: Date, isLate: boolean, daysLate: number }
 */
export const getNextIntake = (schema) => {
  const intakes = getIntakes();
  const medications = getMedications();
  const medication = medications[schema.medicationId];

  // Pour les traitements quotidiens, la prochaine prise est toujours aujourd'hui
  if (schema.frequency.type === 'daily') {
    return {
      nextDate: new Date(),
      isLate: false,
      daysLate: 0
    };
  }

  // Pour les traitements à intervalle, trouver la dernière prise
  const medicationIntakes = intakes
    .filter(intake => intake.medicationId === schema.medicationId)
    .sort((a, b) => b.timestamp - a.timestamp);

  let nextDate;

  if (medicationIntakes.length === 0) {
    // Première prise = date de début du schéma
    nextDate = new Date(schema.startDate);
  } else {
    // Dernière prise + intervalle
    const lastIntakeDate = new Date(medicationIntakes[0].timestamp);
    nextDate = new Date(lastIntakeDate);
    nextDate.setDate(nextDate.getDate() + schema.frequency.intervalDays);
  }

  // Calculer le retard
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - nextDate) / (1000 * 60 * 60 * 24));
  const isLate = daysDiff > 0;

  return {
    nextDate,
    isLate,
    daysLate: isLate ? daysDiff : 0
  };
};

// ========================================
// PRISES AUJOURD'HUI
// ========================================

/**
 * Récupère les prises effectuées aujourd'hui pour un schéma daily
 * @param {object} schema - Le schéma thérapeutique
 * @returns {number} - Nombre de prises effectuées aujourd'hui
 */
export const getTodayIntakesCount = (schema) => {
  const intakes = getIntakes();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  console.log('[getTodayIntakesCount] schema.id:', schema.id, 'medicationId:', schema.medicationId);
  console.log('[getTodayIntakesCount] All intakes:', intakes.map(i => ({ id: i.id, medicationId: i.medicationId, schemaId: i.schemaId, doses: i.doses, timestamp: i.timestamp })));

  const todayIntakes = intakes.filter(intake =>
    intake.schemaId === schema.id &&
    intake.timestamp >= startOfDay &&
    intake.timestamp < endOfDay
  );

  console.log('[getTodayIntakesCount] Filtered todayIntakes:', todayIntakes);
  const count = todayIntakes.reduce((sum, intake) => sum + intake.doses, 0);
  console.log('[getTodayIntakesCount] Returning count:', count);

  return count;
};

/**
 * Vérifie si la prise du jour est déjà effectuée pour un schéma interval
 * @param {object} schema - Le schéma thérapeutique
 * @returns {boolean}
 */
export const isIntervalIntakeDone = (schema) => {
  const { nextDate, isLate } = getNextIntake(schema);
  const intakes = getIntakes();
  const today = new Date();

  // Si la prochaine prise est dans le futur, c'est déjà fait
  if (nextDate > today && !isLate) {
    return true;
  }

  // Vérifier si une prise a été faite à la date prévue ou après
  const intakesAtExpectedDate = intakes.filter(intake => {
    const intakeDate = new Date(intake.timestamp);
    return intake.medicationId === schema.medicationId &&
           intakeDate >= nextDate;
  });

  return intakesAtExpectedDate.length > 0;
};

// ========================================
// BADGE - Nombre de prises à effectuer
// ========================================

/**
 * Calcule le nombre de cases à cocher aujourd'hui (pour le badge)
 * @returns {number}
 */
export const getPendingIntakesCount = () => {
  const schemas = getTherapeuticSchemas();
  const activeSchemas = schemas.filter(s => !s.endDate);

  let count = 0;

  activeSchemas.forEach(schema => {
    if (schema.frequency.type === 'daily') {
      const todayCount = getTodayIntakesCount(schema);
      const remaining = getDosesPerDay(schema.frequency) - todayCount;
      count += Math.max(0, remaining);
    } else if (schema.frequency.type === 'interval') {
      // Si prise non faite et date atteinte ou dépassée
      if (!isIntervalIntakeDone(schema)) {
        const { nextDate } = getNextIntake(schema);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (nextDate <= today) {
          count += 1;
        }
      }
    }
  });

  return Math.min(count, 9); // Max 9 pour affichage "9+"
};

// ========================================
// CRUD - Médicaments
// ========================================

/**
 * Crée ou met à jour un médicament
 * @param {string} id - ID du médicament (null pour créer)
 * @param {string} name - Nom du médicament
 * @returns {string} - ID du médicament
 */
export const saveMedication = (id, name) => {
  const medications = getMedications();

  if (!id) {
    // Créer un nouveau médicament
    id = `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    medications[id] = {
      id,
      name,
      createdAt: Date.now()
    };
  } else {
    // Mettre à jour le nom
    if (medications[id]) {
      medications[id].name = name;
    }
  }

  saveMedications(medications);
  return id;
};

/**
 * Renomme un médicament partout dans l'application
 * @param {string} medicationId - ID du médicament
 * @param {string} newName - Nouveau nom
 */
export const renameMedication = (medicationId, newName) => {
  const medications = getMedications();

  if (medications[medicationId]) {
    medications[medicationId].name = newName;
    saveMedications(medications);
  }
};

// ========================================
// CRUD - Schémas thérapeutiques
// ========================================

/**
 * Crée un nouveau schéma thérapeutique
 * @param {string} medicationId - ID du médicament
 * @param {object} frequency - { type, dosesPerDay, intervalDays }
 * @returns {string} - ID du schéma
 */
export const createSchema = (medicationId, frequency) => {
  const schemas = getTherapeuticSchemas();

  const newSchema = {
    id: `schema-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    medicationId,
    startDate: formatLocalDate(new Date()), // Utiliser la date locale
    endDate: null,
    frequency,
    adherence: 0
  };

  schemas.push(newSchema);
  saveTherapeuticSchemas(schemas);

  return newSchema.id;
};

/**
 * Arrête un schéma thérapeutique actif
 * @param {string} schemaId - ID du schéma
 */
export const stopSchema = (schemaId) => {
  const schemas = getTherapeuticSchemas();
  const schema = schemas.find(s => s.id === schemaId);

  if (schema) {
    schema.endDate = formatLocalDate(new Date()); // Utiliser la date locale
    schema.adherence = calculateAdherence(schema);
    saveTherapeuticSchemas(schemas);
  }
};

/**
 * Modifie la fréquence d'un schéma (crée un nouveau schéma)
 * @param {string} schemaId - ID du schéma actuel
 * @param {object} newFrequency - Nouvelle fréquence
 * @returns {string} - ID du nouveau schéma
 */
export const updateSchemaFrequency = (schemaId, newFrequency) => {
  const schemas = getTherapeuticSchemas();
  const oldSchema = schemas.find(s => s.id === schemaId);

  if (!oldSchema) return null;

  // Clore l'ancien schéma aujourd'hui
  oldSchema.endDate = formatLocalDate(new Date());
  oldSchema.adherence = calculateAdherence(oldSchema);

  // Sauvegarder d'abord la fermeture de l'ancien schéma
  saveTherapeuticSchemas(schemas);

  // Créer le nouveau schéma (qui va s'ajouter à la liste)
  const newSchemaId = createSchema(oldSchema.medicationId, newFrequency);

  // Transférer les prises d'aujourd'hui au nouveau schéma
  const intakes = getIntakes();
  const today = formatLocalDate(new Date());
  const todayIntakes = intakes.filter(intake =>
    intake.schemaId === schemaId &&
    intake.dateTaken === today
  );

  if (todayIntakes.length > 0) {
    todayIntakes.forEach(intake => {
      intake.schemaId = newSchemaId;
    });
    saveIntakes(intakes);

    // Recalculer l'adhérence du nouveau schéma avec les prises transférées
    const updatedSchemas = getTherapeuticSchemas();
    const newSchema = updatedSchemas.find(s => s.id === newSchemaId);
    if (newSchema) {
      newSchema.adherence = calculateAdherence(newSchema);
      saveTherapeuticSchemas(updatedSchemas);
    }
  }

  return newSchemaId;
};

/**
 * Modifie un schéma historique
 * @param {string} schemaId - ID du schéma
 * @param {object} updates - { startDate?, endDate?, frequency? }
 */
export const updateHistoricalSchema = (schemaId, updates) => {
  const schemas = getTherapeuticSchemas();
  const schema = schemas.find(s => s.id === schemaId);

  if (schema) {
    if (updates.startDate) schema.startDate = updates.startDate;
    if (updates.endDate !== undefined) schema.endDate = updates.endDate;
    if (updates.frequency) schema.frequency = updates.frequency;

    // Recalculer l'observance
    schema.adherence = calculateAdherence(schema);

    saveTherapeuticSchemas(schemas);
  }
};

// ========================================
// CRUD - Prises
// ========================================

/**
 * Enregistre une prise de médicament (incrémente si existe déjà)
 * @param {string} medicationId - ID du médicament
 * @param {number} doses - Nombre de doses à ajouter
 * @param {Date} dateTaken - Date de la prise
 * @returns {string} - ID de la prise
 */
export const recordIntake = (medicationId, doses, dateTaken) => {
  const intakes = getIntakes();
  const schemas = getTherapeuticSchemas();
  const dateStr = formatLocalDate(dateTaken);

  console.log('[recordIntake] medicationId:', medicationId, 'doses:', doses, 'dateStr:', dateStr);

  // Trouver le schéma actif pour ce médicament
  const activeSchema = schemas.find(s =>
    s.medicationId === medicationId && !s.endDate
  );

  console.log('[recordIntake] activeSchema found:', !!activeSchema, 'schemaId:', activeSchema?.id);

  // Chercher si une entrée existe déjà pour ce médicament ce jour (dans LE MÊME tableau!)
  const existingIntake = intakes.find(i => i.medicationId === medicationId && i.dateTaken === dateStr);

  if (existingIntake) {
    console.log('[recordIntake] Found existing intake, current doses:', existingIntake.doses, 'schemaId:', existingIntake.schemaId);
    // Incrémenter les doses
    existingIntake.doses += doses;
    console.log('[recordIntake] After increment, doses:', existingIntake.doses);
    existingIntake.timestamp = dateTaken.getTime(); // Mettre à jour timestamp

    // Mettre à jour le schemaId si c'est une prise via schéma
    if (activeSchema) {
      existingIntake.schemaId = activeSchema.id;
    }

    saveIntakes(intakes);
    console.log('[recordIntake] Saved to storage, intakes array:', intakes);

    // Mettre à jour l'observance
    if (activeSchema) {
      activeSchema.adherence = calculateAdherence(activeSchema);
      saveTherapeuticSchemas(schemas);
    }

    return existingIntake.id;
  } else {
    // Créer nouvelle entrée
    const newIntake = {
      id: `intake-${medicationId}-${dateStr}`,
      medicationId,
      schemaId: activeSchema ? activeSchema.id : null,
      timestamp: dateTaken.getTime(),
      doses,
      dateTaken: dateStr
    };

    intakes.push(newIntake);
    saveIntakes(intakes);

    // Mettre à jour l'observance du schéma actif
    if (activeSchema) {
      activeSchema.adherence = calculateAdherence(activeSchema);
      saveTherapeuticSchemas(schemas);
    }

    return newIntake.id;
  }
};

/**
 * Décrémente une dose pour un médicament à une date donnée
 * @param {string} medicationId - ID du médicament
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {boolean} - true si décrémenté, false si pas d'entrée
 */
export const decrementIntake = (medicationId, dateStr) => {
  const intakes = getIntakes();
  const intake = intakes.find(i => i.medicationId === medicationId && i.dateTaken === dateStr);

  if (!intake) return false;

  intake.doses--;

  if (intake.doses <= 0) {
    // Supprimer l'entrée si doses = 0
    const index = intakes.findIndex(i => i.id === intake.id);
    if (index >= 0) {
      intakes.splice(index, 1);
    }
  }

  saveIntakes(intakes);

  // Recalculer l'observance
  const schemas = getTherapeuticSchemas();
  const relatedSchema = schemas.find(s => s.id === intake.schemaId);
  if (relatedSchema) {
    relatedSchema.adherence = calculateAdherence(relatedSchema);
    saveTherapeuticSchemas(schemas);
  }

  return true;
};

/**
 * Modifie une prise existante
 * @param {string} intakeId - ID de la prise
 * @param {object} updates - { doses?, dateTaken? }
 */
export const updateIntake = (intakeId, updates) => {
  const intakes = getIntakes();
  const intake = intakes.find(i => i.id === intakeId);

  if (!intake) return;

  const oldDateStr = intake.dateTaken;
  const newDoses = updates.doses !== undefined ? updates.doses : intake.doses;

  if (updates.dateTaken) {
    const newDateStr = formatLocalDate(updates.dateTaken);

    // Si changement de date
    if (newDateStr !== oldDateStr) {
      // Chercher si une entrée existe déjà à la nouvelle date (dans LE MÊME tableau!)
      const existingAtNewDate = intakes.find(i => i.medicationId === intake.medicationId && i.dateTaken === newDateStr);

      if (existingAtNewDate && existingAtNewDate.id !== intake.id) {
        // Fusionner : ajouter les doses à l'entrée existante
        existingAtNewDate.doses += newDoses;

        // Supprimer l'ancienne entrée
        const index = intakes.findIndex(i => i.id === intakeId);
        if (index >= 0) {
          intakes.splice(index, 1);
        }
      } else {
        // Pas d'entrée existante, juste changer la date
        intake.dateTaken = newDateStr;
        intake.timestamp = updates.dateTaken.getTime();
        intake.doses = newDoses;
        // Mettre à jour l'ID pour refléter la nouvelle date
        intake.id = `intake-${intake.medicationId}-${newDateStr}`;
      }
    } else {
      // Juste changer les doses
      intake.doses = newDoses;
    }
  } else {
    // Juste changer les doses
    intake.doses = newDoses;
  }

  saveIntakes(intakes);

  // Recalculer l'observance
  const schemas = getTherapeuticSchemas();
  const relatedSchema = schemas.find(s => s.id === intake.schemaId);
  if (relatedSchema) {
    relatedSchema.adherence = calculateAdherence(relatedSchema);
    saveTherapeuticSchemas(schemas);
  }
};

/**
 * Supprime une prise
 * @param {string} intakeId - ID de la prise
 */
export const deleteIntake = (intakeId) => {
  const intakes = getIntakes();
  const intakeIndex = intakes.findIndex(i => i.id === intakeId);

  if (intakeIndex >= 0) {
    const intake = intakes[intakeIndex];
    intakes.splice(intakeIndex, 1);
    saveIntakes(intakes);

    // Recalculer l'observance
    const schemas = getTherapeuticSchemas();
    const relatedSchema = schemas.find(s => s.id === intake.schemaId);
    if (relatedSchema) {
      relatedSchema.adherence = calculateAdherence(relatedSchema);
      saveTherapeuticSchemas(schemas);
    }
  }
};

// ========================================
// HELPERS
// ========================================

/**
 * Formatte la fréquence d'un schéma en texte
 * @param {object} frequency - Objet fréquence
 * @returns {string}
 */
export const formatFrequency = (frequency) => {
  if (frequency.type === 'daily') {
    const doses = frequency.doses;
    if (doses) {
      const parts = [];
      if (doses.matin > 0) parts.push(`${doses.matin} matin`);
      if (doses.midi > 0) parts.push(`${doses.midi} midi`);
      if (doses.soir > 0) parts.push(`${doses.soir} soir`);
      return parts.length > 0 ? parts.join(' · ') : '0 prise par jour';
    }
    return `${frequency.dosesPerDay} fois par jour`;
  } else if (frequency.type === 'interval') {
    return `1 fois tous les ${frequency.intervalDays} jours`;
  }
  return '';
};

export const getDosesPerDay = (frequency) => {
  if (frequency.type !== 'daily') return 1;
  if (frequency.doses) {
    return (frequency.doses.matin || 0) + (frequency.doses.midi || 0) + (frequency.doses.soir || 0);
  }
  return frequency.dosesPerDay || 0;
};

export const getDoses = (frequency) => {
  if (frequency.type !== 'daily') return { matin: 0, midi: 0, soir: 0 };
  if (frequency.doses) return frequency.doses;
  return { matin: frequency.dosesPerDay || 0, midi: 0, soir: 0 };
};

export const TREATMENT_REMINDER_DEFAULTS = {
  matin: '08:00',
  midi: '12:00',
  soir: '19:00',
  interval: '08:00',
  stockReminderEnabled: true,
  stockReminderDays: 3,
};

export const getTreatmentReminderTimes = () => {
  const json = storage.getString('treatmentReminderTimes');
  if (json) {
    try { return { ...TREATMENT_REMINDER_DEFAULTS, ...JSON.parse(json) }; } catch {}
  }
  return { ...TREATMENT_REMINDER_DEFAULTS };
};

export const saveTreatmentReminderTimes = (times) => {
  storage.set('treatmentReminderTimes', JSON.stringify(times));
};

/**
 * Récupère tous les noms de médicaments pour l'autocomplete
 * @returns {string[]}
 */
export const getAllMedicationNames = () => {
  const medications = getMedications();
  return Object.values(medications).map(m => m.name).sort();
};

/**
 * Trouve la dernière prise d'aujourd'hui pour un schéma
 * @param {string} schemaId - ID du schéma
 * @returns {object|null}
 */
export const findLastTodayIntake = (schemaId) => {
  const intakes = getIntakes();
  const today = formatLocalDate(new Date());

  const todayIntakes = intakes.filter(intake =>
    intake.schemaId === schemaId &&
    intake.dateTaken === today
  );

  // Trier par timestamp décroissant et prendre le premier
  todayIntakes.sort((a, b) => b.timestamp - a.timestamp);
  return todayIntakes[0] || null;
};

/**
 * Trouve la dernière prise d'intervalle pour un schéma
 * @param {string} schemaId - ID du schéma
 * @returns {object|null}
 */
export const findLastIntervalIntake = (schemaId) => {
  const intakes = getIntakes();

  const intervalIntakes = intakes.filter(intake =>
    intake.schemaId === schemaId
  );

  // Trier par timestamp décroissant et prendre le premier
  intervalIntakes.sort((a, b) => b.timestamp - a.timestamp);
  return intervalIntakes[0] || null;
};

/**
 * Trouve un médicament par son nom
 * @param {string} name - Nom du médicament
 * @returns {object|null}
 */
export const findMedicationByName = (name) => {
  const medications = getMedications();
  return Object.values(medications).find(m => m.name.toLowerCase() === name.toLowerCase());
};

/**
 * Trouve un médicament par son ID
 * @param {string} id - ID du médicament
 * @returns {object|null}
 */
export const findMedicationById = (id) => {
  const medications = getMedications();
  return medications[id] || null;
};

/**
 * Alias pour getIntakes - Récupère toutes les prises
 * @returns {Array}
 */
export const getAllIntakes = () => {
  return getIntakes();
};

/**
 * Récupère uniquement les schémas thérapeutiques actifs (sans endDate)
 * @returns {Array}
 */
export const getActiveTherapeuticSchemas = () => {
  const schemas = getTherapeuticSchemas();
  return schemas.filter(schema => !schema.endDate);
};

/**
 * Récupère uniquement les schémas thérapeutiques historiques (avec endDate)
 * @returns {Array}
 */
export const getHistoricalTherapeuticSchemas = () => {
  const schemas = getTherapeuticSchemas();
  return schemas.filter(schema => schema.endDate);
};

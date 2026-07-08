// Générateur de données de test pour le développement
import storage from './storage';

/**
 * Génère des données réalistes pour tester les graphiques et analyses
 * @param {number} days - Nombre de jours à générer (30, 60 ou 90)
 * @param {string} scenario - Type de scénario : 'improvement', 'stable', 'decline', 'realistic'
 */
export const generateTestData = (days = 30, scenario = 'realistic') => {
  console.log(`🎲 Génération de ${days} jours de données (scénario: ${scenario})...`);
  
  const now = new Date();
  const scores = [];
  const stools = [];
  const surveys = {};
  const ibdiskHistory = [];
  
  // Paramètres selon le scénario
  let baseScore, trendDirection, volatility;
  
  switch (scenario) {
    case 'improvement':
      baseScore = 6;
      trendDirection = -0.05; // Amélioration progressive
      volatility = 1.5;
      break;
    case 'decline':
      baseScore = 2;
      trendDirection = 0.05; // Dégradation progressive
      volatility = 1.5;
      break;
    case 'stable':
      baseScore = 3;
      trendDirection = 0;
      volatility = 1;
      break;
    default: // 'realistic'
      baseScore = 4;
      trendDirection = -0.02; // Légère amélioration
      volatility = 2;
  }
  
  let currentScore = baseScore;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Calcul du score avec tendance et variabilité
    const trendEffect = trendDirection * (days - i);
    const randomEffect = (Math.random() - 0.5) * volatility;
    const weekendEffect = (date.getDay() === 0 || date.getDay() === 6) ? -0.5 : 0; // Meilleur le weekend
    
    currentScore = baseScore + trendEffect + randomEffect + weekendEffect;
    currentScore = Math.max(0, Math.min(13, currentScore));
    
    const finalScore = Math.round(currentScore);
    
    // Générer le score du jour
    scores.push({
      date: dateStr,
      score: finalScore
    });
    
    // Générer les selles (2-8 par jour selon le score)
    const stoolsCount = Math.max(2, Math.min(10, Math.round(3 + finalScore / 2 + Math.random() * 2)));
    
    for (let j = 0; j < stoolsCount; j++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const stoolDate = new Date(date);
      stoolDate.setHours(hour, minute, 0, 0);
      
      // Bristol scale : plus le score est élevé, plus la consistance est liquide
      const bristolBase = finalScore > 6 ? 6 : finalScore > 3 ? 5 : 4;
      const bristol = Math.max(1, Math.min(7, bristolBase + Math.floor(Math.random() * 2)));
      
      // Sang plus probable si score élevé
      const hasBlood = finalScore > 5 ? Math.random() > 0.6 : Math.random() > 0.85;
      
      stools.push({
        id: `test-stool-${dateStr}-${j}`,
        timestamp: stoolDate.getTime(),
        bristolScale: bristol,
        hasBlood: hasBlood
      });
    }
    
    // Générer le bilan quotidien
    surveys[dateStr] = {
      fecalIncontinence: finalScore > 6 ? 'oui' : 'non',
      abdominalPain: finalScore > 7 ? 3 : finalScore > 5 ? 2 : finalScore > 3 ? 1 : 0,
      generalState: finalScore > 8 ? 5 : finalScore > 6 ? 4 : finalScore > 4 ? 3 : finalScore > 2 ? 2 : 1,
      antidiarrheal: finalScore > 5 ? 'oui' : 'non'
    };
    
    // Générer un questionnaire IBDisk tous les 30 jours (simulation réaliste)
    if (i % 30 === 0) {
      const ibdiskAnswers = generateIBDiskAnswers(finalScore);
      ibdiskHistory.push({
        date: dateStr,
        timestamp: date.getTime(),
        answers: ibdiskAnswers,
        completed: true
      });
    }
  }

  // Générer des questionnaires P-SCCAI tous les 7 jours
  const psccaiHistory = [];
  for (let i = days - 1; i >= 0; i -= 7) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const scoreEntry = scores.find(s => s.date === dateStr);
    const dayScore = scoreEntry ? scoreEntry.score : 3;
    psccaiHistory.push(generatePSCCAIEntry(dateStr, date.getTime(), dayScore));
  }

  return { scores, stools, surveys, ibdiskHistory, psccaiHistory };
};

/**
 * Génère des réponses réalistes pour le questionnaire IBDisk
 * @param {number} lichtigerScore - Score de Litchtiger du jour pour cohérence
 */
const generateIBDiskAnswers = (lichtigerScore) => {
  // Les réponses IBDisk sont cohérentes avec le score de Litchtiger
  const baseLevel = Math.min(10, Math.max(0, Math.round(lichtigerScore * 0.8 + Math.random() * 2)));
  
  return {
    abdominal_pain: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    bowel_regulation: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    social_life: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    professional_activities: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    sleep: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    energy: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    stress_anxiety: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    self_image: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    intimate_life: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1)),
    joint_pain: Math.min(10, Math.max(0, baseLevel + Math.floor(Math.random() * 3) - 1))
  };
};

const generatePSCCAIEntry = (dateStr, timestamp, baseScore) => {
  const severity = Math.min(baseScore / 6, 1);
  const dayFreqRaw = Math.round((2 + severity * 8) * 10) / 10;
  let dayFreqScore = 0;
  if (dayFreqRaw > 9) dayFreqScore = 3;
  else if (dayFreqRaw > 6) dayFreqScore = 2;
  else if (dayFreqRaw > 3) dayFreqScore = 1;

  const nightRaw = Math.round(severity * 3 * 10) / 10;
  let nightScore = 0;
  if (nightRaw >= 4) nightScore = 2;
  else if (nightRaw >= 0.5) nightScore = 1;

  const bloodPct = Math.round(severity * 60);
  let bloodScore = 0;
  if (bloodPct > 50) bloodScore = 3;
  else if (bloodPct > 20) bloodScore = 2;
  else if (bloodPct > 0) bloodScore = 1;

  const urgencyScore = Math.min(3, Math.floor(severity * 3.5));
  const wellbeingRating = Math.max(1, Math.min(10, Math.round(8 - severity * 6)));
  let wellbeingScore = 0;
  if (wellbeingRating <= 3) wellbeingScore = 4;
  else if (wellbeingRating === 4) wellbeingScore = 3;
  else if (wellbeingRating === 5) wellbeingScore = 2;
  else if (wellbeingRating === 6) wellbeingScore = 1;

  const hasJoint = severity > 0.5 && Math.random() > 0.6;
  const extraScore = hasJoint ? 1 : 0;

  const totalScore = dayFreqScore + nightScore + bloodScore + urgencyScore + wellbeingScore + extraScore;

  return {
    date: dateStr,
    timestamp,
    computed: {
      dayFrequency: { raw: dayFreqRaw, score: dayFreqScore },
      nightFrequency: { raw: nightRaw, score: nightScore, overridden: false },
      bloodInStool: { raw: bloodPct, score: bloodScore },
    },
    answers: {
      urgency: {
        canHold15min: urgencyScore < 1,
        adaptActivities: urgencyScore >= 2,
        stoolInUnderwear: urgencyScore >= 3,
        score: urgencyScore,
      },
      generalWellbeing: { rating: wellbeingRating, score: wellbeingScore },
      extracolonic: {
        jointPain: hasJoint,
        jointsRedSwollen: null,
        wokeFromJointPain: null,
        skinOrEyeProblem: 'none',
        erythemaNodosum: null,
        pyodermaGangrenosum: null,
        uveitis: null,
        score: extraScore,
      },
    },
    totalScore,
  };
};

/**
 * Injecte les données de test dans le storage
 */
export const injectTestData = (days = 30, scenario = 'realistic') => {
  const { scores, stools, surveys, ibdiskHistory, psccaiHistory } = generateTestData(days, scenario);

  storage.set('scoresHistory', JSON.stringify(scores));
  storage.set('dailySells', JSON.stringify(stools));
  storage.set('dailySurvey', JSON.stringify(surveys));
  storage.set('ibdiskHistory', JSON.stringify(ibdiskHistory));
  storage.set('psccaiHistory', JSON.stringify(psccaiHistory));

  console.log('✅ Données de test générées et sauvegardées :');
  console.log(`  - ${scores.length} scores`);
  console.log(`  - ${stools.length} selles`);
  console.log(`  - ${Object.keys(surveys).length} bilans quotidiens`);
  console.log(`  - ${ibdiskHistory.length} questionnaires IBDisk`);
  console.log(`  - ${psccaiHistory.length} questionnaires P-SCCAI`);

  return { scores, stools, surveys, ibdiskHistory, psccaiHistory };
};

/**
 * Efface toutes les données de test
 */
export const clearTestData = () => {
  storage.set('scoresHistory', '[]');
  storage.set('dailySells', '[]');
  storage.set('dailySurvey', '{}');
  storage.set('ibdiskHistory', '[]');
  storage.set('psccaiHistory', '[]');
  storage.delete('psccaiLastUsed');

  console.log('🗑️ Toutes les données de test ont été effacées');
};

/**
 * Génère des données pour des scénarios spécifiques
 */
export const generateScenarioData = (scenarioName) => {
  const scenarios = {
    'remission': { days: 60, scenario: 'improvement' },
    'poussee': { days: 30, scenario: 'decline' },
    'stable': { days: 90, scenario: 'stable' },
    'realiste': { days: 60, scenario: 'realistic' }
  };
  
  const config = scenarios[scenarioName] || scenarios['realiste'];
  return injectTestData(config.days, config.scenario);
};

/**
 * Génère uniquement des questionnaires IBDisk de test
 * @param {number} count - Nombre de questionnaires à générer
 */
export const generateIBDiskTestData = (count = 3) => {
  console.log(`🎲 Génération de ${count} questionnaires IBDisk de test...`);
  
  const now = new Date();
  const ibdiskHistory = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (i * 30)); // Un questionnaire tous les 30 jours
    
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Générer des scores variés pour tester différents scénarios
    let baseScore;
    switch (i) {
      case 0: baseScore = 8; break; // Poussée récente
      case 1: baseScore = 4; break; // Amélioration
      case 2: baseScore = 2; break; // Rémission
      default: baseScore = Math.floor(Math.random() * 8) + 1;
    }
    
    console.log(`📊 Génération questionnaire ${i + 1} pour ${dateStr} (baseScore: ${baseScore})`);
    
    const ibdiskAnswers = generateIBDiskAnswers(baseScore);
    
    ibdiskHistory.push({
      date: dateStr,
      timestamp: date.getTime(),
      answers: ibdiskAnswers,
      completed: true
    });
  }
  
  console.log('💾 Sauvegarde des questionnaires IBDisk...');
  // Sauvegarder les questionnaires IBDisk
  storage.set('ibdiskHistory', JSON.stringify(ibdiskHistory));
  
  console.log(`✅ ${ibdiskHistory.length} questionnaires IBDisk générés et sauvegardés`);
  
  return ibdiskHistory;
};

export default {
  generateTestData,
  injectTestData,
  clearTestData,
  generateScenarioData,
  generateIBDiskTestData
};


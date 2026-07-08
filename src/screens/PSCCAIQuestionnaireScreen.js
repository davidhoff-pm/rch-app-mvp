import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../components/ui/AppText';
import AppCard from '../components/ui/AppCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import designSystem from '../theme/designSystem';
import {
  computeAutoItems,
  scoreUrgency,
  scoreWellbeing,
  scoreExtracolonic,
  computeTotalScore,
  interpretScore,
  savePSCCAIResult,
  getPSCCAIResult,
} from '../utils/psccaiCalculator';
import { saveFeedback } from '../utils/haptics';

const { colors } = designSystem;

// --- Helpers ---

function YesNoRow({ label, value, onChange }) {
  return (
    <View style={styles.ynRow}>
      <AppText style={styles.ynLabel}>{label}</AppText>
      <View style={styles.ynButtons}>
        <TouchableOpacity
          style={[styles.ynButton, value === true && styles.ynButtonActive]}
          onPress={() => onChange(true)}
          activeOpacity={0.7}
        >
          <AppText style={[styles.ynButtonText, value === true && styles.ynButtonTextActive]}>Oui</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ynButton, value === false && styles.ynButtonActive]}
          onPress={() => onChange(false)}
          activeOpacity={0.7}
        >
          <AppText style={[styles.ynButtonText, value === false && styles.ynButtonTextActive]}>Non</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TripleChoiceRow({ label, value, onChange }) {
  const options = [
    { key: 'yes', label: 'Oui' },
    { key: 'no', label: 'Non' },
    { key: 'unknown', label: 'Je ne sais pas' },
  ];
  return (
    <View style={styles.ynRow}>
      <AppText style={styles.ynLabel}>{label}</AppText>
      <View style={styles.tripleButtons}>
        {options.map(opt => {
          const active = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.tripleButton, active && styles.ynButtonActive]}
              onPress={() => onChange(opt.key)}
              activeOpacity={0.7}
            >
              <AppText style={[styles.tripleButtonText, active && styles.ynButtonTextActive]}>
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProgressBar({ current, total }) {
  const pct = ((current + 1) / total) * 100;
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <AppText style={styles.progressText}>{current + 1} / {total}</AppText>
    </View>
  );
}

// --- Main Screen ---

export default function PSCCAIQuestionnaireScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editDate = route.params?.date || null;
  const [step, setStep] = useState(0);

  const editEntry = useMemo(() => (editDate ? getPSCCAIResult(editDate) : null), [editDate]);

  const referenceDate = useMemo(() => {
    if (!editDate) return new Date();
    const [y, m, d] = editDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [editDate]);

  const autoItems = useMemo(() => computeAutoItems(referenceDate), [referenceDate]);
  const [nightOverride, setNightOverride] = useState(
    editEntry?.computed?.nightFrequency?.overridden ? editEntry.computed.nightFrequency.raw : null
  );
  const [showNightOverride, setShowNightOverride] = useState(false);

  // Item 4 — Urgence
  const [canHold15min, setCanHold15min] = useState(editEntry?.answers?.urgency?.canHold15min ?? null);
  const [adaptActivities, setAdaptActivities] = useState(editEntry?.answers?.urgency?.adaptActivities ?? null);
  const [stoolInUnderwear, setStoolInUnderwear] = useState(editEntry?.answers?.urgency?.stoolInUnderwear ?? null);

  // Item 5 — Bien-être
  const [wellbeingRating, setWellbeingRating] = useState(editEntry?.answers?.generalWellbeing?.rating ?? 7);

  // Item 6 — Extra-colique
  const [jointPain, setJointPain] = useState(editEntry?.answers?.extracolonic?.jointPain ?? null);
  const [jointsRedSwollen, setJointsRedSwollen] = useState(editEntry?.answers?.extracolonic?.jointsRedSwollen ?? null);
  const [wokeFromJointPain, setWokeFromJointPain] = useState(editEntry?.answers?.extracolonic?.wokeFromJointPain ?? null);
  const [skinOrEyeProblem, setSkinOrEyeProblem] = useState(editEntry?.answers?.extracolonic?.skinOrEyeProblem ?? null);
  const [erythemaNodosum, setErythemaNodosum] = useState(editEntry?.answers?.extracolonic?.erythemaNodosum ?? null);
  const [pyodermaGangrenosum, setPyodermaGangrenosum] = useState(editEntry?.answers?.extracolonic?.pyodermaGangrenosum ?? null);
  const [uveitis, setUveitis] = useState(editEntry?.answers?.extracolonic?.uveitis ?? null);

  useEffect(() => {
    if (editDate) {
      navigation.setOptions({ title: 'Modifier le bilan' });
    }
  }, [editDate, navigation]);

  const effectiveNight = useMemo(() => {
    if (nightOverride !== null) {
      let score;
      if (nightOverride === 0) score = 0;
      else if (nightOverride <= 3) score = 1;
      else score = 2;
      return { raw: nightOverride, score, overridden: true };
    }
    return autoItems.nightFrequency;
  }, [nightOverride, autoItems.nightFrequency]);

  const steps = ['summary', 'urgency', 'wellbeing', 'joints', 'skin_eyes', 'result'];
  const totalSteps = steps.length;
  const currentStepName = steps[step];

  const canAdvance = useMemo(() => {
    switch (currentStepName) {
      case 'summary': return true;
      case 'urgency': return canHold15min !== null && adaptActivities !== null && stoolInUnderwear !== null;
      case 'wellbeing': return true;
      case 'joints': return jointPain !== null;
      case 'skin_eyes': return skinOrEyeProblem !== null;
      default: return true;
    }
  }, [currentStepName, canHold15min, adaptActivities, stoolInUnderwear, jointPain, skinOrEyeProblem]);

  const handleNext = () => {
    if (currentStepName === 'skin_eyes' && skinOrEyeProblem === 'none') {
      setStep(steps.indexOf('result'));
    } else if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSave = () => {
    const computed = {
      dayFrequency: autoItems.dayFrequency,
      nightFrequency: effectiveNight,
      bloodInStool: autoItems.bloodInStool,
    };

    const urgencyScore = scoreUrgency({ canHold15min, adaptActivities, stoolInUnderwear });
    const wellbeingScore = scoreWellbeing(wellbeingRating);
    const extraScore = scoreExtracolonic({
      jointPain: jointPain === true,
      erythemaNodosum,
      pyodermaGangrenosum,
      uveitis,
    });

    const answers = {
      urgency: { canHold15min, adaptActivities, stoolInUnderwear, score: urgencyScore },
      generalWellbeing: { rating: wellbeingRating, score: wellbeingScore },
      extracolonic: {
        jointPain: jointPain === true,
        jointsRedSwollen: jointPain ? jointsRedSwollen : null,
        wokeFromJointPain: jointPain ? wokeFromJointPain : null,
        skinOrEyeProblem: skinOrEyeProblem || 'none',
        erythemaNodosum: (skinOrEyeProblem === 'skin' || skinOrEyeProblem === 'both') ? erythemaNodosum : null,
        pyodermaGangrenosum: (skinOrEyeProblem === 'skin' || skinOrEyeProblem === 'both') ? pyodermaGangrenosum : null,
        uveitis: (skinOrEyeProblem === 'eyes' || skinOrEyeProblem === 'both') ? uveitis : null,
        score: extraScore,
      },
    };

    const totalScore = computeTotalScore(computed, answers);
    const now = new Date();
    const dateStr = editDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    savePSCCAIResult({
      date: dateStr,
      timestamp: now.getTime(),
      computed,
      answers,
      totalScore,
    }, { isEdit: !!editDate });
    saveFeedback();
    setStep(steps.indexOf('result'));
  };

  // --- Render steps ---

  const renderSummary = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>Résumé de votre semaine</AppText>
      <AppText style={styles.stepDesc}>
        Calculé à partir de vos {autoItems.totalStools} selle{autoItems.totalStools > 1 ? 's' : ''} sur {autoItems.activeDays} jour{autoItems.activeDays > 1 ? 's' : ''}.
      </AppText>

      <View style={styles.summaryCards}>
        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryCardIcon}>
            <MaterialCommunityIcons name="toilet" size={22} color={colors.primary[500]} />
          </View>
          <View style={styles.summaryCardTextWrap}>
            <AppText style={styles.summaryCardLabel}>Fréquence diurne</AppText>
            <AppText style={styles.summaryCardValue}>{autoItems.dayFrequency.raw}/jour</AppText>
          </View>
        </AppCard>

        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryCardIcon}>
            <MaterialCommunityIcons name="weather-night" size={22} color={colors.primary[500]} />
          </View>
          <View style={styles.summaryCardTextWrap}>
            <AppText style={styles.summaryCardLabel}>Fréquence nocturne</AppText>
            <AppText style={styles.summaryCardValue}>
              {effectiveNight.raw}/nuit
              {effectiveNight.overridden ? ' *' : ''}
            </AppText>
            {autoItems.nightFrequency.score === 0 && (
              <TouchableOpacity
                onPress={() => setShowNightOverride(!showNightOverride)}
                style={styles.overrideTouchable}
              >
                <AppText style={styles.overrideLink}>Modifier</AppText>
              </TouchableOpacity>
            )}
          </View>
        </AppCard>

        <AppCard style={styles.summaryCard}>
          <View style={styles.summaryCardIcon}>
            <MaterialCommunityIcons name="water" size={22} color={colors.primary[500]} />
          </View>
          <View style={styles.summaryCardTextWrap}>
            <AppText style={styles.summaryCardLabel}>Sang dans les selles</AppText>
            <AppText style={styles.summaryCardValue}>{autoItems.bloodInStool.raw}%</AppText>
          </View>
        </AppCard>
      </View>

      {showNightOverride && (
        <AppCard style={styles.overrideCard}>
          <AppText style={styles.overrideTitle}>Selles nocturnes par nuit en moyenne :</AppText>
          <View style={styles.overrideOptions}>
            {[0, 1, 2, 3, 4, 5].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.overrideChip, nightOverride === v && styles.overrideChipActive]}
                onPress={() => { setNightOverride(v); setShowNightOverride(false); }}
              >
                <AppText style={[styles.overrideChipText, nightOverride === v && styles.overrideChipTextActive]}>
                  {v}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </AppCard>
      )}
    </View>
  );

  const renderUrgency = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>Urgence</AppText>
      <AppText style={styles.stepDesc}>Au cours de la semaine précédente :</AppText>

      <View style={styles.questionsList}>
        <AppCard style={styles.questionCard}>
          <YesNoRow
            label="Avez-vous pu retenir vos selles pendant 15 minutes ou plus lorsque vous en avez ressenti le besoin ?"
            value={canHold15min}
            onChange={setCanHold15min}
          />
        </AppCard>

        <AppCard style={styles.questionCard}>
          <YesNoRow
            label="Avez-vous dû adapter vos activités pour vous assurer d'avoir des toilettes à proximité ?"
            value={adaptActivities}
            onChange={setAdaptActivities}
          />
        </AppCard>

        <AppCard style={styles.questionCard}>
          <YesNoRow
            label="Avez-vous trouvé des traces de selles dans vos sous-vêtements ?"
            value={stoolInUnderwear}
            onChange={setStoolInUnderwear}
          />
        </AppCard>
      </View>
    </View>
  );

  const renderWellbeing = () => {
    const wellbeingLabels = {
      1: 'Très mauvais', 2: 'Mauvais', 3: 'Assez mauvais',
      4: 'Médiocre', 5: 'Moyen', 6: 'Assez bien',
      7: 'Bien', 8: 'Très bien', 9: 'Excellent', 10: 'Parfait',
    };
    return (
      <View>
        <AppText variant="h3" style={styles.stepTitle}>Bien-être général</AppText>
        <AppText style={styles.stepDesc}>
          Quelle note donneriez-vous à votre bien-être général cette semaine ?
        </AppText>

        <AppCard style={styles.questionCard}>
          <View style={styles.wellbeingValueRow}>
            <AppText style={styles.wellbeingNumber}>{wellbeingRating}</AppText>
            <AppText style={styles.wellbeingLabel}>{wellbeingLabels[wellbeingRating]}</AppText>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={10}
            step={1}
            value={wellbeingRating}
            onValueChange={setWellbeingRating}
            minimumTrackTintColor={colors.primary[500]}
            maximumTrackTintColor={colors.neutral[200]}
            thumbTintColor={colors.primary[500]}
          />

          <View style={styles.sliderLabels}>
            <AppText style={styles.sliderEdge}>1 — Très mauvais</AppText>
            <AppText style={styles.sliderEdge}>10 — Parfait</AppText>
          </View>
        </AppCard>
      </View>
    );
  };

  const renderJoints = () => (
    <View>
      <AppText variant="h3" style={styles.stepTitle}>Douleurs articulaires</AppText>
      <AppText style={styles.stepDesc}>Au cours de la semaine précédente :</AppText>

      <View style={styles.questionsList}>
        <AppCard style={styles.questionCard}>
          <YesNoRow
            label="Avez-vous eu des douleurs articulaires qui étaient plus fortes au repos qu'en activité ?"
            value={jointPain}
            onChange={setJointPain}
          />
        </AppCard>

        {jointPain === true && (
          <>
            <AppCard style={styles.questionCard}>
              <YesNoRow
                label="Vos articulations étaient-elles rouges ou enflées ?"
                value={jointsRedSwollen}
                onChange={setJointsRedSwollen}
              />
            </AppCard>
            <AppCard style={styles.questionCard}>
              <YesNoRow
                label="Vous êtes-vous réveillé(e) à cause de douleurs articulaires ?"
                value={wokeFromJointPain}
                onChange={setWokeFromJointPain}
              />
            </AppCard>
          </>
        )}
      </View>
    </View>
  );

  const renderSkinEyes = () => {
    const skinEyeOptions = [
      { key: 'skin', label: 'Oui, à la peau', icon: 'hand-back-left-outline' },
      { key: 'eyes', label: 'Oui, aux yeux', icon: 'eye-outline' },
      { key: 'both', label: 'Oui, les deux', icon: 'account-outline' },
      { key: 'none', label: 'Non', icon: 'close-circle-outline' },
    ];

    const showSkin = skinOrEyeProblem === 'skin' || skinOrEyeProblem === 'both';
    const showEyes = skinOrEyeProblem === 'eyes' || skinOrEyeProblem === 'both';

    return (
      <View>
        <AppText variant="h3" style={styles.stepTitle}>Peau et yeux</AppText>
        <AppText style={styles.stepDesc}>
          Avez-vous eu un problème à la peau ou aux yeux ?
        </AppText>

        <View style={styles.skinEyeGrid}>
          {skinEyeOptions.map(opt => {
            const active = skinOrEyeProblem === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.skinEyeOption, active && styles.skinEyeOptionActive]}
                onPress={() => setSkinOrEyeProblem(opt.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={opt.icon}
                  size={22}
                  color={active ? '#FFFFFF' : colors.primary[500]}
                />
                <AppText style={[styles.skinEyeOptionText, active && styles.skinEyeOptionTextActive]}>
                  {opt.label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {showSkin && (
          <View style={styles.questionsList}>
            <AppText style={styles.subSectionTitle}>Problèmes de peau</AppText>
            <AppCard style={styles.questionCard}>
              <TripleChoiceRow
                label="Problème diagnostiqué comme un érythème noueux par votre spécialiste ?"
                value={erythemaNodosum}
                onChange={setErythemaNodosum}
              />
            </AppCard>
            <AppCard style={styles.questionCard}>
              <TripleChoiceRow
                label="Problème diagnostiqué comme un pyoderma gangrenosum par votre spécialiste ?"
                value={pyodermaGangrenosum}
                onChange={setPyodermaGangrenosum}
              />
            </AppCard>
          </View>
        )}

        {showEyes && (
          <View style={styles.questionsList}>
            <AppText style={styles.subSectionTitle}>Problème oculaire</AppText>
            <AppCard style={styles.questionCard}>
              <TripleChoiceRow
                label="Infection oculaire diagnostiquée comme une uvéite par votre ophtalmologue ?"
                value={uveitis}
                onChange={setUveitis}
              />
            </AppCard>
          </View>
        )}
      </View>
    );
  };

  const renderResult = () => {
    const computed = {
      dayFrequency: autoItems.dayFrequency,
      nightFrequency: effectiveNight,
      bloodInStool: autoItems.bloodInStool,
    };
    const urgencyScore = scoreUrgency({ canHold15min, adaptActivities, stoolInUnderwear });
    const wellbeingScore = scoreWellbeing(wellbeingRating);
    const extraScore = scoreExtracolonic({
      jointPain: jointPain === true,
      erythemaNodosum,
      pyodermaGangrenosum,
      uveitis,
    });
    const answers = {
      urgency: { score: urgencyScore },
      generalWellbeing: { score: wellbeingScore },
      extracolonic: { score: extraScore },
    };
    const total = computeTotalScore(computed, answers);
    const interp = interpretScore(total);

    const healthColor =
      interp.color === 'excellent' ? colors.health.excellent :
      interp.color === 'moderate' ? colors.health.moderate :
      colors.health.danger;

    return (
      <View style={styles.resultContainer}>
        <View style={styles.resultHeader}>
          <View style={[styles.resultScoreCircle, { backgroundColor: healthColor.light, borderColor: healthColor.main }]}>
            <AppText style={[styles.resultScoreNumber, { color: healthColor.dark }]} allowFontScaling={false}>{total}</AppText>
            <AppText style={[styles.resultScoreMax, { color: healthColor.main }]} allowFontScaling={false}>/19</AppText>
          </View>
          <AppText variant="h3" style={[styles.resultLabel, { color: healthColor.dark }]}>
            {interp.label}
          </AppText>
          <AppText style={styles.resultInfo}>
            Seuil de rémission : score ≤ 2
          </AppText>
        </View>

        <View style={styles.disclaimerBox}>
          <MaterialCommunityIcons name="information-outline" size={18} color={colors.text.secondary} />
          <AppText style={styles.disclaimerText}>
            Ce score reflète vos symptômes auto-déclarés. Il ne remplace pas un avis médical. Partagez ces résultats avec votre gastro-entérologue.
          </AppText>
        </View>
      </View>
    );
  };

  const isResultStep = currentStepName === 'result';
  const isLastQuestionStep = step === totalSteps - 2;

  return (
    <View style={styles.container}>
      <ProgressBar current={step} total={totalSteps} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {currentStepName === 'summary' && renderSummary()}
        {currentStepName === 'urgency' && renderUrgency()}
        {currentStepName === 'wellbeing' && renderWellbeing()}
        {currentStepName === 'joints' && renderJoints()}
        {currentStepName === 'skin_eyes' && renderSkinEyes()}
        {currentStepName === 'result' && renderResult()}
      </ScrollView>

      <View style={styles.bottomBar}>
        {isResultStep ? (
          <PrimaryButton onPress={() => navigation.goBack()} style={styles.fullButton}>
            Terminer
          </PrimaryButton>
        ) : (
          <View style={styles.navRow}>
            {step > 0 && (
              <SecondaryButton onPress={handleBack} style={styles.backButton}>
                Retour
              </SecondaryButton>
            )}
            <PrimaryButton
              onPress={isLastQuestionStep ? handleSave : handleNext}
              disabled={!canAdvance}
              style={[styles.nextButton, step === 0 && styles.fullButton]}
            >
              {isLastQuestionStep ? 'Voir le résultat' : 'Continuer'}
            </PrimaryButton>
          </View>
        )}
      </View>
    </View>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: designSystem.spacing[4],
    paddingBottom: 100,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: designSystem.spacing[4],
    paddingVertical: designSystem.spacing[2],
    backgroundColor: colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    marginRight: designSystem.spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    minWidth: 32,
    textAlign: 'right',
  },

  // Steps
  stepTitle: {
    color: colors.text.primary,
    marginBottom: designSystem.spacing[1],
  },
  stepDesc: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: designSystem.spacing[4],
  },

  // Summary cards
  summaryCards: {
    gap: designSystem.spacing[2],
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: designSystem.spacing[3],
    paddingHorizontal: designSystem.spacing[3],
    gap: designSystem.spacing[3],
  },
  summaryCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTextWrap: {
    flex: 1,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'left',
  },
  summaryCardLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'left',
    marginBottom: 2,
  },

  // Night override
  overrideTouchable: {
    marginTop: designSystem.spacing[1],
    paddingVertical: 4,
  },
  overrideLink: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  overrideCard: {
    marginTop: designSystem.spacing[3],
    padding: designSystem.spacing[4],
  },
  overrideTitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: designSystem.spacing[3],
  },
  overrideOptions: {
    flexDirection: 'row',
    gap: designSystem.spacing[2],
    justifyContent: 'center',
  },
  overrideChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overrideChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  overrideChipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  overrideChipTextActive: {
    color: '#FFFFFF',
  },

  // Questions
  questionsList: {
    gap: designSystem.spacing[3],
  },
  questionCard: {
    padding: designSystem.spacing[4],
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: designSystem.spacing[2],
    marginBottom: designSystem.spacing[1],
  },

  // Yes/No
  ynRow: {
    gap: designSystem.spacing[3],
  },
  ynLabel: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.primary,
  },
  ynButtons: {
    flexDirection: 'row',
    gap: designSystem.spacing[3],
  },
  ynButton: {
    flex: 1,
    height: 48,
    borderRadius: designSystem.borderRadius.base,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ynButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  ynButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ynButtonTextActive: {
    color: '#FFFFFF',
  },

  // Triple choice
  tripleButtons: {
    flexDirection: 'row',
    gap: designSystem.spacing[2],
  },
  tripleButton: {
    flex: 1,
    height: 48,
    borderRadius: designSystem.borderRadius.base,
    backgroundColor: colors.neutral[100],
    borderWidth: 1.5,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: designSystem.spacing[1],
  },
  tripleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },

  // Wellbeing
  wellbeingValueRow: {
    alignItems: 'center',
    marginBottom: designSystem.spacing[3],
  },
  wellbeingNumber: {
    fontSize: 52,
    fontWeight: '700',
    color: colors.primary[500],
    lineHeight: 56,
  },
  wellbeingLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: designSystem.spacing[1],
  },
  sliderEdge: {
    fontSize: 11,
    color: colors.text.tertiary,
  },

  // Skin/eyes
  skinEyeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing[3],
    marginBottom: designSystem.spacing[4],
  },
  skinEyeOption: {
    width: '47%',
    flexGrow: 1,
    paddingVertical: designSystem.spacing[4],
    paddingHorizontal: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.lg,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    gap: designSystem.spacing[2],
    minHeight: 80,
  },
  skinEyeOptionActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  skinEyeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  skinEyeOptionTextActive: {
    color: '#FFFFFF',
  },

  // Result
  resultContainer: {
    paddingTop: designSystem.spacing[6],
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: designSystem.spacing[8],
  },
  resultScoreCircle: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: designSystem.spacing[4],
  },
  resultScoreNumber: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '700',
  },
  resultScoreMax: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
    marginTop: 0,
  },
  resultLabel: {
    marginBottom: designSystem.spacing[2],
  },
  resultInfo: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designSystem.spacing[3],
    padding: designSystem.spacing[4],
    backgroundColor: colors.neutral[100],
    borderRadius: designSystem.borderRadius.lg,
  },
  disclaimerText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.text.secondary,
    flex: 1,
  },

  // Bottom navigation
  bottomBar: {
    padding: designSystem.spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 34 : designSystem.spacing[4],
    backgroundColor: colors.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  navRow: {
    flexDirection: 'row',
    gap: designSystem.spacing[3],
  },
  backButton: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  fullButton: {
    flex: 1,
  },
});

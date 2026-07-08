import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import AppCard from '../components/ui/AppCard';
import storage from '../utils/storage';
import { getSurveyDayKey } from '../utils/dayKey';
import { useNavigation } from '@react-navigation/native';
import calculateLichtigerScore from '../utils/scoreCalculator';
import designSystem from '../theme/designSystem';

function getTodayKey() {
  return getSurveyDayKey(new Date(), 0);
}

function OptionCard({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.optionCard, selected && styles.optionCardSelected]}
    >
      <AppText
        style={[styles.optionLabel, selected && styles.optionLabelSelected]}
      >
        {label}
      </AppText>
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

export default function DailySurveyScreen() {
  const navigation = useNavigation();
  const [fecalIncontinence, setFecalIncontinence] = useState('non');
  const [abdominalPain, setAbdominalPain] = useState(0);
  const [generalState, setGeneralState] = useState(2);
  const [antidiarrheal, setAntidiarrheal] = useState('non');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [initialValues, setInitialValues] = useState(null);

  const todayKey = useMemo(() => getTodayKey(), []);

  useEffect(() => {
    const json = storage.getString('dailySurvey');
    if (json) {
      const map = JSON.parse(json);
      if (map && map[todayKey]) {
        setAlreadySubmitted(true);
        const s = map[todayKey];
        setFecalIncontinence(s.fecalIncontinence);
        const painMap = { aucune: 0, legeres: 1, moyennes: 2, intenses: 3 };
        const generalMap = { parfait: 0, tres_bon: 1, bon: 2, moyen: 3, mauvais: 4, tres_mauvais: 5 };
        if (typeof s.abdominalPain === 'string') setAbdominalPain(painMap[s.abdominalPain] ?? 0);
        if (typeof s.generalState === 'string') setGeneralState(generalMap[s.generalState] ?? 2);
        setAntidiarrheal(s.antidiarrheal);

        setInitialValues({
          fecalIncontinence: s.fecalIncontinence,
          abdominalPain: painMap[s.abdominalPain] ?? 0,
          generalState: generalMap[s.generalState] ?? 2,
          antidiarrheal: s.antidiarrheal
        });
      } else {
        setAlreadySubmitted(false);
        setInitialValues(null);
        setDirty(false);
      }
    }
  }, [todayKey]);

  const hasChanges = () => {
    if (!alreadySubmitted) return true;
    if (!initialValues) return true;

    return (
      fecalIncontinence !== initialValues.fecalIncontinence ||
      abdominalPain !== initialValues.abdominalPain ||
      generalState !== initialValues.generalState ||
      antidiarrheal !== initialValues.antidiarrheal
    );
  };

  const handleSave = () => {
    const json = storage.getString('dailySurvey');
    const map = json ? JSON.parse(json) : {};
    const painStr = ['aucune', 'legeres', 'moyennes', 'intenses'][abdominalPain] || 'aucune';
    const generalStr = ['parfait','tres_bon','bon','moyen','mauvais','tres_mauvais'][generalState] || 'bon';
    map[todayKey] = {
      date: todayKey,
      fecalIncontinence,
      abdominalPain: painStr,
      generalState: generalStr,
      antidiarrheal
    };
    storage.set('dailySurvey', JSON.stringify(map));

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fullToday = calculateLichtigerScore(todayStr, storage);
    if (fullToday != null) {
      const histJson = storage.getString('scoresHistory');
      const history = histJson ? JSON.parse(histJson) : [];
      const existingIndex = history.findIndex((h) => h.date === todayStr);
      if (existingIndex >= 0) {
        history[existingIndex].score = fullToday;
        storage.set('scoresHistory', JSON.stringify(history));
      } else {
        const newHistory = [{ date: todayStr, score: fullToday }, ...history];
        storage.set('scoresHistory', JSON.stringify(newHistory));
      }
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. État général */}
        <AppCard style={styles.block}>
          <AppText style={styles.question}>État général</AppText>
          {[
            { value: 0, label: 'Parfait' },
            { value: 1, label: 'Très bon' },
            { value: 2, label: 'Bon' },
            { value: 3, label: 'Moyen' },
            { value: 4, label: 'Mauvais' },
            { value: 5, label: 'Très mauvais' },
          ].map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={generalState === option.value}
              onPress={() => setGeneralState(option.value)}
            />
          ))}
        </AppCard>

        {/* 2. Douleurs abdominales */}
        <AppCard style={styles.block}>
          <AppText style={styles.question}>Douleurs abdominales</AppText>
          {[
            { value: 0, label: 'Aucune' },
            { value: 1, label: 'Légères' },
            { value: 2, label: 'Moyennes' },
            { value: 3, label: 'Intenses' },
          ].map((option) => (
            <OptionCard
              key={option.value}
              label={option.label}
              selected={abdominalPain === option.value}
              onPress={() => setAbdominalPain(option.value)}
            />
          ))}
        </AppCard>

        {/* 3. Incontinence fécale */}
        <AppCard style={styles.block}>
          <AppText style={styles.question}>Incontinence fécale</AppText>
          <OptionCard
            label="Oui"
            selected={fecalIncontinence === 'oui'}
            onPress={() => setFecalIncontinence('oui')}
          />
          <OptionCard
            label="Non"
            selected={fecalIncontinence === 'non'}
            onPress={() => setFecalIncontinence('non')}
          />
        </AppCard>

        {/* 4. Antidiarrhéique */}
        <AppCard style={styles.block}>
          <AppText style={styles.question}>Prise d'un antidiarrhéique</AppText>
          <OptionCard
            label="Oui"
            selected={antidiarrheal === 'oui'}
            onPress={() => setAntidiarrheal('oui')}
          />
          <OptionCard
            label="Non"
            selected={antidiarrheal === 'non'}
            onPress={() => setAntidiarrheal('non')}
          />
        </AppCard>

        <PrimaryButton
          mode="contained"
          onPress={handleSave}
          disabled={!hasChanges()}
          style={styles.save}
          buttonColor={designSystem.colors.primary[500]}
        >
          Enregistrer mon bilan
        </PrimaryButton>
        {alreadySubmitted ? <Text style={styles.info}>Bilan déjà enregistré aujourd'hui (modifications possibles).</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: designSystem.spacing[4],
    paddingTop: designSystem.spacing[2],
    paddingBottom: designSystem.spacing[6],
  },
  question: {
    marginTop: 0,
    marginBottom: designSystem.spacing[2],
    fontWeight: designSystem.typography.fontWeight.semiBold,
  },
  block: {
    marginBottom: designSystem.spacing[3],
    paddingTop: designSystem.spacing[3],
    paddingBottom: designSystem.spacing[1],
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: designSystem.spacing[4],
    borderRadius: designSystem.borderRadius.base,
    borderWidth: 1.5,
    borderColor: designSystem.colors.border.light,
    backgroundColor: designSystem.colors.background.tertiary,
    marginBottom: designSystem.spacing[2],
    minHeight: 50,
  },
  optionCardSelected: {
    borderColor: designSystem.colors.primary[500],
    backgroundColor: designSystem.colors.primary[50],
  },
  optionLabel: {
    fontSize: designSystem.typography.body.fontSize,
    fontWeight: designSystem.typography.fontWeight.medium,
    color: designSystem.colors.text.primary,
  },
  optionLabelSelected: {
    color: designSystem.colors.primary[600],
    fontWeight: designSystem.typography.fontWeight.semiBold,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: designSystem.colors.border.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: designSystem.colors.primary[500],
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: designSystem.colors.primary[500],
  },
  save: {
    marginTop: designSystem.spacing[4],
    marginBottom: designSystem.spacing[2],
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: designSystem.borderRadius.md,
    elevation: 4,
    minHeight: 56,
  },
  info: {
    marginTop: designSystem.spacing[2],
    color: designSystem.colors.text.secondary,
  },
});

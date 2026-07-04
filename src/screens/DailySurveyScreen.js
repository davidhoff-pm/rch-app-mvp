import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, RadioButton, Switch } from 'react-native-paper';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import AppCard from '../components/ui/AppCard';
import Slider from '@react-native-community/slider';
import storage from '../utils/storage';
import { getSurveyDayKey } from '../utils/dayKey';
import { useNavigation } from '@react-navigation/native';
import calculateLichtigerScore from '../utils/scoreCalculator';
import designSystem from '../theme/designSystem';

function getTodayKey() {
  return getSurveyDayKey(new Date(), 0);
}

export default function DailySurveyScreen() {
  const navigation = useNavigation();
  const [fecalIncontinence, setFecalIncontinence] = useState('non');
  const [abdominalPain, setAbdominalPain] = useState(0); // 0..3 via slider
  const [generalState, setGeneralState] = useState(2); // 0..5 via slider (2=bon)
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
        // map pain and general to sliders
        const painMap = { aucune: 0, legeres: 1, moyennes: 2, intenses: 3 };
        const generalMap = { parfait: 0, tres_bon: 1, bon: 2, moyen: 3, mauvais: 4, tres_mauvais: 5 };
        if (typeof s.abdominalPain === 'string') setAbdominalPain(painMap[s.abdominalPain] ?? 0);
        if (typeof s.generalState === 'string') setGeneralState(generalMap[s.generalState] ?? 2);
        setAntidiarrheal(s.antidiarrheal);
        
        // Sauvegarder les valeurs initiales pour détecter les changements
        setInitialValues({
          fecalIncontinence: s.fecalIncontinence,
          abdominalPain: painMap[s.abdominalPain] ?? 0,
          generalState: generalMap[s.generalState] ?? 2,
          antidiarrheal: s.antidiarrheal
        });
      } else {
        // Première fois - pas de données existantes
        setAlreadySubmitted(false);
        setInitialValues(null);
        setDirty(false);
      }
    }
  }, [todayKey]);

  // Fonction pour détecter si des changements ont été faits
  const hasChanges = () => {
    if (!alreadySubmitted) return true; // Première fois, toujours activé
    if (!initialValues) return true; // Pas de valeurs initiales, activé
    
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
    // allow edit: overwrite existing entry
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
    
    // Recalculer et sauvegarder le score d'aujourd'hui
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const fullToday = calculateLichtigerScore(todayStr, storage);
    if (fullToday != null) {
      const histJson = storage.getString('scoresHistory');
      const history = histJson ? JSON.parse(histJson) : [];
      const existingIndex = history.findIndex((h) => h.date === todayStr);
      if (existingIndex >= 0) {
        // Mettre à jour le score existant
        history[existingIndex].score = fullToday;
        storage.set('scoresHistory', JSON.stringify(history));
      } else {
        // Ajouter un nouveau score
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
        <AppCard style={styles.block}>
          <AppText style={styles.question}>Incontinence fécale</AppText>
          <RadioButton.Group onValueChange={setFecalIncontinence} value={fecalIncontinence}>
            <View style={styles.row}><RadioButton value="oui" /><AppText>Oui</AppText></View>
            <View style={styles.row}><RadioButton value="non" /><AppText>Non</AppText></View>
          </RadioButton.Group>
        </AppCard>

        <AppCard style={styles.block}>
          <AppText style={styles.question}>Douleurs abdominales</AppText>
          <View style={styles.horizontalButtons}>
            {[
              { value: 0, label: 'Aucune' },
              { value: 1, label: 'Légères' },
              { value: 2, label: 'Moyennes' },
              { value: 3, label: 'Intenses' }
            ].map((option) => (
              <View key={option.value} style={styles.buttonContainer}>
                <AppText 
                  style={[
                    styles.buttonText, 
                    abdominalPain === option.value && styles.selectedButtonText
                  ]}
                  onPress={() => setAbdominalPain(option.value)}
                >
                  {option.label}
                </AppText>
                {abdominalPain === option.value && <View style={styles.selectedIndicator} />}
              </View>
            ))}
          </View>
        </AppCard>

        <AppCard style={styles.block}>
          <AppText style={styles.question}>État général</AppText>
          <View style={styles.horizontalButtons}>
            {[
              { value: 0, label: 'Parfait' },
              { value: 1, label: 'Très bon' },
              { value: 2, label: 'Bon' },
              { value: 3, label: 'Moyen' },
              { value: 4, label: 'Mauvais' },
              { value: 5, label: 'Très mauvais' }
            ].map((option) => (
              <View key={option.value} style={styles.buttonContainer}>
                <AppText 
                  style={[
                    styles.buttonText, 
                    generalState === option.value && styles.selectedButtonText
                  ]}
                  onPress={() => setGeneralState(option.value)}
                >
                  {option.label}
                </AppText>
                {generalState === option.value && <View style={styles.selectedIndicator} />}
              </View>
            ))}
          </View>
        </AppCard>

        <AppCard style={styles.block}>
          <AppText style={styles.question}>Prise d'un antidiarrhéique</AppText>
          <View style={styles.row}>
            <AppText>Oui</AppText>
            <Switch value={antidiarrheal === 'oui'} onValueChange={(v)=>setAntidiarrheal(v ? 'oui' : 'non')} />
          </View>
        </AppCard>

        <PrimaryButton 
          mode="contained" 
          onPress={handleSave} 
          disabled={!hasChanges()} 
          style={styles.save}
          buttonColor="#C16046"
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
    padding: 16,
    paddingTop: 8, // Réduit pour économiser l'espace
    paddingBottom: 24, // Espace en bas pour que le bouton soit visible
  },
  question: {
    marginTop: 0, // Supprimé pour réduire l'espace
    marginBottom: 8
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  horizontalButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  buttonContainer: {
    position: 'relative',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFF3EE',
    borderWidth: 1,
    borderColor: '#E6E0DA',
    minWidth: 60,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#312620',
    textAlign: 'center'
  },
  selectedButtonText: {
    color: '#C16046',
    fontWeight: '600'
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C16046'
  },
  save: {
    marginTop: 16, // Réduit de 32 à 16 pour économiser l'espace
    marginBottom: 8, // Réduit de 16 à 8
    alignSelf: 'stretch',
    paddingVertical: 14, // Légèrement réduit de 16 à 14
    borderRadius: 16,
    elevation: 4,
    minHeight: 56, // Hauteur minimale pour faciliter le clic
  },
  info: {
    marginTop: 8
  },
  block: {
    marginBottom: 12, // Réduit de 16 à 12 pour économiser l'espace
    paddingTop: 12, // Réduit le padding vertical supérieur (par défaut 16)
    paddingBottom: 12, // Réduit le padding vertical inférieur (par défaut 16)
  }
});

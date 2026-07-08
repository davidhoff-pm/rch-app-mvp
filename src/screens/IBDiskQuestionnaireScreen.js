import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Slider from '@react-native-community/slider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AppText from '../components/ui/AppText';
import AppCard from '../components/ui/AppCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import { storage } from '../utils/storage';
import designSystem from '../theme/designSystem';

const IBDiskQuestionnaireScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const editDate = route.params?.date;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const questions = [
    {
      id: 'abdominal_pain',
      icon: 'stomach',
      title: 'Douleur abdominale',
      question: 'J\'ai eu des douleurs au ventre ou à l\'estomac'
    },
    {
      id: 'bowel_regulation',
      icon: 'toilet',
      title: 'Régulation de la défécation',
      question: 'J\'ai eu des selles urgentes que j\'ai eu du mal à gérer ; trouver des toilettes à temps a été un problème et j\'ai parfois eu des difficultés d\'essuyage/nettoyage'
    },
    {
      id: 'social_life',
      icon: 'account-group',
      title: 'Vie sociale',
      question: 'J\'ai eu des difficultés dans ma relation aux autres et/ou des difficultés d\'intégration'
    },
    {
      id: 'professional_activities',
      icon: 'briefcase-outline',
      title: 'Activités professionnelles et scolaires',
      question: 'J\'ai eu des difficultés dans mes activités professionnelles ou dans mes études ou dans la réalisation des tâches quotidiennes'
    },
    {
      id: 'sleep',
      icon: 'weather-night',
      title: 'Sommeil',
      question: 'J\'ai eu des difficultés de sommeil, par exemple des problèmes d\'endormissement, des réveils nocturnes fréquents ou des réveils très matinaux sans possibilité de rendormissement'
    },
    {
      id: 'energy',
      icon: 'battery-low',
      title: 'Énergie',
      question: 'Je ne me suis jamais senti(e) véritablement reposé(e), j\'ai manqué d\'énergie, je me suis senti(e) fatigué(e)'
    },
    {
      id: 'stress_anxiety',
      icon: 'head-dots-horizontal',
      title: 'Niveau de stress, anxiété',
      question: 'Je me suis senti(e) triste, mon moral a été bas, ou je me suis senti(e) déprimé(e) et/ou inquiet(ète) et/ou anxieux(euse)'
    },
    {
      id: 'self_image',
      icon: 'account-outline',
      title: 'Image de soi',
      question: 'Je n\'aime pas mon corps ou certaines parties de mon corps'
    },
    {
      id: 'intimate_life',
      icon: 'heart-outline',
      title: 'Vie intime',
      question: 'J\'ai eu des difficultés d\'ordre psychologique et/ou physique dans ma sexualité'
    },
    {
      id: 'joint_pain',
      icon: 'bone',
      title: 'Douleur articulaire',
      question: 'Mes articulations me font souffrir'
    }
  ];

  useEffect(() => {
    if (editDate) {
      const historyJson = storage.getString('ibdiskHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];
      const entry = history.find(h => h.date === editDate);
      if (entry?.answers) {
        setAnswers(entry.answers);
        setCurrentQuestion(0);
        return;
      }
    }

    const savedProgress = storage.getString('ibdiskCurrentAnswers');
    if (savedProgress) {
      try {
        const progressData = JSON.parse(savedProgress);

        if (progressData.answers && typeof progressData.currentQuestion === 'number') {
          setAnswers(progressData.answers);
          setCurrentQuestion(progressData.currentQuestion);
        } else {
          setAnswers(progressData);
          const firstUnanswered = questions.findIndex(q => !progressData[q.id]);
          if (firstUnanswered !== -1) {
            setCurrentQuestion(firstUnanswered);
          }
        }
      } catch (e) {
        console.error('Erreur lors du chargement des réponses:', e);
      }
    }
  }, []);

  useEffect(() => {
    setAnswers(prev => {
      const currentQ = questions[currentQuestion];
      if (currentQ && prev[currentQ.id] === undefined) {
        const updated = { ...prev, [currentQ.id]: 5 };
        storage.set('ibdiskCurrentAnswers', JSON.stringify({
          answers: updated,
          currentQuestion: currentQuestion
        }));
        return updated;
      }
      return prev;
    });
  }, [currentQuestion]);

  const handleAnswerChange = (value) => {
    const newAnswers = { ...answers, [questions[currentQuestion].id]: value };
    setAnswers(newAnswers);

    const progressData = {
      answers: newAnswers,
      currentQuestion: currentQuestion
    };
    storage.set('ibdiskCurrentAnswers', JSON.stringify(progressData));
  };

  const handleNext = () => {
    const ensured = { ...answers };
    if (ensured[questions[currentQuestion].id] === undefined) {
      ensured[questions[currentQuestion].id] = 5;
    }

    if (currentQuestion < questions.length - 1) {
      const nextQuestion = currentQuestion + 1;
      if (ensured[questions[nextQuestion].id] === undefined) {
        ensured[questions[nextQuestion].id] = 5;
      }
      setAnswers(ensured);
      setCurrentQuestion(nextQuestion);

      storage.set('ibdiskCurrentAnswers', JSON.stringify({
        answers: ensured,
        currentQuestion: nextQuestion
      }));
    } else {
      setAnswers(ensured);
      handleSubmitWith(ensured);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1;
      setCurrentQuestion(prevQuestion);

      const progressData = {
        answers: answers,
        currentQuestion: prevQuestion
      };
      storage.set('ibdiskCurrentAnswers', JSON.stringify(progressData));
    }
  };

  const handleSubmitWith = async (finalAnswers) => {
    setIsLoading(true);

    try {
      const filled = { ...finalAnswers };
      questions.forEach(q => {
        if (filled[q.id] === undefined) filled[q.id] = 5;
      });

      const saveDate = editDate || (() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      })();

      const questionnaireData = {
        date: saveDate,
        timestamp: new Date().getTime(),
        answers: filled,
        completed: true
      };

      const historyJson = storage.getString('ibdiskHistory');
      const history = historyJson ? JSON.parse(historyJson) : [];

      const existingIndex = history.findIndex(h => h.date === saveDate);
      if (existingIndex >= 0) {
        history[existingIndex] = questionnaireData;
      } else {
        history.push(questionnaireData);
      }

      history.sort((a, b) => new Date(b.date) - new Date(a.date));

      storage.set('ibdiskHistory', JSON.stringify(history));
      storage.delete('ibdiskCurrentAnswers');

      if (!editDate) {
        storage.set('ibdiskLastUsed', new Date().getTime().toString());
      }

      navigation.goBack();

      setTimeout(() => {
        Alert.alert(
          editDate ? 'Questionnaire modifié' : 'Questionnaire terminé',
          editDate
            ? 'Vos modifications ont été enregistrées.'
            : 'Merci d\'avoir rempli le questionnaire IBDisk. Vos réponses ont été enregistrées.',
          [{ text: 'OK' }]
        );
      }, 100);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la sauvegarde. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const currentQ = questions[currentQuestion];
  const currentAnswer = answers[currentQ?.id];

  return (
    <ScrollView style={styles.container}>
      <AppCard style={styles.headerCard}>
        <AppText variant="headlineLarge" style={styles.title}>
          Votre quotidien
        </AppText>
        <AppText variant="bodyMedium" style={styles.subtitle}>
          Pour chaque item, sélectionnez le chiffre qui correspond au ressenti pendant la semaine qui vient de s'écouler
        </AppText>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentQuestion + 1) / questions.length) * 100}%` }
              ]}
            />
          </View>
          <AppText variant="labelSmall" style={styles.progressText}>
            {currentQuestion + 1} / {questions.length}
          </AppText>
        </View>
      </AppCard>

      <AppCard style={styles.questionCard}>
        <View style={styles.questionHeader}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={currentQ?.icon}
              size={28}
              color={designSystem.colors.primary[500]}
            />
          </View>
          <AppText variant="headlineSmall" style={styles.questionTitle}>
            {currentQ?.title}
          </AppText>
        </View>

        <AppText variant="bodyLarge" style={styles.questionText}>
          {currentQ?.question}
        </AppText>

        <View style={styles.scaleContainer}>
          <View style={styles.scaleHeader}>
            <AppText variant="bodyMedium" style={styles.scaleTitle}>
              Échelle de notation
            </AppText>
            <View style={styles.scoreDisplay}>
              <AppText variant="headlineLarge" style={styles.scoreValue}>
                {currentAnswer !== undefined ? currentAnswer : '-'}
              </AppText>
              <AppText variant="labelSmall" style={styles.scoreLabel}>
                / 10
              </AppText>
            </View>
          </View>

          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            step={1}
            value={currentAnswer !== undefined ? currentAnswer : 5}
            onValueChange={(value) => handleAnswerChange(Math.round(value))}
            minimumTrackTintColor={designSystem.colors.secondary[500]}
            maximumTrackTintColor={designSystem.colors.neutral[200]}
            thumbTintColor={designSystem.colors.secondary[500]}
          />

          <View style={styles.scaleMarkers}>
            {Array.from({ length: 11 }, (_, i) => (
              <AppText key={i} variant="labelSmall" style={styles.markerText}>
                {i}
              </AppText>
            ))}
          </View>

          <View style={styles.scaleLabels}>
            <AppText variant="labelSmall" style={styles.scaleLabelLeft}>
              Pas du tout d'accord
            </AppText>
            <AppText variant="labelSmall" style={styles.scaleLabelRight}>
              Tout à fait d'accord
            </AppText>
          </View>
        </View>
      </AppCard>

      <View style={styles.navigationContainer}>
        <SecondaryButton
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
          style={styles.navButton}
        >
          Précédent
        </SecondaryButton>

        <PrimaryButton
          onPress={handleNext}
          loading={isLoading}
          style={styles.navButton}
        >
          {currentQuestion === questions.length - 1 ? 'Terminer' : 'Suivant'}
        </PrimaryButton>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background.secondary,
  },
  headerCard: {
    margin: designSystem.spacing[5],
    marginBottom: designSystem.spacing[4],
    padding: designSystem.spacing[5],
  },
  title: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    marginBottom: designSystem.spacing[2],
  },
  subtitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[5],
    lineHeight: 22,
  },
  progressContainer: {
    marginTop: designSystem.spacing[4],
  },
  progressBar: {
    height: 8,
    backgroundColor: designSystem.colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: designSystem.spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: designSystem.colors.secondary[500],
    borderRadius: 4,
  },
  progressText: {
    color: designSystem.colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  questionCard: {
    marginHorizontal: designSystem.spacing[5],
    marginBottom: designSystem.spacing[5],
    padding: designSystem.spacing[5],
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[4],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: designSystem.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: designSystem.spacing[3],
  },
  questionTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    flex: 1,
  },
  questionText: {
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[6],
    lineHeight: 24,
  },
  scaleContainer: {
    marginTop: designSystem.spacing[2],
    backgroundColor: designSystem.colors.background.secondary,
    padding: designSystem.spacing[4],
    borderRadius: designSystem.borderRadius.base,
    borderWidth: 1,
    borderColor: designSystem.colors.neutral[200],
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[4],
  },
  scaleTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: designSystem.colors.background.tertiary,
    paddingHorizontal: designSystem.spacing[4],
    paddingVertical: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.sm,
    borderWidth: 2,
    borderColor: designSystem.colors.secondary[500],
  },
  scoreValue: {
    color: designSystem.colors.secondary[500],
    fontWeight: '700',
    fontSize: 32,
  },
  scoreLabel: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  slider: {
    width: '100%',
    height: 40,
    marginVertical: designSystem.spacing[2],
  },
  scaleMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: designSystem.spacing[4],
  },
  markerText: {
    color: designSystem.colors.neutral[400],
    fontWeight: '600',
    fontSize: 10,
    textAlign: 'center',
    width: 20,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: designSystem.spacing[2],
    paddingTop: designSystem.spacing[2],
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.neutral[200],
  },
  scaleLabelLeft: {
    color: designSystem.colors.text.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  scaleLabelRight: {
    color: designSystem.colors.text.primary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: designSystem.spacing[5],
    marginBottom: 40,
    gap: designSystem.spacing[3],
  },
  navButton: {
    flex: 1,
  },
});

export default IBDiskQuestionnaireScreen;

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Linking, TouchableOpacity, Platform, Alert, Animated } from 'react-native';
import { Text, Button, Portal, Modal, Card, Switch, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import HealthIcon from '../components/ui/HealthIcon';
import AppCard from '../components/ui/AppCard';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import StatCard from '../components/ui/StatCard';
import Toast from '../components/ui/Toast';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';
import DateTimePicker from '../components/ui/DateTimePicker';
import { isValidDate, isValidTime } from '../components/ui/DateTimeInput';
import Slider from '@react-native-community/slider';
import storage from '../utils/storage';
import calculateLichtigerScore from '../utils/scoreCalculator';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getSurveyDayKey } from '../utils/dayKey';
import { useTheme } from 'react-native-paper';
import designSystem from '../theme/designSystem';
import { fetchRSSFeed } from '../services/rssService';
import { saveFeedback, errorFeedback, toggleFeedback } from '../utils/haptics';
import { useStoolModal } from '../contexts/StoolModalContext';
import ActionCard from '../components/home/ActionCard';
import usePendingTreatments from '../hooks/usePendingTreatments';
import SymptomModal from '../components/modals/SymptomModal';
import NoteModal from '../components/modals/NoteModal';
import { useSpeedDial } from '../contexts/SpeedDialContext';

// Hooks personnalisés
import { useHistoryData } from '../hooks/useHistoryData';
import { useSymptomManagement } from '../hooks/useSymptomManagement';
import { useNoteManagement } from '../hooks/useNoteManagement';

export default function HomeScreen({ route }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isModalVisible, openModal, closeModal } = useStoolModal();
  const { registerHandlers } = useSpeedDial();
  const [bristol, setBristol] = useState(4);
  const [hasBlood, setHasBlood] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [todayProvisionalScore, setTodayProvisionalScore] = useState(null);

  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');

  // États pour la modale de traitement
  const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentDateInput, setTreatmentDateInput] = useState('');
  const [treatmentTimeInput, setTreatmentTimeInput] = useState('');
  const [treatmentSuggestions, setTreatmentSuggestions] = useState([]);

  // État pour le Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // États pour IBDisk
  const [ibdiskAvailable, setIbdiskAvailable] = useState(true);
  const [ibdiskDaysRemaining, setIbdiskDaysRemaining] = useState(0);

  // États pour les actualités RSS
  const [rssArticles, setRssArticles] = useState([]);
  const [rssLoading, setRssLoading] = useState(true);

  // États pour le tooltip du score
  const [scoreTooltipVisible, setScoreTooltipVisible] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.96)).current;


  // Chargement des données (utilisé pour rafraîchir après ajout via le bouton +)
  const { loadHistoryData } = useHistoryData();

  // Nombre de prises de traitement en attente (pour la section "À faire")
  const pendingTreatmentsCount = usePendingTreatments();

  // Salutation selon l'heure + date du jour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return 'Bonne nuit';
    if (h < 18) return 'Bonjour';
    return 'Bonsoir';
  }, []);

  const todayLabel = useMemo(() => {
    const label = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, []);

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Hook pour gérer les symptômes (ajout via le bouton + de la barre de navigation)
  const symptomManagement = useSymptomManagement({
    onDataChange: loadHistoryData,
    showToast
  });

  // Hook pour gérer les notes
  const noteManagement = useNoteManagement({
    onDataChange: loadHistoryData,
    showToast
  });

  // Animation du tooltip
  useEffect(() => {
    if (scoreTooltipVisible) {
      Animated.parallel([
        Animated.timing(tooltipOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(tooltipScale, { toValue: 1, speed: 20, bounciness: 6, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(tooltipOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(tooltipScale, { toValue: 0.96, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [scoreTooltipVisible, tooltipOpacity, tooltipScale]);

  const bristolDescriptions = useMemo(() => ({
    1: 'Noix dures séparées',
    2: 'Saucisse grumeleuse',
    3: 'Saucisse fissurée',
    4: 'Saucisse lisse (normal)',
    5: 'Morceaux mous',
    6: 'Morceaux floconneux',
    7: 'Aqueux, liquide'
  }), []);

  // Fonction pour charger les articles RSS
  const loadRSSArticles = async () => {
    try {
      setRssLoading(true);
      const articles = await fetchRSSFeed();
      setRssArticles(articles);
    } catch (error) {
      console.error('Erreur lors du chargement des articles RSS:', error);
      setRssArticles([]);
    } finally {
      setRssLoading(false);
    }
  };

  // Fonction pour ouvrir un article dans le navigateur
  const openArticle = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setToastMessage('Impossible d\'ouvrir le lien');
        setToastType('error');
        setToastVisible(true);
      }
    } catch (error) {
      setToastMessage('Erreur lors de l\'ouverture du lien');
      setToastType('error');
      setToastVisible(true);
    }
  };

  // Fonction pour vérifier la disponibilité d'IBDisk
  const checkIBDiskAvailability = () => {
    const lastUsedStr = storage.getString('ibdiskLastUsed');
    if (!lastUsedStr) {
      setIbdiskAvailable(true);
      setIbdiskDaysRemaining(0);
      return;
    }

    const lastUsed = parseInt(lastUsedStr);
    const now = new Date().getTime();
    const daysSinceLastUsed = Math.floor((now - lastUsed) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastUsed >= 30) {
      setIbdiskAvailable(true);
      setIbdiskDaysRemaining(0);
    } else {
      setIbdiskAvailable(false);
      setIbdiskDaysRemaining(30 - daysSinceLastUsed);
    }
  };

  const computeTodayCount = () => {
    const json = storage.getString('dailySells');
    if (!json) return 0;
    const list = JSON.parse(json);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return list.filter((e) => e.timestamp >= start && e.timestamp < end).length;
  };

  const formatDate = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  };

  const isNight = (timestamp) => {
    // 23h -> 6h
    const d = new Date(timestamp);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return minutes >= 1380 || minutes < 360; // 23h = 1380 min, 6h = 360 min
  };

  const computeStoolSubscoresForDate = (dateStr) => {
    const stoolsJson = storage.getString('dailySells');
    const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
    // Créer la date en heure locale (pas UTC) pour éviter les décalages de fuseau horaire
    const [y, m, d] = dateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const dayStools = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);
    const stoolsCount = dayStools.length;
    const nocturnalCount = dayStools.filter(s => isNight(s.timestamp)).length;
    const bloodCount = dayStools.filter(s => s.hasBlood).length;

    let stoolsScore = 0;
    if (stoolsCount >= 10) stoolsScore = 4;
    else if (stoolsCount >= 7) stoolsScore = 3;
    else if (stoolsCount >= 5) stoolsScore = 2;
    else if (stoolsCount >= 3) stoolsScore = 1;
    else stoolsScore = 0;

    const nocturnalScore = nocturnalCount > 0 ? 1 : 0;

    let bloodScore = 0;
    if (stoolsCount > 0) {
      const ratio = bloodCount / stoolsCount;
      if (ratio === 0) bloodScore = 0;
      else if (ratio < 0.5) bloodScore = 1;
      else if (ratio < 1) bloodScore = 2;
      else bloodScore = 3;
    }

    return stoolsScore + nocturnalScore + bloodScore;
  };

  // Ouvrir automatiquement le modal de bilan si demandé par une notification
  useEffect(() => {
    if (route?.params?.openSurveyModal && !surveyCompleted) {
      console.log('🔔 Ouverture automatique du modal de bilan suite à une notification');
      openModal();
      // Réinitialiser le paramètre pour éviter une réouverture lors du prochain focus
      navigation.setParams({ openSurveyModal: false });
    }
  }, [route?.params?.openSurveyModal, surveyCompleted]);

  useFocusEffect(
    React.useCallback(() => {
      setDailyCount(computeTodayCount());
      const key = getSurveyDayKey(new Date(), 0);
      const json = storage.getString('dailySurvey');
      if (json) {
        const map = JSON.parse(json);
        setSurveyCompleted(Boolean(map[key]));
      } else {
        setSurveyCompleted(false);
      }
      
      // Vérifier la disponibilité d'IBDisk
      checkIBDiskAvailability();
      
      // Charger les articles RSS
      loadRSSArticles();

      // Charger les données de l'historique
      loadHistoryData();

      // Today provisional score
      const today = new Date();
      const tDateStr = formatDate(today);
      const fullToday = calculateLichtigerScore(tDateStr, storage);
      if (fullToday == null) {
        setTodayProvisionalScore(computeStoolSubscoresForDate(tDateStr));
      } else {
        setTodayProvisionalScore(fullToday);
        // Si on a un score complet pour aujourd'hui, le sauvegarder dans l'historique
        const histJson = storage.getString('scoresHistory');
        const history = histJson ? JSON.parse(histJson) : [];
        const existingIndex = history.findIndex((h) => h.date === tDateStr);
        if (existingIndex >= 0) {
          // Mettre à jour le score existant
          history[existingIndex].score = fullToday;
          storage.set('scoresHistory', JSON.stringify(history));
        } else {
          // Ajouter un nouveau score
          const newHistory = [{ date: tDateStr, score: fullToday }, ...history];
          storage.set('scoresHistory', JSON.stringify(newHistory));
        }
      }
    }, [])
  );

  // Enregistrer les handlers pour le Speed Dial dans la tab bar
  useEffect(() => {
    registerHandlers({
      onStoolPress: showModal,
      onSymptomPress: symptomManagement.handleOpenSymptomModal,
      onNotePress: noteManagement.handleOpenNoteModal,
    });
  }, []);

  const hideModal = () => {
    closeModal();
  };

  // Fonctions pour la modale de traitement
  const showTreatmentModal = () => {
    const now = new Date();
    setTreatmentDateInput(now.toLocaleDateString('fr-FR'));
    setTreatmentTimeInput(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    setTreatmentName('');
    setTreatmentSuggestions([]);
    setTreatmentModalVisible(true);
  };

  const hideTreatmentModal = () => {
    setTreatmentModalVisible(false);
    setTreatmentName('');
    setTreatmentSuggestions([]);
  };

  const handleTreatmentNameChange = (text) => {
    setTreatmentName(text);
    
    // Récupérer tous les traitements pour l'auto-complétion
    if (text.length > 0) {
      const treatmentsJson = storage.getString('treatments');
      const treatments = treatmentsJson ? JSON.parse(treatmentsJson) : [];
      
      // Extraire les noms uniques
      const uniqueNames = [...new Set(treatments.map(t => t.name))];
      
      // Filtrer ceux qui commencent par le texte entré
      const suggestions = uniqueNames.filter(name => 
        name.toLowerCase().startsWith(text.toLowerCase())
      ).slice(0, 5); // Limiter à 5 suggestions
      
      setTreatmentSuggestions(suggestions);
    } else {
      setTreatmentSuggestions([]);
    }
  };

  const saveTreatment = () => {
    if (!treatmentName.trim()) {
      showToast('Veuillez entrer le nom du traitement', 'error');
      return;
    }

    // Valider la date et l'heure
    if (!isValidDate(treatmentDateInput)) {
      showToast('Date invalide', 'error');
      return;
    }

    if (!isValidTime(treatmentTimeInput)) {
      showToast('Heure invalide', 'error');
      return;
    }

    const selectedDateTime = parseDateTime(treatmentDateInput, treatmentTimeInput);
    const timestamp = selectedDateTime.getTime();

    const treatmentsJson = storage.getString('treatments');
    const treatments = treatmentsJson ? JSON.parse(treatmentsJson) : [];
    
    const newTreatment = {
      id: Date.now().toString(),
      name: treatmentName.trim(),
      timestamp: timestamp
    };
    
    treatments.push(newTreatment);
    storage.set('treatments', JSON.stringify(treatments));
    
    hideTreatmentModal();
    showToast('💊 Traitement enregistré !', 'success');
  };
  const showModal = () => {
    openModal();
  };

  // Initialiser les valeurs quand la modale s'ouvre via le contexte
  useEffect(() => {
    if (isModalVisible) {
      const now = new Date();
      setDateInput(now.toLocaleDateString('fr-FR'));
      setTimeInput(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      
      // Récupérer la dernière selle pour pré-remplir les valeurs
      const stoolsJson = storage.getString('dailySells');
      const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
      
      if (stools.length > 0) {
        // Trier par timestamp décroissant pour avoir la plus récente
        const sortedStools = stools.sort((a, b) => b.timestamp - a.timestamp);
        const lastStool = sortedStools[0];
        
        // Utiliser les valeurs de la dernière selle
        setBristol(lastStool.bristolScale);
        setHasBlood(lastStool.hasBlood);
      } else {
        // Valeurs par défaut si aucune selle
        setBristol(4);
        setHasBlood(false);
      }
    }
  }, [isModalVisible]);

  const containerStyle = useMemo(() => ({
    margin: 16
  }), []);

  const formatDateInput = (text) => {
    // Supprimer tout sauf les chiffres
    const numbers = text.replace(/\D/g, '');
    
    // Limiter à 8 chiffres (DDMMYYYY)
    const limited = numbers.slice(0, 8);
    
    // Formater avec les /
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const formatTimeInput = (text) => {
    // Supprimer tout sauf les chiffres
    const numbers = text.replace(/\D/g, '');
    
    // Limiter à 4 chiffres (HHMM)
    const limited = numbers.slice(0, 4);
    
    // Formater avec le :
    if (limited.length <= 2) {
      return limited;
    } else {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`;
    }
  };

  const validateDate = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    // Validation basique
    if (day < 1 || day > 31) return false;
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    
    // Validation avec Date
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
  };

  const validateTime = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return false;
    
    const hour = parseInt(parts[0]);
    const minute = parseInt(parts[1]);
    
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  };

  const parseDateTime = (dateStr, timeStr) => {
    try {
      if (!validateDate(dateStr) || !validateTime(timeStr)) {
        return new Date(); // Retourner la date actuelle si invalide
      }

      const [day, month, year] = dateStr.split('/');
      const [hour, minute] = timeStr.split(':');
      
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // Les mois commencent à 0
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
      
      return date;
    } catch (error) {
      return new Date(); // Retourner la date actuelle en cas d'erreur
    }
  };

  const handleSave = () => {
    // Valider la date et l'heure
    if (!isValidDate(dateInput)) {
      errorFeedback();
      showToast('Date invalide', 'error');
      return;
    }

    if (!isValidTime(timeInput)) {
      errorFeedback();
      showToast('Heure invalide', 'error');
      return;
    }

    const selectedDateTime = parseDateTime(dateInput, timeInput);
    
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: selectedDateTime.getTime(),
      bristolScale: Math.round(bristol),
      hasBlood
    };

    const existingJson = storage.getString('dailySells');
    const existing = existingJson ? JSON.parse(existingJson) : [];
    const updated = [entry, ...existing];
    storage.set('dailySells', JSON.stringify(updated));
    
    setDailyCount(computeTodayCount());
    // refresh provisional score after add
    const tDateStr = formatDate(new Date());
    const fullToday = calculateLichtigerScore(tDateStr, storage);
    if (fullToday == null) {
      setTodayProvisionalScore(computeStoolSubscoresForDate(tDateStr));
    } else {
      setTodayProvisionalScore(fullToday);
      // Sauvegarder le score complet dans l'historique
      const histJson = storage.getString('scoresHistory');
      const history = histJson ? JSON.parse(histJson) : [];
      const existingIndex = history.findIndex((h) => h.date === tDateStr);
      if (existingIndex >= 0) {
        // Mettre à jour le score existant
        history[existingIndex].score = fullToday;
        storage.set('scoresHistory', JSON.stringify(history));
      } else {
        // Ajouter un nouveau score
        const newHistory = [{ date: tDateStr, score: fullToday }, ...history];
        storage.set('scoresHistory', JSON.stringify(newHistory));
      }
    }

    // Recharger les données de l'historique pour HomeScreen
    loadHistoryData();

    saveFeedback();
    hideModal();
  };

  const navigateToSurvey = () => {
    try {
      navigation.navigate('DailySurvey');
    } catch (e) {
      try {
        navigation.getParent()?.navigate('DailySurvey');
      } catch (_) {
        // ignore
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête : salutation + date */}
        <View style={styles.homeHeader}>
          <AppText variant="h2" style={styles.greetingText}>
            {greeting}
          </AppText>
          <AppText variant="bodyMedium" style={styles.dateText}>
            {todayLabel}
          </AppText>
        </View>

        {/* Section : À faire aujourd'hui */}
        <View style={styles.todoSection}>
          <View style={styles.todoHeader}>
            <HealthIcon name="stethoscope" size={22} color={designSystem.colors.primary[500]} />
            <AppText variant="h4" style={styles.todoTitle}>
              À faire aujourd'hui
            </AppText>
          </View>

          {(!surveyCompleted || ibdiskAvailable || pendingTreatmentsCount > 0) ? (
            <View style={styles.todoList}>
              {!surveyCompleted && (
                <ActionCard
                  title="Bilan quotidien"
                  description="Renseignez vos symptômes du jour"
                  icon="clipboard-text-outline"
                  gradient={['#4C4DDC', '#3A3AB0']}
                  style={styles.todoActionCard}
                  onPress={navigateToSurvey}
                />
              )}
              {ibdiskAvailable && (
                <ActionCard
                  title="Questionnaire IBDisk"
                  description="Évaluez votre qualité de vie (mensuel)"
                  icon="chart-box-outline"
                  gradient={['#6366F1', '#4F46E5']}
                  style={styles.todoActionCard}
                  onPress={() => navigation.navigate('IBDiskQuestionnaire')}
                />
              )}
              {pendingTreatmentsCount > 0 && (
                <ActionCard
                  title="Traitement à prendre"
                  description={`${pendingTreatmentsCount} prise${pendingTreatmentsCount > 1 ? 's' : ''} en attente aujourd'hui`}
                  icon="pill"
                  gradient={['#22C55E', '#16A34A']}
                  style={styles.todoActionCard}
                  onPress={() => navigation.navigate('Traitement')}
                />
              )}
            </View>
          ) : (
            <AppCard variant="success" style={styles.allDoneCard}>
              <View style={styles.allDoneContent}>
                <MaterialCommunityIcons name="check-circle" size={28} color={designSystem.colors.health.excellent.main} />
                <View style={styles.allDoneTextWrap}>
                  <AppText variant="bodyLarge" style={styles.allDoneTitle}>
                    Tout est à jour
                  </AppText>
                  <AppText variant="bodySmall" style={styles.allDoneSubtitle}>
                    Aucune action requise pour aujourd'hui
                  </AppText>
                </View>
              </View>
            </AppCard>
          )}
        </View>

        {/* Section Aujourd'hui */}
        <AppCard style={styles.todaySection}>
          <View style={styles.sectionHeader}>
            <HealthIcon name="calendar" size={28} color={designSystem.colors.primary[500]} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Aujourd'hui
            </AppText>
          </View>

          <View style={styles.todayStatsRow}>
            {/* Selles */}
            <View style={[styles.todayStat, styles.todayStatLeft]}>
              <View style={styles.todayStatIcon}>
                <MaterialCommunityIcons name="toilet" size={Platform.OS === 'web' ? 32 : 28} color="#4C4DDC" />
              </View>
              <View style={styles.todayStatContent}>
                <AppText variant="labelMedium" style={styles.todayStatLabel}>
                  Selles
                </AppText>
                <AppText variant="displayMedium" style={styles.todayStatValue}>
                  {dailyCount}
                </AppText>
              </View>
            </View>

            {/* Score */}
            <View
              style={[styles.todayStat, styles.todayStatRight]}
              {...(Platform.OS === 'web' && {
                onMouseEnter: () => setScoreTooltipVisible(true),
                onMouseLeave: () => setScoreTooltipVisible(false),
              })}
            >
              <View style={styles.todayStatIcon}>
                <MaterialCommunityIcons
                  name="chart-bar"
                  size={Platform.OS === 'web' ? 32 : 28}
                  color={todayProvisionalScore !== null ? (todayProvisionalScore < 5 ? '#16A34A' : todayProvisionalScore <= 10 ? '#F59E0B' : '#DC2626') : '#A3A3A3'}
                />
              </View>
              <View style={styles.todayStatContent}>
                <View style={styles.todayScoreHeader}>
                  <AppText variant="labelMedium" style={styles.todayStatLabel}>
                    Score
                  </AppText>
                  {Platform.OS === 'web' && (
                    <MaterialCommunityIcons name="information-outline" size={16} color="#64748B" />
                  )}
                </View>
                <AppText variant="displayMedium" style={[
                  styles.todayStatValue,
                  todayProvisionalScore !== null && (
                    todayProvisionalScore < 5 ? styles.scoreGood :
                    todayProvisionalScore <= 10 ? styles.scoreWarning :
                    styles.scoreError
                  )
                ]}>
                  {todayProvisionalScore !== null ? todayProvisionalScore : 'N/A'}
                </AppText>
              </View>

              {/* Tooltip au survol (web uniquement) */}
              {Platform.OS === 'web' && scoreTooltipVisible && (
                <>
                  <Animated.View
                    style={[
                      styles.scoreTooltip,
                      {
                        opacity: tooltipOpacity,
                        transform: [{ scale: tooltipScale }],
                      },
                    ]}
                    pointerEvents="none"
                  >
                    <View style={styles.scoreTooltipHeader}>
                      <MaterialCommunityIcons name="chart-line" size={14} color="#4C4DDC" />
                      <AppText variant="labelSmall" style={styles.scoreTooltipTitle}>
                        Score de Lichtiger
                      </AppText>
                    </View>
                    <AppText variant="labelSmall" style={styles.scoreTooltipText}>
                      Évalue l'activité de la maladie
                    </AppText>
                    <View style={styles.scoreTooltipScale}>
                      <AppText variant="labelSmall" style={styles.scoreTooltipScaleItem}>
                        • 0-4 : Rémission
                      </AppText>
                      <AppText variant="labelSmall" style={styles.scoreTooltipScaleItem}>
                        • 5-10 : Modérée
                      </AppText>
                      <AppText variant="labelSmall" style={styles.scoreTooltipScaleItem}>
                        • {'>'} 10 : Sévère
                      </AppText>
                    </View>
                  </Animated.View>

                  {/* Flèche du tooltip */}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.scoreTooltipArrow,
                      {
                        opacity: tooltipOpacity,
                        transform: [{ scale: tooltipScale }],
                      },
                    ]}
                  />
                </>
              )}
            </View>
          </View>
        </AppCard>


        {/* Actualités de l'association MICI */}
        <AppCard style={styles.newsCard}>
          <View style={styles.newsHeader}>
            <HealthIcon name="report" size={28} color={designSystem.colors.primary[500]} />
            <AppText variant="h3" style={styles.newsTitle}>
              Actualités AFA
            </AppText>
          </View>
          <AppText variant="bodyMedium" style={styles.newsDescription}>
            Découvrez les dernières actualités de l'Association François Aupetit (AFA)
          </AppText>
          
          {rssLoading ? (
            <SkeletonCard count={3} />
          ) : rssArticles.length > 0 ? (
            <View style={styles.newsItems}>
              {rssArticles.map((article, index) => (
                <View key={index} style={styles.newsItem}>
                  <View style={styles.newsItemHeader}>
                    <AppText variant="label" style={styles.newsDate}>
                      {article.formattedDate}
                    </AppText>
                    <View style={styles.newsBadge}>
                      <AppText variant="caption" style={styles.newsBadgeText}>
                        {index === 0 ? 'Nouveau' : 'Actualité'}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="body" style={styles.newsItemTitle}>
                    {article.title}
                  </AppText>
                  <AppText variant="bodySmall" style={styles.newsItemExcerpt}>
                    {article.description}
                  </AppText>
                  <TouchableOpacity 
                    onPress={() => openArticle(article.link)}
                    style={styles.articleButton}
                  >
                    <AppText variant="bodySmall" color="primary" style={styles.articleButtonText}>
                      Voir l'article complet →
                    </AppText>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.newsError}>
              <AppText variant="bodyMedium" style={styles.newsErrorText}>
                Impossible de charger les actualités
              </AppText>
            </View>
          )}
          
          <PrimaryButton 
            onPress={() => openArticle('https://www.afa.asso.fr/')}
            variant="primary"
            outlined
            style={styles.newsButton}
            icon="open-in-new"
          >
            Voir toutes les actualités
          </PrimaryButton>
        </AppCard>

      </ScrollView>

      {/* Modal d'enregistrement de selle */}
      <Portal>
        <Modal visible={isModalVisible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
          <AppCard style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <AppText variant="h2" style={styles.modalTitle}>
                Nouvelle selle
              </AppText>
              
              <View style={styles.dateTimeSection}>
              <DateTimePicker
                dateValue={dateInput}
                timeValue={timeInput}
                onDateChange={setDateInput}
                onTimeChange={setTimeInput}
                dateLabel="Date (DD/MM/YYYY)"
                timeLabel="Heure (HH:MM)"
              />
              <AppText variant="labelSmall" style={styles.dateTimeHint}>
                Format: Date DD/MM/YYYY, Heure HH:MM (24h)
              </AppText>
            </View>

            <View style={styles.bristolSection}>
              <AppText style={styles.fieldLabel}>Consistance (Bristol)</AppText>
              <Slider
                minimumValue={1}
                maximumValue={7}
                step={1}
                value={bristol}
                onValueChange={setBristol}
                style={styles.slider}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.outline}
                thumbStyle={{ backgroundColor: theme.colors.primary }}
              />
              <AppText variant="labelMedium" style={styles.bristolHint}>
                Sélection: {bristol} — {bristolDescriptions[bristol]}
              </AppText>
            </View>

            <View style={styles.bloodSection}>
              <View style={styles.switchRow}>
                <AppText variant="bodyLarge">Présence de sang</AppText>
                <Switch 
                  value={hasBlood} 
                  onValueChange={(value) => {
                    toggleFeedback();
                    setHasBlood(value);
                  }}
                  color={theme.colors.error}
                />
              </View>
            </View>

              <View style={styles.modalActions}>
                <PrimaryButton 
                  onPress={handleSave} 
                  style={styles.saveButton}
                  variant="primary"
                  size="medium"
                >
                  Enregistrer
                </PrimaryButton>
                <PrimaryButton 
                  onPress={hideModal} 
                  style={styles.cancelButton}
                  variant="neutral"
                  size="medium"
                  outlined
                >
                  Annuler
                </PrimaryButton>
              </View>
            </ScrollView>
          </AppCard>
        </Modal>
      </Portal>

      {/* Modale de prise de traitement */}
      <Portal>
        <Modal visible={treatmentModalVisible} onDismiss={hideTreatmentModal} contentContainerStyle={styles.modalContainer}>
          <AppCard style={styles.modalCard}>
            <ScrollView>
              <Card.Title title="Prise de traitement" titleStyle={{ fontSize: 22, fontWeight: '700', color: '#1E293B' }} />
              
              <Card.Content>
                {/* Date et Heure */}
                <AppText variant="bodyMedium" style={styles.modalSectionLabel}>
                  📅 Date et heure de la prise
                </AppText>
                
                <DateTimePicker
                  dateValue={treatmentDateInput}
                  timeValue={treatmentTimeInput}
                  onDateChange={setTreatmentDateInput}
                  onTimeChange={setTreatmentTimeInput}
                  dateLabel="Date (JJ/MM/AAAA)"
                  timeLabel="Heure (HH:MM)"
                />

                {/* Nom du traitement */}
                <AppText variant="bodyMedium" style={[styles.modalSectionLabel, { marginTop: 20 }]}>
                  💊 Nom du traitement
                </AppText>
                
                <TextInput
                  label="Ex: Pentasa, Humira..."
                  value={treatmentName}
                  onChangeText={handleTreatmentNameChange}
                  style={[styles.treatmentInput, { backgroundColor: '#F8FAFB', borderRadius: 16 }]}
                  mode="outlined"
                  outlineStyle={{ borderRadius: 16 }}
                  autoCapitalize="words"
                />

                {/* Suggestions d'auto-complétion */}
                {treatmentSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {treatmentSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        mode="outlined"
                        onPress={() => {
                          setTreatmentName(suggestion);
                          setTreatmentSuggestions([]);
                        }}
                        style={styles.suggestionButton}
                        labelStyle={styles.suggestionButtonLabel}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </View>
                )}
              </Card.Content>

              <View style={styles.modalActions}>
                <PrimaryButton
                  onPress={saveTreatment}
                  style={styles.saveButton}
                  variant="primary"
                  size="medium"
                >
                  Enregistrer
                </PrimaryButton>
                <PrimaryButton
                  onPress={hideTreatmentModal}
                  style={styles.cancelButton}
                  variant="neutral"
                  size="medium"
                  outlined
                >
                  Annuler
                </PrimaryButton>
              </View>
            </ScrollView>
          </AppCard>
        </Modal>
      </Portal>

      {/* Toast de notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />

      {/* Modal de symptôme */}
      <SymptomModal
        visible={symptomManagement.symptomModalVisible}
        onDismiss={symptomManagement.handleCloseSymptomModal}
        onSave={symptomManagement.handleSaveSymptom}
        initialData={symptomManagement.editingSymptom}
      />

      {/* Modal de note */}
      <NoteModal
        visible={noteManagement.noteModalVisible}
        onDismiss={noteManagement.handleCloseNoteModal}
        onSave={noteManagement.handleSaveNote}
        initialData={noteManagement.editingNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background.primary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: designSystem.spacing[5], // Augmenté de [4] à [5] pour plus d'air
  },
  scrollViewContent: {
    paddingTop: designSystem.spacing[4], // Ajout d'un padding top
    paddingBottom: 120, // Augmenté de 100 à 120 pour la tab bar
  },
  homeHeader: {
    marginTop: designSystem.spacing[2],
    marginBottom: designSystem.spacing[5],
  },
  greetingText: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  dateText: {
    color: designSystem.colors.text.secondary,
    marginTop: designSystem.spacing[1],
  },
  todoSection: {
    marginBottom: designSystem.spacing[6],
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    marginBottom: designSystem.spacing[4],
  },
  todoTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  todoList: {
    gap: designSystem.spacing[1],
  },
  todoActionCard: {
    marginHorizontal: 0, // Neutralise l'inset interne d'ActionCard (le ScrollView gère le padding)
  },
  allDoneCard: {
    marginBottom: 0,
  },
  allDoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[3],
  },
  allDoneTextWrap: {
    flex: 1,
  },
  allDoneTitle: {
    color: designSystem.colors.health.excellent.dark,
    fontWeight: '700',
  },
  allDoneSubtitle: {
    color: designSystem.colors.text.secondary,
    marginTop: 2,
  },
  statsContainer: {
    marginBottom: designSystem.spacing[6],
  },
  mainActionsContainer: {
    marginBottom: designSystem.spacing[6],
    paddingHorizontal: designSystem.spacing[4],
    paddingTop: designSystem.spacing[4],
  },
  actionsGrid: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designSystem.colors.background.tertiary,
    borderRadius: designSystem.borderRadius.lg,
    padding: designSystem.spacing[4],
    ...designSystem.shadows.md,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: designSystem.spacing[3],
  },
  actionTitle: {
    flex: 1,
    color: designSystem.colors.text.primary,
  },
  actionTitleDisabled: {
    color: designSystem.colors.text.secondary,
  },
  actionButtons: {
    gap: designSystem.spacing[4],
  },
  primaryAction: {
    marginBottom: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.base,
    paddingVertical: designSystem.spacing[1],
  },
  secondaryAction: {
    marginBottom: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.base,
    paddingVertical: designSystem.spacing[1],
  },
  newsCard: {
    backgroundColor: designSystem.colors.background.tertiary,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    ...designSystem.shadows.base,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[3],
  },
  newsTitle: {
    marginLeft: designSystem.spacing[3],
    color: designSystem.colors.text.primary,
  },
  newsDescription: {
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[5],
  },
  newsItems: {
    marginBottom: designSystem.spacing[5],
  },
  newsItem: {
    paddingVertical: designSystem.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border.light,
  },
  newsItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[2],
  },
  newsDate: {
    color: designSystem.colors.text.tertiary,
  },
  newsBadge: {
    backgroundColor: designSystem.colors.primary[100],
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[1],
    borderRadius: designSystem.borderRadius.sm,
  },
  newsBadgeText: {
    color: designSystem.colors.primary[700],
    fontWeight: designSystem.typography.fontWeight.medium,
  },
  newsItemTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: designSystem.typography.fontWeight.normal, // Style texte normal
    marginBottom: designSystem.spacing[1],
  },
  newsItemExcerpt: {
    color: designSystem.colors.text.secondary,
    lineHeight: designSystem.typography.fontSize.sm * 1.4,
  },
  newsButton: {
    width: '100%',
    borderRadius: designSystem.borderRadius.md,
  },
  newsLoading: {
    paddingVertical: designSystem.spacing[6],
    alignItems: 'center',
  },
  newsLoadingText: {
    color: designSystem.colors.text.secondary,
    fontStyle: 'italic',
  },
  newsError: {
    paddingVertical: designSystem.spacing[6],
    alignItems: 'center',
  },
  newsErrorText: {
    color: designSystem.colors.health.danger.main,
  },
  articleButton: {
    marginTop: designSystem.spacing[3],
    alignSelf: 'flex-start',
    paddingVertical: designSystem.spacing[2],
    paddingHorizontal: designSystem.spacing[3],
  },
  articleButtonText: {
    textDecorationLine: 'underline',
    fontWeight: designSystem.typography.fontWeight.medium,
  },
  modalContainer: {
    margin: designSystem.spacing[4], // Réduit de [5] à [4]
    maxHeight: '90%', // Augmenté de 85% à 90%
  },
  modalCard: {
    backgroundColor: designSystem.colors.background.tertiary,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    ...designSystem.shadows.xl,
    overflow: 'hidden',
  },
  modalScroll: {
    padding: designSystem.spacing[5], // Réduit de [7] à [5] pour plus d'espace
  },
  modalTitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[5], // Réduit de [7] à [5]
    textAlign: 'center',
    fontSize: 24, // Ajout taille explicite pour mobile
    lineHeight: 32,
  },
  dateTimeSection: {
    marginBottom: designSystem.spacing[5], // Réduit de [6] à [5]
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm, // Réduit de base à sm (14px)
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[3], // Réduit de [4] à [3]
  },
  dateTimeRow: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
  },
  dateTimeInput: {
    flex: 1,
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
  },
  dateTimeHint: {
    color: designSystem.colors.text.tertiary,
    marginTop: designSystem.spacing[2], // Réduit de [3] à [2]
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 11, // Ajout taille petite pour mobile
    lineHeight: 16,
  },
  bristolSection: {
    marginBottom: designSystem.spacing[5], // Réduit de [7] à [5]
  },
  slider: {
    height: 48,
    marginVertical: designSystem.spacing[3], // Réduit de [4] à [3]
  },
  bristolHint: {
    color: designSystem.colors.text.secondary,
    textAlign: 'center',
    marginTop: designSystem.spacing[2], // Réduit de [3] à [2]
    fontSize: 13, // Ajout pour meilleure lisibilité
    lineHeight: 18,
  },
  bloodSection: {
    marginBottom: designSystem.spacing[5], // Réduit de [7] à [5]
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designSystem.spacing[3],
    paddingHorizontal: designSystem.spacing[4],
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
  },
  modalActions: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[4], // Réduit de [6] à [4]
    marginBottom: designSystem.spacing[2], // Réduit de [4] à [2]
  },
  cancelButton: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
  treatmentInput: {
    marginTop: designSystem.spacing[2],
  },
  suggestionsContainer: {
    marginTop: designSystem.spacing[3],
    gap: designSystem.spacing[2],
  },
  suggestionButton: {
    borderRadius: designSystem.borderRadius.base,
    borderColor: designSystem.colors.secondary[500],
  },
  suggestionButtonLabel: {
    color: designSystem.colors.secondary[500],
    fontSize: designSystem.typography.fontSize.sm,
  },
  // Styles pour la section Aujourd'hui
  todaySection: {
    marginTop: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
    overflow: 'visible', // Pour permettre au tooltip de dépasser
    zIndex: 100, // Pour que le tooltip passe au-dessus des autres cartes
    position: 'relative', // Nécessaire pour que zIndex fonctionne
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[5], // Augmenté de [4] à [5]
    gap: designSystem.spacing[3],
  },
  sectionTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  todayStatsRow: {
    flexDirection: 'row',
    gap: designSystem.spacing[3],
    overflow: 'visible', // Pour permettre au tooltip de dépasser
    // Sur mobile, passer en colonne
    ...(Platform.OS !== 'web' && {
      flexDirection: 'column',
    }),
  },
  todayStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: designSystem.borderRadius.lg,
    padding: designSystem.spacing[4],
    borderWidth: 2,
    borderColor: '#E5E5F4',
    gap: designSystem.spacing[3],
    // Sur mobile, ne pas étirer en hauteur
    ...(Platform.OS !== 'web' && {
      flex: 0,
      width: '100%',
      padding: designSystem.spacing[3], // Moins de padding sur mobile
    }),
  },
  todayStatLeft: {
    // Style spécifique si besoin
  },
  todayStatRight: {
    position: 'relative', // Pour positionner le tooltip
    overflow: 'visible', // Pour que le tooltip puisse dépasser
  },
  todayStatIcon: {
    width: 56,
    height: 56,
    borderRadius: designSystem.borderRadius.md,
    backgroundColor: '#EDEDFC',
    justifyContent: 'center',
    alignItems: 'center',
    // Sur mobile, icône plus petite
    ...(Platform.OS !== 'web' && {
      width: 48,
      height: 48,
    }),
  },
  todayStatContent: {
    flex: 1,
  },
  todayStatLabel: {
    color: designSystem.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  todayStatValue: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 38,
    // Sur mobile, valeur un peu plus petite
    ...(Platform.OS !== 'web' && {
      fontSize: 28,
      lineHeight: 34,
    }),
  },
  todayScoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreTooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    minWidth: 180,
    maxWidth: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 244, 0.6)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    zIndex: 1000,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    }),
  },
  scoreTooltipArrow: {
    position: 'absolute',
    top: '100%',
    right: 16,
    marginTop: -1,
    width: 10,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(200, 200, 244, 0.6)',
    transform: [{ rotate: '-45deg' }],
    zIndex: 999,
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
    }),
  },
  scoreTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scoreTooltipTitle: {
    color: '#101010',
    fontWeight: '700',
  },
  scoreTooltipText: {
    color: '#101010',
    marginBottom: 6,
  },
  scoreTooltipScale: {
    gap: 2,
  },
  scoreTooltipScaleItem: {
    color: '#101010',
    fontSize: 11,
    lineHeight: 16,
  },
  scoreGood: {
    color: '#16A34A',
  },
  scoreWarning: {
    color: '#F59E0B',
  },
  scoreError: {
    color: '#DC2626',
  },
  emptyTodayState: {
    paddingVertical: designSystem.spacing[6],
    alignItems: 'center',
  },
  todayStoolsList: {
    marginTop: designSystem.spacing[4],
  },
  // Styles pour la section Historique
  historySection: {
    marginBottom: designSystem.spacing[6],
  },
  emptyState: {
    paddingVertical: designSystem.spacing[6],
    alignItems: 'center',
  },
  emptyText: {
    color: designSystem.colors.text.secondary,
  },
  stoolItem: {
    marginBottom: designSystem.spacing[3],
  },
  stoolMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDEDFC',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  stoolMainWithBlood: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  bristolBadge: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  bristolNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stoolInfo: {
    flex: 1,
  },
  stoolDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stoolDate: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  stoolActions: {
    flexDirection: 'row',
    gap: designSystem.spacing[2],
  },
  actionButton: {
    width: 44, // Augmenté de 36px à 44px (touch target minimum)
    height: 44,
    borderRadius: designSystem.borderRadius.lg, // Augmenté à lg
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  // Styles pour le calendrier
  calendarCard: {
    marginBottom: designSystem.spacing[6],
  },
  calendarHeaderSection: {
    marginBottom: designSystem.spacing[5],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing[3],
    paddingTop: designSystem.spacing[4],
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
  },
  legendSquare: {
    width: 20,
    height: 20,
    borderRadius: designSystem.borderRadius.sm,
  },
  legendText: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  legendFullWidth: {
    flex: 1,
    backgroundColor: '#EDEDFC',
    padding: designSystem.spacing[3],
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  legendTextCentered: {
    color: designSystem.colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Styles pour IBDisk
  ibdiskCard: {
    marginBottom: designSystem.spacing[6],
  },
  ibdiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[4],
  },
  cardTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  ibdiskNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[3],
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: designSystem.borderRadius.md,
    backgroundColor: '#EDEDFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navText: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
  },
  singleQuestionnaireText: {
    color: designSystem.colors.text.secondary,
    fontStyle: 'italic',
  },
  // Styles pour les onglets d'historique
  historyTabsContainer: {
    marginBottom: designSystem.spacing[4],
  },
  // Styles pour les symptômes
  symptomItem: {
    marginBottom: designSystem.spacing[3],
  },
  symptomMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  symptomIcon: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  symptomInfo: {
    flex: 1,
  },
  symptomType: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  symptomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    flexWrap: 'wrap',
  },
  symptomDate: {
    color: designSystem.colors.text.tertiary,
  },
  symptomIntensity: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  symptomIntensityText: {
    color: designSystem.colors.text.secondary,
    fontWeight: '500',
  },
  symptomNote: {
    color: designSystem.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Styles pour les notes
  noteItem: {
    marginBottom: designSystem.spacing[3],
  },
  noteMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  noteInfo: {
    flex: 1,
  },
  noteHeader: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  noteContent: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    flexWrap: 'wrap',
  },
  noteDate: {
    color: designSystem.colors.text.tertiary,
  },
  noteCategory: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  noteCategoryText: {
    color: designSystem.colors.text.secondary,
    fontWeight: '500',
  },
  noteShared: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDEDFC',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  noteSharedText: {
    color: '#4C4DDC',
    fontWeight: '500',
  },
  // Badges IA
  aiProcessingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDEDFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiProcessingText: {
    color: '#4C4DDC',
    fontWeight: '600',
    fontSize: 10,
  },
  aiCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiCompleteText: {
    color: '#16A34A',
    fontWeight: '600',
    fontSize: 10,
  },
});

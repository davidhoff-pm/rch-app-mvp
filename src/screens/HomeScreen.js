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
import ScreenHeader from '../components/ui/ScreenHeader';
import Toast from '../components/ui/Toast';
import SkeletonCard from '../components/ui/SkeletonCard';
import EmptyState from '../components/ui/EmptyState';
import DateTimePicker from '../components/ui/DateTimePicker';
import { isValidDate, isValidTime } from '../components/ui/DateTimeInput';
import Slider from '@react-native-community/slider';
import storage from '../utils/storage';
import calculatePRO2Score from '../utils/scoreCalculator';
import { checkPSCCAICooldown } from '../utils/psccaiCalculator';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import designSystem from '../theme/designSystem';
import { fetchRSSFeed } from '../services/rssService';
import { saveFeedback, errorFeedback, toggleFeedback } from '../utils/haptics';
import { useStoolModal } from '../contexts/StoolModalContext';
import ActionCard from '../components/home/ActionCard';
import WellbeingCard from '../components/home/WellbeingCard';
import SwipeToDismiss from '../components/home/SwipeToDismiss';
import { shouldShowWellbeingCard } from '../utils/wellbeingUtils';
import { isDismissedToday, dismissForToday } from '../utils/homeDismissUtils';
import usePendingTreatments from '../hooks/usePendingTreatments';
import TreatmentCard from '../components/treatment/TreatmentCard';
import {
  getActiveTherapeuticSchemas,
  getMedications,
  recordIntake,
  toggleMomentIntake,
  getPendingIntakesCount,
  getTodayMoments,
  getDoses,
  getDosesPerDay,
  isIntervalIntakeDone,
} from '../utils/treatmentUtils';
import { buttonPressFeedback } from '../utils/haptics';
import SymptomModal from '../components/modals/SymptomModal';
import NoteModal from '../components/modals/NoteModal';
import BatchStoolModal from '../components/modals/BatchStoolModal';
import { useSpeedDial } from '../contexts/SpeedDialContext';
import { useTrackingMode, useSuggestion } from '../hooks/useTrackingMode';

// Hooks personnalisés
import { useHistoryData } from '../hooks/useHistoryData';
import { useSymptomManagement } from '../hooks/useSymptomManagement';
import { useNoteManagement } from '../hooks/useNoteManagement';

export default function HomeScreen({ route }) {
  const navigation = useNavigation();
  const theme = useTheme();
  const { isModalVisible, openModal, closeModal, isBatchModalVisible, openBatchModal, closeBatchModal } = useStoolModal();
  const { registerHandlers } = useSpeedDial();
  const [bristol, setBristol] = useState(4);
  const [hasBlood, setHasBlood] = useState(false);
  const [bloodOnly, setBloodOnly] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [stoolsDismissed, setStoolsDismissed] = useState(false);
  const [batchFromForm, setBatchFromForm] = useState(false);
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

  // États pour P-SCCAI
  const [psccaiAvailable, setPsccaiAvailable] = useState(true);

  // Cartes masquées pour la journée (swipe sur l'accueil) + visibilité du bilan léger
  const [dismissedPsccai, setDismissedPsccai] = useState(false);
  const [dismissedIbdisk, setDismissedIbdisk] = useState(false);
  const [dismissedWellbeing, setDismissedWellbeing] = useState(false);
  const [wellbeingVisible, setWellbeingVisible] = useState(false);

  // États pour les actualités RSS
  const [rssArticles, setRssArticles] = useState([]);
  const [rssLoading, setRssLoading] = useState(true);

  // États pour le tooltip du score
  const [scoreTooltipVisible, setScoreTooltipVisible] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.96)).current;


  // Chargement des données (utilisé pour rafraîchir après ajout via le bouton +)
  const { loadHistoryData } = useHistoryData();

  // Traitements en attente (pour la section "À faire")
  const pendingTreatmentsCount = usePendingTreatments();
  const [pendingSchemas, setPendingSchemas] = useState([]);
  const [allMedications, setAllMedications] = useState({});

  const refreshTreatments = () => {
    const schemas = getActiveTherapeuticSchemas();
    const meds = getMedications();
    const pending = schemas.filter(s => {
      if (s.frequency.type === 'daily') {
        const moments = getTodayMoments(s);
        const d = getDoses(s.frequency);
        return ['matin', 'midi', 'soir'].some(m => (d[m] || 0) > 0 && !moments[m]);
      }
      return !isIntervalIntakeDone(s);
    });
    setPendingSchemas(pending);
    setAllMedications(meds);
  };

  // Mode de suivi (actif / rémission)
  const { mode: trackingMode, setMode: setTrackingMode, isRemission } = useTrackingMode();
  const suggestion = useSuggestion(trackingMode);

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

  const upsertScoreHistory = (dateStr, score) => {
    const histJson = storage.getString('scoresHistory');
    const history = histJson ? JSON.parse(histJson) : [];
    const idx = history.findIndex((h) => h.date === dateStr);
    if (idx >= 0) {
      history[idx].score = score;
    } else {
      history.unshift({ date: dateStr, score });
    }
    storage.set('scoresHistory', JSON.stringify(history));
  };

  useFocusEffect(
    React.useCallback(() => {
      const count = computeTodayCount();
      setDailyCount(count);

      const today = new Date();
      const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const noStoolFlag = storage.getString('noStoolDay');
      setStoolsDismissed(count > 0 || noStoolFlag === dayKey);

      // Vérifier la disponibilité d'IBDisk
      checkIBDiskAvailability();
      const psccaiCooldown = checkPSCCAICooldown();
      setPsccaiAvailable(psccaiCooldown.available);

      // Cartes masquées pour la journée + visibilité du bilan léger
      setDismissedPsccai(isDismissedToday('psccai'));
      setDismissedIbdisk(isDismissedToday('ibdisk'));
      setDismissedWellbeing(isDismissedToday('wellbeing'));
      setWellbeingVisible(shouldShowWellbeingCard());

      // Charger les traitements en attente
      refreshTreatments();

      // Charger les articles RSS
      loadRSSArticles();

      // Charger les données de l'historique
      loadHistoryData();

      // Score PRO-2 du jour
      const tDateStr = formatDate(today);
      const score = calculatePRO2Score(tDateStr, storage);
      setTodayProvisionalScore(score);
      if (score != null) upsertScoreHistory(tDateStr, score);
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
        const sortedStools = stools.sort((a, b) => b.timestamp - a.timestamp);
        const lastStool = sortedStools[0];
        setBristol(lastStool.bristolScale ?? 4);
        setHasBlood(lastStool.hasBlood);
        setBloodOnly(lastStool.bloodOnly || false);
      } else {
        setBristol(4);
        setHasBlood(false);
        setBloodOnly(false);
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
      bristolScale: bloodOnly ? null : Math.round(bristol),
      hasBlood: bloodOnly || hasBlood,
      bloodOnly,
    };

    const existingJson = storage.getString('dailySells');
    const existing = existingJson ? JSON.parse(existingJson) : [];
    const updated = [entry, ...existing];
    storage.set('dailySells', JSON.stringify(updated));
    
    setDailyCount(computeTodayCount());
    setStoolsDismissed(true);
    const tDateStr = formatDate(new Date());
    const score = calculatePRO2Score(tDateStr, storage);
    setTodayProvisionalScore(score);
    if (score != null) upsertScoreHistory(tDateStr, score);

    // Recharger les données de l'historique pour HomeScreen
    loadHistoryData();

    saveFeedback();
    hideModal();
  };

  // Ordre fixe des tâches de l'accueil (priorité décroissante) : Selles > P-SCCAI >
  // Bilan du jour > Questionnaire mensuel. Le style de chaque carte est fixe (pas
  // dérivé de la position), cf. demande de réordonnancement.
  const showStoolsTask = !isRemission && !stoolsDismissed;
  const showPsccaiTask = psccaiAvailable && !dismissedPsccai;
  const showWellbeingTask = wellbeingVisible && !dismissedWellbeing;
  const showIbdiskTask = !isRemission && ibdiskAvailable && !dismissedIbdisk;
  const visibleTaskCount = [showStoolsTask, showPsccaiTask, showWellbeingTask, showIbdiskTask].filter(Boolean).length;

  const handleDismissPsccai = () => { dismissForToday('psccai'); setDismissedPsccai(true); };
  const handleDismissIbdisk = () => { dismissForToday('ibdisk'); setDismissedIbdisk(true); };
  const handleDismissWellbeing = () => { dismissForToday('wellbeing'); setDismissedWellbeing(true); };

  const handleHomeToggleMoment = (schema, medication, moment) => {
    toggleMomentIntake(schema.medicationId, schema.id, moment, schema.frequency);
    buttonPressFeedback();
    refreshTreatments();
  };

  const handleHomeIntervalCheck = (schema, medication) => {
    recordIntake(schema.medicationId, 1, new Date());
    buttonPressFeedback();
    refreshTreatments();
  };

  // Pastille de statut : reflète le mode de suivi choisi par l'utilisateur
  const status = isRemission
    ? { label: 'En rémission', color: designSystem.colors.health.excellent.main }
    : { label: 'Phase active', color: designSystem.colors.health.moderate.main };

  const scoreTone = todayProvisionalScore == null
    ? { label: '—', color: designSystem.colors.text.tertiary, bg: designSystem.colors.background.secondary }
    : todayProvisionalScore <= 1
      ? { label: 'Faible', color: designSystem.colors.health.excellent.main, bg: designSystem.colors.health.excellent.light }
      : todayProvisionalScore <= 3
        ? { label: 'Modéré', color: designSystem.colors.health.moderate.main, bg: designSystem.colors.health.moderate.light }
        : { label: 'Élevé', color: designSystem.colors.health.danger.main, bg: designSystem.colors.health.danger.light };

  const shortDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title={greeting}
        actions={[{ icon: 'cog-outline', onPress: () => navigation.navigate('Paramètres'), label: 'Paramètres' }]}
      >
        <View style={styles.greetingMeta}>
          <AppText style={styles.dateText}>{todayLabel}</AppText>
          <View style={styles.metaDot} />
          <AppText style={[styles.statusText, { color: status.color }]}>{status.label}</AppText>
        </View>
      </ScreenHeader>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Bandeau suggestion changement de mode */}
        {suggestion && (
          <View style={styles.suggestionBanner}>
            <MaterialCommunityIcons
              name={suggestion.type === 'suggest_remission' ? 'moon-waning-crescent' : 'alert-circle-outline'}
              size={18}
              color={suggestion.type === 'suggest_remission' ? designSystem.colors.health.excellent.main : designSystem.colors.health.moderate.main}
            />
            <AppText style={styles.suggestionText}>{suggestion.message}</AppText>
            <View style={styles.suggestionActions}>
              <TouchableOpacity
                style={styles.suggestionBtn}
                onPress={() => setTrackingMode(suggestion.type === 'suggest_remission' ? 'remission' : 'active')}
              >
                <AppText style={styles.suggestionBtnText}>Oui</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.suggestionBtnSecondary}
                onPress={() => storage.set('suggestionDismissedAt', String(Date.now()))}
              >
                <AppText style={styles.suggestionBtnSecondaryText}>Non</AppText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Aujourd'hui */}
        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionHeaderTitle}>Aujourd'hui</AppText>
          {visibleTaskCount > 0 && (
            <View style={styles.countPill}>
              <AppText style={styles.countPillText}>{visibleTaskCount} tâche{visibleTaskCount > 1 ? 's' : ''}</AppText>
            </View>
          )}
        </View>

        {visibleTaskCount > 0 ? (
          <View style={styles.todoList}>
            {/* 1. Selles du jour — priorité maximale, pas de swipe (dismiss via "pas de selles") */}
            {showStoolsTask && (
              <TouchableOpacity style={styles.taskCompact} onPress={() => openBatchModal()} activeOpacity={0.9}>
                <View style={styles.taskCompactIcon}>
                  <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
                </View>
                <AppText style={styles.taskCompactTitle} numberOfLines={1}>Renseigner mes selles du jour</AppText>
                <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            )}

            {/* 2. P-SCCAI — important, full terracotta */}
            {showPsccaiTask && (
              <SwipeToDismiss onDismiss={handleDismissPsccai}>
                <TouchableOpacity style={styles.taskPrimary} onPress={() => navigation.navigate('PSCCAIQuestionnaire')} activeOpacity={0.9}>
                  <View style={styles.taskPrimaryIcon}>
                    <MaterialCommunityIcons name="clipboard-pulse-outline" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.taskTextWrap}>
                    <AppText style={styles.taskPrimaryTitle} numberOfLines={1}>Bilan hebdomadaire</AppText>
                    <AppText style={styles.taskPrimaryDesc} numberOfLines={1}>Questionnaire P-SCCAI · ~2 min</AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </SwipeToDismiss>
            )}

            {/* 3. Bilan du jour — normal (outline terracotta) */}
            {showWellbeingTask && (
              <SwipeToDismiss onDismiss={handleDismissWellbeing}>
                <WellbeingCard style={styles.wellbeingCardInList} />
              </SwipeToDismiss>
            )}

            {/* 4. Questionnaire mensuel (IBDisk) — normal (outline terracotta) */}
            {showIbdiskTask && (
              <SwipeToDismiss onDismiss={handleDismissIbdisk}>
                <TouchableOpacity style={styles.taskOutlined} onPress={() => navigation.navigate('IBDiskQuestionnaire')} activeOpacity={0.85}>
                  <View style={styles.taskOutlinedIcon}>
                    <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.primary[500]} />
                  </View>
                  <View style={styles.taskTextWrap}>
                    <AppText style={styles.taskOutlinedTitle} numberOfLines={1}>Questionnaire mensuel</AppText>
                    <AppText style={styles.taskOutlinedDesc} numberOfLines={1}>Évaluez votre qualité de vie</AppText>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary[400]} />
                </TouchableOpacity>
              </SwipeToDismiss>
            )}
          </View>
        ) : pendingSchemas.length === 0 ? (
          <AppText style={styles.noActionText}>Rien à faire aujourd'hui, tout est à jour.</AppText>
        ) : null}

        {/* Traitements en attente — cases cochables directement */}
        {pendingSchemas.length > 0 && (
          <View style={{ marginTop: visibleTaskCount > 0 ? 12 : 0 }}>
            <View style={styles.treatmentSectionHeader}>
              <MaterialCommunityIcons name="pill" size={18} color={colors.primary[500]} />
              <AppText style={styles.treatmentSectionTitle}>Traitement</AppText>
            </View>
            {pendingSchemas.map(schema => {
              const med = allMedications[schema.medicationId];
              if (!med) return null;
              return (
                <TreatmentCard
                  key={schema.id}
                  schema={schema}
                  medication={med}
                  onToggleMoment={handleHomeToggleMoment}
                  onCheckInterval={handleHomeIntervalCheck}
                  onUncheckInterval={() => {}}
                  onEdit={() => navigation.navigate('Traitement')}
                  onStop={() => navigation.navigate('Traitement')}
                  compact
                />
              );
            })}
          </View>
        )}

        <View style={[styles.statGrid, { marginTop: 16 }]}>
          {/* Selles */}
          <View style={styles.statCard}>
            <View style={styles.statCardLeft}>
              <View style={[styles.statIcon, { backgroundColor: designSystem.colors.primary[100] }]}>
                <MaterialCommunityIcons name="toilet" size={20} color={designSystem.colors.primary[500]} />
              </View>
              <AppText style={styles.statLabel}>SELLES</AppText>
            </View>
            <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{dailyCount}</AppText>
          </View>

          {/* Score */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => setScoreTooltipVisible(!scoreTooltipVisible)}
            activeOpacity={0.8}
          >
            <View style={styles.statCardLeft}>
              <View style={[styles.statIcon, { backgroundColor: scoreTone.bg }]}>
                <MaterialCommunityIcons name="pulse" size={20} color={scoreTone.color} />
              </View>
              <AppText style={styles.statLabel}>SCORE</AppText>
            </View>
            <AppText style={[styles.statValue, { color: scoreTone.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {todayProvisionalScore != null ? todayProvisionalScore : '—'}
            </AppText>
          </TouchableOpacity>
        </View>

        {scoreTooltipVisible && (
          <Animated.View style={[styles.scoreTooltip, { opacity: tooltipOpacity, transform: [{ scale: tooltipScale }] }]}>
            <View style={styles.scoreTooltipHeader}>
              <MaterialCommunityIcons name="pulse" size={14} color={designSystem.colors.text.primary} />
              <AppText variant="bodySmall" style={styles.scoreTooltipTitle}>Score PRO-2</AppText>
            </View>
            <AppText variant="caption" style={styles.scoreTooltipText}>
              Indice d'activité symptomatique (0–6)
            </AppText>
            <View style={styles.scoreTooltipScale}>
              <AppText style={[styles.scoreTooltipScaleItem, styles.scoreGood]}>0–1 : Faible</AppText>
              <AppText style={[styles.scoreTooltipScaleItem, styles.scoreWarning]}>2–3 : Modéré</AppText>
              <AppText style={[styles.scoreTooltipScaleItem, styles.scoreError]}>4–6 : Élevé</AppText>
            </View>
            <AppText variant="caption" style={[styles.scoreTooltipText, { marginTop: 6 }]}>
              Ce score reflète vos symptômes. Il ne mesure pas directement l'inflammation.
            </AppText>
          </Animated.View>
        )}

        {/* Actualités AFA */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <AppText style={styles.sectionHeaderTitle}>Actualités AFA</AppText>
        </View>

        <View style={styles.newsCard}>

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
        </View>

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
              <AppText style={[styles.fieldLabel, bloodOnly && { color: colors.text.disabled }]}>Consistance (Bristol)</AppText>
              <Slider
                minimumValue={1}
                maximumValue={7}
                step={1}
                value={bristol}
                onValueChange={setBristol}
                style={styles.slider}
                minimumTrackTintColor={bloodOnly ? colors.text.disabled : theme.colors.primary}
                maximumTrackTintColor={theme.colors.outline}
                thumbStyle={{ backgroundColor: bloodOnly ? colors.text.disabled : theme.colors.primary }}
                disabled={bloodOnly}
              />
              <AppText variant="labelMedium" style={[styles.bristolHint, bloodOnly && { color: colors.text.disabled }]}>
                {bloodOnly ? 'Non applicable (sang uniquement)' : `Sélection: ${bristol} — ${bristolDescriptions[bristol]}`}
              </AppText>
            </View>

            <View style={styles.bloodSection}>
              <AppText variant="bodyLarge" style={{ marginBottom: 10 }}>Sang</AppText>
              <View style={styles.bloodSelector}>
                {[
                  { key: 'none', label: 'Pas de sang' },
                  { key: 'with', label: 'Avec du sang' },
                  { key: 'only', label: 'Sang uniquement' },
                ].map(opt => {
                  const active = opt.key === 'only' ? bloodOnly
                    : opt.key === 'with' ? (hasBlood && !bloodOnly)
                    : (!hasBlood && !bloodOnly);
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.bloodOption, active && styles.bloodOptionActive]}
                      onPress={() => {
                        toggleFeedback();
                        if (opt.key === 'none') { setHasBlood(false); setBloodOnly(false); }
                        else if (opt.key === 'with') { setHasBlood(true); setBloodOnly(false); }
                        else { setHasBlood(true); setBloodOnly(true); }
                      }}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={active ? 'radiobox-marked' : 'radiobox-blank'}
                        size={20}
                        color={active ? colors.health.danger.main : colors.text.tertiary}
                      />
                      <AppText style={[styles.bloodOptionText, active && styles.bloodOptionTextActive]}>
                        {opt.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
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

              <TouchableOpacity
                style={styles.switchToBatchBtn}
                onPress={() => { hideModal(); setBatchFromForm(true); openBatchModal(); }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="lightning-bolt-outline" size={16} color={designSystem.colors.primary[500]} />
                <AppText style={styles.switchToBatchLabel}>Saisie rapide du jour</AppText>
              </TouchableOpacity>
            </ScrollView>
          </AppCard>
        </Modal>
      </Portal>

      {/* Modal saisie rapide batch selles */}
      <BatchStoolModal
        visible={isBatchModalVisible}
        onClose={() => { closeBatchModal(); setBatchFromForm(false); }}
        showNoStoolOption={!stoolsDismissed && !batchFromForm}
        onSave={() => {
          setDailyCount(computeTodayCount());
          setStoolsDismissed(true);
          const tDateStr = formatDate(new Date());
          const score = calculatePRO2Score(tDateStr, storage);
          setTodayProvisionalScore(score);
          if (score != null) upsertScoreHistory(tDateStr, score);
          loadHistoryData();
        }}
      />

      {/* Modale de prise de traitement */}
      <Portal>
        <Modal visible={treatmentModalVisible} onDismiss={hideTreatmentModal} contentContainerStyle={styles.modalContainer}>
          <AppCard style={styles.modalCard}>
            <ScrollView>
              <Card.Title title="Prise de traitement" titleStyle={{ fontSize: 22, fontWeight: '700', color: '#312620' }} />
              
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
                  style={[styles.treatmentInput, { backgroundColor: '#F5EFE8', borderRadius: 16 }]}
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

const { colors } = designSystem;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  // Header (Bonjour pleine largeur + Paramètres)
  header: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 18 : 52,
    paddingBottom: 16,
    backgroundColor: colors.background.primary,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topEyebrow: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.primary[400],
    fontWeight: '600',
    marginBottom: 2,
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 22,
  },
  scrollViewContent: {
    paddingTop: 8,
    paddingBottom: 130,
  },
  // Greeting
  greetingBlock: {
    paddingTop: 14,
    paddingBottom: 22,
  },
  greetingText: {
    fontFamily: designSystem.typography.fontFamily.serif,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '500',
    letterSpacing: -0.6,
    color: colors.text.primary,
  },
  greetingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 16,
    padding: 14,
    borderRadius: designSystem.borderRadius.base,
    backgroundColor: designSystem.colors.background.secondary,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 18,
  },
  suggestionActions: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginTop: 4,
  },
  suggestionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: designSystem.borderRadius.sm,
    backgroundColor: designSystem.colors.primary[500],
    alignItems: 'center',
  },
  suggestionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionBtnSecondary: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: designSystem.borderRadius.sm,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    backgroundColor: designSystem.colors.background.tertiary,
    alignItems: 'center',
  },
  suggestionBtnSecondaryText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 15,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[300],
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  countPill: {
    backgroundColor: colors.primary[100],
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  noActionText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text.tertiary,
    paddingVertical: 4,
  },
  treatmentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  treatmentSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  // Tasks
  todoList: {
    gap: 12,
  },
  wellbeingCardInList: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  taskPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.primary[500],
    borderRadius: 22,
    padding: 20,
    ...designSystem.shadows.terracotta,
  },
  taskPrimaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskPrimaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: '#FFFFFF',
  },
  taskPrimaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  taskPrimaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taskPrimaryDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
  },
  taskSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.background.tertiary,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  taskSecondaryIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskSecondaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: colors.text.primary,
  },
  taskSecondaryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  taskSecondaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskSecondaryDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 3,
  },
  taskOutlined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.background.tertiary,
    borderRadius: 18,
    padding: 16,
    borderTopWidth: 3,
    borderTopColor: colors.primary[400],
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: '#C16046',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  taskOutlinedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskOutlinedTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: colors.text.primary,
  },
  taskOutlinedDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  taskCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary[500],
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...designSystem.shadows.terracotta,
  },
  taskCompactIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCompactTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  allDoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.health.excellent.light,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.health.excellent.main + '33',
  },
  allDoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allDoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.health.excellent.dark,
  },
  allDoneSubtitle: {
    fontSize: 13.5,
    color: colors.text.secondary,
    marginTop: 2,
  },
  // Stat grid
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  statCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.text.tertiary,
  },
  statCardBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 6,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -1,
    color: colors.text.primary,
  },
  statUnit: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  statAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...designSystem.shadows.terracotta,
  },
  scorePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scorePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
  // News
  newsCard: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 20,
    paddingHorizontal: 18,
    overflow: 'hidden',
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
    marginBottom: designSystem.spacing[5],
  },
  bloodSelector: {
    gap: 8,
  },
  bloodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: designSystem.borderRadius.sm,
    borderWidth: 1.5,
    borderColor: designSystem.colors.border.light,
    backgroundColor: designSystem.colors.background.secondary,
  },
  bloodOptionActive: {
    borderColor: designSystem.colors.health.danger.main,
    backgroundColor: designSystem.colors.health.danger.light,
  },
  bloodOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystem.colors.text.secondary,
    textAlign: 'left',
  },
  bloodOptionTextActive: {
    color: designSystem.colors.health.danger.main,
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
  switchToBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
  },
  switchToBatchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: designSystem.colors.primary[500],
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
    borderColor: '#E6E0DA',
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
    backgroundColor: '#FFF3EE',
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
    marginTop: 8,
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...designSystem.shadows.base,
  },
  scoreTooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scoreTooltipTitle: {
    color: '#312620',
    fontWeight: '700',
  },
  scoreTooltipText: {
    color: '#312620',
    marginBottom: 6,
  },
  scoreTooltipScale: {
    gap: 2,
  },
  scoreTooltipScaleItem: {
    color: '#312620',
    fontSize: 11,
    lineHeight: 16,
  },
  scoreGood: {
    color: '#397852',
  },
  scoreWarning: {
    color: '#AD7130',
  },
  scoreError: {
    color: '#C0392B',
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
    backgroundColor: '#FFF3EE',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#E6E0DA',
  },
  stoolMainWithBlood: {
    borderColor: '#C0392B',
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
    borderColor: '#E6E0DA',
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
    backgroundColor: '#FFF3EE',
    padding: designSystem.spacing[3],
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: '#E6E0DA',
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
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0DA',
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
    backgroundColor: '#FBF1EE',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#F3C9BC',
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
    backgroundColor: '#FFF9F0',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#F0D9A8',
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
    backgroundColor: '#FFF3EE',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  noteSharedText: {
    color: '#C16046',
    fontWeight: '500',
  },
  // Badges IA
  aiProcessingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3EE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiProcessingText: {
    color: '#C16046',
    fontWeight: '600',
    fontSize: 10,
  },
  aiCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D7F4E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiCompleteText: {
    color: '#397852',
    fontWeight: '600',
    fontSize: 10,
  },
});

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
import DateTimeInput, { isValidDate, isValidTime } from '../components/ui/DateTimeInput';
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
import SegmentedControl from '../components/ui/SegmentedControl';
import AnimatedListItem from '../components/ui/AnimatedListItem';
import IBDiskChart from '../components/charts/IBDiskChart';
import { deleteFeedback } from '../utils/haptics';
import SymptomModal from '../components/modals/SymptomModal';
import NoteModal from '../components/modals/NoteModal';
import { useSpeedDial } from '../contexts/SpeedDialContext';
import {
  getSymptoms,
  createSymptom,
  updateSymptom,
  deleteSymptom,
  getSymptomDisplayName,
  INTENSITY_LABELS,
} from '../utils/symptomsUtils';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getCategoryLabel,
} from '../utils/notesUtils';

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
  
  // États pour l'historique (depuis HistoryScreen)
  const [stools, setStools] = useState([]);
  const [scores, setScores] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [ibdiskHistory, setIbdiskHistory] = useState([]);
  const [currentIbdiskIndex, setCurrentIbdiskIndex] = useState(0);
  const [calendarMode, setCalendarMode] = useState('score');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStool, setEditingStool] = useState(null);
  const [editBristol, setEditBristol] = useState(4);
  const [editHasBlood, setEditHasBlood] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');
  const [editTimeInput, setEditTimeInput] = useState('');
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

  // États pour symptômes et notes
  const [symptoms, setSymptoms] = useState([]);
  const [notes, setNotes] = useState([]);
  const [symptomModalVisible, setSymptomModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [editingSymptom, setEditingSymptom] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'stools', 'symptoms', 'notes'

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
      onSymptomPress: handleOpenSymptomModal,
      onNotePress: handleOpenNoteModal,
    });
  }, []);

  const hideModal = () => {
    closeModal();
  };

  // Fonctions pour l'historique (depuis HistoryScreen)
  const loadHistoryData = () => {
    const stoolsJson = storage.getString('dailySells');
    const entries = stoolsJson ? JSON.parse(stoolsJson) : [];
    setStools(entries.sort((a, b) => b.timestamp - a.timestamp));

    const histJson = storage.getString('scoresHistory');
    const history = histJson ? JSON.parse(histJson) : [];
    setScores(history);

    const treatmentsJson = storage.getString('treatments');
    const treatmentsList = treatmentsJson ? JSON.parse(treatmentsJson) : [];
    setTreatments(treatmentsList.sort((a, b) => b.timestamp - a.timestamp));

    // Charger l'historique IBDisk
    const ibdiskJson = storage.getString('ibdiskHistory');
    const ibdiskList = ibdiskJson ? JSON.parse(ibdiskJson) : [];
    setIbdiskHistory(ibdiskList);
    setCurrentIbdiskIndex(0);

    // Charger les symptômes et notes
    const symptomsData = getSymptoms();
    setSymptoms(symptomsData.sort((a, b) => b.timestamp - a.timestamp));

    const notesData = getNotes();
    setNotes(notesData.sort((a, b) => b.timestamp - a.timestamp));
  };

  // Handlers pour les symptômes
  const handleOpenSymptomModal = () => {
    setEditingSymptom(null);
    setSymptomModalVisible(true);
  };

  const handleSaveSymptom = (data) => {
    saveFeedback();
    if (editingSymptom) {
      // Mode édition
      updateSymptom(editingSymptom.id, data);
      showToast('✅ Symptôme mis à jour', 'success');
    } else {
      // Mode création
      createSymptom(data.type, data.intensity, data.note, data.date);
      showToast('✅ Symptôme enregistré', 'success');
    }
    setSymptomModalVisible(false);
    setEditingSymptom(null);
    loadHistoryData();
  };

  const handleEditSymptom = (symptom) => {
    setEditingSymptom(symptom);
    setSymptomModalVisible(true);
  };

  const handleDeleteSymptom = (symptomId) => {
    const executeDelete = () => {
      deleteFeedback();
      deleteSymptom(symptomId);
      loadHistoryData();
      showToast('🗑️ Symptôme supprimé', 'success');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce symptôme ?')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Supprimer le symptôme',
        'Êtes-vous sûr de vouloir supprimer ce symptôme ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: executeDelete, style: 'destructive' }
        ]
      );
    }
  };

  // Handlers pour les notes
  const handleOpenNoteModal = () => {
    setEditingNote(null);
    setNoteModalVisible(true);
  };

  const handleSaveNote = (data) => {
    saveFeedback();
    if (editingNote) {
      // Mode édition
      updateNote(editingNote.id, data);
      showToast('✅ Note mise à jour', 'success');
    } else {
      // Mode création
      createNote(data.content, data.category, data.sharedWithDoctor, data.date);
      showToast('✅ Note enregistrée', 'success');
    }
    setNoteModalVisible(false);
    setEditingNote(null);
    loadHistoryData();
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteModalVisible(true);
  };

  const handleDeleteNote = (noteId) => {
    const executeDelete = () => {
      deleteFeedback();
      deleteNote(noteId);
      loadHistoryData();
      showToast('🗑️ Note supprimée', 'success');
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la note',
        'Êtes-vous sûr de vouloir supprimer cette note ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: executeDelete, style: 'destructive' }
        ]
      );
    }
  };

  const handleDeleteStool = (stoolId) => {
    const executeDelete = () => {
      deleteFeedback();
      const stoolsJson = storage.getString('dailySells');
      const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
      const updated = stools.filter(s => s.id !== stoolId);
      storage.set('dailySells', JSON.stringify(updated));
      setStools(updated.sort((a, b) => b.timestamp - a.timestamp));
      setDailyCount(computeTodayCount());
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette selle ?')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la selle',
        'Êtes-vous sûr de vouloir supprimer cette selle ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: executeDelete, style: 'destructive' }
        ]
      );
    }
  };

  const handleEditStool = (stool) => {
    setEditingStool(stool);
    setEditBristol(stool.bristolScale);
    setEditHasBlood(stool.hasBlood);
    
    const date = new Date(stool.timestamp);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    setEditDateInput(dateStr);
    setEditTimeInput(timeStr);
    setEditModalVisible(true);
  };

  const hideEditModal = () => {
    setEditModalVisible(false);
    setEditingStool(null);
  };

  const handleSaveEdit = () => {
    if (!editingStool) return;

    const editDateTime = parseDateTime(editDateInput, editTimeInput);

    const updatedStool = {
      ...editingStool,
      timestamp: editDateTime.getTime(),
      bristolScale: Math.round(editBristol),
      hasBlood: editHasBlood
    };

    const stoolsJson = storage.getString('dailySells');
    const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
    const updated = stools.map(s => s.id === editingStool.id ? updatedStool : s);
    storage.set('dailySells', JSON.stringify(updated));
    setStools(updated.sort((a, b) => b.timestamp - a.timestamp));
    setDailyCount(computeTodayCount());
    saveFeedback();
    hideEditModal();
  };

  const formatCompactDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) return `Aujourd'hui ${time}`;
    if (isYesterday) return `Hier ${time}`;

    return `${date.getDate()}/${date.getMonth() + 1} ${time}`;
  };

  // Format date sans heure (pour symptômes et notes)
  const formatCompactDateOnly = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return `Aujourd'hui`;
    if (isYesterday) return `Hier`;

    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getBristolColor = (bristol) => {
    if (bristol <= 2) return '#C16046';
    if (bristol <= 4) return '#C16046';
    if (bristol <= 5) return '#E6E0DA';
    return '#312620';
  };

  const handlePreviousIbdisk = () => {
    if (currentIbdiskIndex < ibdiskHistory.length - 1) {
      setCurrentIbdiskIndex(currentIbdiskIndex + 1);
    }
  };

  const handleNextIbdisk = () => {
    if (currentIbdiskIndex > 0) {
      setCurrentIbdiskIndex(currentIbdiskIndex - 1);
    }
  };

  // Rendu calendrier moderne (depuis HistoryScreen)
  const renderModernCalendar = () => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    const remainingCells = days.length % 7;
    if (remainingCells > 0) {
      for (let i = 0; i < (7 - remainingCells); i++) {
        days.push(null);
      }
    }

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const isCurrentMonth = calendarMonthOffset === 0;

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarMonthHeader}>
          <TouchableOpacity 
            onPress={() => setCalendarMonthOffset(calendarMonthOffset - 1)}
            style={styles.monthNavButton}
          >
            <AppText style={styles.monthNavIcon}>←</AppText>
          </TouchableOpacity>
          
          <View style={styles.monthTitleContainer}>
            <AppText variant="headlineLarge" style={styles.calendarMonth}>
              {monthNames[month]} {year}
            </AppText>
            {isCurrentMonth && (
              <View style={styles.currentMonthBadge}>
                <AppText variant="labelSmall" style={styles.currentMonthText}>
                  Aujourd'hui
                </AppText>
              </View>
            )}
          </View>
          
          <TouchableOpacity 
            onPress={() => setCalendarMonthOffset(calendarMonthOffset + 1)}
            style={styles.monthNavButton}
          >
            <AppText style={styles.monthNavIcon}>→</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarHeader}>
          {dayNames.map((name, index) => (
            <View key={index} style={styles.dayNameCell}>
              <AppText variant="labelSmall" style={styles.dayName}>
                {name}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            let cellContent = null;
            let cellStyle = [styles.dayCell];
            let hasData = false;

            if (calendarMode === 'score') {
              const score = calculateLichtigerScore(dateStr, storage);
              if (score !== null) {
                hasData = true;
                let scoreColor = '#C16046';
                if (score >= 10) scoreColor = '#312620';
                
                cellStyle.push(styles.dayCellWithScore, { backgroundColor: scoreColor });
                cellContent = (
                  <View style={styles.dayCellContent}>
                    <AppText variant="headlineLarge" style={styles.scoreInCell}>
                      {score}
                    </AppText>
                  </View>
                );
              }
            } else {
              const [y, m, d] = dateStr.split('-').map(Number);
              const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
              const dayEnd = dayStart + 24 * 60 * 60 * 1000;
              const dayEntries = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);
              
              if (dayEntries.length > 0) {
                hasData = true;
                cellStyle.push(styles.dayCellWithStools);
                cellContent = (
                  <View style={styles.dayCellContent}>
                    <AppText variant="displayMedium" style={styles.stoolCountLarge}>
                      {dayEntries.length}
                    </AppText>
                  </View>
                );
              }
            }

            if (!hasData) {
              cellStyle.push(styles.dayCellEmpty);
              cellContent = (
                <AppText variant="bodyMedium" style={styles.dayNumberEmpty}>
                  {day}
                </AppText>
              );
            }

            return (
              <View key={index} style={cellStyle}>
                {cellContent}
              </View>
            );
          })}
        </View>
      </View>
    );
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

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
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
                <MaterialCommunityIcons name="toilet" size={Platform.OS === 'web' ? 32 : 28} color="#C16046" />
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
                  color={todayProvisionalScore !== null ? (todayProvisionalScore < 5 ? '#397852' : todayProvisionalScore <= 10 ? '#AD7130' : '#C0392B') : '#A3A3A3'}
                />
              </View>
              <View style={styles.todayStatContent}>
                <View style={styles.todayScoreHeader}>
                  <AppText variant="labelMedium" style={styles.todayStatLabel}>
                    Score
                  </AppText>
                  {Platform.OS === 'web' && (
                    <MaterialCommunityIcons name="information-outline" size={16} color="#84776F" />
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
                      <MaterialCommunityIcons name="chart-line" size={14} color="#C16046" />
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

        {/* Section Historique */}
        <AppCard style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <HealthIcon name="journal" size={28} color={designSystem.colors.primary[500]} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Historique
            </AppText>
          </View>

          {/* Onglets de filtrage */}
          <View style={styles.historyTabsContainer}>
            <SegmentedControl
              options={[
                { value: 'all', label: 'Tout' },
                { value: 'stools', label: 'Selles' },
                { value: 'symptoms', label: 'Symptômes' },
                { value: 'notes', label: 'Notes' }
              ]}
              selectedValue={historyFilter}
              onValueChange={setHistoryFilter}
            />
          </View>

          {/* Liste filtrée */}
          {(() => {
            // Filtrer les entrées selon l'onglet sélectionné
            let filteredEntries = [];

            if (historyFilter === 'all' || historyFilter === 'stools') {
              filteredEntries = [...filteredEntries, ...stools.map(s => ({ ...s, entryType: 'stool' }))];
            }
            if (historyFilter === 'all' || historyFilter === 'symptoms') {
              filteredEntries = [...filteredEntries, ...symptoms.map(s => ({ ...s, entryType: 'symptom' }))];
            }
            if (historyFilter === 'all' || historyFilter === 'notes') {
              filteredEntries = [...filteredEntries, ...notes.map(n => ({ ...n, entryType: 'note' }))];
            }

            // Trier par timestamp
            filteredEntries.sort((a, b) => b.timestamp - a.timestamp);

            // Limiter à 20 entrées
            filteredEntries = filteredEntries.slice(0, 20);

            if (filteredEntries.length === 0) {
              let emptyMessage = '';
              if (historyFilter === 'stools') emptyMessage = 'Aucune selle enregistrée';
              else if (historyFilter === 'symptoms') emptyMessage = 'Aucun symptôme enregistré';
              else if (historyFilter === 'notes') emptyMessage = 'Aucune note enregistrée';
              else emptyMessage = 'Aucune donnée enregistrée';

              return (
                <EmptyState
                  healthIcon="empty"
                  title={emptyMessage}
                  description="Utilisez le bouton + en bas pour ajouter une entrée"
                  size="compact"
                />
              );
            }

            return (
              <View>
                {filteredEntries.map((item, index) => (
                  <AnimatedListItem key={`${item.entryType}-${item.id}`} index={index} delay={30}>
                    {item.entryType === 'stool' && (
                      <View style={styles.stoolItem}>
                        <View style={styles.stoolMain}>
                          <View style={[styles.bristolBadge, { backgroundColor: getBristolColor(item.bristolScale) }]}>
                            <AppText variant="bodyLarge" style={styles.bristolNumber}>
                              {item.bristolScale}
                            </AppText>
                          </View>
                          <View style={styles.stoolInfo}>
                            <View style={styles.stoolDateContainer}>
                              <AppText variant="bodyMedium" style={styles.stoolDate}>
                                {formatCompactDate(item.timestamp)}
                              </AppText>
                              {item.hasBlood && (
                                <MaterialCommunityIcons
                                  name="water"
                                  size={16}
                                  color="#C0392B"
                                  style={{ marginLeft: 6 }}
                                />
                              )}
                            </View>
                          </View>
                          <View style={styles.stoolActions}>
                            <TouchableOpacity
                              onPress={() => handleEditStool(item)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="pencil" size={20} color="#C16046" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteStool(item.id)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="delete" size={20} color="#C0392B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {item.entryType === 'symptom' && (
                      <View style={styles.symptomItem}>
                        <View style={styles.symptomMain}>
                          <View style={[styles.symptomIcon, { backgroundColor: '#FBE3DF' }]}>
                            <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#C0392B" />
                          </View>
                          <View style={styles.symptomInfo}>
                            <AppText variant="bodyMedium" style={styles.symptomType}>
                              {getSymptomDisplayName(item)}
                            </AppText>
                            <View style={styles.symptomMeta}>
                              <AppText variant="labelSmall" style={styles.symptomDate}>
                                {formatCompactDateOnly(item.timestamp)}
                              </AppText>
                              <View style={styles.symptomIntensity}>
                                <AppText variant="labelSmall" style={styles.symptomIntensityText}>
                                  Intensité: {item.intensity}/5 ({INTENSITY_LABELS[item.intensity]})
                                </AppText>
                              </View>
                            </View>
                            {item.note && (
                              <AppText variant="labelSmall" style={styles.symptomNote}>
                                {item.note}
                              </AppText>
                            )}
                          </View>
                          <View style={styles.stoolActions}>
                            <TouchableOpacity
                              onPress={() => handleEditSymptom(item)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="pencil" size={20} color="#C16046" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteSymptom(item.id)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="delete" size={20} color="#C0392B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {item.entryType === 'note' && (
                      <View style={styles.noteItem}>
                        <View style={styles.noteMain}>
                          <View style={[styles.noteIcon, { backgroundColor: '#FFF0DA' }]}>
                            <MaterialCommunityIcons
                              name={item.sharedWithDoctor ? "share-variant" : "note-text-outline"}
                              size={24}
                              color="#AD7130"
                            />
                          </View>
                          <View style={styles.noteInfo}>
                            <View style={styles.noteHeader}>
                              <AppText variant="bodyMedium" style={styles.noteContent}>
                                {item.content.length > 80 ? item.content.substring(0, 80) + '...' : item.content}
                              </AppText>
                            </View>
                            <View style={styles.noteMeta}>
                              <AppText variant="labelSmall" style={styles.noteDate}>
                                {formatCompactDateOnly(item.timestamp)}
                              </AppText>
                              {item.category && (
                                <View style={styles.noteCategory}>
                                  <AppText variant="labelSmall" style={styles.noteCategoryText}>
                                    {getCategoryLabel(item.category)}
                                  </AppText>
                                </View>
                              )}
                              {item.sharedWithDoctor && (
                                <View style={styles.noteShared}>
                                  <MaterialCommunityIcons name="share-variant" size={12} color="#C16046" />
                                  <AppText variant="labelSmall" style={styles.noteSharedText}>
                                    Partagé
                                  </AppText>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={styles.stoolActions}>
                            <TouchableOpacity
                              onPress={() => handleEditNote(item)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="pencil" size={20} color="#C16046" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteNote(item.id)}
                              style={styles.actionButton}
                            >
                              <MaterialCommunityIcons name="delete" size={20} color="#C0392B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </AnimatedListItem>
                ))}
              </View>
            );
          })()}
        </AppCard>

        {/* Calendrier moderne */}
        <AppCard style={styles.calendarCard}>
          <View style={styles.calendarHeaderSection}>
            <SegmentedControl
              options={[
                { value: 'score', label: 'Score' },
                { value: 'bristol', label: 'Selles' }
              ]}
              selectedValue={calendarMode}
              onValueChange={setCalendarMode}
            />
          </View>
          
          {renderModernCalendar()}

          {/* Légende */}
          <View style={styles.legend}>
            {calendarMode === 'score' ? (
              <>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSquare, { backgroundColor: '#C16046' }]} />
                  <AppText variant="labelSmall" style={styles.legendText}>Excellent (0-3)</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSquare, { backgroundColor: '#C16046' }]} />
                  <AppText variant="labelSmall" style={styles.legendText}>Acceptable (4-9)</AppText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendSquare, { backgroundColor: '#312620' }]} />
                  <AppText variant="labelSmall" style={styles.legendText}>Préoccupant (10+)</AppText>
                </View>
              </>
            ) : (
              <View style={styles.legendFullWidth}>
                <AppText variant="labelSmall" style={styles.legendTextCentered}>
                  💡 Le chiffre indique le nombre de selles enregistrées ce jour-là
                </AppText>
              </View>
            )}
          </View>
        </AppCard>

        {/* Historique IBDisk */}
        {ibdiskHistory.length > 0 && (
          <AppCard style={styles.ibdiskCard}>
            <View style={styles.ibdiskHeader}>
              <AppText variant="headlineLarge" style={styles.cardTitle}>
                Historique IBDisk
              </AppText>
              
              {ibdiskHistory.length > 1 ? (
                <View style={styles.ibdiskNavigation}>
                  <TouchableOpacity
                    onPress={handlePreviousIbdisk}
                    disabled={currentIbdiskIndex >= ibdiskHistory.length - 1}
                    style={[
                      styles.navButton,
                      currentIbdiskIndex >= ibdiskHistory.length - 1 && styles.navButtonDisabled
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name="chevron-left" 
                      size={24} 
                      color={currentIbdiskIndex >= ibdiskHistory.length - 1 ? '#A3A3A3' : '#312620'} 
                    />
                  </TouchableOpacity>
                  
                  <AppText variant="labelMedium" style={styles.navText}>
                    {currentIbdiskIndex + 1} / {ibdiskHistory.length}
                  </AppText>
                  
                  <TouchableOpacity
                    onPress={handleNextIbdisk}
                    disabled={currentIbdiskIndex <= 0}
                    style={[
                      styles.navButton,
                      currentIbdiskIndex <= 0 && styles.navButtonDisabled
                    ]}
                  >
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={24} 
                      color={currentIbdiskIndex <= 0 ? '#A3A3A3' : '#312620'} 
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <AppText variant="labelSmall" style={styles.singleQuestionnaireText}>
                  Premier questionnaire IBDisk
                </AppText>
              )}
            </View>
            
            <IBDiskChart 
              data={ibdiskHistory[currentIbdiskIndex]?.answers || {}} 
              date={ibdiskHistory[currentIbdiskIndex]?.date || ''} 
            />
          </AppCard>
        )}
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
              <AppText style={styles.fieldLabel}>Date et heure</AppText>
              <DateTimeInput
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

      {/* Modal d'édition de selle */}
      <Portal>
        <Modal visible={editModalVisible} onDismiss={hideEditModal} contentContainerStyle={styles.modalContainer}>
          <AppCard style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <AppText variant="h2" style={styles.modalTitle}>
                Modifier la selle
              </AppText>

              <View style={styles.dateTimeSection}>
                <AppText style={styles.fieldLabel}>Date et heure</AppText>
                <DateTimeInput
                  dateValue={editDateInput}
                  timeValue={editTimeInput}
                  onDateChange={setEditDateInput}
                  onTimeChange={setEditTimeInput}
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
                  value={editBristol}
                  onValueChange={setEditBristol}
                  style={styles.slider}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.outline}
                  thumbStyle={{ backgroundColor: theme.colors.primary }}
                />
                <AppText variant="labelMedium" style={styles.bristolHint}>
                  Sélection: {editBristol} — {bristolDescriptions[editBristol]}
                </AppText>
              </View>

              <View style={styles.bloodSection}>
                <View style={styles.switchRow}>
                  <AppText variant="bodyLarge">Présence de sang</AppText>
                  <Switch
                    value={editHasBlood}
                    onValueChange={(value) => {
                      toggleFeedback();
                      setEditHasBlood(value);
                    }}
                    color={theme.colors.error}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton
                  onPress={handleSaveEdit}
                  style={styles.saveButton}
                  variant="primary"
                  size="medium"
                >
                  Enregistrer
                </PrimaryButton>
                <PrimaryButton
                  onPress={hideEditModal}
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
              <Card.Title title="Prise de traitement" titleStyle={{ fontSize: 22, fontWeight: '700', color: '#312620' }} />
              
              <Card.Content>
                {/* Date et Heure */}
                <AppText variant="bodyMedium" style={styles.modalSectionLabel}>
                  📅 Date et heure de la prise
                </AppText>
                
                <DateTimeInput
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
        visible={symptomModalVisible}
        onDismiss={() => {
          setSymptomModalVisible(false);
          setEditingSymptom(null);
        }}
        onSave={handleSaveSymptom}
        initialData={editingSymptom}
      />

      {/* Modal de note */}
      <NoteModal
        visible={noteModalVisible}
        onDismiss={() => {
          setNoteModalVisible(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialData={editingNote}
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
    flexDirection: 'row',
    gap: designSystem.spacing[4],
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
  calendarContainer: {
    marginBottom: designSystem.spacing[4],
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designSystem.spacing[4],
    paddingHorizontal: designSystem.spacing[2],
  },
  monthNavButton: {
    width: 48, // Augmenté de 44px à 48px
    height: 48,
    borderRadius: designSystem.borderRadius.lg, // Augmenté à lg
    backgroundColor: '#FFF3EE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0DA',
  },
  monthNavIcon: {
    fontSize: 24,
    color: '#C16046',
    fontWeight: '700',
  },
  monthTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  calendarMonth: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  currentMonthBadge: {
    backgroundColor: '#C16046',
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[1],
    borderRadius: designSystem.borderRadius.md,
    marginTop: designSystem.spacing[1],
  },
  currentMonthText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: designSystem.spacing[2],
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: designSystem.spacing[2],
  },
  dayName: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '13.48%',
    aspectRatio: 1,
    margin: '0.4%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellEmpty: {
    opacity: 0.7,
  },
  dayCellWithScore: {
    borderRadius: designSystem.borderRadius.sm,
  },
  dayCellWithStools: {
    backgroundColor: '#FFF3EE',
    borderRadius: designSystem.borderRadius.sm,
    borderWidth: 2,
    borderColor: '#C16046',
  },
  dayCellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  scoreInCell: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 22,
  },
  stoolCountLarge: {
    color: '#C16046',
    fontWeight: '700',
    fontSize: 26,
  },
  dayNumberEmpty: {
    color: designSystem.colors.text.primary,
    fontSize: 14,
    fontWeight: '500',
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
});

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ScrollView, Platform, TextInput, Switch, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import storage from '../utils/storage';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import SecondaryButton from '../components/ui/SecondaryButton';
import AppCard from '../components/ui/AppCard';
import SettingsSection, { SettingsItem } from '../components/settings/SettingsSection';
import Divider from '../components/ui/Divider';
import ScreenHeader from '../components/ui/ScreenHeader';
import TimeInput from '../components/ui/TimeInput';
import Stepper from '../components/ui/Stepper';
import { useTheme } from 'react-native-paper';
import { injectTestData, clearTestData, generateScenarioData, generateIBDiskTestData } from '../utils/dataGenerator';
import designSystem from '../theme/designSystem';
import * as NotificationService from '../services/notificationService';
import * as WebNotificationService from '../services/webNotificationService';
import { useTrackingMode } from '../hooks/useTrackingMode';
import { getTreatmentReminderTimes, saveTreatmentReminderTimes } from '../utils/treatmentUtils';

export default function SettingsScreen() {
  const [isWiping, setIsWiping] = useState(false);
  const [showManualImport, setShowManualImport] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [devModeEnabled, setDevModeEnabled] = useState(() => storage.getString('devModeEnabled') === 'true');
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef(null);
  const theme = useTheme();
  const { mode: trackingMode, setMode: setTrackingMode, isRemission } = useTrackingMode();

  const [normalStoolCount, setNormalStoolCount] = useState(() => {
    const saved = storage.getString('normalStoolCount');
    return saved != null ? parseInt(saved, 10) : 1;
  });

  const handleNormalStoolCountChange = (value) => {
    setNormalStoolCount(value);
    storage.set('normalStoolCount', String(value));
  };

  const handleVersionTap = () => {
    versionTapCount.current++;
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    if (versionTapCount.current >= 5) {
      versionTapCount.current = 0;
      const next = !devModeEnabled;
      setDevModeEnabled(next);
      storage.set('devModeEnabled', next);
      Alert.alert(
        next ? 'Mode développeur activé' : 'Mode développeur désactivé',
        next ? 'Les outils de test sont maintenant disponibles.' : 'Les outils de test sont masqués.',
      );
    } else {
      versionTapTimer.current = setTimeout(() => { versionTapCount.current = 0; }, 1500);
    }
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminder1Time, setReminder1Time] = useState('09:00');
  const [reminder2Time, setReminder2Time] = useState('20:00');

  const [treatmentRemindersEnabled, setTreatmentRemindersEnabled] = useState(true);
  const [treatmentMatin, setTreatmentMatin] = useState('08:00');
  const [treatmentMidi, setTreatmentMidi] = useState('12:00');
  const [treatmentSoir, setTreatmentSoir] = useState('19:00');
  const [treatmentInterval, setTreatmentInterval] = useState('08:00');
  const [stockReminderEnabled, setStockReminderEnabled] = useState(true);
  const [stockReminderDays, setStockReminderDays] = useState('3');

  // Charger les paramètres de notification au démarrage
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = () => {
    const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
    const settings = service.getNotificationSettings();
    setNotificationsEnabled(settings.enabled);

    const formatHour = (hour, minute) => {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    setReminder1Time(formatHour(settings.surveyReminder1.hour, settings.surveyReminder1.minute));
    const stool = settings.stoolReminder || { hour: 20, minute: 0 };
    setReminder2Time(formatHour(stool.hour, stool.minute));

    const treatTimes = getTreatmentReminderTimes();
    setTreatmentMatin(treatTimes.matin);
    setTreatmentMidi(treatTimes.midi);
    setTreatmentSoir(treatTimes.soir);
    setTreatmentRemindersEnabled(settings.treatmentRemindersEnabled !== false);
    setTreatmentInterval(treatTimes.interval || '08:00');
    setStockReminderEnabled(treatTimes.stockReminderEnabled !== false);
    setStockReminderDays(String(treatTimes.stockReminderDays || 3));
  };

  // Générer des données de test
  const handleGenerateTestData = (scenario) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous générer des données de test ? Cela écrasera vos données actuelles.')) {
        setIsGenerating(true);
        try {
          const result = generateScenarioData(scenario);
          setIsGenerating(false);
          Alert.alert(
            'Données générées !',
            `${result.scores.length} jours de données ont été générés.\n\nAllez dans l'onglet Statistiques pour voir les graphiques.`,
            [{ text: 'OK', onPress: () => {} }]
          );
        } catch (error) {
          setIsGenerating(false);
          Alert.alert('Erreur', 'Impossible de générer les données de test.');
        }
      }
    } else {
      Alert.alert(
        'Générer des données de test',
        'Voulez-vous générer des données de test ? Cela écrasera vos données actuelles.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Générer',
            onPress: () => {
              setIsGenerating(true);
              try {
                const result = generateScenarioData(scenario);
                setIsGenerating(false);
                Alert.alert(
                  'Données générées !',
                  `${result.scores.length} jours de données ont été générés.\n\nAllez dans l'onglet Statistiques pour voir les graphiques.`
                );
              } catch (error) {
                setIsGenerating(false);
                Alert.alert('Erreur', 'Impossible de générer les données de test.');
              }
            }
          }
        ]
      );
    }
  };

  // Générer des questionnaires IBDisk de test
  const handleGenerateIBDiskData = () => {
    console.log('🎯 Début génération IBDisk...');
    
    // Génération directe sans alerte pour éviter les problèmes de compatibilité
    try {
      console.log('🎯 Génération directe des questionnaires IBDisk...');
      const result = generateIBDiskTestData(3);
      console.log('✅ IBDisk générés:', result);
      
      // Afficher un message de succès simple
      alert(`✅ ${result.length} questionnaires IBDisk générés !\n\nAllez dans l'onglet Historique pour voir les graphiques en araignée.`);
      
    } catch (error) {
      console.error('❌ Erreur génération IBDisk:', error);
      alert(`❌ Erreur: Impossible de générer les questionnaires: ${error.message}`);
    }
  };

  // Tester les notifications
  const handleTestNotification = async () => {
    try {
      const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
      await service.sendTestNotification();
      Alert.alert('Succès', 'Notification de test envoyée ! Vous devriez la voir apparaître.');
    } catch (error) {
      Alert.alert('Erreur', `Impossible d'envoyer la notification de test: ${error.message}`);
    }
  };

  // Tester la notif bilan (dans 5 secondes)
  const handleTestSurveyNotif = async () => {
    try {
      const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
      await service.sendTestBilanNotification();
      Alert.alert('✅ Notif bilan', Platform.OS === 'web'
        ? 'Notification envoyée.'
        : "Vous la recevrez dans 5 secondes.\nSortez de l'app pour la voir apparaître.");
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  // Tester la notif selles (dans 5 secondes)
  const handleTestStoolNotif = async () => {
    try {
      const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
      await service.sendTestStoolNotification();
      Alert.alert('✅ Notif selles', Platform.OS === 'web'
        ? 'Notification envoyée.'
        : "Vous la recevrez dans 5 secondes.\nSortez de l'app pour la voir apparaître.");
    } catch (error) {
      Alert.alert('Erreur', error.message);
    }
  };

  // Activer/désactiver les notifications
  const handleToggleNotifications = async (value) => {
    try {
      // Utiliser le service approprié selon la plateforme
      const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
      
      if (value) {
        const success = await service.enableNotifications();
        if (success) {
          setNotificationsEnabled(true);
          Alert.alert('Succès', 'Les notifications ont été activées. Vous recevrez des rappels pour compléter votre bilan quotidien.');
        } else {
          Alert.alert('Erreur', 'Impossible d\'activer les notifications. Veuillez autoriser les notifications dans les paramètres de votre navigateur/appareil.');
        }
      } else {
        await service.disableNotifications();
        setNotificationsEnabled(false);
        Alert.alert('Succès', 'Les notifications ont été désactivées.');
      }
    } catch (error) {
      console.error('Erreur toggle notifications:', error);
      Alert.alert('Erreur', `Impossible de modifier les notifications: ${error.message}`);
    }
  };

  // Modifier l'heure du premier rappel
  const handleReminder1Change = async (timeStr) => {
    setReminder1Time(timeStr);
    
    // Valider le format HH:MM
    if (timeStr.length === 5 && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Utiliser le service approprié selon la plateforme
        const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
        const settings = service.getNotificationSettings();
        settings.surveyReminder1.hour = hours;
        settings.surveyReminder1.minute = minutes;
        service.saveNotificationSettings(settings);
        
        if (notificationsEnabled) {
          if (Platform.OS === 'web') {
            WebNotificationService.scheduleAllReminders();
          } else {
            await NotificationService.scheduleSurveyReminder(hours, minutes);
          }
        }
      }
    }
  };

  // Modifier l'heure du second rappel
  const handleReminder2Change = async (timeStr) => {
    setReminder2Time(timeStr);
    
    // Valider le format HH:MM
    if (timeStr.length === 5 && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        // Utiliser le service approprié selon la plateforme
        const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
        const settings = service.getNotificationSettings();
        if (!settings.stoolReminder) settings.stoolReminder = { enabled: true, hour: 20, minute: 0 };
        settings.stoolReminder.hour = hours;
        settings.stoolReminder.minute = minutes;
        service.saveNotificationSettings(settings);

        if (notificationsEnabled) {
          if (Platform.OS === 'web') {
            WebNotificationService.scheduleAllReminders();
          } else {
            await NotificationService.scheduleStoolReminder(hours, minutes);
          }
        }
      }
    }
  };

  const handleToggleTreatmentReminders = async (value) => {
    setTreatmentRemindersEnabled(value);
    const service = Platform.OS === 'web' ? WebNotificationService : NotificationService;
    const settings = service.getNotificationSettings();
    settings.treatmentRemindersEnabled = value;
    service.saveNotificationSettings(settings);

    if (notificationsEnabled) {
      if (value) {
        if (Platform.OS === 'web') {
          WebNotificationService.scheduleAllReminders();
        } else {
          const { scheduleTreatmentReminders } = require('../services/notificationService');
          await scheduleTreatmentReminders();
        }
      } else {
        if (Platform.OS === 'web') {
          WebNotificationService.scheduleAllReminders();
        } else {
          const { cancelTreatmentReminders } = require('../services/notificationService');
          await cancelTreatmentReminders();
        }
      }
    }
  };

  const handleToggleStockReminder = async (value) => {
    setStockReminderEnabled(value);
    const current = getTreatmentReminderTimes();
    current.stockReminderEnabled = value;
    saveTreatmentReminderTimes(current);

    if (notificationsEnabled && treatmentRemindersEnabled) {
      if (Platform.OS === 'web') {
        WebNotificationService.scheduleAllReminders();
      } else {
        const { scheduleTreatmentReminders } = require('../services/notificationService');
        await scheduleTreatmentReminders();
      }
    }
  };

  const handleStockDaysChange = async (text) => {
    setStockReminderDays(text);
    const days = parseInt(text);
    if (!isNaN(days) && days >= 1 && days <= 30) {
      const current = getTreatmentReminderTimes();
      current.stockReminderDays = days;
      saveTreatmentReminderTimes(current);

      if (notificationsEnabled && treatmentRemindersEnabled && stockReminderEnabled) {
        if (Platform.OS === 'web') {
          WebNotificationService.scheduleAllReminders();
        } else {
          const { scheduleTreatmentReminders } = require('../services/notificationService');
          await scheduleTreatmentReminders();
        }
      }
    }
  };

  const handleTreatmentTimeChange = async (moment, timeStr) => {
    const setter = { matin: setTreatmentMatin, midi: setTreatmentMidi, soir: setTreatmentSoir, interval: setTreatmentInterval }[moment];
    if (setter) setter(timeStr);

    if (timeStr.length === 5 && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        const current = getTreatmentReminderTimes();
        current[moment] = timeStr;
        saveTreatmentReminderTimes(current);

        if (notificationsEnabled && treatmentRemindersEnabled) {
          if (Platform.OS === 'web') {
            WebNotificationService.scheduleAllReminders();
          } else {
            const { scheduleTreatmentReminders } = require('../services/notificationService');
            await scheduleTreatmentReminders();
          }
        }
      }
    }
  };

  const handleWipeData = () => {
    Alert.alert(
      'Effacer toutes les données',
      'Êtes-vous sûr de vouloir supprimer toutes les données de l\'application ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => {
            setIsWiping(true);
            
            try {
              // Effacer toutes les données
              console.log('Début de la suppression des données...');
              
              storage.set('dailySells', '[]');
              console.log('dailySells effacé');
              
              storage.set('dailySurvey', '{}');
              console.log('dailySurvey effacé');
              
              storage.set('scoresHistory', '[]');
              console.log('scoresHistory effacé');

              storage.set('psccaiHistory', '[]');
              storage.delete('psccaiLastUsed');
              console.log('psccaiHistory effacé');
              
              // Vérifier que les données ont bien été effacées
              const dailySells = storage.getString('dailySells');
              const dailySurvey = storage.getString('dailySurvey');
              const scoresHistory = storage.getString('scoresHistory');
              
              console.log('Vérification après suppression:');
              console.log('dailySells:', dailySells);
              console.log('dailySurvey:', dailySurvey);
              console.log('scoresHistory:', scoresHistory);
              
              if (dailySells === '[]' && dailySurvey === '{}' && scoresHistory === '[]') {
                Alert.alert('Succès', 'Toutes les données ont été effacées avec succès. Les écrans se mettront à jour automatiquement.');
              } else {
                Alert.alert('Attention', 'Certaines données n\'ont pas pu être effacées.');
              }
              
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', `Impossible d'effacer les données: ${error.message}`);
            } finally {
              setIsWiping(false);
            }
          }
        }
      ]
    );
  };

  const handleManualClear = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.clear();
        console.log('localStorage effacé manuellement');
        Alert.alert('Succès', 'localStorage effacé manuellement. Les écrans se mettront à jour automatiquement.');
      } catch (error) {
        console.error('Erreur localStorage:', error);
        Alert.alert('Erreur', `Erreur localStorage: ${error.message}`);
      }
    } else {
      Alert.alert('Info', 'localStorage non disponible (probablement sur mobile natif)');
    }
  };

  // Export des données
  const handleExportData = () => {
    try {
      const allData = {
        scoresHistory: storage.getString('scoresHistory') || '[]',
        dailySells: storage.getString('dailySells') || '[]',
        dailySurvey: storage.getString('dailySurvey') || '{}',
        treatments: storage.getString('treatments') || '[]',
        ibdiskHistory: storage.getString('ibdiskHistory') || '[]',
        ibdiskLastUsed: storage.getString('ibdiskLastUsed') || '',
        psccaiHistory: storage.getString('psccaiHistory') || '[]',
        psccaiLastUsed: storage.getString('psccaiLastUsed') || '',
        exportDate: new Date().toISOString(),
        version: '1.3.0'
      };

      const dataStr = JSON.stringify(allData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rch-suivi-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      Alert.alert('Succès', 'Données exportées avec succès ! Le fichier a été téléchargé.');
    } catch (error) {
      console.error('Erreur export:', error);
      Alert.alert('Erreur', `Impossible d'exporter les données: ${error.message}`);
    }
  };


  // Import manuel via texte JSON
  const handleManualImport = () => {
    if (!importJsonText.trim()) {
      Alert.alert('Erreur', 'Veuillez coller le contenu JSON de votre sauvegarde.');
      return;
    }

    try {
      const data = JSON.parse(importJsonText);
      
      // Vérifier que c'est un fichier de sauvegarde RCH
      if (!data.version || !data.scoresHistory) {
        Alert.alert('Erreur', 'Ce JSON ne semble pas être une sauvegarde RCH Suivi valide.');
        return;
      }

      // Restaurer les données
      storage.set('scoresHistory', data.scoresHistory);
      storage.set('dailySells', data.dailySells);
      storage.set('dailySurvey', data.dailySurvey);
      storage.set('treatments', data.treatments);
      storage.set('ibdiskHistory', data.ibdiskHistory);
      storage.set('ibdiskLastUsed', data.ibdiskLastUsed);
      if (data.psccaiHistory) storage.set('psccaiHistory', data.psccaiHistory);
      if (data.psccaiLastUsed) storage.set('psccaiLastUsed', data.psccaiLastUsed);

      Alert.alert('Succès', 'Données importées avec succès ! L\'application va se recharger.');
      setShowManualImport(false);
      setImportJsonText('');
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      }, 1000);
    } catch (error) {
      console.error('Erreur import manuel:', error);
      Alert.alert('Erreur', `JSON invalide: ${error.message}`);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScreenHeader title="Paramètres" />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Nombre normal de selles/jour */}
      <AppCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="toilet" size={28} color="#C16046" style={{ marginRight: 16 }} />
          <AppText variant="headlineLarge" style={styles.infoTitle}>
            Selles normales / jour
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.infoDescription}>
          Nombre habituel de selles par jour en dehors des poussées. Utilisé pour calculer votre score PRO-2.
        </AppText>
        <View style={{ alignItems: 'center', marginTop: designSystem.spacing[4] }}>
          <Stepper value={normalStoolCount} min={0} max={5} onChange={handleNormalStoolCountChange} size="large" />
        </View>
      </AppCard>

      {/* Mode de suivi */}
      <AppCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="swap-horizontal" size={28} color="#C16046" style={{ marginRight: 16 }} />
          <AppText variant="headlineLarge" style={styles.infoTitle}>
            Mode de suivi
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.infoDescription}>
          En rémission, seuls les rappels de traitement restent actifs. Les bilans et selles ne sont plus proposés sur l'accueil.
        </AppText>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, !isRemission && styles.modeBtnActive]}
            onPress={() => setTrackingMode('active')}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={!isRemission ? '#fff' : designSystem.colors.text.secondary} />
            <AppText style={[styles.modeBtnText, !isRemission && styles.modeBtnTextActive]}>Phase active</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, isRemission && styles.modeBtnActiveGreen]}
            onPress={() => setTrackingMode('remission')}
          >
            <MaterialCommunityIcons name="moon-waning-crescent" size={18} color={isRemission ? '#fff' : designSystem.colors.text.secondary} />
            <AppText style={[styles.modeBtnText, isRemission && styles.modeBtnTextActive]}>Rémission</AppText>
          </TouchableOpacity>
        </View>
      </AppCard>

      {/* Mode Développeur — visible uniquement si activé */}
      {devModeEnabled && <AppCard style={styles.devCard}>
        <View style={styles.devHeader}>
          <MaterialCommunityIcons name="dice-multiple" size={24} color="#C16046" style={{ marginRight: 12 }} />
          <AppText variant="headlineLarge" style={styles.devTitle}>
            Mode Développeur
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.devDescription}>
          Générez des données de test pour voir les graphiques et tendances sans attendre. Parfait pour tester l'application !
        </AppText>
        
        <View style={styles.scenarioButtons}>
          <PrimaryButton 
            onPress={() => handleGenerateTestData('realiste')} 
            disabled={isGenerating}
            variant="success"
            style={styles.scenarioButton}
            icon={isGenerating ? "timer-sand" : "chart-bar"}
          >
            {isGenerating ? 'Génération...' : 'Réaliste (60j)'}
          </PrimaryButton>
          
          <PrimaryButton 
            onPress={() => handleGenerateTestData('remission')} 
            disabled={isGenerating}
            variant="success"
            outlined
            style={styles.scenarioButton}
            icon="trending-up"
          >
            Amélioration (60j)
          </PrimaryButton>
          
          <PrimaryButton 
            onPress={() => handleGenerateTestData('poussee')} 
            disabled={isGenerating}
            variant="warning"
            outlined
            style={styles.scenarioButton}
            icon="trending-down"
          >
            Poussée (30j)
          </PrimaryButton>
          
          <PrimaryButton 
            onPress={() => handleGenerateTestData('stable')} 
            disabled={isGenerating}
            variant="primary"
            outlined
            style={styles.scenarioButton}
            icon="minus"
          >
            Stable (90j)
          </PrimaryButton>
          
          <PrimaryButton 
            onPress={handleGenerateIBDiskData} 
            variant="warning"
            outlined
            style={styles.scenarioButton}
            icon="chart-box-outline"
          >
            IBDisk (3 questionnaires)
          </PrimaryButton>
          
          <PrimaryButton
            onPress={handleTestNotification}
            variant="info"
            outlined
            style={styles.scenarioButton}
            icon="bell-ring"
          >
            Test Notification
          </PrimaryButton>

          <PrimaryButton
            onPress={handleTestSurveyNotif}
            variant="info"
            outlined
            style={styles.scenarioButton}
            icon="clipboard-text-outline"
          >
            Test Notif Bilan (5s)
          </PrimaryButton>

          <PrimaryButton
            onPress={handleTestStoolNotif}
            variant="info"
            outlined
            style={styles.scenarioButton}
            icon="toilet"
          >
            Test Notif Selles (5s)
          </PrimaryButton>
        </View>
      </AppCard>}

      {/* Notifications */}
      <AppCard style={styles.notificationCard}>
        <View style={styles.notificationHeader}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="#C16046" style={{ marginRight: 12 }} />
          <AppText variant="headlineLarge" style={styles.notificationTitle}>
            Notifications
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.notificationDescription}>
          Recevez des rappels quotidiens pour compléter votre bilan si vous ne l'avez pas encore fait.
        </AppText>
        
        {/* Activation des notifications */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <MaterialCommunityIcons name="bell-check" size={20} color="#C16046" />
            <AppText variant="bodyMedium" style={styles.settingLabel}>
              Activer les notifications
            </AppText>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#D4D4D8', true: '#E6E0DA' }}
            thumbColor={notificationsEnabled ? '#C16046' : '#FFF3EE'}
          />
        </View>
        
        {notificationsEnabled && (
          <>
            {isRemission && (
              <View style={styles.remissionNote}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={16} color={designSystem.colors.health.excellent.main} />
                <AppText variant="bodySmall" style={styles.remissionNoteText}>
                  En mode rémission, les rappels bilan et selles sont suspendus. Seuls les rappels traitement restent actifs.
                </AppText>
              </View>
            )}

            <View style={styles.divider} />

            {/* Rappel selles soir */}
            <View style={[styles.reminderSection, isRemission && styles.reminderSectionDisabled]}>
              <View style={styles.reminderHeader}>
                <MaterialCommunityIcons name="toilet" size={20} color={isRemission ? designSystem.colors.text.tertiary : '#C16046'} />
                <AppText variant="bodyLarge" style={[styles.reminderTitle, isRemission && styles.reminderTitleDisabled]}>
                  Rappel selles (soir)
                </AppText>
              </View>
              <AppText variant="bodySmall" style={styles.reminderDescription}>
                Envoyé uniquement si aucune selle n'a été saisie dans la journée.
              </AppText>
              <TimeInput
                value={reminder2Time}
                onChange={handleReminder2Change}
                label="Heure du rappel selles"
              />
            </View>

            <View style={styles.divider} />

            {/* Rappels traitement matin/midi/soir */}
            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <MaterialCommunityIcons name="pill" size={20} color="#C16046" />
                <AppText variant="bodyLarge" style={styles.reminderTitle}>
                  Rappels traitement
                </AppText>
              </View>
              <AppText variant="bodySmall" style={styles.reminderDescription}>
                Heures des rappels pour les prises matin, midi et soir. Actifs même en rémission.
              </AppText>
              <View style={styles.settingRow}>
                <View style={styles.settingLabelContainer}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#C16046" />
                  <AppText variant="bodyMedium" style={styles.settingLabel}>
                    Activer les rappels traitement
                  </AppText>
                </View>
                <Switch
                  value={treatmentRemindersEnabled}
                  onValueChange={handleToggleTreatmentReminders}
                  trackColor={{ false: '#D4D4D8', true: '#E6E0DA' }}
                  thumbColor={treatmentRemindersEnabled ? '#C16046' : '#FFF3EE'}
                />
              </View>
              {treatmentRemindersEnabled && (
                <>
                  <AppText variant="bodySmall" style={[styles.reminderDescription, { marginTop: 8, marginBottom: 4 }]}>
                    Traitements quotidiens
                  </AppText>
                  <TimeInput
                    value={treatmentMatin}
                    onChange={(v) => handleTreatmentTimeChange('matin', v)}
                    label="Matin"
                  />
                  <TimeInput
                    value={treatmentMidi}
                    onChange={(v) => handleTreatmentTimeChange('midi', v)}
                    label="Midi"
                  />
                  <TimeInput
                    value={treatmentSoir}
                    onChange={(v) => handleTreatmentTimeChange('soir', v)}
                    label="Soir"
                  />

                  <View style={styles.divider} />

                  <AppText variant="bodySmall" style={[styles.reminderDescription, { marginBottom: 4 }]}>
                    Traitements espacés (tous les X jours)
                  </AppText>
                  <TimeInput
                    value={treatmentInterval}
                    onChange={(v) => handleTreatmentTimeChange('interval', v)}
                    label="Heure du rappel"
                  />

                  <View style={[styles.settingRow, { marginTop: 8 }]}>
                    <View style={styles.settingLabelContainer}>
                      <MaterialCommunityIcons name="package-variant" size={20} color="#C16046" />
                      <AppText variant="bodyMedium" style={styles.settingLabel}>
                        Rappel de stock
                      </AppText>
                    </View>
                    <Switch
                      value={stockReminderEnabled}
                      onValueChange={handleToggleStockReminder}
                      trackColor={{ false: '#D4D4D8', true: '#E6E0DA' }}
                      thumbColor={stockReminderEnabled ? '#C16046' : '#FFF3EE'}
                    />
                  </View>
                  {stockReminderEnabled && (
                    <View style={{ marginTop: 4 }}>
                      <AppText variant="bodySmall" style={styles.reminderDescription}>
                        Recevez un rappel X jours avant la prise pour vérifier votre stock en pharmacie.
                      </AppText>
                      <TextInput
                        value={stockReminderDays}
                        onChangeText={handleStockDaysChange}
                        keyboardType="number-pad"
                        style={styles.stockDaysInput}
                        placeholder="3"
                      />
                      <AppText variant="labelSmall" style={{ color: designSystem.colors.text.tertiary, fontStyle: 'italic', marginTop: 2 }}>
                        Nombre de jours avant la prise (1 à 30)
                      </AppText>
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </AppCard>

      {/* Sauvegarde des données */}
      <AppCard style={styles.backupCard}>
        <View style={styles.backupHeader}>
          <MaterialCommunityIcons name="cloud-upload" size={24} color="#C16046" style={{ marginRight: 12 }} />
          <AppText variant="headlineLarge" style={styles.backupTitle}>
            Sauvegarde des données
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.backupDescription}>
          Exportez vos données pour les sauvegarder ou les transférer vers un autre appareil.
        </AppText>
        
        <View style={styles.backupButtons}>
          <PrimaryButton 
            onPress={handleExportData} 
            variant="secondary"
            style={styles.backupButton}
            icon="download"
          >
            Exporter les données
          </PrimaryButton>
          
          <PrimaryButton 
            onPress={() => setShowManualImport(!showManualImport)} 
            variant="secondary"
            outlined
            style={styles.backupButton}
            icon="text-box"
          >
            Importer des données
          </PrimaryButton>
        </View>
        
        {showManualImport && (
          <View style={styles.manualImportContainer}>
            <AppText variant="bodyMedium" style={styles.manualImportLabel}>
              Collez le contenu JSON de votre sauvegarde :
            </AppText>
            <TextInput
              style={styles.jsonInput}
              value={importJsonText}
              onChangeText={setImportJsonText}
              placeholder="Collez votre JSON ici..."
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            <View style={styles.manualImportButtons}>
              <PrimaryButton 
                onPress={handleManualImport}
                variant="secondary"
                style={styles.importButton}
              >
                Importer
              </PrimaryButton>
              <PrimaryButton 
                onPress={() => {
                  setShowManualImport(false);
                  setImportJsonText('');
                }}
                variant="neutral"
                outlined
                style={styles.cancelButton}
              >
                Annuler
              </PrimaryButton>
            </View>
          </View>
        )}
      </AppCard>

      {/* Zone de danger */}
      <AppCard style={styles.dangerCard}>
        <View style={styles.dangerHeader}>
          <MaterialCommunityIcons name="alert" size={28} color="#312620" style={{ marginRight: 16 }} />
          <AppText variant="headlineLarge" style={styles.dangerTitle}>
            Zone de danger
          </AppText>
        </View>
        <AppText variant="bodyMedium" style={styles.dangerDescription}>
          Cette action supprimera définitivement toutes vos données : selles, bilans quotidiens et historique des scores.
        </AppText>
        <PrimaryButton 
          onPress={handleWipeData} 
          disabled={isWiping}
          variant="danger"
          style={styles.wipeButton}
          icon="delete-forever"
        >
          {isWiping ? 'Suppression...' : 'Effacer toutes les données'}
        </PrimaryButton>
        
        {devModeEnabled && (
          <PrimaryButton
            onPress={handleManualClear}
            variant="info"
            outlined
            style={styles.debugButton}
            icon="broom"
          >
            Effacer localStorage (Debug)
          </PrimaryButton>
        )}
      </AppCard>

      {/* Version — 5 taps pour activer/désactiver le mode développeur */}
      <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionFooter}>
        <AppText variant="labelSmall" style={styles.versionText}>
          RCH Suivi · v1.2.0
        </AppText>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  subtitle: {
    color: '#312620', // Color 03
    fontWeight: '400',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFF3EE', // Color 02
    borderWidth: 1,
    borderColor: '#C16046', // Color 01
    shadowColor: '#C16046',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    color: '#312620', // Color 03
    fontWeight: '600',
  },
  infoDescription: {
    color: '#312620',
    fontWeight: '400',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: designSystem.borderRadius.base,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    backgroundColor: designSystem.colors.background.tertiary,
  },
  modeBtnActive: {
    backgroundColor: designSystem.colors.primary[500],
    borderColor: designSystem.colors.primary[500],
  },
  modeBtnActiveGreen: {
    backgroundColor: designSystem.colors.health.excellent.main,
    borderColor: designSystem.colors.health.excellent.main,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: designSystem.colors.text.secondary,
  },
  modeBtnTextActive: {
    color: '#fff',
  },
  devCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFF3EE', // Color 02
    borderWidth: 1,
    borderColor: '#C16046', // Color 01
    shadowColor: '#C16046',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  devTitle: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  devDescription: {
    color: '#312620', // Color 03
    marginBottom: 20,
    lineHeight: 22,
  },
  scenarioButtons: {
    gap: 12,
  },
  scenarioButton: {
    borderRadius: 16,
    paddingVertical: 4,
  },
  dangerCard: {
    marginHorizontal: 20,
    marginBottom: 32,
    padding: 24,
    backgroundColor: '#FFF3EE', // Color 02
    borderWidth: 1,
    borderColor: '#312620', // Color 03 - Noir pour alertes
    shadowColor: '#312620',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dangerTitle: {
    color: '#312620', // Color 03
    fontWeight: '600',
  },
  dangerDescription: {
    color: '#312620', // Color 03
    marginBottom: 24,
    fontWeight: '400',
  },
  wipeButton: {
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  debugButton: {
    borderRadius: 16,
    paddingVertical: 4,
  },
  // Styles pour la sauvegarde
  backupCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFF3EE', // Color 02
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backupTitle: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  backupDescription: {
    color: '#312620', // Color 03
    marginBottom: 16,
  },
  backupButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  backupButton: {
    width: '100%',
  },
  // Styles pour l'import manuel
  manualImportContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3EE', // Color 02
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
  },
  manualImportLabel: {
    color: '#312620', // Color 03
    marginBottom: 8,
    fontWeight: '600',
  },
  jsonInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
    borderRadius: 6,
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 120,
    marginBottom: 12,
  },
  manualImportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  importButton: {
    flex: 1,
  },
  // Styles pour les notifications
  notificationCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    backgroundColor: '#FFF3EE', // Color 02
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
    shadowColor: '#C16046',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationTitle: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  notificationDescription: {
    color: '#312620', // Color 03
    marginBottom: 20,
    lineHeight: 22,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  settingLabel: {
    color: '#312620', // Color 03
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E0DA', // Color 04
    marginVertical: 16,
  },
  remissionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: designSystem.borderRadius.base,
    backgroundColor: designSystem.colors.health.excellent.light,
  },
  remissionNoteText: {
    flex: 1,
    color: designSystem.colors.health.excellent.main,
    lineHeight: 18,
  },
  reminderSection: {
    marginTop: 8,
  },
  reminderSectionDisabled: {
    opacity: 0.45,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reminderTitle: {
    color: '#312620',
    fontWeight: '600',
  },
  reminderTitleDisabled: {
    color: designSystem.colors.text.tertiary,
  },
  reminderDescription: {
    color: '#312620',
    fontStyle: 'italic',
    marginBottom: 12,
    marginLeft: 28,
  },
  stockDaysInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E6E0DA',
    borderRadius: designSystem.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginTop: 8,
    width: 80,
  },
  versionFooter: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  versionText: {
    color: designSystem.colors.text.disabled,
    fontSize: 12,
  },
});

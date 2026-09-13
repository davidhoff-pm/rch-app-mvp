import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppText from '../components/ui/AppText';
import AppCard from '../components/ui/AppCard';
import PrimaryButton from '../components/ui/PrimaryButton';
import ScreenHeader from '../components/ui/ScreenHeader';
import designSystem from '../theme/designSystem';
import { toggleFeedback, selectionFeedback, saveFeedback } from '../utils/haptics';
import {
  getWellbeingSettings,
  getTodayCheckin,
  saveTodayCheckin,
  getTodayDateString,
  MOOD_LABELS,
  SLEEP_LABELS,
  FATIGUE_LABELS,
  WELLBEING_SCALE_MIN,
  WELLBEING_SCALE_MAX,
  WELLBEING_SCALE_DEFAULT,
} from '../utils/wellbeingUtils';
import {
  getActiveChips,
  toggleChipLogForToday,
  getActiveChipIdsForDate,
} from '../utils/factorChipsUtils';

const { colors, spacing, borderRadius } = designSystem;

const SCALE_OPTIONS = Array.from(
  { length: WELLBEING_SCALE_MAX - WELLBEING_SCALE_MIN + 1 },
  (_, i) => WELLBEING_SCALE_MIN + i
);

// Sélecteur au tap (plutôt qu'un slider) : plus rapide et plus précis pour une
// échelle courte à choix labellisés — un seul geste suffit pour choisir sa valeur.
function ScalePicker({ icon, title, labels, value, onChange }) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderHeaderLeft}>
          <MaterialCommunityIcons name={icon} size={20} color={colors.primary[500]} />
          <AppText variant="bodyMedium" weight="semiBold" style={styles.sliderTitle}>{title}</AppText>
        </View>
        <AppText variant="bodyMedium" weight="semiBold" style={styles.sliderValueLabel}>
          {labels[value]}
        </AppText>
      </View>

      <View style={styles.scaleOptionsRow}>
        {SCALE_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.scaleOption, active && styles.scaleOptionActive]}
              onPress={() => onChange(opt)}
              activeOpacity={0.7}
            >
              <AppText
                variant="bodyLarge"
                weight="semiBold"
                style={active ? styles.scaleOptionTextActive : styles.scaleOptionText}
              >
                {opt}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Formulaire du bilan léger quotidien (humeur / sommeil / fatigue, échelle 0-3,
 * sélection au tap) + facteurs personnalisables (chips). Ne concerne que la
 * journée courante : pas de saisie rétroactive (anti-biais mémoire).
 */
export default function WellbeingCheckinScreen() {
  const navigation = useNavigation();
  const [settings, setSettings] = useState(() => getWellbeingSettings());
  const [mood, setMood] = useState(WELLBEING_SCALE_DEFAULT);
  const [sleep, setSleep] = useState(WELLBEING_SCALE_DEFAULT);
  const [fatigue, setFatigue] = useState(WELLBEING_SCALE_DEFAULT);
  const [activeChips, setActiveChips] = useState(() => getActiveChips());
  const [todayChipIds, setTodayChipIds] = useState(() => getActiveChipIdsForDate(getTodayDateString()));

  useFocusEffect(
    React.useCallback(() => {
      const freshSettings = getWellbeingSettings();
      setSettings(freshSettings);

      const checkin = getTodayCheckin();
      setMood(checkin?.mood ?? WELLBEING_SCALE_DEFAULT);
      setSleep(checkin?.sleep ?? WELLBEING_SCALE_DEFAULT);
      setFatigue(checkin?.fatigue ?? WELLBEING_SCALE_DEFAULT);

      setActiveChips(getActiveChips());
      setTodayChipIds(getActiveChipIdsForDate(getTodayDateString()));
    }, [])
  );

  const handleChipTap = (chipId) => {
    toggleFeedback();
    toggleChipLogForToday(chipId);
    setTodayChipIds(getActiveChipIdsForDate(getTodayDateString()));
  };

  const handleMoodChange = (value) => { selectionFeedback(); setMood(value); };
  const handleSleepChange = (value) => { selectionFeedback(); setSleep(value); };
  const handleFatigueChange = (value) => { selectionFeedback(); setFatigue(value); };

  const handleSave = () => {
    const updates = {};
    if (settings.moodEnabled) updates.mood = mood;
    if (settings.sleepEnabled) updates.sleep = sleep;
    if (settings.fatigueEnabled) updates.fatigue = fatigue;

    if (Object.keys(updates).length > 0) {
      saveTodayCheckin(updates);
    }
    saveFeedback();
    navigation.goBack();
  };

  const showMood = settings.moodEnabled;
  const showSleep = settings.sleepEnabled;
  const showFatigue = settings.fatigueEnabled;
  const showChips = settings.chipsEnabled;
  const showSliders = showMood || showSleep || showFatigue;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Bilan du jour"
        actions={[{ icon: 'arrow-left', onPress: () => navigation.goBack(), label: 'Retour' }]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showSliders ? (
          <AppCard style={styles.card}>
            {showMood && (
              <ScalePicker icon="emoticon-outline" title="Humeur" labels={MOOD_LABELS} value={mood} onChange={handleMoodChange} />
            )}
            {showSleep && (
              <ScalePicker icon="sleep" title="Sommeil" labels={SLEEP_LABELS} value={sleep} onChange={handleSleepChange} />
            )}
            {showFatigue && (
              <ScalePicker icon="lightning-bolt-outline" title="Fatigue" labels={FATIGUE_LABELS} value={fatigue} onChange={handleFatigueChange} />
            )}
          </AppCard>
        ) : (
          <AppText variant="bodyMedium" color="secondary" style={styles.emptyText}>
            Aucune sous-partie activée. Rendez-vous dans les Réglages pour activer humeur, sommeil ou fatigue.
          </AppText>
        )}

        {showChips && (
          <AppCard style={styles.card}>
            <View style={styles.chipsSectionHeader}>
              <AppText variant="bodyLarge" weight="semiBold" style={styles.chipsSectionTitle}>Facteurs du jour</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('ChipsManagement')}>
                <AppText variant="bodySmall" color="info">Gérer</AppText>
              </TouchableOpacity>
            </View>
            {activeChips.length > 0 ? (
              <View style={styles.chipsRow}>
                {activeChips.map((chip) => {
                  const isOn = todayChipIds.includes(chip.id);
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[styles.chipPill, isOn && styles.chipPillActive]}
                      onPress={() => handleChipTap(chip.id)}
                      activeOpacity={0.8}
                    >
                      <AppText
                        variant="bodySmall"
                        weight={isOn ? 'semiBold' : 'regular'}
                        style={isOn ? styles.chipTextActive : styles.chipText}
                      >
                        {chip.label}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <AppText variant="bodySmall" color="tertiary" style={styles.chipsEmptyText}>
                Aucun facteur suivi pour l'instant. Touchez "Gérer" pour en choisir.
              </AppText>
            )}
          </AppCard>
        )}

        <PrimaryButton onPress={handleSave} style={styles.saveButton}>
          Enregistrer
        </PrimaryButton>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: 100,
  },
  card: {
    marginBottom: spacing[4],
  },
  emptyText: {
    marginBottom: spacing[4],
  },
  sliderBlock: {
    marginBottom: spacing[4],
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  sliderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderTitle: {
    color: colors.text.primary,
  },
  sliderValueLabel: {
    color: colors.primary[600],
  },
  scaleOptionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  scaleOption: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.base,
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleOptionActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  scaleOptionText: {
    color: colors.text.primary,
  },
  scaleOptionTextActive: {
    color: '#FFFFFF',
  },
  chipsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  chipsSectionTitle: {
    color: colors.text.primary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chipPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  chipPillActive: {
    backgroundColor: colors.secondary[100],
    borderColor: colors.secondary[500],
  },
  chipText: {
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.secondary[700],
  },
  chipsEmptyText: {
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: spacing[2],
  },
});

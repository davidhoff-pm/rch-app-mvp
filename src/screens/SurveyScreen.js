import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../components/ui/AppCard';
import AppText from '../components/ui/AppText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';
import designSystem from '../theme/designSystem';
import ScreenHeader from '../components/ui/ScreenHeader';
import WellbeingCard from '../components/home/WellbeingCard';
import { checkPSCCAICooldown, interpretScore, deletePSCCAIResult } from '../utils/psccaiCalculator';
import { getCheckins, deleteCheckin, getTodayDateString } from '../utils/wellbeingUtils';
import { getLogsByDate, getChipById } from '../utils/factorChipsUtils';
import { deleteFeedback } from '../utils/haptics';
import { refreshDailyNotifications } from '../services/notificationService';

const { colors } = designSystem;

const HISTORY_PAGE_SIZE = 5;

// Ligne générique d'un tableau d'historique (date + contenu libre + score optionnel
// + actions éditer/supprimer). Réutilisée pour les 3 types de questionnaires.
function HistoryTableRow({ icon, iconColor, title, rightBadge, onEdit, onDelete, children }) {
  return (
    <View style={styles.tableRow}>
      <View style={styles.tableRowMain}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        <View style={styles.tableRowText}>
          <AppText style={styles.tableRowTitle}>{title}</AppText>
          {children}
        </View>
      </View>
      <View style={styles.tableRowRight}>
        {rightBadge}
        <View style={styles.tableRowActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} hitSlop={8} style={styles.tableRowActionBtn}>
              <MaterialCommunityIcons name="pencil-outline" size={17} color={colors.primary[500]} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={styles.tableRowActionBtn}>
            <MaterialCommunityIcons name="trash-can-outline" size={17} color={colors.health.danger.main} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function ShowMoreButton({ remaining, onPress }) {
  if (remaining <= 0) return null;
  return (
    <TouchableOpacity onPress={onPress} style={styles.showMoreBtn} activeOpacity={0.7}>
      <AppText style={styles.showMoreText}>Voir {Math.min(remaining, HISTORY_PAGE_SIZE)} de plus</AppText>
      <MaterialCommunityIcons name="chevron-down" size={16} color={colors.primary[500]} />
    </TouchableOpacity>
  );
}

export default function SurveyScreen() {
  const navigation = useNavigation();
  const [ibdiskAvailable, setIbdiskAvailable] = useState(true);
  const [ibdiskDaysRemaining, setIbdiskDaysRemaining] = useState(0);
  const [ibdiskHistory, setIbdiskHistory] = useState([]);
  const [psccaiAvailable, setPsccaiAvailable] = useState(true);
  const [psccaiDaysRemaining, setPsccaiDaysRemaining] = useState(0);
  const [psccaiHistory, setPsccaiHistory] = useState([]);
  const [wellbeingHistory, setWellbeingHistory] = useState([]);

  const [wellbeingVisibleCount, setWellbeingVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [psccaiVisibleCount, setPsccaiVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const [ibdiskVisibleCount, setIbdiskVisibleCount] = useState(HISTORY_PAGE_SIZE);
  // Forcer le remontage de WellbeingCard après suppression du bilan du jour :
  // son état "complet" est géré en interne et ne se réévalue qu'au focus de
  // l'écran, pas quand on supprime une entrée sans quitter l'écran Bilan.
  const [wellbeingRefreshKey, setWellbeingRefreshKey] = useState(0);

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

  const loadIbdiskHistory = () => {
    const ibdiskJson = storage.getString('ibdiskHistory');
    const ibdiskList = ibdiskJson ? JSON.parse(ibdiskJson) : [];
    setIbdiskHistory(ibdiskList);
  };

  const checkPSCCAIAvailability = () => {
    const { available, daysRemaining } = checkPSCCAICooldown();
    setPsccaiAvailable(available);
    setPsccaiDaysRemaining(daysRemaining);
  };

  const loadPsccaiHistory = () => {
    const json = storage.getString('psccaiHistory');
    const list = json ? JSON.parse(json) : [];
    setPsccaiHistory(list);
  };

  const loadWellbeingHistory = () => {
    const list = [...getCheckins()].sort((a, b) => b.date.localeCompare(a.date));
    setWellbeingHistory(list);
  };

  useFocusEffect(
    React.useCallback(() => {
      checkIBDiskAvailability();
      loadIbdiskHistory();
      checkPSCCAIAvailability();
      loadPsccaiHistory();
      loadWellbeingHistory();
    }, [])
  );

  // Score moyen /10 d'un questionnaire IBDisk (moyenne des 10 dimensions)
  const getIbdiskAverageScore = (answers) => {
    const values = Object.values(answers || {}).filter(v => typeof v === 'number');
    if (values.length === 0) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  // Alert.alert() n'affiche aucune boîte de dialogue sur web (react-native-web) —
  // les boutons/onPress ne se déclenchent jamais. Comme le reste de l'app
  // (cf. useStoolManagement.js), on bascule sur window.confirm côté web.
  const confirmDelete = (title, message, executeDelete) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        deleteFeedback();
        executeDelete();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => { deleteFeedback(); executeDelete(); } },
      ]);
    }
  };

  const handleDeletePsccai = (date) => {
    confirmDelete(
      'Supprimer ce bilan ?',
      `Le bilan hebdomadaire du ${formatShortDate(date)} sera définitivement supprimé.`,
      () => {
        deletePSCCAIResult(date);
        loadPsccaiHistory();
        checkPSCCAIAvailability();
        if (Platform.OS !== 'web') refreshDailyNotifications();
      }
    );
  };

  const handleDeleteIbdisk = (date) => {
    confirmDelete(
      'Supprimer ce questionnaire ?',
      `Le questionnaire mensuel du ${formatShortDate(date)} sera définitivement supprimé.`,
      () => {
        const json = storage.getString('ibdiskHistory');
        const list = json ? JSON.parse(json) : [];
        const remaining = list.filter(h => h.date !== date);
        storage.set('ibdiskHistory', JSON.stringify(remaining));

        // Recalcule le cooldown mensuel à partir du questionnaire restant le plus
        // récent, pour que la suppression du dernier en date le rende disponible.
        if (remaining.length > 0) {
          const mostRecentTimestamp = Math.max(...remaining.map(h => h.timestamp || 0));
          storage.set('ibdiskLastUsed', String(mostRecentTimestamp));
        } else {
          storage.delete('ibdiskLastUsed');
        }

        loadIbdiskHistory();
        checkIBDiskAvailability();
        if (Platform.OS !== 'web') refreshDailyNotifications();
      }
    );
  };

  const handleDeleteWellbeing = (date) => {
    confirmDelete(
      'Supprimer ce bilan ?',
      `Le bilan du ${formatShortDate(date)} sera définitivement supprimé.`,
      () => {
        deleteCheckin(date);
        loadWellbeingHistory();
        setWellbeingRefreshKey(k => k + 1);
        if (Platform.OS !== 'web') refreshDailyNotifications();
      }
    );
  };

  const formatShortDate = (dateKey) => {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Bilan"
        actions={[
          { icon: 'cog-outline', onPress: () => navigation.navigate('Paramètres'), label: 'Paramètres' },
        ]}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section : Questionnaires */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color={colors.primary[500]} />
            <AppText variant="h3" style={styles.sectionTitle}>
              Questionnaires
            </AppText>
          </View>

          {/* Bilan léger quotidien (humeur / sommeil / fatigue / facteurs) */}
          <WellbeingCard key={wellbeingRefreshKey} style={styles.wellbeingCardEmbedded} />

          {/* P-SCCAI hebdomadaire */}
          {psccaiAvailable ? (
            <TouchableOpacity
              style={styles.taskOutlined}
              onPress={() => navigation.navigate('PSCCAIQuestionnaire')}
              activeOpacity={0.85}
            >
              <View style={styles.taskOutlinedIcon}>
                <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.taskTextWrap}>
                <AppText style={styles.taskOutlinedTitle} numberOfLines={1}>Bilan hebdomadaire</AppText>
                <AppText style={styles.taskOutlinedDesc} numberOfLines={1}>Questionnaire P-SCCAI</AppText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          ) : (
            <View style={styles.taskDisabled}>
              <View style={styles.taskDisabledIcon}>
                <MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color={colors.neutral[400]} />
              </View>
              <View style={styles.taskTextWrap}>
                <AppText style={styles.taskDisabledTitle} numberOfLines={1}>Bilan hebdomadaire</AppText>
                <AppText style={styles.taskDisabledDesc} numberOfLines={1}>
                  {psccaiDaysRemaining === 1
                    ? 'Disponible demain'
                    : `Disponible dans ${psccaiDaysRemaining} jours`}
                </AppText>
              </View>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.secondary[500]} />
            </View>
          )}

          {/* IBDisk */}
          {ibdiskAvailable ? (
            <TouchableOpacity
              style={styles.taskOutlined}
              onPress={() => navigation.navigate('IBDiskQuestionnaire')}
              activeOpacity={0.85}
            >
              <View style={styles.taskOutlinedIcon}>
                <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.primary[500]} />
              </View>
              <View style={styles.taskTextWrap}>
                <AppText style={styles.taskOutlinedTitle} numberOfLines={1}>Questionnaire mensuel</AppText>
                <AppText style={styles.taskOutlinedDesc} numberOfLines={1}>Évaluez votre qualité de vie</AppText>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary[400]} />
            </TouchableOpacity>
          ) : (
            <View style={styles.taskDisabled}>
              <View style={styles.taskDisabledIcon}>
                <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.neutral[400]} />
              </View>
              <View style={styles.taskTextWrap}>
                <AppText style={styles.taskDisabledTitle} numberOfLines={1}>Questionnaire mensuel</AppText>
                <AppText style={styles.taskDisabledDesc} numberOfLines={1}>
                  {ibdiskDaysRemaining === 1
                    ? 'Disponible demain'
                    : `Disponible dans ${ibdiskDaysRemaining} jours`}
                </AppText>
              </View>
              <MaterialCommunityIcons name="check-circle" size={22} color={colors.secondary[500]} />
            </View>
          )}
        </View>

        {/* Section : Historique des questionnaires */}
        {(wellbeingHistory.length > 0 || psccaiHistory.length > 0 || ibdiskHistory.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={24} color={colors.primary[500]} />
              <AppText variant="h3" style={styles.sectionTitle}>
                Historique des questionnaires
              </AppText>
            </View>

            {/* Bilans du jour (humeur / sommeil / fatigue / facteurs) */}
            {wellbeingHistory.length > 0 && (
              <AppCard style={styles.historyCard}>
                <AppText variant="h4" style={styles.historySectionTitle}>
                  Bilans du jour
                </AppText>
                {wellbeingHistory.slice(0, wellbeingVisibleCount).map((checkin) => {
                  const tags = getLogsByDate(checkin.date)
                    .map(log => getChipById(log.chipId))
                    .filter(Boolean);
                  const isToday = checkin.date === getTodayDateString();
                  return (
                    <HistoryTableRow
                      key={checkin.date}
                      icon="white-balance-sunny"
                      iconColor={colors.primary[500]}
                      title={formatShortDate(checkin.date)}
                      onEdit={isToday ? () => navigation.navigate('WellbeingCheckin') : undefined}
                      onDelete={() => handleDeleteWellbeing(checkin.date)}
                    >
                      <View style={styles.wellbeingScoresRow}>
                        <View style={styles.wellbeingScoreBadge}>
                          <MaterialCommunityIcons name="emoticon-outline" size={13} color={colors.text.secondary} />
                          <AppText style={styles.wellbeingScoreValue}>{checkin.mood ?? '—'}</AppText>
                        </View>
                        <View style={styles.wellbeingScoreBadge}>
                          <MaterialCommunityIcons name="weather-night" size={13} color={colors.text.secondary} />
                          <AppText style={styles.wellbeingScoreValue}>{checkin.sleep ?? '—'}</AppText>
                        </View>
                        <View style={styles.wellbeingScoreBadge}>
                          <MaterialCommunityIcons name="battery-charging-medium" size={13} color={colors.text.secondary} />
                          <AppText style={styles.wellbeingScoreValue}>{checkin.fatigue ?? '—'}</AppText>
                        </View>
                      </View>
                      {tags.length > 0 && (
                        <View style={styles.wellbeingTagsRow}>
                          {tags.map(tag => (
                            <View key={tag.id} style={styles.wellbeingTagChip}>
                              <AppText style={styles.wellbeingTagText} numberOfLines={1}>{tag.label}</AppText>
                            </View>
                          ))}
                        </View>
                      )}
                    </HistoryTableRow>
                  );
                })}
                <ShowMoreButton
                  remaining={wellbeingHistory.length - wellbeingVisibleCount}
                  onPress={() => setWellbeingVisibleCount(c => c + HISTORY_PAGE_SIZE)}
                />
              </AppCard>
            )}

            {/* Bilan hebdomadaire (P-SCCAI) */}
            {psccaiHistory.length > 0 && (
              <AppCard style={styles.historyCard}>
                <AppText variant="h4" style={styles.historySectionTitle}>
                  Bilan hebdomadaire (P-SCCAI)
                </AppText>
                {psccaiHistory.slice(0, psccaiVisibleCount).map((entry) => {
                  const interp = interpretScore(entry.totalScore);
                  const healthColor =
                    interp.color === 'excellent' ? colors.secondary[500] :
                    interp.color === 'moderate' ? colors.accent[500] :
                    colors.health.danger.main;
                  return (
                    <HistoryTableRow
                      key={entry.date}
                      icon="clipboard-pulse"
                      iconColor={healthColor}
                      title={formatShortDate(entry.date)}
                      rightBadge={
                        <AppText style={[styles.rowScoreBadge, { color: healthColor }]}>
                          {entry.totalScore}/19
                        </AppText>
                      }
                      onEdit={() => navigation.navigate('PSCCAIQuestionnaire', { date: entry.date })}
                      onDelete={() => handleDeletePsccai(entry.date)}
                    />
                  );
                })}
                <ShowMoreButton
                  remaining={psccaiHistory.length - psccaiVisibleCount}
                  onPress={() => setPsccaiVisibleCount(c => c + HISTORY_PAGE_SIZE)}
                />
              </AppCard>
            )}

            {/* Questionnaire mensuel (IBDisk) */}
            {ibdiskHistory.length > 0 && (
              <AppCard style={styles.historyCard}>
                <AppText variant="h4" style={styles.historySectionTitle}>
                  Questionnaire qualité de vie
                </AppText>
                {ibdiskHistory.slice(0, ibdiskVisibleCount).map((ibdisk) => {
                  const avgScore = getIbdiskAverageScore(ibdisk.answers);
                  return (
                    <HistoryTableRow
                      key={ibdisk.date}
                      icon="chart-box"
                      iconColor={colors.primary[500]}
                      title={formatShortDate(ibdisk.date)}
                      rightBadge={
                        avgScore !== null && (
                          <AppText style={styles.rowScoreBadge}>{avgScore}/10</AppText>
                        )
                      }
                      onEdit={() => navigation.navigate('IBDiskQuestionnaire', { date: ibdisk.date })}
                      onDelete={() => handleDeleteIbdisk(ibdisk.date)}
                    />
                  );
                })}
                <ShowMoreButton
                  remaining={ibdiskHistory.length - ibdiskVisibleCount}
                  onPress={() => setIbdiskVisibleCount(c => c + HISTORY_PAGE_SIZE)}
                />
              </AppCard>
            )}
          </View>
        )}
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
    padding: designSystem.spacing[4],
    paddingBottom: 100,
  },
  section: {
    marginBottom: designSystem.spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[4],
  },
  sectionTitle: {
    marginLeft: designSystem.spacing[3],
    color: colors.text.primary,
  },
  taskTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  wellbeingCardEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: designSystem.spacing[3],
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
    marginBottom: designSystem.spacing[3],
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
  taskDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.neutral[100],
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: designSystem.spacing[3],
    opacity: 0.7,
  },
  taskDisabledIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDisabledTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: colors.neutral[400],
  },
  taskDisabledDesc: {
    fontSize: 12,
    color: colors.neutral[400],
    marginTop: 2,
  },
  historyCard: {
    marginBottom: designSystem.spacing[4],
  },
  historySectionTitle: {
    color: colors.text.primary,
    marginBottom: designSystem.spacing[3],
    fontWeight: '600',
  },
  // Tableau d'historique (ligne générique, cf. HistoryTableRow)
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: designSystem.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: designSystem.spacing[2],
  },
  tableRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
    gap: designSystem.spacing[3],
  },
  tableRowText: {
    flex: 1,
    minWidth: 0,
  },
  tableRowTitle: {
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 14,
  },
  tableRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
  },
  tableRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[1],
  },
  tableRowActionBtn: {
    padding: 4,
  },
  rowScoreBadge: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  // Bilans du jour : 3 scores + tags
  wellbeingScoresRow: {
    flexDirection: 'row',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[1],
  },
  wellbeingScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  wellbeingScoreValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  wellbeingTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing[1],
    marginTop: designSystem.spacing[2],
  },
  wellbeingTagChip: {
    backgroundColor: colors.primary[50],
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 140,
  },
  wellbeingTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[500],
  },
  // Pagination "voir plus"
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: designSystem.spacing[3],
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
  },
});

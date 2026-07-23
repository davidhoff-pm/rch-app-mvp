import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../components/ui/AppCard';
import AppText from '../components/ui/AppText';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';
import designSystem from '../theme/designSystem';
import ScreenHeader from '../components/ui/ScreenHeader';
import WellbeingCard from '../components/home/WellbeingCard';
import { checkPSCCAICooldown, interpretScore } from '../utils/psccaiCalculator';

const { colors } = designSystem;

export default function SurveyScreen() {
  const navigation = useNavigation();
  const [ibdiskAvailable, setIbdiskAvailable] = useState(true);
  const [ibdiskDaysRemaining, setIbdiskDaysRemaining] = useState(0);
  const [ibdiskHistory, setIbdiskHistory] = useState([]);
  const [psccaiAvailable, setPsccaiAvailable] = useState(true);
  const [psccaiDaysRemaining, setPsccaiDaysRemaining] = useState(0);
  const [psccaiHistory, setPsccaiHistory] = useState([]);

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

  useFocusEffect(
    React.useCallback(() => {
      checkIBDiskAvailability();
      loadIbdiskHistory();
      checkPSCCAIAvailability();
      loadPsccaiHistory();
    }, [])
  );

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
          <WellbeingCard style={styles.wellbeingCardEmbedded} />

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
        {(psccaiHistory.length > 0 || ibdiskHistory.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="history" size={24} color={colors.primary[500]} />
              <AppText variant="h3" style={styles.sectionTitle}>
                Historique des questionnaires
              </AppText>
            </View>

            {psccaiHistory.length > 0 && (
              <AppCard style={styles.historyCard}>
                <AppText variant="h4" style={styles.historySectionTitle}>
                  Bilan hebdomadaire (P-SCCAI)
                </AppText>
                {psccaiHistory.map((entry, index) => {
                  const interp = interpretScore(entry.totalScore);
                  const healthColor =
                    interp.color === 'excellent' ? colors.secondary[500] :
                    interp.color === 'moderate' ? colors.accent[500] :
                    colors.health.danger.main;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.historyItem}
                      onPress={() => navigation.navigate('PSCCAIQuestionnaire', { date: entry.date })}
                    >
                      <View style={styles.historyItemContent}>
                        <MaterialCommunityIcons
                          name="clipboard-pulse"
                          size={20}
                          color={healthColor}
                        />
                        <View style={styles.historyItemText}>
                          <AppText variant="bodyMedium" style={styles.historyItemDate}>
                            {formatShortDate(entry.date)}
                          </AppText>
                          <AppText variant="bodySmall" style={styles.historyItemDetails}>
                            Score : {entry.totalScore}/19 — {interp.label}
                          </AppText>
                        </View>
                      </View>
                      <View style={styles.historyItemAction}>
                        <AppText style={[styles.historyScore, { color: healthColor }]}>
                          {entry.totalScore}
                        </AppText>
                        <MaterialCommunityIcons
                          name="pencil"
                          size={18}
                          color={colors.primary[500]}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </AppCard>
            )}

            {ibdiskHistory.length > 0 && (
            <AppCard style={styles.historyCard}>
              <AppText variant="h4" style={styles.historySectionTitle}>
                Questionnaire qualité de vie
              </AppText>
              {ibdiskHistory.map((ibdisk, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.historyItem}
                  onPress={() => navigation.navigate('IBDiskQuestionnaire', { date: ibdisk.date })}
                >
                  <View style={styles.historyItemContent}>
                    <MaterialCommunityIcons
                      name="chart-box"
                      size={20}
                      color={colors.primary[500]}
                    />
                    <View style={styles.historyItemText}>
                      <AppText variant="bodyMedium" style={styles.historyItemDate}>
                        {formatShortDate(ibdisk.date)}
                      </AppText>
                      <AppText variant="bodySmall" style={styles.historyItemDetails}>
                        Score calculé
                      </AppText>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={20}
                    color={colors.primary[500]}
                  />
                </TouchableOpacity>
              ))}
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
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: designSystem.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyItemText: {
    marginLeft: designSystem.spacing[3],
    flex: 1,
  },
  historyItemDate: {
    color: colors.text.primary,
    fontWeight: '500',
    marginBottom: designSystem.spacing[1],
  },
  historyItemDetails: {
    color: colors.text.secondary,
  },
  historyItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
  },
  historyScore: {
    fontSize: 17,
    fontWeight: '700',
  },
});

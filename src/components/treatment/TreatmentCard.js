import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';
import {
  getTodayMoments,
  isIntervalIntakeDone,
  getNextIntake,
  formatFrequency,
  getDoses,
  getDosesPerDay,
} from '../../utils/treatmentUtils';

const { colors, spacing, borderRadius } = designSystem;

const MOMENT_ICONS = {
  matin: 'weather-sunny',
  midi: 'white-balance-sunny',
  soir: 'weather-night',
};

const MOMENT_LABELS = {
  matin: 'Matin',
  midi: 'Midi',
  soir: 'Soir',
};

const TreatmentCard = ({
  schema,
  medication,
  onToggleMoment,
  onCheckInterval,
  onUncheckInterval,
  onEdit,
  onStop,
  compact = false,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const { type } = schema.frequency;
  const isDaily = type === 'daily';

  const doses = isDaily ? getDoses(schema.frequency) : {};
  const moments = isDaily ? getTodayMoments(schema) : {};
  const activeMoments = isDaily
    ? ['matin', 'midi', 'soir'].filter(m => (doses[m] || 0) > 0)
    : [];
  const allDone = isDaily
    ? activeMoments.length > 0 && activeMoments.every(m => moments[m])
    : isIntervalIntakeDone(schema);

  const isDone = !isDaily && isIntervalIntakeDone(schema);
  const { nextDate, isLate, daysLate } = !isDaily ? getNextIntake(schema) : {};

  const renderMomentToggle = (moment, isCompact) => {
    const doseCount = doses[moment] || 0;
    if (doseCount === 0) return null;

    const checked = moments[moment];

    return (
      <TouchableOpacity
        key={moment}
        onPress={() => onToggleMoment(schema, medication, moment)}
        style={[
          styles.momentToggle,
          isCompact && styles.momentToggleCompact,
          checked && styles.momentToggleChecked,
        ]}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={MOMENT_ICONS[moment]}
          size={isCompact ? 14 : 18}
          color={checked ? colors.background.tertiary : colors.text.disabled}
        />
      </TouchableOpacity>
    );
  };

  const renderMomentRow = (moment) => {
    const doseCount = doses[moment] || 0;
    if (doseCount === 0) return null;

    const checked = moments[moment];

    return (
      <TouchableOpacity
        key={moment}
        onPress={() => onToggleMoment(schema, medication, moment)}
        style={[styles.momentRow, checked && styles.momentRowChecked]}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={MOMENT_ICONS[moment]}
          size={16}
          color={checked ? colors.primary[500] : colors.text.disabled}
        />
        <AppText variant="bodySmall" style={[styles.momentRowLabel, checked && styles.momentRowLabelChecked]}>
          {MOMENT_LABELS[moment]}
          {doseCount > 1 ? ` · ${doseCount}cp` : ''}
        </AppText>
        <MaterialCommunityIcons
          name={checked ? 'check-circle' : 'circle-outline'}
          size={20}
          color={checked ? colors.primary[500] : colors.neutral[300]}
        />
      </TouchableOpacity>
    );
  };

  // --- COMPACT MODE ---
  if (compact) {
    return (
      <View style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <MaterialCommunityIcons name="pill" size={18} color={colors.primary[500]} />
          <AppText variant="bodySmall" style={styles.compactName} numberOfLines={1}>
            {medication.name}
          </AppText>
          {isLate && !isDaily && (
            <View style={styles.compactLateBadge}>
              <AppText variant="labelSmall" style={styles.compactLateText}>
                {daysLate}j retard
              </AppText>
            </View>
          )}
        </View>
        {allDone ? (
          <View style={styles.compactDone}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.secondary[500]} />
            <AppText variant="labelSmall" style={styles.compactDoneText}>Pris</AppText>
          </View>
        ) : isDaily ? (
          <View style={styles.compactToggles}>
            {activeMoments.map(m => renderMomentToggle(m, true))}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => onCheckInterval(schema, medication)}
            style={[styles.momentToggle, styles.momentToggleCompact]}
          >
            <MaterialCommunityIcons name="check" size={14} color="transparent" />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // --- FULL MODE ---
  return (
    <AppCard style={[styles.card, isLate && styles.cardLate]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="pill" size={24} color={colors.primary[500]} />
          <View style={styles.headerText}>
            <AppText variant="h4" style={styles.medicationName}>
              {medication.name}
            </AppText>
            <AppText variant="labelSmall" style={styles.frequency}>
              {formatFrequency(schema.frequency)}
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setMenuVisible(!menuVisible)}
          style={styles.menuButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {menuVisible && (
        <View style={styles.menu}>
          <TouchableOpacity
            onPress={() => { setMenuVisible(false); onEdit(schema, medication); }}
            style={styles.menuItem}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={colors.primary[500]} />
            <AppText variant="body" style={styles.menuItemText}>Modifier</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setMenuVisible(false); onStop(schema, medication); }}
            style={styles.menuItem}
          >
            <MaterialCommunityIcons name="stop-circle" size={20} color={colors.health.danger.main} />
            <AppText variant="body" style={styles.menuItemText}>Arrêter</AppText>
          </TouchableOpacity>
        </View>
      )}

      {isLate && !isDaily && (
        <View style={styles.lateAlert}>
          <MaterialCommunityIcons name="alert" size={20} color={colors.health.danger.main} />
          <AppText variant="bodySmall" style={styles.lateText}>
            RETARD {daysLate} jour{daysLate > 1 ? 's' : ''}
          </AppText>
        </View>
      )}

      <View style={styles.mainSection}>
        {isDaily ? (
          <View style={styles.momentsList}>
            {activeMoments.map(m => renderMomentRow(m))}
          </View>
        ) : (
          <>
            {isDone ? (
              <View style={styles.nextDoseInfo}>
                <AppText variant="labelMedium" style={styles.label}>
                  Prochaine prise : {nextDate?.toLocaleDateString('fr-FR')}
                </AppText>
              </View>
            ) : (
              <View style={styles.intervalSection}>
                <AppText variant="labelMedium" style={styles.label}>
                  À prendre aujourd'hui
                </AppText>
                <TouchableOpacity
                  onPress={() => onCheckInterval(schema, medication)}
                  style={styles.momentToggle}
                >
                  <MaterialCommunityIcons name="check" size={20} color="transparent" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
  },
  cardLate: {
    borderColor: colors.health.danger.main,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  headerText: {
    flex: 1,
  },
  medicationName: {
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  frequency: {
    color: colors.text.secondary,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing[2],
    ...designSystem.shadows.lg,
    zIndex: 10,
    borderWidth: 1,
    borderColor: colors.border.light,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[3],
  },
  menuItemText: {
    color: colors.text.primary,
  },
  lateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.health.danger.light,
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  lateText: {
    color: colors.health.danger.main,
    fontWeight: '700',
  },
  mainSection: {},
  label: {
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  // Moment rows (full mode)
  momentsList: {
    gap: spacing[2],
  },
  momentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.secondary,
  },
  momentRowChecked: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  momentRowLabel: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 14,
  },
  momentRowLabelChecked: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  momentToggle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  momentToggleCompact: {
    width: 30,
    height: 30,
  },
  momentToggleChecked: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  intervalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextDoseInfo: {
    paddingVertical: spacing[2],
  },
  // Compact mode
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing[2],
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    minWidth: 0,
  },
  compactName: {
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  compactLateBadge: {
    backgroundColor: colors.health.danger.light,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  compactLateText: {
    color: colors.health.danger.main,
    fontWeight: '700',
    fontSize: 10,
  },
  compactToggles: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  compactDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  compactDoneText: {
    color: colors.secondary[500],
    fontWeight: '600',
  },
});

export default TreatmentCard;

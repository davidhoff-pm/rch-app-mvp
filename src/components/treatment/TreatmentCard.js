import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';
import {
  getTodayIntakesCount,
  isIntervalIntakeDone,
  getNextIntake,
  formatFrequency,
  checkOverdose,
  getDosesPerDay,
  getDoses,
} from '../../utils/treatmentUtils';

/**
 * Card pour afficher un traitement dans le schéma actif
 */

const TreatmentCard = ({
  schema,
  medication,
  onCheckDaily,
  onUncheckDaily,
  onCheckInterval,
  onUncheckInterval,
  onEdit,
  onStop
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  const { type } = schema.frequency;
  const isDaily = type === 'daily';

  const todayCount = isDaily ? getTodayIntakesCount(schema) : 0;
  const totalDoses = isDaily ? getDosesPerDay(schema.frequency) : 1;

  // Pour les interval: vérifier si déjà pris et calculer retard
  const isDone = !isDaily && isIntervalIntakeDone(schema);
  const { nextDate, isLate, daysLate } = !isDaily ? getNextIntake(schema) : {};

  // Observance et surdosage
  const adherence = schema.adherence || 0;
  const { hasOverdose, excess } = checkOverdose(schema);

  // Rendu des checkboxes pour daily
  const renderDailyCheckboxes = () => {
    const boxes = [];
    for (let i = 0; i < totalDoses; i++) {
      const isChecked = i < todayCount;
      boxes.push(
        <TouchableOpacity
          key={i}
          onPress={() => {
            if (isChecked) {
              // Si cochée, on décoche (décrémente)
              onUncheckDaily(schema, medication);
            } else {
              // Si décochée, on coche (incrémente)
              onCheckDaily(schema, medication);
            }
          }}
          style={[
            styles.checkbox,
            isChecked && styles.checkboxChecked
          ]}
        >
          {isChecked && (
            <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      );
    }
    return boxes;
  };

  return (
    <AppCard style={[styles.card, isLate && styles.cardLate]}>
      {/* Header avec nom et menu */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="pill" size={24} color={designSystem.colors.primary[500]} />
          <View style={styles.headerText}>
            <AppText variant="h4" style={styles.medicationName}>
              {medication.name}
            </AppText>
            <AppText variant="labelSmall" style={styles.frequency}>
              {formatFrequency(schema.frequency)}
            </AppText>
          </View>
        </View>

        {/* Menu 3 points */}
        <TouchableOpacity
          onPress={() => setMenuVisible(!menuVisible)}
          style={styles.menuButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={24} color={designSystem.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Menu contextuel */}
      {menuVisible && (
        <View style={styles.menu}>
          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              onEdit(schema, medication);
            }}
            style={styles.menuItem}
          >
            <MaterialCommunityIcons name="pencil" size={20} color={designSystem.colors.primary[500]} />
            <AppText variant="body" style={styles.menuItemText}>Modifier</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false);
              onStop(schema, medication);
            }}
            style={styles.menuItem}
          >
            <MaterialCommunityIcons name="stop-circle" size={20} color={designSystem.colors.health.danger.main} />
            <AppText variant="body" style={styles.menuItemText}>Arrêter</AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Alerte retard pour interval */}
      {isLate && !isDaily && (
        <View style={styles.lateAlert}>
          <MaterialCommunityIcons name="alert" size={20} color="#C0392B" />
          <AppText variant="bodySmall" style={styles.lateText}>
            RETARD {daysLate} jour{daysLate > 1 ? 's' : ''}
          </AppText>
        </View>
      )}

      {/* Section principale - Checkboxes ou prochaine prise */}
      <View style={styles.mainSection}>
        {isDaily ? (
          <>
            <AppText variant="labelMedium" style={styles.label}>
              Aujourd'hui : {todayCount}/{totalDoses}
              {todayCount > totalDoses && (
                <AppText variant="labelMedium" style={styles.excessText}>
                  {' '}(+{todayCount - totalDoses} en excès)
                </AppText>
              )}
            </AppText>
            <View style={styles.checkboxContainer}>
              {renderDailyCheckboxes()}
            </View>
          </>
        ) : (
          <>
            {isDone ? (
              // Dose déjà prise - Afficher seulement la prochaine date
              <View style={styles.nextDoseInfo}>
                <AppText variant="labelMedium" style={styles.label}>
                  Prochaine prise : {nextDate?.toLocaleDateString('fr-FR')}
                </AppText>
              </View>
            ) : (
              // Dose à prendre - Afficher la checkbox
              <View style={styles.intervalSection}>
                <AppText variant="labelMedium" style={styles.label}>
                  À prendre aujourd'hui
                </AppText>
                <TouchableOpacity
                  onPress={() => onCheckInterval(schema, medication)}
                  style={[
                    styles.checkbox,
                    styles.checkboxLarge
                  ]}
                >
                  <MaterialCommunityIcons name="check" size={20} color="transparent" />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Observance */}
      <View style={styles.observanceSection}>
        <AppText variant="labelMedium" style={styles.observanceLabel}>
          Observance :
        </AppText>
        <AppText
          variant="labelMedium"
          style={[
            styles.observanceValue,
            adherence >= 90 && styles.observanceGood,
            adherence < 90 && adherence >= 70 && styles.observanceMedium,
            adherence < 70 && styles.observanceBad
          ]}
        >
          {adherence}%{hasOverdose && ` (+${excess} dose${excess > 1 ? 's' : ''} en excès)`}
        </AppText>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: designSystem.spacing[4],
  },
  cardLate: {
    borderColor: '#C0392B',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designSystem.spacing[4],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: designSystem.spacing[3],
  },
  headerText: {
    flex: 1,
  },
  medicationName: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    marginBottom: designSystem.spacing[1],
  },
  frequency: {
    color: designSystem.colors.text.secondary,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[2],
    ...designSystem.shadows.lg,
    zIndex: 10,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designSystem.spacing[3],
    gap: designSystem.spacing[3],
  },
  menuItemText: {
    color: designSystem.colors.text.primary,
  },
  lateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBE3DF',
    padding: designSystem.spacing[3],
    borderRadius: designSystem.borderRadius.md,
    marginBottom: designSystem.spacing[4],
    gap: designSystem.spacing[2],
  },
  lateText: {
    color: '#C0392B',
    fontWeight: '700',
  },
  mainSection: {
    marginBottom: designSystem.spacing[4],
  },
  label: {
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[3],
  },
  excessText: {
    color: '#AD7130',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    gap: designSystem.spacing[3],
    flexWrap: 'wrap',
  },
  checkbox: {
    width: 36,
    height: 36,
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 2,
    borderColor: designSystem.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: designSystem.colors.primary[500],
  },
  checkboxLarge: {
    width: 44,
    height: 44,
  },
  intervalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextDoseInfo: {
    paddingVertical: designSystem.spacing[2],
  },
  observanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: designSystem.spacing[4],
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.border.light,
    gap: designSystem.spacing[2],
  },
  observanceLabel: {
    color: designSystem.colors.text.secondary,
  },
  observanceValue: {
    fontWeight: '700',
  },
  observanceGood: {
    color: '#397852',
  },
  observanceMedium: {
    color: '#AD7130',
  },
  observanceBad: {
    color: '#C0392B',
  },
});

export default TreatmentCard;

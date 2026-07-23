import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';
import { isTodayCheckinComplete, shouldShowWellbeingCard } from '../../utils/wellbeingUtils';

const { colors } = designSystem;

/**
 * Carte d'entrée "Bilan du jour" (accueil + onglet Bilan) : humeur / sommeil / fatigue
 * (échelle 0-3) + facteurs personnalisables. Au tap, ouvre le formulaire dédié.
 * Ne concerne que la journée courante (pas de saisie rétroactive).
 */
export default function WellbeingCard({ style }) {
  const navigation = useNavigation();
  const [complete, setComplete] = useState(() => isTodayCheckinComplete());

  const refresh = useCallback(() => {
    setComplete(isTodayCheckinComplete());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (!shouldShowWellbeingCard()) return null;

  if (complete) {
    return (
      <View style={[styles.taskDisabled, style]}>
        <View style={styles.taskDisabledIcon}>
          <MaterialCommunityIcons name="white-balance-sunny" size={22} color={colors.neutral[400]} />
        </View>
        <View style={styles.taskTextWrap}>
          <AppText style={styles.taskDisabledTitle} numberOfLines={1}>Bilan du jour</AppText>
          <AppText style={styles.taskDisabledDesc} numberOfLines={1}>Disponible demain</AppText>
        </View>
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.secondary[500]} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.taskOutlined, style]}
      onPress={() => navigation.navigate('WellbeingCheckin')}
      activeOpacity={0.85}
    >
      <View style={styles.taskOutlinedIcon}>
        <MaterialCommunityIcons name="white-balance-sunny" size={22} color={colors.primary[500]} />
      </View>
      <View style={styles.taskTextWrap}>
        <AppText style={styles.taskOutlinedTitle} numberOfLines={1}>Bilan du jour</AppText>
        <AppText style={styles.taskOutlinedDesc} numberOfLines={1}>
          Humeur, sommeil, fatigue, facteurs
        </AppText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary[400]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    marginHorizontal: 20,
    marginTop: 20,
  },
  taskOutlinedIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskTextWrap: {
    flex: 1,
    minWidth: 0,
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
    marginHorizontal: 20,
    marginTop: 20,
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
});

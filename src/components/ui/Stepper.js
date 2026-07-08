import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import designSystem from '../../theme/designSystem';
import { buttonPressFeedback } from '../../utils/haptics';

const { colors, spacing } = designSystem;

export default function Stepper({ value, min, max, onChange, size = 'large' }) {
  const isLarge = size === 'large';
  const btnSize = isLarge ? 44 : 36;
  const iconSize = isLarge ? 22 : 18;
  const fontSize = isLarge ? 32 : 22;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
          value <= min && styles.btnDisabled]}
        onPress={() => { if (value > min) { buttonPressFeedback(); onChange(value - 1); } }}
        activeOpacity={0.7}
        disabled={value <= min}
      >
        <MaterialCommunityIcons name="minus" size={iconSize} color={value <= min ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>

      <AppText style={[styles.value, { fontSize, minWidth: isLarge ? 56 : 36 }]}>
        {value}
      </AppText>

      <TouchableOpacity
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
          value >= max && styles.btnDisabled]}
        onPress={() => { if (value < max) { buttonPressFeedback(); onChange(value + 1); } }}
        activeOpacity={0.7}
        disabled={value >= max}
      >
        <MaterialCommunityIcons name="plus" size={iconSize} color={value >= max ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
    borderWidth: 1.5,
    borderColor: colors.primary[200],
  },
  btnDisabled: {
    backgroundColor: colors.background.secondary,
    borderColor: colors.border.light,
  },
  value: {
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
});

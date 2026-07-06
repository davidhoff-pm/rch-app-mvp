import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Portal, Modal } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import designSystem from '../../theme/designSystem';
import { saveFeedback, buttonPressFeedback } from '../../utils/haptics';
import storage from '../../utils/storage';

const { colors, spacing, borderRadius } = designSystem;

function Stepper({ value, min, max, onChange, size = 'large' }) {
  const isLarge = size === 'large';
  const btnSize = isLarge ? 44 : 36;
  const iconSize = isLarge ? 22 : 18;
  const fontSize = isLarge ? 32 : 22;

  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity
        style={[stepperStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
          value <= min && stepperStyles.btnDisabled]}
        onPress={() => { if (value > min) { buttonPressFeedback(); onChange(value - 1); } }}
        activeOpacity={0.7}
        disabled={value <= min}
      >
        <MaterialCommunityIcons name="minus" size={iconSize} color={value <= min ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>

      <AppText style={[stepperStyles.value, { fontSize, minWidth: isLarge ? 56 : 36 }]}>
        {value}
      </AppText>

      <TouchableOpacity
        style={[stepperStyles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
          value >= max && stepperStyles.btnDisabled]}
        onPress={() => { if (value < max) { buttonPressFeedback(); onChange(value + 1); } }}
        activeOpacity={0.7}
        disabled={value >= max}
      >
        <MaterialCommunityIcons name="plus" size={iconSize} color={value >= max ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
}

export default function BatchStoolModal({ visible, onClose, onSave, showNoStoolOption = false }) {
  const [total, setTotal] = useState(1);
  const [withBlood, setWithBlood] = useState(0);
  const [nocturnal, setNocturnal] = useState(0);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTotal(1);
    setWithBlood(0);
    setNocturnal(0);
  };

  const handleTotalChange = (n) => {
    setTotal(n);
    if (withBlood > n) setWithBlood(n);
    if (nocturnal > n) setNocturnal(n);
  };

  const handleSave = () => {
    if (total === 0) return;

    const today = new Date();
    const noonTimestamp = new Date(
      today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0
    ).getTime();

    const newStools = [];
    for (let i = 0; i < total; i++) {
      newStools.push({
        id: `batch-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: noonTimestamp,
        bristolScale: 4,
        hasBlood: i < withBlood,
        nocturnal: i < nocturnal,
        batch: true,
      });
    }

    const existingJson = storage.getString('dailySells');
    const existing = existingJson ? JSON.parse(existingJson) : [];
    storage.set('dailySells', JSON.stringify([...existing, ...newStools]));

    saveFeedback();
    onSave?.();
    handleClose();
  };

  const handleNoStool = () => {
    const today = new Date();
    const dayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    storage.set('noStoolDay', dayKey);
    saveFeedback();
    onSave?.();
    handleClose();
  };

  const today = new Date();
  const dateLabel = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <AppText variant="h3">Selles du jour</AppText>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <AppText variant="bodySmall" color="secondary" style={styles.subtitle}>
          {dateLabel}
        </AppText>

        {/* Nombre de selles — grand stepper central */}
        <View style={styles.totalSection}>
          <View style={styles.totalLabelRow}>
            <MaterialCommunityIcons name="toilet" size={18} color={colors.primary[500]} />
            <AppText variant="body" weight="semiBold">Nombre de selles</AppText>
          </View>
          <Stepper value={total} min={0} max={20} onChange={handleTotalChange} size="large" />
        </View>

        {/* Sanglantes + Nocturnes — deux colonnes */}
        {total > 0 && (
          <View style={styles.subRow}>
            <View style={styles.subCol}>
              <View style={styles.subLabelRow}>
                <MaterialCommunityIcons name="water" size={16} color={colors.health.danger.main} />
                <AppText variant="bodySmall" weight="semiBold">Sanglantes</AppText>
              </View>
              <Stepper value={withBlood} min={0} max={total} onChange={setWithBlood} size="small" />
            </View>

            <View style={styles.subDivider} />

            <View style={styles.subCol}>
              <View style={styles.subLabelRow}>
                <MaterialCommunityIcons name="moon-waning-crescent" size={16} color={colors.accent[500]} />
                <AppText variant="bodySmall" weight="semiBold">Nocturnes</AppText>
              </View>
              <Stepper value={nocturnal} min={0} max={total} onChange={setNocturnal} size="small" />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton onPress={handleSave} disabled={total === 0}>
            {`Enregistrer ${total} selle${total > 1 ? 's' : ''}`}
          </PrimaryButton>

          {showNoStoolOption && (
            <TouchableOpacity style={styles.noStoolBtn} onPress={handleNoStool} activeOpacity={0.7}>
              <MaterialCommunityIcons name="close-circle-outline" size={18} color={colors.text.secondary} />
              <AppText variant="bodySmall" color="secondary" style={styles.noStoolLabel}>
                Aucune selle aujourd'hui
              </AppText>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    backgroundColor: colors.background.primary,
    margin: 16,
    borderRadius: borderRadius.lg,
    padding: spacing[5],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[5],
  },
  totalSection: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  totalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background.tertiary,
    borderRadius: borderRadius.base,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  subCol: {
    flex: 1,
    alignItems: 'center',
  },
  subDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border.light,
    marginHorizontal: spacing[3],
  },
  subLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  actions: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  noStoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  noStoolLabel: {
    fontWeight: '500',
  },
});

const stepperStyles = StyleSheet.create({
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

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

function CountSelector({ label, icon, iconColor, value, max, onChange }) {
  const options = [];
  for (let i = 0; i <= max; i++) options.push(i);

  return (
    <View style={selectorStyles.container}>
      <View style={selectorStyles.labelRow}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        <AppText variant="body" weight="semiBold" style={selectorStyles.label}>{label}</AppText>
      </View>
      <View style={selectorStyles.chips}>
        {options.map(n => (
          <TouchableOpacity
            key={n}
            style={[selectorStyles.chip, value === n && selectorStyles.chipActive]}
            onPress={() => { buttonPressFeedback(); onChange(n); }}
            activeOpacity={0.7}
          >
            <AppText
              variant="body"
              weight="semiBold"
              style={[selectorStyles.chipLabel, value === n && selectorStyles.chipLabelActive]}
            >
              {n}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
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

        <CountSelector
          label="Nombre de selles"
          icon="toilet"
          iconColor={colors.primary[500]}
          value={total}
          max={15}
          onChange={handleTotalChange}
        />

        {total > 0 && (
          <>
            <CountSelector
              label="Dont sanglantes"
              icon="water"
              iconColor={colors.health.danger.main}
              value={withBlood}
              max={total}
              onChange={setWithBlood}
            />

            <CountSelector
              label="Dont nocturnes"
              icon="moon-waning-crescent"
              iconColor={colors.accent[500]}
              value={nocturnal}
              max={total}
              onChange={setNocturnal}
            />
          </>
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
    maxHeight: '88%',
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
  actions: {
    marginTop: spacing[5],
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

const selectorStyles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  label: {
    color: colors.text.primary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1.5,
    borderColor: colors.border.light,
  },
  chipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  chipLabel: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  chipLabelActive: {
    color: '#fff',
  },
});

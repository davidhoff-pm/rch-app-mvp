import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Portal, Modal, TextInput, RadioButton } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import designSystem from '../../theme/designSystem';
import {
  saveMedication,
  createSchema,
  getTreatmentReminderTimes,
} from '../../utils/treatmentUtils';
import { buttonPressFeedback } from '../../utils/haptics';

const { colors, spacing, borderRadius } = designSystem;

function MiniStepper({ value, min, max, onChange }) {
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity
        style={[stepperStyles.btn, value <= min && stepperStyles.btnDisabled]}
        onPress={() => { if (value > min) { buttonPressFeedback(); onChange(value - 1); } }}
        activeOpacity={0.7}
        disabled={value <= min}
      >
        <MaterialCommunityIcons name="minus" size={16} color={value <= min ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>
      <AppText style={stepperStyles.value}>{value}</AppText>
      <TouchableOpacity
        style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
        onPress={() => { if (value < max) { buttonPressFeedback(); onChange(value + 1); } }}
        activeOpacity={0.7}
        disabled={value >= max}
      >
        <MaterialCommunityIcons name="plus" size={16} color={value >= max ? colors.text.disabled : colors.primary[500]} />
      </TouchableOpacity>
    </View>
  );
}

const CreateSchemaModal = ({ visible, onDismiss, onSuccess }) => {
  const [medicationName, setMedicationName] = useState('');
  const [frequencyType, setFrequencyType] = useState('daily');
  const [dosesMatin, setDosesMatin] = useState(1);
  const [dosesMidi, setDosesMidi] = useState(0);
  const [dosesSoir, setDosesSoir] = useState(0);
  const [intervalDays, setIntervalDays] = useState('7');

  const reminderTimes = getTreatmentReminderTimes();
  const totalDoses = dosesMatin + dosesMidi + dosesSoir;

  React.useEffect(() => {
    if (visible) {
      setMedicationName('');
      setFrequencyType('daily');
      setDosesMatin(1);
      setDosesMidi(0);
      setDosesSoir(0);
      setIntervalDays('7');
    }
  }, [visible]);

  const handleSave = () => {
    if (!medicationName.trim()) {
      alert('Veuillez entrer le nom du médicament');
      return;
    }

    if (frequencyType === 'daily') {
      if (totalDoses < 1) {
        alert('Indiquez au moins 1 prise par jour');
        return;
      }
    } else {
      const interval = parseInt(intervalDays);
      if (isNaN(interval) || interval < 1 || interval > 365) {
        alert('L\'intervalle doit être entre 1 et 365 jours');
        return;
      }
    }

    const medicationId = saveMedication(null, medicationName.trim());

    const frequency = frequencyType === 'daily'
      ? { type: 'daily', doses: { matin: dosesMatin, midi: dosesMidi, soir: dosesSoir }, dosesPerDay: totalDoses }
      : { type: 'interval', intervalDays: parseInt(intervalDays) };

    createSchema(medicationId, frequency);

    buttonPressFeedback();
    onSuccess?.();
    onDismiss();
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <AppCard style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <AppText variant="h2" style={styles.modalTitle}>
              Nouveau traitement
            </AppText>

            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Nom du médicament</AppText>
              <TextInput
                value={medicationName}
                onChangeText={setMedicationName}
                placeholder="Ex: Pentasa, Humira..."
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: borderRadius.md }}
              />
            </View>

            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Fréquence</AppText>

              <TouchableOpacity
                onPress={() => setFrequencyType('daily')}
                style={[styles.radioOption, frequencyType === 'daily' && styles.radioOptionSelected]}
              >
                <RadioButton
                  value="daily"
                  status={frequencyType === 'daily' ? 'checked' : 'unchecked'}
                  onPress={() => setFrequencyType('daily')}
                  color={colors.primary[500]}
                />
                <View style={styles.radioContent}>
                  <AppText variant="bodyLarge" style={styles.radioLabel}>Tous les jours</AppText>
                  <AppText variant="bodySmall" style={styles.radioHint}>
                    Prises matin, midi et/ou soir
                  </AppText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFrequencyType('interval')}
                style={[styles.radioOption, frequencyType === 'interval' && styles.radioOptionSelected]}
              >
                <RadioButton
                  value="interval"
                  status={frequencyType === 'interval' ? 'checked' : 'unchecked'}
                  onPress={() => setFrequencyType('interval')}
                  color={colors.primary[500]}
                />
                <View style={styles.radioContent}>
                  <AppText variant="bodyLarge" style={styles.radioLabel}>Tous les X jours</AppText>
                  <AppText variant="bodySmall" style={styles.radioHint}>
                    Une seule prise à intervalle régulier
                  </AppText>
                </View>
              </TouchableOpacity>
            </View>

            {frequencyType === 'daily' && (
              <View style={styles.section}>
                <AppText style={styles.fieldLabel}>Nombre de prises par moment</AppText>

                <View style={styles.momentRow}>
                  <View style={styles.momentLabel}>
                    <MaterialCommunityIcons name="weather-sunny" size={18} color={colors.accent[500]} />
                    <AppText variant="body" weight="semiBold">Matin</AppText>
                  </View>
                  <MiniStepper value={dosesMatin} min={0} max={10} onChange={setDosesMatin} />
                </View>

                <View style={styles.momentRow}>
                  <View style={styles.momentLabel}>
                    <MaterialCommunityIcons name="white-balance-sunny" size={18} color={colors.accent[500]} />
                    <AppText variant="body" weight="semiBold">Midi</AppText>
                  </View>
                  <MiniStepper value={dosesMidi} min={0} max={10} onChange={setDosesMidi} />
                </View>

                <View style={styles.momentRow}>
                  <View style={styles.momentLabel}>
                    <MaterialCommunityIcons name="weather-night" size={18} color={colors.accent[500]} />
                    <AppText variant="body" weight="semiBold">Soir</AppText>
                  </View>
                  <MiniStepper value={dosesSoir} min={0} max={10} onChange={setDosesSoir} />
                </View>

                <View style={styles.totalRow}>
                  <AppText variant="bodySmall" color="secondary">
                    Total : {totalDoses} prise{totalDoses > 1 ? 's' : ''} / jour
                  </AppText>
                </View>

                <View style={styles.reminderInfo}>
                  <MaterialCommunityIcons name="bell-outline" size={14} color={colors.text.tertiary} />
                  <AppText variant="labelSmall" style={styles.reminderText}>
                    Rappels : {reminderTimes.matin} · {reminderTimes.midi} · {reminderTimes.soir}
                  </AppText>
                </View>
                <AppText variant="labelSmall" style={styles.reminderHint}>
                  Modifiable dans les Paramètres
                </AppText>
              </View>
            )}

            {frequencyType === 'interval' && (
              <View style={styles.section}>
                <AppText style={styles.fieldLabel}>Intervalle en jours</AppText>
                <TextInput
                  value={intervalDays}
                  onChangeText={setIntervalDays}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={{ borderRadius: borderRadius.md }}
                  placeholder="Ex: 7, 14, 28..."
                />
                <AppText variant="labelSmall" style={styles.hint}>
                  Nombre de jours entre chaque prise
                </AppText>
              </View>
            )}

            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={handleSave}
                variant="primary"
                size="medium"
                style={styles.saveButton}
              >
                Créer le traitement
              </PrimaryButton>
              <PrimaryButton
                onPress={onDismiss}
                variant="neutral"
                size="medium"
                outlined
                style={styles.cancelButton}
              >
                Annuler
              </PrimaryButton>
            </View>
          </ScrollView>
        </AppCard>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    margin: spacing[4],
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...designSystem.shadows.xl,
    overflow: 'hidden',
    padding: spacing[5],
  },
  modalTitle: {
    color: colors.text.primary,
    marginBottom: spacing[5],
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 32,
  },
  section: {
    marginBottom: spacing[5],
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing[3],
  },
  input: {
    backgroundColor: colors.background.secondary,
  },
  hint: {
    color: colors.text.tertiary,
    marginTop: spacing[2],
    fontStyle: 'italic',
    fontSize: 11,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginBottom: spacing[3],
    backgroundColor: '#FFFFFF',
  },
  radioOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  radioContent: {
    flex: 1,
    marginLeft: spacing[2],
  },
  radioLabel: {
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  radioHint: {
    color: colors.text.secondary,
  },
  momentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  momentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  totalRow: {
    alignItems: 'flex-end',
    paddingTop: spacing[2],
    marginBottom: spacing[3],
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.background.secondary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.sm,
  },
  reminderText: {
    color: colors.text.tertiary,
  },
  reminderHint: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing[1],
    marginLeft: spacing[3],
    fontSize: 11,
  },
  modalActions: {
    flexDirection: 'column',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  saveButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
});

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    minWidth: 28,
  },
});

export default CreateSchemaModal;

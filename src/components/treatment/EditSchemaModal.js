import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Portal, Modal, TextInput, RadioButton, HelperText } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import designSystem from '../../theme/designSystem';
import {
  renameMedication,
  updateSchemaFrequency,
  updateHistoricalSchema,
  saveTherapeuticSchemas,
  getTherapeuticSchemas,
  calculateAdherence,
  getDoses,
  getTreatmentReminderTimes,
} from '../../utils/treatmentUtils';
import { isValidDate } from '../ui/DateTimeInput';
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

const EditSchemaModal = ({ visible, schema, medication, onDismiss, onSuccess }) => {
  const [medicationName, setMedicationName] = useState('');
  const [frequencyType, setFrequencyType] = useState('daily');
  const [dosesMatin, setDosesMatin] = useState(1);
  const [dosesMidi, setDosesMidi] = useState(0);
  const [dosesSoir, setDosesSoir] = useState(0);
  const [intervalDays, setIntervalDays] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const reminderTimes = getTreatmentReminderTimes();
  const totalDoses = dosesMatin + dosesMidi + dosesSoir;

  const [errors, setErrors] = useState({
    medicationName: '',
    startDate: '',
    endDate: '',
    intervalDays: ''
  });

  React.useEffect(() => {
    if (visible && schema && medication) {
      setMedicationName(medication.name);
      setFrequencyType(schema.frequency.type);

      if (schema.frequency.type === 'daily') {
        const doses = getDoses(schema.frequency);
        setDosesMatin(doses.matin);
        setDosesMidi(doses.midi);
        setDosesSoir(doses.soir);
      } else {
        setIntervalDays(schema.frequency.intervalDays.toString());
      }

      if (schema.startDate) {
        const [year, month, day] = schema.startDate.split('-');
        setStartDate(`${day}/${month}/${year}`);
      }
      if (schema.endDate) {
        const [year, month, day] = schema.endDate.split('-');
        setEndDate(`${day}/${month}/${year}`);
      } else {
        setEndDate('');
      }

      setErrors({
        medicationName: '',
        startDate: '',
        endDate: '',
        intervalDays: ''
      });
    }
  }, [visible, schema, medication]);

  const hasNameChanged = () => {
    return medicationName.trim() !== medication?.name;
  };

  const hasFrequencyChanged = () => {
    if (frequencyType !== schema?.frequency.type) return true;

    if (frequencyType === 'daily') {
      const oldDoses = getDoses(schema.frequency);
      return dosesMatin !== oldDoses.matin || dosesMidi !== oldDoses.midi || dosesSoir !== oldDoses.soir;
    } else {
      return parseInt(intervalDays) !== schema.frequency.intervalDays;
    }
  };

  const hasDateChanged = () => {
    // Convertir les dates DD/MM/YYYY en YYYY-MM-DD pour comparer
    const convertToISO = (ddmmyyyy) => {
      if (!ddmmyyyy || ddmmyyyy.length < 10) return null;
      const [day, month, year] = ddmmyyyy.split('/');
      return `${year}-${month}-${day}`;
    };

    const newStart = convertToISO(startDate);
    const newEnd = convertToISO(endDate);

    if (newStart && newStart !== schema?.startDate) return true;
    if (schema?.endDate && newEnd !== schema?.endDate) return true;
    if (!schema?.endDate && newEnd) return true;

    return false;
  };

  const handleSave = () => {
    // Réinitialiser les erreurs
    const newErrors = {
      medicationName: '',
      startDate: '',
      endDate: '',
      dosesPerDay: '',
      intervalDays: ''
    };

    let hasError = false;

    if (!medicationName.trim()) {
      newErrors.medicationName = 'Veuillez entrer le nom du médicament';
      hasError = true;
    }

    // Valider les dates
    if (!isValidDate(startDate)) {
      newErrors.startDate = 'Date invalide (format: JJ/MM/AAAA)';
      hasError = true;
    } else {
      // Vérifier que la date de début n'est pas dans le futur
      const [dayStart, monthStart, yearStart] = startDate.split('/');
      const startDateObj = new Date(parseInt(yearStart), parseInt(monthStart) - 1, parseInt(dayStart));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDateObj > today) {
        newErrors.startDate = 'La date de début ne peut pas être dans le futur';
        hasError = true;
      }
    }

    if (schema?.endDate && endDate) {
      if (!isValidDate(endDate)) {
        newErrors.endDate = 'Date invalide (format: JJ/MM/AAAA)';
        hasError = true;
      } else if (isValidDate(startDate)) {
        // Vérifier que la date de début < date de fin
        const [dayStart, monthStart, yearStart] = startDate.split('/');
        const startDateObj = new Date(parseInt(yearStart), parseInt(monthStart) - 1, parseInt(dayStart));
        const [dayEnd, monthEnd, yearEnd] = endDate.split('/');
        const endDateObj = new Date(parseInt(yearEnd), parseInt(monthEnd) - 1, parseInt(dayEnd));

        if (startDateObj > endDateObj) {
          newErrors.endDate = 'La date de fin doit être après la date de début';
          hasError = true;
        }
      }
    }

    setErrors(newErrors);

    if (hasError) {
      return;
    }

    // Vérifier si la fréquence a changé
    const freqChanged = hasFrequencyChanged();
    const nameChanged = hasNameChanged();
    const dateChanged = hasDateChanged();

    if (!freqChanged && !nameChanged && !dateChanged) {
      onDismiss();
      return;
    }

    // Si changement de nom, demander confirmation (car rétroactif)
    if (nameChanged) {
      const confirmMessage = Platform.OS === 'web'
        ? window.confirm('Renommer le médicament mettra à jour son nom partout dans l\'application. Continuer ?')
        : true; // Sur mobile, utiliser Alert.alert

      if (Platform.OS !== 'web') {
        Alert.alert(
          'Confirmation',
          'Renommer le médicament mettra à jour son nom partout dans l\'application. Continuer ?',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Continuer',
              onPress: () => {
                renameMedication(medication.id, medicationName.trim());
                handleFrequencyUpdate();
              }
            }
          ]
        );
        return;
      } else if (!confirmMessage) {
        return;
      } else {
        renameMedication(medication.id, medicationName.trim());
      }
    }

    handleFrequencyUpdate();
  };

  const handleFrequencyUpdate = () => {
    const freqChanged = hasFrequencyChanged();
    const dateChanged = hasDateChanged();

    if (freqChanged) {
      const newErrors = { ...errors };
      let hasError = false;

      if (frequencyType === 'daily') {
        if (totalDoses < 1) {
          alert('Indiquez au moins 1 prise par jour');
          hasError = true;
        }
      } else {
        const interval = parseInt(intervalDays);
        if (isNaN(interval) || interval < 1 || interval > 365) {
          newErrors.intervalDays = 'L\'intervalle doit être entre 1 et 365 jours';
          hasError = true;
        }
      }

      if (hasError) {
        setErrors(newErrors);
        return;
      }

      const newFrequency = frequencyType === 'daily'
        ? { type: 'daily', doses: { matin: dosesMatin, midi: dosesMidi, soir: dosesSoir }, dosesPerDay: totalDoses }
        : { type: 'interval', intervalDays: parseInt(intervalDays) };

      // Modifier le schéma (clôt l'ancien, crée un nouveau)
      updateSchemaFrequency(schema.id, newFrequency);
    } else if (dateChanged) {
      // Si seules les dates ont changé, mettre à jour le schéma directement
      const convertToISO = (ddmmyyyy) => {
        if (!ddmmyyyy || ddmmyyyy.length < 10) return null;
        const [day, month, year] = ddmmyyyy.split('/');
        return `${year}-${month}-${day}`;
      };

      const updates = {};
      const newStart = convertToISO(startDate);
      const newEnd = convertToISO(endDate);

      if (newStart && newStart !== schema.startDate) {
        updates.startDate = newStart;
      }
      if (schema.endDate && newEnd !== schema.endDate) {
        updates.endDate = newEnd;
      }

      if (Object.keys(updates).length > 0) {
        updateHistoricalSchema(schema.id, updates);
      }
    }

    buttonPressFeedback();
    onSuccess?.();
    onDismiss();
  };

  if (!schema || !medication) return null;

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <AppCard style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <AppText variant="h2" style={styles.modalTitle}>
              Modifier le traitement
            </AppText>

            {/* Nom du médicament */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Nom du médicament</AppText>
              <TextInput
                value={medicationName}
                onChangeText={setMedicationName}
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                error={!!errors.medicationName}
              />
              {errors.medicationName ? (
                <HelperText type="error" visible={true}>
                  {errors.medicationName}
                </HelperText>
              ) : hasNameChanged() ? (
                <AppText variant="labelSmall" style={styles.warningText}>
                  ⚠️ Le nom sera mis à jour dans tout l'historique
                </AppText>
              ) : null}
            </View>

            {/* Date de début */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Date de début</AppText>
              <TextInput
                value={startDate}
                onChangeText={(text) => {
                  // Auto-format with /
                  const numbers = text.replace(/\D/g, '');
                  const limited = numbers.slice(0, 8);
                  let formatted = '';
                  if (limited.length <= 2) {
                    formatted = limited;
                  } else if (limited.length <= 4) {
                    formatted = `${limited.slice(0, 2)}/${limited.slice(2)}`;
                  } else {
                    formatted = `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
                  }
                  setStartDate(formatted);
                }}
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                placeholder="JJ/MM/AAAA"
                keyboardType="numeric"
                error={!!errors.startDate}
              />
              <HelperText type="error" visible={!!errors.startDate}>
                {errors.startDate}
              </HelperText>
            </View>

            {/* Date de fin (si schéma historique) */}
            {schema?.endDate && (
              <View style={styles.section}>
                <AppText style={styles.fieldLabel}>Date de fin</AppText>
                <TextInput
                  value={endDate}
                  onChangeText={(text) => {
                    // Auto-format with /
                    const numbers = text.replace(/\D/g, '');
                    const limited = numbers.slice(0, 8);
                    let formatted = '';
                    if (limited.length <= 2) {
                      formatted = limited;
                    } else if (limited.length <= 4) {
                      formatted = `${limited.slice(0, 2)}/${limited.slice(2)}`;
                    } else {
                      formatted = `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
                    }
                    setEndDate(formatted);
                  }}
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                  placeholder="JJ/MM/AAAA"
                  keyboardType="numeric"
                  error={!!errors.endDate}
                />
                <HelperText type="error" visible={!!errors.endDate}>
                  {errors.endDate}
                </HelperText>
              </View>
            )}

            {/* Type de fréquence */}
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
                  color={designSystem.colors.primary[500]}
                />
                <View style={styles.radioContent}>
                  <AppText variant="bodyLarge" style={styles.radioLabel}>Tous les jours</AppText>
                  <AppText variant="bodySmall" style={styles.radioHint}>
                    Plusieurs prises par jour
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
                  color={designSystem.colors.primary[500]}
                />
                <View style={styles.radioContent}>
                  <AppText variant="bodyLarge" style={styles.radioLabel}>Tous les X jours</AppText>
                  <AppText variant="bodySmall" style={styles.radioHint}>
                    Une seule prise à intervalle régulier
                  </AppText>
                </View>
              </TouchableOpacity>

              {hasFrequencyChanged() && (
                <AppText variant="labelSmall" style={styles.warningText}>
                  ⚠️ Un nouveau schéma sera créé, l'ancien sera clôturé
                </AppText>
              )}
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

            {/* Intervalle (si interval) */}
            {frequencyType === 'interval' && (
              <View style={styles.section}>
                <AppText style={styles.fieldLabel}>Intervalle en jours</AppText>
                <TextInput
                  value={intervalDays}
                  onChangeText={setIntervalDays}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                  error={!!errors.intervalDays}
                />
                <HelperText type="error" visible={!!errors.intervalDays}>
                  {errors.intervalDays}
                </HelperText>
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={handleSave}
                variant="primary"
                size="medium"
                style={styles.saveButton}
              >
                Enregistrer
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
  warningText: {
    color: '#AD7130',
    marginTop: spacing[2],
    fontStyle: 'italic',
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

export default EditSchemaModal;

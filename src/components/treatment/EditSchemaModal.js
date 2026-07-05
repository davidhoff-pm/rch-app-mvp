import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Portal, Modal, TextInput, RadioButton, HelperText } from 'react-native-paper';
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
  calculateAdherence
} from '../../utils/treatmentUtils';
import { isValidDate } from '../ui/DateTimeInput';
import { buttonPressFeedback } from '../../utils/haptics';

/**
 * Modal pour modifier un schéma thérapeutique (actif ou historique)
 * Permet de modifier :
 * - Le nom du médicament (mise à jour partout)
 * - La fréquence (crée un nouveau schéma, clôture l'ancien)
 * - Les dates de début et de fin (pour schémas historiques)
 */

const EditSchemaModal = ({ visible, schema, medication, onDismiss, onSuccess }) => {
  const [medicationName, setMedicationName] = useState('');
  const [frequencyType, setFrequencyType] = useState('daily');
  const [dosesPerDay, setDosesPerDay] = useState('1');
  const [intervalDays, setIntervalDays] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // États d'erreur
  const [errors, setErrors] = useState({
    medicationName: '',
    startDate: '',
    endDate: '',
    dosesPerDay: '',
    intervalDays: ''
  });

  React.useEffect(() => {
    if (visible && schema && medication) {
      setMedicationName(medication.name);
      setFrequencyType(schema.frequency.type);

      if (schema.frequency.type === 'daily') {
        setDosesPerDay(schema.frequency.dosesPerDay.toString());
      } else {
        setIntervalDays(schema.frequency.intervalDays.toString());
      }

      // Initialiser les dates (convertir YYYY-MM-DD en DD/MM/YYYY)
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

      // Réinitialiser les erreurs
      setErrors({
        medicationName: '',
        startDate: '',
        endDate: '',
        dosesPerDay: '',
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
      return parseInt(dosesPerDay) !== schema.frequency.dosesPerDay;
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
      // Validation
      const newErrors = { ...errors };
      let hasError = false;

      if (frequencyType === 'daily') {
        const doses = parseInt(dosesPerDay);
        if (isNaN(doses) || doses < 1 || doses > 10) {
          newErrors.dosesPerDay = 'Le nombre de prises par jour doit être entre 1 et 10';
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

      // Créer la nouvelle fréquence
      const newFrequency = frequencyType === 'daily'
        ? { type: 'daily', dosesPerDay: parseInt(dosesPerDay) }
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

            {/* Nombre de prises (si daily) */}
            {frequencyType === 'daily' && (
              <View style={styles.section}>
                <AppText style={styles.fieldLabel}>Nombre de prises par jour</AppText>
                <TextInput
                  value={dosesPerDay}
                  onChangeText={setDosesPerDay}
                  keyboardType="number-pad"
                  mode="outlined"
                  style={styles.input}
                  outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                  error={!!errors.dosesPerDay}
                />
                <HelperText type="error" visible={!!errors.dosesPerDay}>
                  {errors.dosesPerDay}
                </HelperText>
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
    margin: designSystem.spacing[4],
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: designSystem.colors.background.tertiary,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    ...designSystem.shadows.xl,
    overflow: 'hidden',
    padding: designSystem.spacing[5],
  },
  modalTitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[5],
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 32,
  },
  section: {
    marginBottom: designSystem.spacing[5],
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[3],
  },
  input: {
    backgroundColor: designSystem.colors.background.secondary,
  },
  warningText: {
    color: '#AD7130',
    marginTop: designSystem.spacing[2],
    fontStyle: 'italic',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: designSystem.spacing[3],
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 2,
    borderColor: designSystem.colors.border.light,
    marginBottom: designSystem.spacing[3],
    backgroundColor: '#FFFFFF',
  },
  radioOptionSelected: {
    borderColor: designSystem.colors.primary[500],
    backgroundColor: designSystem.colors.primary[50],
  },
  radioContent: {
    flex: 1,
    marginLeft: designSystem.spacing[2],
  },
  radioLabel: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
    marginBottom: designSystem.spacing[1],
  },
  radioHint: {
    color: designSystem.colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[4],
  },
  saveButton: {
    width: '100%',
  },
  cancelButton: {
    width: '100%',
  },
});

export default EditSchemaModal;

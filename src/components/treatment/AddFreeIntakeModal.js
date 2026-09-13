import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Portal, Modal, TextInput } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import DateTimeInput, { isValidDate } from '../ui/DateTimeInput';
import designSystem from '../../theme/designSystem';
import {
  getAllMedicationNames,
  findMedicationByName,
  saveMedication,
  recordIntake
} from '../../utils/treatmentUtils';
import { buttonPressFeedback } from '../../utils/haptics';

/**
 * Modal pour ajouter une prise libre (hors schéma)
 */

const AddFreeIntakeModal = ({ visible, onDismiss, onSuccess }) => {
  const [medicationName, setMedicationName] = useState('');
  const [doses, setDoses] = useState('1');
  const [dateInput, setDateInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  // Initialiser la date à aujourd'hui lors de l'ouverture
  React.useEffect(() => {
    if (visible) {
      const now = new Date();
      setDateInput(now.toLocaleDateString('fr-FR'));
      setMedicationName('');
      setDoses('1');
      setSuggestions([]);
    }
  }, [visible]);

  const handleMedicationChange = (text) => {
    setMedicationName(text);

    // Autocomplete
    if (text.length > 0) {
      const allNames = getAllMedicationNames();
      const filtered = allNames.filter(name =>
        name.toLowerCase().includes(text.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const handleSave = () => {
    // Validation
    if (!medicationName.trim()) {
      alert('Veuillez entrer le nom du médicament');
      return;
    }

    if (!isValidDate(dateInput)) {
      alert('Date invalide');
      return;
    }

    const dosesNum = parseInt(doses);
    if (isNaN(dosesNum) || dosesNum < 1) {
      alert('Le nombre de doses doit être au moins 1');
      return;
    }

    // Trouver ou créer le médicament
    let medication = findMedicationByName(medicationName.trim());
    let medicationId;

    if (medication) {
      medicationId = medication.id;
    } else {
      // Créer un nouveau médicament
      medicationId = saveMedication(null, medicationName.trim());
    }

    // Parser la date
    const [day, month, year] = dateInput.split('/');
    const dateTaken = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Enregistrer la prise
    recordIntake(medicationId, dosesNum, dateTaken);

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
              Ajouter une prise
            </AppText>

            {/* Médicament */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Médicament</AppText>
              <TextInput
                value={medicationName}
                onChangeText={handleMedicationChange}
                placeholder="Ex: Pentasa, Humira..."
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
              />

              {/* Suggestions autocomplete */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((name, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setMedicationName(name);
                        setSuggestions([]);
                      }}
                      style={styles.suggestionItem}
                    >
                      <AppText variant="body">{name}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Doses */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Nombre de doses</AppText>
              <TextInput
                value={doses}
                onChangeText={setDoses}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.input}
                outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
              />
            </View>

            {/* Date */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Date de prise</AppText>
              <DateTimeInput
                dateValue={dateInput}
                onDateChange={setDateInput}
                dateLabel="Date (DD/MM/YYYY)"
              />
              <AppText variant="labelSmall" style={styles.hint}>
                Format: DD/MM/YYYY
              </AppText>
            </View>

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
  hint: {
    color: designSystem.colors.text.tertiary,
    marginTop: designSystem.spacing[2],
    fontStyle: 'italic',
    fontSize: 11,
  },
  suggestionsContainer: {
    marginTop: designSystem.spacing[2],
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    borderRadius: designSystem.borderRadius.md,
    backgroundColor: designSystem.colors.background.tertiary,
  },
  suggestionItem: {
    padding: designSystem.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: designSystem.colors.border.light,
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

export default AddFreeIntakeModal;

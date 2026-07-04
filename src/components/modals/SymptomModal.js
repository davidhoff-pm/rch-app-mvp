import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Portal, Modal, TextInput, HelperText } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import DateTimeInput, { isValidDate } from '../ui/DateTimeInput';
import designSystem from '../../theme/designSystem';
import { getAllSymptomSuggestions, INTENSITY_LABELS } from '../../utils/symptomsUtils';

/**
 * Modale pour ajouter/éditer un symptôme
 */
const SymptomModal = ({ visible, onDismiss, onSave, initialData = null }) => {
  const [symptomType, setSymptomType] = useState('');
  const [intensity, setIntensity] = useState(2);
  const [note, setNote] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState({ symptomType: '', date: '' });

  // Initialiser avec les données existantes (mode édition)
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setSymptomType(initialData.type || initialData.customType || '');
        setIntensity(initialData.intensity || 2);
        setNote(initialData.note || '');
        // Convertir date YYYY-MM-DD en DD/MM/YYYY
        if (initialData.date) {
          const [y, m, d] = initialData.date.split('-');
          setDateInput(`${d}/${m}/${y}`);
        }
      } else {
        // Mode création : valeurs par défaut
        const today = new Date();
        setDateInput(today.toLocaleDateString('fr-FR'));
        setSymptomType('');
        setIntensity(2);
        setNote('');
      }
      setErrors({ symptomType: '', date: '' });
      setShowSuggestions(false);
    }
  }, [visible, initialData]);

  const handleSymptomTypeChange = (text) => {
    setSymptomType(text);
    setShowSuggestions(text.length > 0);
  };

  const selectPredefined = (symptom) => {
    setSymptomType(symptom);
    setShowSuggestions(false);
  };

  // Utiliser les suggestions incluant les symptômes personnalisés déjà utilisés
  const allSuggestions = getAllSymptomSuggestions();
  const filteredSuggestions = allSuggestions.filter(s =>
    s.toLowerCase().includes(symptomType.toLowerCase())
  );

  const handleSave = () => {
    const newErrors = { symptomType: '', date: '' };
    let hasError = false;

    // Validation du type de symptôme
    if (!symptomType.trim()) {
      newErrors.symptomType = 'Veuillez saisir un symptôme';
      hasError = true;
    }

    // Validation de la date
    if (!isValidDate(dateInput)) {
      newErrors.date = 'Date invalide (format: JJ/MM/AAAA)';
      hasError = true;
    } else {
      const [day, month, year] = dateInput.split('/');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      if (date > today) {
        newErrors.date = 'La date ne peut pas être dans le futur';
        hasError = true;
      }
    }

    setErrors(newErrors);

    if (hasError) return;

    // Convertir la date en objet Date
    const [day, month, year] = dateInput.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    onSave({
      type: symptomType.trim(),
      intensity,
      note: note.trim(),
      date,
    });
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <AppCard style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#C0392B" />
              <AppText variant="h2" style={styles.modalTitle}>
                {initialData ? 'Modifier le symptôme' : 'Nouveau symptôme'}
              </AppText>
            </View>

            {/* Type de symptôme */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Symptôme *</AppText>
              <TextInput
                mode="outlined"
                placeholder="Ex: Fatigue, douleurs..."
                value={symptomType}
                onChangeText={handleSymptomTypeChange}
                error={!!errors.symptomType}
                style={styles.input}
                outlineStyle={{ borderRadius: 12 }}
              />
              <HelperText type="error" visible={!!errors.symptomType}>
                {errors.symptomType}
              </HelperText>

            </View>

            {/* Suggestions - Position absolue pour ne pas modifier la taille de la modale */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <View style={styles.suggestionsOverlay}>
                <View style={styles.suggestionsContainer}>
                  {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectPredefined(suggestion)}
                    >
                      <AppText variant="bodyMedium" style={styles.suggestionText}>
                        {suggestion}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Intensité */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Intensité</AppText>
              <View style={styles.intensityContainer}>
                <AppText variant="h3" style={[styles.intensityValue, getIntensityColor(intensity)]}>
                  {intensity}
                </AppText>
                <AppText variant="labelMedium" style={styles.intensityLabel}>
                  {INTENSITY_LABELS[intensity]}
                </AppText>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={5}
                step={1}
                value={intensity}
                onValueChange={setIntensity}
                style={styles.slider}
                minimumTrackTintColor={getIntensityColorHex(intensity)}
                maximumTrackTintColor="#E6E0DA"
                thumbTintColor={getIntensityColorHex(intensity)}
              />
              <View style={styles.intensityLabels}>
                <AppText variant="labelSmall" style={styles.intensityLabelText}>0 - Aucune</AppText>
                <AppText variant="labelSmall" style={styles.intensityLabelText}>5 - Insupportable</AppText>
              </View>
            </View>

            {/* Date */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Date</AppText>
              <DateTimeInput
                dateValue={dateInput}
                onDateChange={setDateInput}
                dateLabel="Date (JJ/MM/AAAA)"
              />
              <HelperText type="error" visible={!!errors.date}>
                {errors.date}
              </HelperText>
            </View>

            {/* Note optionnelle */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Note (optionnel)</AppText>
              <TextInput
                mode="outlined"
                placeholder="Ajoutez des détails..."
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                style={styles.textArea}
                outlineStyle={{ borderRadius: 12 }}
                maxLength={200}
              />
              <AppText variant="labelSmall" style={styles.charCount}>
                {note.length}/200
              </AppText>
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={handleSave}
                style={styles.saveButton}
                variant="primary"
                size="medium"
              >
                {initialData ? 'Enregistrer' : 'Ajouter'}
              </PrimaryButton>
              <PrimaryButton
                onPress={onDismiss}
                style={styles.cancelButton}
                variant="neutral"
                size="medium"
                outlined
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

// Helpers pour les couleurs d'intensité
const getIntensityColor = (intensity) => {
  if (intensity === 0) return { color: '#A3A3A3' };
  if (intensity <= 2) return { color: '#397852' };
  if (intensity <= 3) return { color: '#AD7130' };
  return { color: '#C0392B' };
};

const getIntensityColorHex = (intensity) => {
  if (intensity === 0) return '#A3A3A3';
  if (intensity <= 2) return '#397852';
  if (intensity <= 3) return '#AD7130';
  return '#C0392B';
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
  },
  modalScroll: {
    padding: designSystem.spacing[5],
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: designSystem.spacing[5],
  },
  modalTitle: {
    color: designSystem.colors.text.primary,
    marginTop: designSystem.spacing[2],
    textAlign: 'center',
  },
  section: {
    marginBottom: designSystem.spacing[4],
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[2],
  },
  input: {
    backgroundColor: designSystem.colors.background.secondary,
  },
  textArea: {
    backgroundColor: designSystem.colors.background.secondary,
    minHeight: 80,
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: 180, // Position juste en dessous du champ de symptôme
    left: designSystem.spacing[5],
    right: designSystem.spacing[5],
    zIndex: 1000,
    ...designSystem.shadows.lg,
  },
  suggestionsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E0DA',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    maxHeight: 200,
  },
  suggestionItem: {
    padding: designSystem.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#E6E0DA',
  },
  suggestionText: {
    color: designSystem.colors.text.primary,
  },
  intensityContainer: {
    alignItems: 'center',
    marginVertical: designSystem.spacing[3],
  },
  intensityValue: {
    fontWeight: '700',
    fontSize: 48,
  },
  intensityLabel: {
    color: designSystem.colors.text.secondary,
    marginTop: designSystem.spacing[1],
    fontWeight: '600',
  },
  slider: {
    height: 40,
    marginVertical: designSystem.spacing[2],
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityLabelText: {
    color: designSystem.colors.text.tertiary,
  },
  charCount: {
    color: designSystem.colors.text.tertiary,
    textAlign: 'right',
    marginTop: designSystem.spacing[1],
  },
  modalActions: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[4],
  },
  cancelButton: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
});

export default SymptomModal;

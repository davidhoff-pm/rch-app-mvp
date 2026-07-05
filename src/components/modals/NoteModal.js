import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { Portal, Modal, TextInput, Switch, HelperText, Menu, Chip, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import DateTimeInput, { isValidDate } from '../ui/DateTimeInput';
import designSystem from '../../theme/designSystem';
import { NOTE_CATEGORIES, validateNoteContent, getCategoryLabel } from '../../utils/notesUtils';
import { getAllTags, getTagLabel, getTagType, TAG_DEFINITIONS } from '../../utils/tagDefinitions';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

/**
 * Modale pour ajouter/éditer une note libre
 */
const NoteModal = ({ visible, onDismiss, onSave, initialData = null }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(null);
  const [sharedWithDoctor, setSharedWithDoctor] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [errors, setErrors] = useState({ content: '', date: '' });
  const [menuVisible, setMenuVisible] = useState(false);

  // États pour les tags IA
  const [tags, setTags] = useState([]);
  const [tagMenuVisible, setTagMenuVisible] = useState(false);
  const [aiProcessed, setAiProcessed] = useState(false);
  const [aiConfidence, setAiConfidence] = useState(null);

  // Hook de reconnaissance vocale
  const {
    isSupported: isSpeechSupported,
    isRecording,
    transcript,
    interimTranscript,
    error: speechError,
    toggleRecording,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'fr-FR',
    continuous: false,
    interimResults: true,
    maxAlternatives: 1,
  });

  // Animation pour le bouton microphone
  const [micScale] = useState(new Animated.Value(1));
  const [micOpacity] = useState(new Animated.Value(1));

  // Initialiser avec les données existantes (mode édition)
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setContent(initialData.content || '');
        setCategory(initialData.category || null);
        setSharedWithDoctor(initialData.sharedWithDoctor || false);
        setTags(initialData.tags || []);
        setAiProcessed(initialData.aiProcessed || false);
        setAiConfidence(initialData.aiConfidence || null);
        // Convertir date YYYY-MM-DD en DD/MM/YYYY
        if (initialData.date) {
          const [y, m, d] = initialData.date.split('-');
          setDateInput(`${d}/${m}/${y}`);
        }
      } else {
        // Mode création : valeurs par défaut
        const today = new Date();
        setDateInput(today.toLocaleDateString('fr-FR'));
        setContent('');
        setCategory(null);
        setSharedWithDoctor(false);
        setTags([]);
        setAiProcessed(false);
        setAiConfidence(null);
      }
      setErrors({ content: '', date: '' });
      resetTranscript();
    }
  }, [visible, initialData, resetTranscript]);

  // Animation du bouton microphone pendant l'enregistrement
  useEffect(() => {
    if (isRecording) {
      // Animation pulsante
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(micScale, {
              toValue: 1.2,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(micOpacity, {
              toValue: 0.7,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(micScale, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(micOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      // Réinitialiser l'animation
      micScale.setValue(1);
      micOpacity.setValue(1);
    }
  }, [isRecording, micScale, micOpacity]);

  // Ajouter la transcription au contenu existant
  useEffect(() => {
    if (transcript) {
      // Ajouter un espace si le contenu existant ne se termine pas par un espace
      const separator = content && !content.endsWith(' ') && !content.endsWith('\n') ? ' ' : '';
      setContent(prevContent => prevContent + separator + transcript);
      resetTranscript();
    }
  }, [transcript, content, resetTranscript]);

  const handleSave = () => {
    const newErrors = { content: '', date: '' };
    let hasError = false;

    // Validation du contenu
    const validation = validateNoteContent(content, 500);
    if (!validation.valid) {
      newErrors.content = validation.error;
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
      content: content.trim(),
      category,
      sharedWithDoctor,
      date,
      tags,
    });
  };

  const handleAddTag = (tagToAdd) => {
    if (tagToAdd && !tags.includes(tagToAdd) && tags.length < 8) {
      setTags([...tags, tagToAdd]);
      setTagMenuVisible(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getTagColors = (tag) => {
    const tagType = getTagType(tag);
    if (tagType === 'aggravant') {
      return {
        backgroundColor: '#FBE3DF', // rouge clair
        borderColor: '#EF4444',     // rouge
        textColor: '#991B1B',       // rouge foncé
      };
    } else if (tagType === 'protecteur') {
      return {
        backgroundColor: '#DBEAFE', // bleu clair
        borderColor: '#3B82F6',     // bleu
        textColor: '#1E3A8A',       // bleu foncé
      };
    }
    // Fallback (ne devrait pas arriver avec la nouvelle liste)
    return {
      backgroundColor: '#F3F4F6',
      borderColor: '#9CA3AF',
      textColor: '#374151',
    };
  };

  const getAvailableTagsForMenu = () => {
    const allTags = getAllTags();
    return allTags.filter(tag => !tags.includes(tag));
  };

  const getCategoryDisplayText = () => {
    if (!category) return 'Aucune';
    return getCategoryLabel(category);
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <AppCard style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={32} color="#AD7130" />
              <AppText variant="h2" style={styles.modalTitle}>
                {initialData ? 'Modifier la note' : 'Nouvelle note'}
              </AppText>
            </View>

            {/* Contenu */}
            <View style={styles.section}>
              <View style={styles.contentHeader}>
                <AppText style={styles.fieldLabel}>Contenu *</AppText>
                {isSpeechSupported && (
                  <TouchableOpacity
                    onPress={toggleRecording}
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={{
                        transform: [{ scale: micScale }],
                        opacity: micOpacity,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={isRecording ? 'microphone' : 'microphone-outline'}
                        size={24}
                        color={isRecording ? '#FFFFFF' : designSystem.colors.primary[500]}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Avertissement Vercel */}
              {isSpeechSupported && typeof window !== 'undefined' && window.location.hostname.includes('.vercel.app') && (
                <View style={styles.vercelWarning}>
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={16}
                    color="#0369A1"
                  />
                  <AppText variant="labelSmall" style={styles.vercelWarningText}>
                    La dictée vocale peut ne pas fonctionner sur Vercel preview. Utilisez localhost pour la tester.
                  </AppText>
                </View>
              )}

              <TextInput
                mode="outlined"
                placeholder="Écrivez votre note ou utilisez la dictée vocale..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                error={!!errors.content || !!speechError}
                style={styles.textArea}
                outlineStyle={{ borderRadius: 12 }}
                maxLength={500}
              />

              {/* Afficher la transcription intermédiaire */}
              {isRecording && interimTranscript && (
                <View style={styles.interimContainer}>
                  <MaterialCommunityIcons
                    name="record-circle"
                    size={16}
                    color="#EF4444"
                  />
                  <AppText variant="bodySmall" style={styles.interimText}>
                    {interimTranscript}
                  </AppText>
                </View>
              )}

              <View style={styles.helperRow}>
                <View style={{ flex: 1 }}>
                  <HelperText type="error" visible={!!errors.content}>
                    {errors.content}
                  </HelperText>
                  <HelperText type="error" visible={!!speechError && !errors.content}>
                    {speechError}
                  </HelperText>
                  {isRecording && (
                    <HelperText type="info">
                      Parlez maintenant... (arrêt automatique après silence)
                    </HelperText>
                  )}
                </View>
                <AppText variant="labelSmall" style={styles.charCount}>
                  {content.length}/500
                </AppText>
              </View>
            </View>

            {/* Catégorie */}
            <View style={styles.section}>
              <AppText style={styles.fieldLabel}>Catégorie (optionnel)</AppText>
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setMenuVisible(true)}
                  >
                    <AppText variant="bodyMedium" style={styles.dropdownText}>
                      {getCategoryDisplayText()}
                    </AppText>
                    <MaterialCommunityIcons
                      name={menuVisible ? "chevron-up" : "chevron-down"}
                      size={24}
                      color={designSystem.colors.text.secondary}
                    />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setCategory(null);
                    setMenuVisible(false);
                  }}
                  title="Aucune"
                />
                {NOTE_CATEGORIES.map((cat) => (
                  <Menu.Item
                    key={cat.value}
                    onPress={() => {
                      setCategory(cat.value);
                      setMenuVisible(false);
                    }}
                    title={cat.label}
                  />
                ))}
              </Menu>
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

            {/* Tags IA */}
            {initialData && (
              <View style={styles.section}>
                <View style={styles.tagsHeader}>
                  <AppText style={styles.fieldLabel}>Tags IA</AppText>
                  {!aiProcessed && (
                    <View style={styles.processingBadge}>
                      <ActivityIndicator size={12} color={designSystem.colors.primary[500]} />
                      <AppText variant="labelSmall" style={styles.processingText}>
                        Analyse en cours...
                      </AppText>
                    </View>
                  )}
                  {aiProcessed && aiConfidence && (
                    <AppText variant="labelSmall" style={styles.confidenceText}>
                      Confiance: {aiConfidence}
                    </AppText>
                  )}
                </View>

                {/* Liste des tags */}
                <View style={styles.tagsContainer}>
                  {tags.length === 0 && aiProcessed && (
                    <AppText variant="bodySmall" style={styles.noTagsText}>
                      Aucun tag détecté
                    </AppText>
                  )}
                  {tags.map((tag, index) => {
                    const colors = getTagColors(tag);
                    return (
                      <Chip
                        key={index}
                        onClose={() => handleRemoveTag(tag)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: colors.backgroundColor,
                            borderColor: colors.borderColor,
                            borderWidth: 1,
                          }
                        ]}
                        textStyle={[styles.chipText, { color: colors.textColor }]}
                      >
                        {getTagLabel(tag)}
                      </Chip>
                    );
                  })}
                </View>

                {/* Ajouter un tag manuellement */}
                {tags.length < 8 && (
                  <View style={styles.addTagRow}>
                    <Menu
                      visible={tagMenuVisible}
                      onDismiss={() => setTagMenuVisible(false)}
                      anchor={
                        <TouchableOpacity
                          style={styles.addTagButton}
                          onPress={() => setTagMenuVisible(true)}
                        >
                          <MaterialCommunityIcons
                            name="plus-circle"
                            size={24}
                            color={designSystem.colors.primary[500]}
                          />
                          <AppText variant="bodyMedium" style={styles.addTagButtonText}>
                            Ajouter un tag
                          </AppText>
                        </TouchableOpacity>
                      }
                      contentStyle={styles.tagMenuContent}
                    >
                      <ScrollView style={styles.tagMenuScroll}>
                        {/* Facteurs aggravants */}
                        <Menu.Item
                          title="FACTEURS AGGRAVANTS - Alimentation"
                          disabled
                          titleStyle={styles.tagMenuHeader}
                        />
                        {TAG_DEFINITIONS.aggravants.alimentation
                          .filter(tag => !tags.includes(tag))
                          .map(tag => (
                            <Menu.Item
                              key={tag}
                              onPress={() => handleAddTag(tag)}
                              title={getTagLabel(tag)}
                              leadingIcon="alert-circle"
                              titleStyle={{ color: '#991B1B' }}
                            />
                          ))}

                        <Menu.Item
                          title="FACTEURS AGGRAVANTS - Comportement"
                          disabled
                          titleStyle={styles.tagMenuHeader}
                        />
                        {TAG_DEFINITIONS.aggravants.comportement
                          .filter(tag => !tags.includes(tag))
                          .map(tag => (
                            <Menu.Item
                              key={tag}
                              onPress={() => handleAddTag(tag)}
                              title={getTagLabel(tag)}
                              leadingIcon="alert-circle"
                              titleStyle={{ color: '#991B1B' }}
                            />
                          ))}

                        {/* Facteurs protecteurs */}
                        <Menu.Item
                          title="FACTEURS PROTECTEURS - Alimentation"
                          disabled
                          titleStyle={styles.tagMenuHeader}
                        />
                        {TAG_DEFINITIONS.protecteurs.alimentation
                          .filter(tag => !tags.includes(tag))
                          .map(tag => (
                            <Menu.Item
                              key={tag}
                              onPress={() => handleAddTag(tag)}
                              title={getTagLabel(tag)}
                              leadingIcon="shield-check"
                              titleStyle={{ color: '#1E3A8A' }}
                            />
                          ))}

                        <Menu.Item
                          title="FACTEURS PROTECTEURS - Comportement"
                          disabled
                          titleStyle={styles.tagMenuHeader}
                        />
                        {TAG_DEFINITIONS.protecteurs.comportement
                          .filter(tag => !tags.includes(tag))
                          .map(tag => (
                            <Menu.Item
                              key={tag}
                              onPress={() => handleAddTag(tag)}
                              title={getTagLabel(tag)}
                              leadingIcon="shield-check"
                              titleStyle={{ color: '#1E3A8A' }}
                            />
                          ))}
                      </ScrollView>
                    </Menu>
                  </View>
                )}

                {tags.length >= 8 && (
                  <HelperText type="info">
                    Limite de 8 tags atteinte
                  </HelperText>
                )}
              </View>
            )}

            {/* Partager avec le médecin */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <MaterialCommunityIcons
                    name={sharedWithDoctor ? "share-variant" : "lock-outline"}
                    size={20}
                    color={sharedWithDoctor ? designSystem.colors.primary[500] : designSystem.colors.text.secondary}
                  />
                  <View style={styles.switchTextContainer}>
                    <AppText variant="bodyLarge" style={styles.switchLabel}>
                      Partager avec le médecin
                    </AppText>
                    <AppText variant="labelSmall" style={styles.switchHint}>
                      {sharedWithDoctor ? 'Visible dans l\'export PDF' : 'Note privée'}
                    </AppText>
                  </View>
                </View>
                <Switch
                  value={sharedWithDoctor}
                  onValueChange={setSharedWithDoctor}
                  color={designSystem.colors.primary[500]}
                />
              </View>
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
  textArea: {
    backgroundColor: designSystem.colors.background.secondary,
    minHeight: 120,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: designSystem.colors.text.tertiary,
    marginTop: designSystem.spacing[1],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designSystem.spacing[3],
    paddingHorizontal: designSystem.spacing[4],
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: designSystem.spacing[3],
  },
  switchTextContainer: {
    flex: 1,
  },
  switchLabel: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  switchHint: {
    color: designSystem.colors.text.secondary,
    marginTop: 2,
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
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[4],
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
  },
  dropdownText: {
    color: designSystem.colors.text.primary,
    flex: 1,
  },
  tagsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[2],
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[1],
    backgroundColor: designSystem.colors.primary[50],
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: designSystem.spacing[1],
    borderRadius: designSystem.borderRadius.full,
  },
  processingText: {
    color: designSystem.colors.primary[600],
    fontWeight: '500',
  },
  confidenceText: {
    color: designSystem.colors.text.secondary,
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing[2],
    marginBottom: designSystem.spacing[2],
  },
  chip: {
    backgroundColor: designSystem.colors.primary[100],
    borderWidth: 1,
    borderColor: designSystem.colors.primary[300],
  },
  chipText: {
    color: designSystem.colors.primary[700],
    fontSize: designSystem.typography.fontSize.sm,
  },
  noTagsText: {
    color: designSystem.colors.text.tertiary,
    fontStyle: 'italic',
  },
  addTagRow: {
    marginTop: designSystem.spacing[2],
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
    borderStyle: 'dashed',
  },
  addTagButtonText: {
    color: designSystem.colors.primary[500],
    fontWeight: '500',
  },
  tagMenuContent: {
    maxHeight: 400,
    backgroundColor: designSystem.colors.background.secondary,
  },
  tagMenuScroll: {
    maxHeight: 380,
  },
  tagMenuHeader: {
    fontSize: designSystem.typography.fontSize.xs,
    fontWeight: designSystem.typography.fontWeight.bold,
    color: designSystem.colors.text.tertiary,
    textTransform: 'uppercase',
    paddingTop: designSystem.spacing[2],
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[2],
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: designSystem.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: designSystem.colors.primary[200],
    ...designSystem.shadows.sm,
  },
  micButtonRecording: {
    backgroundColor: '#EF4444',
    borderColor: '#C0392B',
    ...designSystem.shadows.lg,
  },
  interimContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[2],
    backgroundColor: '#FFF0DA',
    borderRadius: designSystem.borderRadius.md,
    marginTop: designSystem.spacing[2],
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  interimText: {
    color: '#78350F',
    fontStyle: 'italic',
    flex: 1,
  },
  vercelWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    paddingHorizontal: designSystem.spacing[3],
    paddingVertical: designSystem.spacing[2],
    backgroundColor: '#E0F2FE',
    borderRadius: designSystem.borderRadius.md,
    marginBottom: designSystem.spacing[2],
    borderWidth: 1,
    borderColor: '#7DD3FC',
  },
  vercelWarningText: {
    color: '#0369A1',
    flex: 1,
    lineHeight: 16,
  },
});

export default NoteModal;

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Portal, Modal, Switch } from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

import HealthIcon from '../ui/HealthIcon';
import AppCard from '../ui/AppCard';
import AppText from '../ui/AppText';
import PrimaryButton from '../ui/PrimaryButton';
import EmptyState from '../ui/EmptyState';
import DateTimePicker from '../ui/DateTimePicker';
import SegmentedControl from '../ui/SegmentedControl';
import AnimatedListItem from '../ui/AnimatedListItem';
import Toast from '../ui/Toast';
import CalendarSection from '../home/CalendarSection';
import IBDiskChart from '../charts/IBDiskChart';
import SymptomModal from '../modals/SymptomModal';
import NoteModal from '../modals/NoteModal';

import designSystem from '../../theme/designSystem';
import { toggleFeedback } from '../../utils/haptics';
import { getSymptomDisplayName, INTENSITY_LABELS } from '../../utils/symptomsUtils';
import { getCategoryLabel } from '../../utils/notesUtils';

import { useHistoryData } from '../../hooks/useHistoryData';
import { useStoolManagement } from '../../hooks/useStoolManagement';
import { useSymptomManagement } from '../../hooks/useSymptomManagement';
import { useNoteManagement } from '../../hooks/useNoteManagement';

const bristolDescriptions = {
  1: 'Noix dures séparées',
  2: 'Saucisse grumeleuse',
  3: 'Saucisse fissurée',
  4: 'Saucisse lisse (normal)',
  5: 'Morceaux mous',
  6: 'Morceaux floconneux',
  7: 'Aqueux, liquide',
};

/**
 * Historique + calendrier + IBDisk, rendus dans l'écran Statistiques.
 * Composant autonome : gère son propre chargement de données et ses modales d'édition.
 */
export default function HistoryOverview() {
  const theme = useTheme();

  const [historyFilter, setHistoryFilter] = useState('stools'); // 'stools' | 'symptoms' | 'notes'
  const [calendarMode, setCalendarMode] = useState('score'); // 'score' | 'bristol'
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [currentIbdiskIndex, setCurrentIbdiskIndex] = useState(0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const historyData = useHistoryData();
  const { stools, ibdiskHistory, symptoms, notes, loadHistoryData } = historyData;

  const stoolManagement = useStoolManagement({ onDataChange: loadHistoryData });
  const symptomManagement = useSymptomManagement({ onDataChange: loadHistoryData, showToast });
  const noteManagement = useNoteManagement({ onDataChange: loadHistoryData, showToast });

  useFocusEffect(
    React.useCallback(() => {
      loadHistoryData();
    }, [loadHistoryData])
  );

  const formatCompactDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    if (isToday) return `Aujourd'hui ${time}`;
    if (isYesterday) return `Hier ${time}`;
    return `${date.getDate()}/${date.getMonth() + 1} ${time}`;
  };

  const formatCompactDateOnly = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return `Aujourd'hui`;
    if (isYesterday) return `Hier`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getBristolColor = (bristol) => {
    if (bristol <= 2) return '#4C4DDC';
    if (bristol <= 4) return '#4C4DDC';
    if (bristol <= 5) return '#C8C8F4';
    return '#101010';
  };

  const handlePreviousIbdisk = () => {
    if (currentIbdiskIndex < ibdiskHistory.length - 1) {
      setCurrentIbdiskIndex(currentIbdiskIndex + 1);
    }
  };

  const handleNextIbdisk = () => {
    if (currentIbdiskIndex > 0) {
      setCurrentIbdiskIndex(currentIbdiskIndex - 1);
    }
  };

  return (
    <>
      {/* Section Historique */}
      <AppCard style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <HealthIcon name="journal" size={24} color={designSystem.colors.primary[500]} />
          <AppText variant="h3" style={styles.sectionTitle}>
            Historique
          </AppText>
        </View>

        <View style={styles.historyTabsContainer}>
          <SegmentedControl
            options={[
              { value: 'stools', label: 'Selles' },
              { value: 'symptoms', label: 'Symptômes' },
              { value: 'notes', label: 'Notes' },
            ]}
            selectedValue={historyFilter}
            onValueChange={setHistoryFilter}
          />
        </View>

        {(() => {
          let filteredEntries = [];

          if (historyFilter === 'stools') {
            filteredEntries = [...filteredEntries, ...stools.map((s) => ({ ...s, entryType: 'stool' }))];
          }
          if (historyFilter === 'symptoms') {
            filteredEntries = [...filteredEntries, ...symptoms.map((s) => ({ ...s, entryType: 'symptom' }))];
          }
          if (historyFilter === 'notes') {
            filteredEntries = [...filteredEntries, ...notes.map((n) => ({ ...n, entryType: 'note' }))];
          }

          filteredEntries.sort((a, b) => b.timestamp - a.timestamp);
          filteredEntries = filteredEntries.slice(0, 20);

          if (filteredEntries.length === 0) {
            let emptyMessage = '';
            if (historyFilter === 'stools') emptyMessage = 'Aucune selle enregistrée';
            else if (historyFilter === 'symptoms') emptyMessage = 'Aucun symptôme enregistré';
            else emptyMessage = 'Aucune note enregistrée';

            return (
              <EmptyState
                healthIcon="empty"
                title={emptyMessage}
                description="Utilisez le bouton + en bas pour ajouter une entrée"
                size="compact"
              />
            );
          }

          return (
            <View>
              {filteredEntries.map((item, index) => (
                <AnimatedListItem key={`${item.entryType}-${item.id}`} index={index} delay={30}>
                  {item.entryType === 'stool' && (
                    <View style={styles.stoolItem}>
                      <View style={[styles.stoolMain, item.hasBlood && styles.stoolMainWithBlood]}>
                        <View style={[styles.bristolBadge, { backgroundColor: getBristolColor(item.bristolScale) }]}>
                          <AppText variant="bodyLarge" style={styles.bristolNumber}>
                            {item.bristolScale}
                          </AppText>
                        </View>
                        <View style={styles.stoolInfo}>
                          <View style={styles.stoolDateContainer}>
                            <AppText variant="bodyMedium" style={styles.stoolDate}>
                              {formatCompactDate(item.timestamp)}
                            </AppText>
                          </View>
                        </View>
                        <View style={styles.stoolActions}>
                          <TouchableOpacity onPress={() => stoolManagement.handleEditStool(item)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="pencil" size={20} color="#4C4DDC" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => stoolManagement.handleDeleteStool(item.id)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="delete" size={20} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {item.entryType === 'symptom' && (
                    <View style={styles.symptomItem}>
                      <View style={styles.symptomMain}>
                        <View style={[styles.symptomIcon, { backgroundColor: '#FEE2E2' }]}>
                          <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#DC2626" />
                        </View>
                        <View style={styles.symptomInfo}>
                          <AppText variant="bodyMedium" style={styles.symptomType}>
                            {getSymptomDisplayName(item)}
                          </AppText>
                          <View style={styles.symptomMeta}>
                            <AppText variant="labelSmall" style={styles.symptomDate}>
                              {formatCompactDateOnly(item.timestamp)}
                            </AppText>
                            <View style={styles.symptomIntensity}>
                              <AppText variant="labelSmall" style={styles.symptomIntensityText}>
                                Intensité: {item.intensity}/5 ({INTENSITY_LABELS[item.intensity]})
                              </AppText>
                            </View>
                          </View>
                          {item.note && (
                            <AppText variant="labelSmall" style={styles.symptomNote}>
                              {item.note}
                            </AppText>
                          )}
                        </View>
                        <View style={styles.stoolActions}>
                          <TouchableOpacity onPress={() => symptomManagement.handleEditSymptom(item)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="pencil" size={20} color="#4C4DDC" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => symptomManagement.handleDeleteSymptom(item.id)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="delete" size={20} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}

                  {item.entryType === 'note' && (
                    <View style={styles.noteItem}>
                      <View style={styles.noteMain}>
                        <View style={[styles.noteIcon, { backgroundColor: '#FEF3C7' }]}>
                          <MaterialCommunityIcons
                            name={item.sharedWithDoctor ? 'share-variant' : 'note-text-outline'}
                            size={24}
                            color="#F59E0B"
                          />
                        </View>
                        <View style={styles.noteInfo}>
                          <View style={styles.noteHeader}>
                            <AppText variant="bodyMedium" style={styles.noteContent}>
                              {item.content.length > 80 ? item.content.substring(0, 80) + '...' : item.content}
                            </AppText>
                            {!item.aiProcessed && (
                              <View style={styles.aiProcessingBadge}>
                                <MaterialCommunityIcons name="brain" size={12} color="#4C4DDC" />
                                <AppText variant="labelSmall" style={styles.aiProcessingText}>
                                  IA...
                                </AppText>
                              </View>
                            )}
                            {item.aiProcessed && item.tags && item.tags.length > 0 && (
                              <View style={styles.aiCompleteBadge}>
                                <MaterialCommunityIcons name="tag-multiple" size={12} color="#16A34A" />
                                <AppText variant="labelSmall" style={styles.aiCompleteText}>
                                  {item.tags.length}
                                </AppText>
                              </View>
                            )}
                          </View>
                          <View style={styles.noteMeta}>
                            <AppText variant="labelSmall" style={styles.noteDate}>
                              {formatCompactDateOnly(item.timestamp)}
                            </AppText>
                            {item.category && (
                              <View style={styles.noteCategory}>
                                <AppText variant="labelSmall" style={styles.noteCategoryText}>
                                  {getCategoryLabel(item.category)}
                                </AppText>
                              </View>
                            )}
                            {item.sharedWithDoctor && (
                              <View style={styles.noteShared}>
                                <MaterialCommunityIcons name="share-variant" size={12} color="#4C4DDC" />
                                <AppText variant="labelSmall" style={styles.noteSharedText}>
                                  Partagé
                                </AppText>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.stoolActions}>
                          <TouchableOpacity onPress={() => noteManagement.handleEditNote(item)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="pencil" size={20} color="#4C4DDC" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => noteManagement.handleDeleteNote(item.id)} style={styles.actionButton}>
                            <MaterialCommunityIcons name="delete" size={20} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </AnimatedListItem>
              ))}
            </View>
          );
        })()}
      </AppCard>

      {/* Calendrier */}
      <AppCard style={styles.calendarCard}>
        <View style={styles.calendarHeaderSection}>
          <SegmentedControl
            options={[
              { value: 'score', label: 'Score' },
              { value: 'bristol', label: 'Selles' },
            ]}
            selectedValue={calendarMode}
            onValueChange={setCalendarMode}
          />
        </View>

        <CalendarSection
          calendarMonthOffset={calendarMonthOffset}
          setCalendarMonthOffset={setCalendarMonthOffset}
          calendarMode={calendarMode}
          stools={stools}
        />

        <View style={styles.legend}>
          {calendarMode === 'score' ? (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#16A34A' }]} />
                <AppText variant="labelSmall" style={styles.legendText}>Excellent (0-3)</AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#F59E0B' }]} />
                <AppText variant="labelSmall" style={styles.legendText}>Acceptable (4-9)</AppText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: '#DC2626' }]} />
                <AppText variant="labelSmall" style={styles.legendText}>Préoccupant (10+)</AppText>
              </View>
            </>
          ) : (
            <View style={styles.legendFullWidth}>
              <AppText variant="labelSmall" style={styles.legendTextCentered}>
                💡 Le chiffre indique le nombre de selles enregistrées ce jour-là
              </AppText>
            </View>
          )}
        </View>
      </AppCard>

      {/* Historique IBDisk */}
      {ibdiskHistory.length > 0 && (
        <AppCard style={styles.ibdiskCard}>
          <View style={styles.ibdiskHeader}>
            <AppText variant="headlineLarge" style={styles.cardTitle}>
              Historique IBDisk
            </AppText>

            {ibdiskHistory.length > 1 ? (
              <View style={styles.ibdiskNavigation}>
                <TouchableOpacity
                  onPress={handlePreviousIbdisk}
                  disabled={currentIbdiskIndex >= ibdiskHistory.length - 1}
                  style={[styles.navButton, currentIbdiskIndex >= ibdiskHistory.length - 1 && styles.navButtonDisabled]}
                >
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={24}
                    color={currentIbdiskIndex >= ibdiskHistory.length - 1 ? '#A3A3A3' : '#101010'}
                  />
                </TouchableOpacity>

                <AppText variant="labelMedium" style={styles.navText}>
                  {currentIbdiskIndex + 1} / {ibdiskHistory.length}
                </AppText>

                <TouchableOpacity
                  onPress={handleNextIbdisk}
                  disabled={currentIbdiskIndex <= 0}
                  style={[styles.navButton, currentIbdiskIndex <= 0 && styles.navButtonDisabled]}
                >
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={currentIbdiskIndex <= 0 ? '#A3A3A3' : '#101010'}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <AppText variant="labelSmall" style={styles.singleQuestionnaireText}>
                Premier questionnaire IBDisk
              </AppText>
            )}
          </View>

          <IBDiskChart
            data={ibdiskHistory[currentIbdiskIndex]?.answers || {}}
            date={ibdiskHistory[currentIbdiskIndex]?.date || ''}
          />
        </AppCard>
      )}

      {/* Modal d'édition de selle */}
      <Portal>
        <Modal visible={stoolManagement.editModalVisible} onDismiss={stoolManagement.hideEditModal} contentContainerStyle={styles.modalContainer}>
          <AppCard style={styles.modalCard}>
            <View style={styles.modalScroll}>
              <AppText variant="h2" style={styles.modalTitle}>
                Modifier la selle
              </AppText>

              <View style={styles.dateTimeSection}>
                <AppText style={styles.fieldLabel}>Date et heure</AppText>
                <DateTimePicker
                  dateValue={stoolManagement.editDateInput}
                  timeValue={stoolManagement.editTimeInput}
                  onDateChange={stoolManagement.setEditDateInput}
                  onTimeChange={stoolManagement.setEditTimeInput}
                  dateLabel="Date (DD/MM/YYYY)"
                  timeLabel="Heure (HH:MM)"
                />
              </View>

              <View style={styles.bristolSection}>
                <AppText style={styles.fieldLabel}>Consistance (Bristol)</AppText>
                <Slider
                  minimumValue={1}
                  maximumValue={7}
                  step={1}
                  value={stoolManagement.editBristol}
                  onValueChange={stoolManagement.setEditBristol}
                  style={styles.slider}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.outline}
                  thumbStyle={{ backgroundColor: theme.colors.primary }}
                />
                <AppText variant="labelMedium" style={styles.bristolHint}>
                  Sélection: {stoolManagement.editBristol} — {bristolDescriptions[stoolManagement.editBristol]}
                </AppText>
              </View>

              <View style={styles.bloodSection}>
                <View style={styles.switchRow}>
                  <AppText variant="bodyLarge">Présence de sang</AppText>
                  <Switch
                    value={stoolManagement.editHasBlood}
                    onValueChange={(value) => {
                      toggleFeedback();
                      stoolManagement.setEditHasBlood(value);
                    }}
                    color={theme.colors.error}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <PrimaryButton onPress={stoolManagement.handleSaveEdit} style={styles.saveButton} variant="primary" size="medium">
                  Enregistrer
                </PrimaryButton>
                <PrimaryButton onPress={stoolManagement.hideEditModal} style={styles.cancelButton} variant="neutral" size="medium" outlined>
                  Annuler
                </PrimaryButton>
              </View>
            </View>
          </AppCard>
        </Modal>
      </Portal>

      {/* Modal de symptôme */}
      <SymptomModal
        visible={symptomManagement.symptomModalVisible}
        onDismiss={symptomManagement.handleCloseSymptomModal}
        onSave={symptomManagement.handleSaveSymptom}
        initialData={symptomManagement.editingSymptom}
      />

      {/* Modal de note */}
      <NoteModal
        visible={noteManagement.noteModalVisible}
        onDismiss={noteManagement.handleCloseNoteModal}
        onSave={noteManagement.handleSaveNote}
        initialData={noteManagement.editingNote}
      />

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[5],
    gap: designSystem.spacing[3],
  },
  sectionTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  historySection: {
    marginHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  historyTabsContainer: {
    marginBottom: designSystem.spacing[4],
  },
  stoolItem: {
    marginBottom: designSystem.spacing[3],
  },
  stoolMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDEDFC',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  stoolMainWithBlood: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  bristolBadge: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  bristolNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stoolInfo: {
    flex: 1,
  },
  stoolDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stoolDate: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  stoolActions: {
    flexDirection: 'row',
    gap: designSystem.spacing[2],
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: designSystem.borderRadius.lg,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  calendarCard: {
    marginHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  calendarHeaderSection: {
    marginBottom: designSystem.spacing[5],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: designSystem.spacing[3],
    paddingTop: designSystem.spacing[4],
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.border.light,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
  },
  legendSquare: {
    width: 20,
    height: 20,
    borderRadius: designSystem.borderRadius.sm,
  },
  legendText: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  legendFullWidth: {
    flex: 1,
    backgroundColor: '#EDEDFC',
    padding: designSystem.spacing[3],
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  legendTextCentered: {
    color: designSystem.colors.text.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
  ibdiskCard: {
    marginHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  ibdiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: designSystem.spacing[4],
  },
  cardTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  ibdiskNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[3],
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: designSystem.borderRadius.md,
    backgroundColor: '#EDEDFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8C8F4',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navText: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
  },
  singleQuestionnaireText: {
    color: designSystem.colors.text.secondary,
    fontStyle: 'italic',
  },
  symptomItem: {
    marginBottom: designSystem.spacing[3],
  },
  symptomMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  symptomIcon: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  symptomInfo: {
    flex: 1,
  },
  symptomType: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  symptomMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    flexWrap: 'wrap',
  },
  symptomDate: {
    color: designSystem.colors.text.tertiary,
  },
  symptomIntensity: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  symptomIntensityText: {
    color: designSystem.colors.text.secondary,
    fontWeight: '500',
  },
  symptomNote: {
    color: designSystem.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  noteItem: {
    marginBottom: designSystem.spacing[3],
  },
  noteMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: designSystem.spacing[3],
  },
  noteInfo: {
    flex: 1,
  },
  noteHeader: {
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  noteContent: {
    color: designSystem.colors.text.primary,
    fontWeight: '500',
  },
  noteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
    flexWrap: 'wrap',
  },
  noteDate: {
    color: designSystem.colors.text.tertiary,
  },
  noteCategory: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  noteCategoryText: {
    color: designSystem.colors.text.secondary,
    fontWeight: '500',
  },
  noteShared: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDEDFC',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 2,
    borderRadius: designSystem.borderRadius.sm,
  },
  noteSharedText: {
    color: '#4C4DDC',
    fontWeight: '500',
  },
  aiProcessingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDEDFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiProcessingText: {
    color: '#4C4DDC',
    fontWeight: '600',
    fontSize: 10,
  },
  aiCompleteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  aiCompleteText: {
    color: '#16A34A',
    fontWeight: '600',
    fontSize: 10,
  },
  // Modales
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
  modalTitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[5],
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 32,
  },
  dateTimeSection: {
    marginBottom: designSystem.spacing[5],
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[3],
  },
  bristolSection: {
    marginBottom: designSystem.spacing[5],
  },
  slider: {
    height: 48,
    marginVertical: designSystem.spacing[3],
  },
  bristolHint: {
    color: designSystem.colors.text.secondary,
    textAlign: 'center',
    marginTop: designSystem.spacing[2],
    fontSize: 13,
    lineHeight: 18,
  },
  bloodSection: {
    marginBottom: designSystem.spacing[5],
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
  modalActions: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[4],
    marginBottom: designSystem.spacing[2],
  },
  cancelButton: {
    width: '100%',
  },
  saveButton: {
    width: '100%',
  },
});

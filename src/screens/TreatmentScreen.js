import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import EmptyState from '../components/ui/EmptyState';
import TreatmentCard from '../components/treatment/TreatmentCard';
import CreateSchemaModal from '../components/treatment/CreateSchemaModal';
import EditSchemaModal from '../components/treatment/EditSchemaModal';
import AddFreeIntakeModal from '../components/treatment/AddFreeIntakeModal';
import DateTimeInput, { isValidDate } from '../components/ui/DateTimeInput';
import { Portal, Modal, TextInput, HelperText } from 'react-native-paper';
import AppCard from '../components/ui/AppCard';
import ScreenHeader from '../components/ui/ScreenHeader';
import designSystem from '../theme/designSystem';
import {
  getActiveTherapeuticSchemas,
  getHistoricalTherapeuticSchemas,
  getAllIntakes,
  getMedications,
  findMedicationById,
  recordIntake,
  decrementIntake,
  updateIntake,
  deleteIntake,
  stopSchema,
  getTodayIntakesCount,
  isIntervalIntakeDone,
  findLastTodayIntake,
  findLastIntervalIntake,
  formatFrequency
} from '../utils/treatmentUtils';
import { buttonPressFeedback } from '../utils/haptics';

const TreatmentScreen = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'history'
  const [historyView, setHistoryView] = useState('intakes'); // 'intakes' | 'schemas'
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [freeIntakeModalVisible, setFreeIntakeModalVisible] = useState(false);
  const [intervalConfirmVisible, setIntervalConfirmVisible] = useState(false);
  const [editIntakeModalVisible, setEditIntakeModalVisible] = useState(false);

  // Selected items
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [pendingIntervalIntake, setPendingIntervalIntake] = useState(null);
  const [selectedIntake, setSelectedIntake] = useState(null);

  // Interval confirmation
  const [intervalDateInput, setIntervalDateInput] = useState('');

  // Edit intake
  const [editDoses, setEditDoses] = useState('1');
  const [editDateInput, setEditDateInput] = useState('');
  const [editIntakeErrors, setEditIntakeErrors] = useState({
    doses: '',
    date: ''
  });

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get active schemas with medications
  const getActiveSchemasWithMeds = () => {
    const activeSchemas = getActiveTherapeuticSchemas();
    const medications = getMedications();

    return activeSchemas
      .map(schema => {
        const medication = medications[schema.medicationId];
        return medication ? { schema, medication } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.medication.name.localeCompare(b.medication.name));
  };

  // Get all intakes with metadata, grouped by date
  const getIntakesHistory = () => {
    const intakes = getAllIntakes();
    const medications = getMedications();

    const intakesWithMeta = intakes.map(intake => {
      const medication = medications[intake.medicationId];
      return {
        ...intake,
        medicationName: medication?.name || 'Médicament inconnu',
        dateTaken: new Date(intake.dateTaken)
      };
    });

    // Sort by date descending
    intakesWithMeta.sort((a, b) => b.dateTaken - a.dateTaken);

    // Group by date
    const grouped = {};
    intakesWithMeta.forEach(intake => {
      const dateKey = intake.dateTaken.toLocaleDateString('fr-FR');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(intake);
    });

    return grouped;
  };

  // Handle daily intake checkbox
  const handleCheckDaily = (schema, medication) => {
    recordIntake(schema.medicationId, 1, new Date());
    buttonPressFeedback();
    refresh();
  };

  // Handle daily intake uncheck
  const handleUncheckDaily = (schema, medication) => {
    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
                     String(today.getMonth() + 1).padStart(2, '0') + '-' +
                     String(today.getDate()).padStart(2, '0');
    decrementIntake(schema.medicationId, todayStr);
    buttonPressFeedback();
    refresh();
  };

  // Handle interval intake checkbox
  const handleCheckInterval = (schema, medication) => {
    // Ask for confirmation with date
    setPendingIntervalIntake({ schema, medication });
    const today = new Date();
    setIntervalDateInput(today.toLocaleDateString('fr-FR'));
    setIntervalConfirmVisible(true);
  };

  // Handle interval intake uncheck
  const handleUncheckInterval = (schema, medication) => {
    const lastIntake = findLastIntervalIntake(schema.id);
    if (lastIntake) {
      decrementIntake(schema.medicationId, lastIntake.dateTaken);
      buttonPressFeedback();
      refresh();
    }
  };

  // Confirm interval intake
  const confirmIntervalIntake = () => {
    if (!pendingIntervalIntake) return;

    if (!isValidDate(intervalDateInput)) {
      alert('Date invalide');
      return;
    }

    const [day, month, year] = intervalDateInput.split('/');
    const dateTaken = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    recordIntake(pendingIntervalIntake.schema.medicationId, 1, dateTaken);
    buttonPressFeedback();
    setIntervalConfirmVisible(false);
    setPendingIntervalIntake(null);
    refresh();
  };

  // Handle edit schema
  const handleEdit = (schema, medication) => {
    setSelectedSchema(schema);
    setSelectedMedication(medication);
    setEditModalVisible(true);
  };

  // Handle stop schema
  const handleStop = (schema, medication) => {
    const confirmMessage = `Voulez-vous vraiment arrêter le traitement "${medication.name}" ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        stopSchema(schema.id);
        buttonPressFeedback();
        refresh();
      }
    } else {
      Alert.alert(
        'Confirmation',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Arrêter',
            style: 'destructive',
            onPress: () => {
              stopSchema(schema.id);
              buttonPressFeedback();
              refresh();
            }
          }
        ]
      );
    }
  };

  // Handle edit intake
  const handleEditIntake = (intake) => {
    setSelectedIntake(intake);
    setEditDoses(intake.doses.toString());
    setEditDateInput(intake.dateTaken.toLocaleDateString('fr-FR'));
    setEditIntakeErrors({ doses: '', date: '' });
    setEditIntakeModalVisible(true);
  };

  // Save edited intake
  const saveEditedIntake = () => {
    if (!selectedIntake) return;

    const newErrors = { doses: '', date: '' };
    let hasError = false;

    if (!isValidDate(editDateInput)) {
      newErrors.date = 'Date invalide (format: JJ/MM/AAAA)';
      hasError = true;
    }

    const dosesNum = parseInt(editDoses);
    if (isNaN(dosesNum) || dosesNum < 1) {
      newErrors.doses = 'Le nombre de doses doit être au moins 1';
      hasError = true;
    }

    setEditIntakeErrors(newErrors);

    if (hasError) {
      return;
    }

    const [day, month, year] = editDateInput.split('/');
    const dateTaken = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    updateIntake(selectedIntake.id, { doses: dosesNum, dateTaken });
    buttonPressFeedback();
    setEditIntakeModalVisible(false);
    setSelectedIntake(null);
    refresh();
  };

  // Handle delete intake
  const handleDeleteIntake = (intake) => {
    const confirmMessage = `Supprimer cette prise de ${intake.medicationName} ?`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        deleteIntake(intake.id);
        buttonPressFeedback();
        refresh();
      }
    } else {
      Alert.alert(
        'Confirmation',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              deleteIntake(intake.id);
              buttonPressFeedback();
              refresh();
            }
          }
        ]
      );
    }
  };

  // Render active schemas
  const renderActiveSchemas = () => {
    const activeSchemas = getActiveSchemasWithMeds();

    if (activeSchemas.length === 0) {
      return (
        <EmptyState
          healthIcon="pill"
          title="Aucun traitement actif"
          message="Ajoutez votre premier traitement pour commencer le suivi"
        />
      );
    }

    return (
      <>
        {activeSchemas.map(({ schema, medication }) => (
          <TreatmentCard
            key={schema.id}
            schema={schema}
            medication={medication}
            onCheckDaily={handleCheckDaily}
            onUncheckDaily={handleUncheckDaily}
            onCheckInterval={handleCheckInterval}
            onUncheckInterval={handleUncheckInterval}
            onEdit={handleEdit}
            onStop={handleStop}
          />
        ))}
      </>
    );
  };

  // Render history of intakes
  const renderIntakesHistory = () => {
    const groupedIntakes = getIntakesHistory();
    const dates = Object.keys(groupedIntakes);

    if (dates.length === 0) {
      return (
        <EmptyState
          healthIcon="empty"
          title="Aucune prise enregistrée"
          message="Les prises de traitement apparaîtront ici"
        />
      );
    }

    return (
      <>
        {dates.map(dateKey => (
          <View key={dateKey} style={styles.historyGroup}>
            <AppText variant="h4" style={styles.historyDate}>
              {dateKey}
            </AppText>
            {groupedIntakes[dateKey].map(intake => (
              <AppCard key={intake.id} style={styles.historyCard}>
                <View style={styles.historyCardHeader}>
                  <View style={styles.historyCardLeft}>
                    <MaterialCommunityIcons
                      name="pill"
                      size={20}
                      color={designSystem.colors.primary[500]}
                    />
                    <View style={styles.historyCardText}>
                      <AppText variant="bodyLarge" style={styles.historyMedName}>
                        {intake.medicationName}
                      </AppText>
                      <AppText variant="labelSmall" style={styles.historyDoses}>
                        {intake.doses} dose{intake.doses > 1 ? 's' : ''}
                      </AppText>
                    </View>
                  </View>
                  <View style={styles.historyActions}>
                    <TouchableOpacity
                      onPress={() => handleEditIntake(intake)}
                      style={styles.historyActionButton}
                    >
                      <MaterialCommunityIcons
                        name="pencil"
                        size={20}
                        color={designSystem.colors.primary[500]}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteIntake(intake)}
                      style={styles.historyActionButton}
                    >
                      <MaterialCommunityIcons
                        name="delete"
                        size={20}
                        color={designSystem.colors.health.danger.main}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </AppCard>
            ))}
          </View>
        ))}
      </>
    );
  };

  // Render history of schemas
  const renderSchemasHistory = () => {
    const historicalSchemas = getHistoricalTherapeuticSchemas();
    const medications = getMedications();

    const schemasWithMeds = historicalSchemas
      .map(schema => {
        const medication = medications[schema.medicationId];
        return medication ? { schema, medication } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.schema.endDate) - new Date(a.schema.endDate));

    if (schemasWithMeds.length === 0) {
      return (
        <EmptyState
          healthIcon="empty"
          title="Aucun schéma archivé"
          message="Les anciens schémas thérapeutiques apparaîtront ici"
        />
      );
    }

    return (
      <>
        {schemasWithMeds.map(({ schema, medication }) => {
          const startDate = new Date(schema.startDate).toLocaleDateString('fr-FR');
          const endDate = new Date(schema.endDate).toLocaleDateString('fr-FR');
          const adherence = schema.adherence || 0;

          const adherenceColor = adherence >= 90
            ? '#397852'
            : adherence >= 70
            ? '#AD7130'
            : '#C0392B';

          return (
            <AppCard key={schema.id} style={styles.historyCard}>
              <View style={styles.schemaHistoryHeader}>
                <MaterialCommunityIcons
                  name="file-document"
                  size={24}
                  color={designSystem.colors.primary[500]}
                />
                <View style={styles.schemaHistoryText}>
                  <AppText variant="h4" style={styles.schemaHistoryName}>
                    {medication.name}
                  </AppText>
                  <AppText variant="labelSmall" style={styles.schemaHistoryFrequency}>
                    {formatFrequency(schema.frequency)}
                  </AppText>
                  <AppText variant="labelSmall" style={styles.schemaHistoryPeriod}>
                    Du {startDate} au {endDate}
                  </AppText>
                </View>
              </View>
              <View style={styles.schemaHistoryFooter}>
                <View style={styles.schemaHistoryObservance}>
                  <AppText variant="labelSmall" style={styles.schemaHistoryLabel}>
                    Observance :
                  </AppText>
                  <AppText variant="bodyLarge" style={[styles.schemaHistoryAdherence, { color: adherenceColor }]}>
                    {adherence}%
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => handleEdit(schema, medication)}
                  style={styles.modifyButton}
                >
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={designSystem.colors.primary[500]}
                  />
                  <AppText variant="labelSmall" style={styles.modifyButtonText}>
                    Modifier
                  </AppText>
                </TouchableOpacity>
              </View>
            </AppCard>
          );
        })}
      </>
    );
  };

  // Render history (with switch)
  const renderHistory = () => {
    return historyView === 'intakes' ? renderIntakesHistory() : renderSchemasHistory();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Traitement"
        actions={[
          { icon: 'cog-outline', onPress: () => navigation.navigate('Paramètres'), label: 'Paramètres' },
        ]}
      />
      {/* Header with action buttons and history link (only in active view) */}
      {activeTab === 'active' && (
        <View style={styles.header}>
          <View style={[styles.headerLeft, isMobile && styles.headerLeftMobile]}>
            <PrimaryButton
              onPress={() => setCreateModalVisible(true)}
              variant="primary"
              size="small"
              icon="plus"
              style={styles.actionButton}
            >
              Schéma thérapeutique
            </PrimaryButton>
            <PrimaryButton
              onPress={() => setFreeIntakeModalVisible(true)}
              variant="neutral"
              size="small"
              outlined
              icon="plus"
              style={styles.actionButton}
            >
              Prise d'un médicament
            </PrimaryButton>
          </View>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('history');
              buttonPressFeedback();
            }}
            style={styles.historyButton}
          >
            <AppText style={styles.historyButtonText}>Historique</AppText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={designSystem.colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Header with back button (only in history view) */}
      {activeTab === 'history' && (
        <View style={styles.headerHistory}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('active');
              buttonPressFeedback();
            }}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={designSystem.colors.primary[500]}
            />
            <AppText style={styles.backButtonText}>Retour</AppText>
          </TouchableOpacity>
          <AppText variant="h3" style={styles.historyTitle}>
            Historique
          </AppText>
          {/* Switch entre Prises et Schémas */}
          <View style={styles.historySwitchContainer}>
            <TouchableOpacity
              onPress={() => {
                setHistoryView('intakes');
                buttonPressFeedback();
              }}
              style={[
                styles.historySwitchButton,
                historyView === 'intakes' && styles.historySwitchButtonActive
              ]}
            >
              <AppText
                variant="labelSmall"
                style={[
                  styles.historySwitchText,
                  historyView === 'intakes' && styles.historySwitchTextActive
                ]}
              >
                Prises
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setHistoryView('schemas');
                buttonPressFeedback();
              }}
              style={[
                styles.historySwitchButton,
                historyView === 'schemas' && styles.historySwitchButtonActive
              ]}
            >
              <AppText
                variant="labelSmall"
                style={[
                  styles.historySwitchText,
                  historyView === 'schemas' && styles.historySwitchTextActive
                ]}
              >
                Schémas
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'active' ? renderActiveSchemas() : renderHistory()}
      </ScrollView>

      {/* Modals */}
      <CreateSchemaModal
        visible={createModalVisible}
        onDismiss={() => setCreateModalVisible(false)}
        onSuccess={refresh}
      />

      <EditSchemaModal
        visible={editModalVisible}
        schema={selectedSchema}
        medication={selectedMedication}
        onDismiss={() => {
          setEditModalVisible(false);
          setSelectedSchema(null);
          setSelectedMedication(null);
        }}
        onSuccess={refresh}
      />

      <AddFreeIntakeModal
        visible={freeIntakeModalVisible}
        onDismiss={() => setFreeIntakeModalVisible(false)}
        onSuccess={refresh}
      />

      {/* Interval confirmation modal */}
      <Portal>
        <Modal
          visible={intervalConfirmVisible}
          onDismiss={() => setIntervalConfirmVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" style={styles.modalTitle}>
              Date de prise
            </AppText>
            <AppText variant="body" style={styles.modalText}>
              Confirmez la date de prise du traitement :
            </AppText>
            <View style={styles.modalSection}>
              <DateTimeInput
                dateValue={intervalDateInput}
                onDateChange={setIntervalDateInput}
                dateLabel="Date (DD/MM/YYYY)"
              />
            </View>
            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={confirmIntervalIntake}
                variant="primary"
                size="medium"
                style={styles.modalButton}
              >
                Confirmer
              </PrimaryButton>
              <PrimaryButton
                onPress={() => setIntervalConfirmVisible(false)}
                variant="neutral"
                size="medium"
                outlined
                style={styles.modalButton}
              >
                Annuler
              </PrimaryButton>
            </View>
          </AppCard>
        </Modal>
      </Portal>

      {/* Edit intake modal */}
      <Portal>
        <Modal
          visible={editIntakeModalVisible}
          onDismiss={() => {
            setEditIntakeModalVisible(false);
            setSelectedIntake(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <AppCard style={styles.modalCard}>
            <AppText variant="h3" style={styles.modalTitle}>
              Modifier la prise
            </AppText>

            <View style={styles.modalSection}>
              <AppText style={styles.fieldLabel}>Nombre de doses</AppText>
              <TextInput
                value={editDoses}
                onChangeText={setEditDoses}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.textInput}
                outlineStyle={{ borderRadius: designSystem.borderRadius.md }}
                error={!!editIntakeErrors.doses}
              />
              <HelperText type="error" visible={!!editIntakeErrors.doses}>
                {editIntakeErrors.doses}
              </HelperText>
            </View>

            <View style={styles.modalSection}>
              <AppText style={styles.fieldLabel}>Date de prise</AppText>
              <DateTimeInput
                dateValue={editDateInput}
                onDateChange={setEditDateInput}
                dateLabel="Date (DD/MM/YYYY)"
              />
              <HelperText type="error" visible={!!editIntakeErrors.date}>
                {editIntakeErrors.date}
              </HelperText>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                onPress={saveEditedIntake}
                variant="primary"
                size="medium"
                style={styles.modalButton}
              >
                Enregistrer
              </PrimaryButton>
              <PrimaryButton
                onPress={() => {
                  setEditIntakeModalVisible(false);
                  setSelectedIntake(null);
                }}
                variant="neutral"
                size="medium"
                outlined
                style={styles.modalButton}
              >
                Annuler
              </PrimaryButton>
            </View>
          </AppCard>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background.primary,
  },
  header: {
    paddingHorizontal: designSystem.spacing[4],
    paddingTop: designSystem.spacing[3],
    paddingBottom: designSystem.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: designSystem.spacing[2],
  },
  headerLeftMobile: {
    flexDirection: 'column',
  },
  actionButton: {
    alignSelf: 'flex-start',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[1],
    paddingVertical: designSystem.spacing[2],
    paddingHorizontal: designSystem.spacing[2],
  },
  historyButtonText: {
    color: designSystem.colors.primary[500],
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
  },
  headerHistory: {
    paddingHorizontal: designSystem.spacing[4],
    paddingTop: designSystem.spacing[3],
    paddingBottom: designSystem.spacing[3],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[1],
    marginBottom: designSystem.spacing[3],
  },
  backButtonText: {
    color: designSystem.colors.primary[500],
    fontSize: designSystem.typography.fontSize.md,
    fontWeight: designSystem.typography.fontWeight.semiBold,
  },
  historyTitle: {
    color: designSystem.colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: designSystem.spacing[3],
  },
  historySwitchContainer: {
    flexDirection: 'row',
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.lg,
    padding: designSystem.spacing[1],
  },
  historySwitchButton: {
    flex: 1,
    paddingVertical: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.md,
    alignItems: 'center',
  },
  historySwitchButtonActive: {
    backgroundColor: designSystem.colors.primary[500],
  },
  historySwitchText: {
    color: designSystem.colors.text.secondary,
    fontWeight: '600',
  },
  historySwitchTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: designSystem.spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 120 : 100, // Space for tab bar
  },
  historyGroup: {
    marginBottom: designSystem.spacing[5],
  },
  historyDate: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
    marginBottom: designSystem.spacing[3],
    fontSize: 18,
  },
  historyCard: {
    marginBottom: designSystem.spacing[3],
    padding: designSystem.spacing[4],
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[3],
    flex: 1,
  },
  historyCardText: {
    flex: 1,
  },
  historyMedName: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
    marginBottom: designSystem.spacing[1],
  },
  historyDoses: {
    color: designSystem.colors.text.secondary,
  },
  historyActions: {
    flexDirection: 'row',
    gap: designSystem.spacing[2],
  },
  historyActionButton: {
    width: 44,
    height: 44,
    borderRadius: designSystem.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schemaHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: designSystem.spacing[3],
    marginBottom: designSystem.spacing[3],
  },
  schemaHistoryText: {
    flex: 1,
  },
  schemaHistoryName: {
    color: designSystem.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: designSystem.spacing[1],
  },
  schemaHistoryFrequency: {
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[1],
  },
  schemaHistoryPeriod: {
    color: designSystem.colors.text.tertiary,
    fontSize: 12,
  },
  schemaHistoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: designSystem.spacing[3],
    borderTopWidth: 1,
    borderTopColor: designSystem.colors.border.light,
  },
  schemaHistoryObservance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[2],
  },
  schemaHistoryLabel: {
    color: designSystem.colors.text.secondary,
  },
  schemaHistoryAdherence: {
    fontSize: 18,
    fontWeight: '700',
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designSystem.spacing[1],
    paddingVertical: designSystem.spacing[1],
    paddingHorizontal: designSystem.spacing[2],
    borderRadius: designSystem.borderRadius.sm,
    backgroundColor: designSystem.colors.primary[50],
  },
  modifyButtonText: {
    color: designSystem.colors.primary[500],
    fontWeight: '600',
  },
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
    marginBottom: designSystem.spacing[4],
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 28,
  },
  modalText: {
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[4],
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: designSystem.spacing[4],
  },
  fieldLabel: {
    fontSize: designSystem.typography.fontSize.sm,
    fontWeight: designSystem.typography.fontWeight.semiBold,
    color: designSystem.colors.text.secondary,
    marginBottom: designSystem.spacing[3],
  },
  textInput: {
    backgroundColor: designSystem.colors.background.secondary,
  },
  input: {
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.md,
    padding: designSystem.spacing[3],
    borderWidth: 1,
    borderColor: designSystem.colors.border.light,
  },
  modalActions: {
    flexDirection: 'column',
    gap: designSystem.spacing[3],
    marginTop: designSystem.spacing[4],
  },
  modalButton: {
    width: '100%',
  },
});

export default TreatmentScreen;

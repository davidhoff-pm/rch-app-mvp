import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Portal, Modal, TextInput, Switch } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ui/ScreenHeader';
import AppCard from '../components/ui/AppCard';
import AppText from '../components/ui/AppText';
import PrimaryButton from '../components/ui/PrimaryButton';
import SegmentedControl from '../components/ui/SegmentedControl';
import designSystem from '../theme/designSystem';
import { toggleFeedback, buttonPressFeedback } from '../utils/haptics';
import {
  getManageableChips,
  getArchivedChips,
  createCustomChip,
  toggleChipActive,
  archiveChip,
  unarchiveChip,
  MAX_ACTIVE_CHIPS,
} from '../utils/factorChipsUtils';

const { colors, spacing, borderRadius } = designSystem;

const CATEGORY_OPTIONS = [
  { value: 'alimentation', label: 'Alimentation' },
  { value: 'comportement', label: 'Comportement' },
  { value: 'autre', label: 'Autre' },
];

const CATEGORY_LABELS = {
  alimentation: 'Alimentation',
  comportement: 'Comportement',
  autre: 'Autre',
};

function ChipRow({ chip, onToggleActive, onArchive }) {
  return (
    <View style={styles.chipRow}>
      <View style={styles.chipRowInfo}>
        <AppText variant="bodyLarge" weight="semiBold" numberOfLines={1}>{chip.label}</AppText>
        <AppText variant="bodySmall" color="tertiary">{CATEGORY_LABELS[chip.category] || chip.category}</AppText>
      </View>
      <View style={styles.chipRowActions}>
        <Switch
          value={chip.active}
          onValueChange={() => onToggleActive(chip)}
          color={colors.primary[500]}
        />
        <TouchableOpacity
          style={styles.archiveBtn}
          onPress={() => onArchive(chip)}
          accessibilityLabel="Archiver"
        >
          <MaterialCommunityIcons name="archive-outline" size={20} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ChipsManagementScreen() {
  const navigation = useNavigation();
  const [chips, setChips] = useState(() => getManageableChips());
  const [archivedChips, setArchivedChips] = useState(() => getArchivedChips());
  const [showArchived, setShowArchived] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('autre');
  const [errorMessage, setErrorMessage] = useState(null);

  const refresh = useCallback(() => {
    setChips(getManageableChips());
    setArchivedChips(getArchivedChips());
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const activeCount = chips.filter(c => c.active).length;

  const handleToggleActive = (chip) => {
    const result = toggleChipActive(chip.id);
    if (!result.success) {
      setErrorMessage(`Limite de ${MAX_ACTIVE_CHIPS} facteurs actifs atteinte. Désactivez-en un pour en activer un autre.`);
      return;
    }
    toggleFeedback();
    setErrorMessage(null);
    refresh();
  };

  const handleArchive = (chip) => {
    archiveChip(chip.id);
    toggleFeedback();
    refresh();
  };

  const handleUnarchive = (chip) => {
    unarchiveChip(chip.id);
    toggleFeedback();
    refresh();
  };

  const openCreateModal = () => {
    setNewLabel('');
    setNewCategory('autre');
    setErrorMessage(null);
    setCreateModalVisible(true);
  };

  const handleCreate = () => {
    const { chip, error } = createCustomChip(newLabel, newCategory);
    if (!chip) {
      setErrorMessage('Le nom du facteur ne peut pas être vide.');
      return;
    }
    buttonPressFeedback();
    setCreateModalVisible(false);
    refresh();
    if (error === 'max_active_reached') {
      setErrorMessage(`Facteur créé, mais non activé (limite de ${MAX_ACTIVE_CHIPS} facteurs actifs atteinte).`);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Mes facteurs"
        actions={[{ icon: 'arrow-left', onPress: () => navigation.goBack(), label: 'Retour' }]}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText variant="bodySmall" color="secondary" style={styles.hint}>
          Activez jusqu'à {MAX_ACTIVE_CHIPS} facteurs à suivre au quotidien. Un tap par jour suffit,
          pas besoin de préciser une durée ou une intensité.
        </AppText>

        <View style={styles.countRow}>
          <AppText variant="bodySmall" color="tertiary">
            {activeCount}/{MAX_ACTIVE_CHIPS} actifs
          </AppText>
        </View>

        {errorMessage && (
          <AppCard variant="warning" style={styles.errorCard}>
            <AppText variant="bodySmall" color="warning">{errorMessage}</AppText>
          </AppCard>
        )}

        <AppCard style={styles.listCard}>
          {chips.length > 0 ? (
            chips.map((chip, index) => (
              <View key={chip.id}>
                <ChipRow chip={chip} onToggleActive={handleToggleActive} onArchive={handleArchive} />
                {index < chips.length - 1 && <View style={styles.separator} />}
              </View>
            ))
          ) : (
            <AppText variant="bodySmall" color="tertiary">Aucun facteur pour l'instant.</AppText>
          )}
        </AppCard>

        <PrimaryButton
          onPress={openCreateModal}
          variant="primary"
          size="medium"
          icon="plus"
          style={styles.createButton}
        >
          Créer un facteur personnalisé
        </PrimaryButton>

        <TouchableOpacity
          style={styles.archivedToggle}
          onPress={() => setShowArchived(!showArchived)}
        >
          <AppText variant="bodySmall" color="info" weight="semiBold">
            {showArchived ? 'Masquer les facteurs archivés' : `Voir les facteurs archivés (${archivedChips.length})`}
          </AppText>
          <MaterialCommunityIcons
            name={showArchived ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.primary[500]}
          />
        </TouchableOpacity>

        {showArchived && (
          <AppCard style={styles.listCard}>
            {archivedChips.length > 0 ? (
              archivedChips.map((chip, index) => (
                <View key={chip.id}>
                  <View style={styles.chipRow}>
                    <View style={styles.chipRowInfo}>
                      <AppText variant="bodyLarge" weight="semiBold" numberOfLines={1}>{chip.label}</AppText>
                      <AppText variant="bodySmall" color="tertiary">{CATEGORY_LABELS[chip.category] || chip.category}</AppText>
                    </View>
                    <TouchableOpacity onPress={() => handleUnarchive(chip)}>
                      <AppText variant="bodySmall" color="info" weight="semiBold">Restaurer</AppText>
                    </TouchableOpacity>
                  </View>
                  {index < archivedChips.length - 1 && <View style={styles.separator} />}
                </View>
              ))
            ) : (
              <AppText variant="bodySmall" color="tertiary">Aucun facteur archivé.</AppText>
            )}
          </AppCard>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={createModalVisible}
          onDismiss={() => setCreateModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <AppCard style={styles.modalCard}>
            <AppText variant="h2" style={styles.modalTitle}>Nouveau facteur</AppText>

            <AppText style={styles.fieldLabel}>Nom</AppText>
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder="Ex: Produits laitiers, Stress travail..."
              mode="outlined"
              maxLength={60}
              style={styles.input}
              outlineStyle={{ borderRadius: borderRadius.md }}
            />

            <AppText style={[styles.fieldLabel, { marginTop: spacing[4] }]}>Catégorie</AppText>
            <SegmentedControl
              options={CATEGORY_OPTIONS}
              selectedValue={newCategory}
              onValueChange={setNewCategory}
            />

            <View style={styles.modalActions}>
              <PrimaryButton onPress={handleCreate} variant="primary" size="medium" style={styles.modalButton}>
                Créer
              </PrimaryButton>
              <PrimaryButton
                onPress={() => setCreateModalVisible(false)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  hint: {
    marginBottom: spacing[3],
  },
  countRow: {
    alignItems: 'flex-end',
    marginBottom: spacing[2],
  },
  errorCard: {
    marginBottom: spacing[3],
  },
  listCard: {
    marginBottom: spacing[4],
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
  },
  chipRowInfo: {
    flex: 1,
    marginRight: spacing[3],
  },
  chipRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  archiveBtn: {
    padding: spacing[2],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  createButton: {
    marginBottom: spacing[4],
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
  },
  modalContainer: {
    margin: spacing[4],
    maxHeight: '90%',
  },
  modalCard: {
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...designSystem.shadows.xl,
    padding: spacing[5],
  },
  modalTitle: {
    color: colors.text.primary,
    marginBottom: spacing[5],
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 32,
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
  modalActions: {
    flexDirection: 'column',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  modalButton: {
    width: '100%',
  },
});

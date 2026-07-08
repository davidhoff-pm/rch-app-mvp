import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import storage from '../utils/storage';
import { saveFeedback, deleteFeedback } from '../utils/haptics';

/**
 * Hook pour gérer les opérations CRUD sur les selles
 */
export const useStoolManagement = ({ onDataChange }) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingStool, setEditingStool] = useState(null);
  const [editBristol, setEditBristol] = useState(4);
  const [editHasBlood, setEditHasBlood] = useState(false);
  const [editBloodOnly, setEditBloodOnly] = useState(false);
  const [editDateInput, setEditDateInput] = useState('');
  const [editTimeInput, setEditTimeInput] = useState('');

  const handleEditStool = (stool) => {
    setEditingStool(stool);
    setEditBristol(stool.bristolScale ?? 4);
    setEditHasBlood(stool.hasBlood);
    setEditBloodOnly(stool.bloodOnly || false);

    const date = new Date(stool.timestamp);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    setEditDateInput(dateStr);
    setEditTimeInput(timeStr);
    setEditModalVisible(true);
  };

  const hideEditModal = () => {
    setEditModalVisible(false);
    setEditingStool(null);
  };

  const parseDateTime = (dateStr, timeStr) => {
    try {
      const [day, month, year] = dateStr.split('/');
      const [hour, minute] = timeStr.split(':');

      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      return date;
    } catch (error) {
      return new Date();
    }
  };

  const handleSaveEdit = () => {
    if (!editingStool) return;

    const editDateTime = parseDateTime(editDateInput, editTimeInput);

    const updatedStool = {
      ...editingStool,
      timestamp: editDateTime.getTime(),
      bristolScale: editBloodOnly ? null : Math.round(editBristol),
      hasBlood: editBloodOnly || editHasBlood,
      bloodOnly: editBloodOnly,
    };

    const stoolsJson = storage.getString('dailySells');
    const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
    const updated = stools.map(s => s.id === editingStool.id ? updatedStool : s);
    storage.set('dailySells', JSON.stringify(updated));

    saveFeedback();
    hideEditModal();
    onDataChange?.();
  };

  const handleDeleteStool = (stoolId) => {
    const executeDelete = () => {
      deleteFeedback();
      const stoolsJson = storage.getString('dailySells');
      const stools = stoolsJson ? JSON.parse(stoolsJson) : [];
      const updated = stools.filter(s => s.id !== stoolId);
      storage.set('dailySells', JSON.stringify(updated));
      onDataChange?.();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette selle ?')) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la selle',
        'Êtes-vous sûr de vouloir supprimer cette selle ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', onPress: executeDelete, style: 'destructive' }
        ]
      );
    }
  };

  return {
    editModalVisible,
    editingStool,
    editBristol,
    editHasBlood,
    editBloodOnly,
    editDateInput,
    editTimeInput,
    setEditBristol,
    setEditHasBlood,
    setEditBloodOnly,
    setEditDateInput,
    setEditTimeInput,
    handleEditStool,
    hideEditModal,
    handleSaveEdit,
    handleDeleteStool,
  };
};

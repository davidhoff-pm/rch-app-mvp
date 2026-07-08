import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';

export const usePendingQuestionnaires = () => {
  const [pendingCount, setPendingCount] = useState(0);

  const calculatePending = () => {
    let count = 0;

    // P-SCCAI — cooldown 7 jours
    const psccaiLastUsedStr = storage.getString('psccaiLastUsed');
    if (!psccaiLastUsedStr) {
      count += 1;
    } else {
      const lastUsed = parseInt(psccaiLastUsedStr);
      const daysSince = Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) count += 1;
    }

    // IBDisk — cooldown 30 jours
    const ibdiskLastUsedStr = storage.getString('ibdiskLastUsed');
    if (!ibdiskLastUsedStr) {
      count += 1;
    } else {
      const lastUsed = parseInt(ibdiskLastUsedStr);
      const daysSince = Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24));
      if (daysSince >= 30) count += 1;
    }

    return count;
  };

  useFocusEffect(
    useCallback(() => {
      setPendingCount(calculatePending());
    }, [])
  );

  return pendingCount;
};

export default usePendingQuestionnaires;

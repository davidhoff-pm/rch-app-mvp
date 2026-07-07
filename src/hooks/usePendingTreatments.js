import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getPendingIntakesCount } from '../utils/treatmentUtils';

export const usePendingTreatments = () => {
  const [pendingCount, setPendingCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setPendingCount(getPendingIntakesCount());
    }, [])
  );

  return pendingCount;
};

export default usePendingTreatments;

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';
import { getSurveyDayKey } from '../utils/dayKey';

export const usePendingQuestionnaires = () => {
  const [pendingCount, setPendingCount] = useState(0);

  const calculatePending = () => {
    let count = 0;

    const todayKey = getSurveyDayKey(new Date(), 0);
    const dailySurveyJson = storage.getString('dailySurvey');

    if (dailySurveyJson) {
      const dailySurveyMap = JSON.parse(dailySurveyJson);
      if (!dailySurveyMap[todayKey]) count += 1;
    } else {
      count += 1;
    }

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

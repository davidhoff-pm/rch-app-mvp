import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import storage from '../utils/storage';

const STORAGE_KEY = 'trackingMode';
const SCORE_THRESHOLD = 4;
const CONSECUTIVE_DAYS_THRESHOLD = 7;
const INACTIVITY_DAYS_THRESHOLD = 7;

export function useTrackingMode() {
  const [mode, setModeState] = useState(() => {
    return storage.getString(STORAGE_KEY) || 'active';
  });

  useFocusEffect(
    useCallback(() => {
      setModeState(storage.getString(STORAGE_KEY) || 'active');
    }, [])
  );

  const setMode = useCallback((newMode) => {
    storage.set(STORAGE_KEY, newMode);
    setModeState(newMode);
  }, []);

  const isRemission = mode === 'remission';

  return { mode, setMode, isRemission };
}

export function useSuggestion(mode) {
  const suggestion = useMemo(() => {
    if (mode === 'active') {
      return checkSuggestRemission();
    }
    if (mode === 'remission') {
      return checkSuggestActive();
    }
    return null;
  }, [mode]);

  return suggestion;
}

function checkSuggestRemission() {
  const scoresJson = storage.getString('scoresHistory');
  const stoolsJson = storage.getString('dailySells');

  // Signal 1 : score ≤ 4 pendant ≥ 7 jours consécutifs
  if (scoresJson) {
    const scores = JSON.parse(scoresJson);
    if (scores.length >= CONSECUTIVE_DAYS_THRESHOLD) {
      const sorted = [...scores].sort((a, b) => b.date.localeCompare(a.date));
      const recent = sorted.slice(0, CONSECUTIVE_DAYS_THRESHOLD);

      const allLow = recent.every(s => s.score <= SCORE_THRESHOLD);
      const datesAreConsecutive = checkConsecutiveDates(recent.map(s => s.date));

      if (allLow && datesAreConsecutive) {
        return {
          type: 'suggest_remission',
          message: `Votre score est bas depuis ${CONSECUTIVE_DAYS_THRESHOLD} jours. Passer en mode rémission ?`,
        };
      }
    }
  }

  // Signal 2 : aucune selle depuis ≥ 7 jours
  if (stoolsJson) {
    const stools = JSON.parse(stoolsJson);
    if (stools.length > 0) {
      const latest = Math.max(...stools.map(s => s.timestamp));
      const daysSince = Math.floor((Date.now() - latest) / (1000 * 60 * 60 * 24));
      if (daysSince >= INACTIVITY_DAYS_THRESHOLD) {
        return {
          type: 'suggest_remission',
          message: `Aucune selle enregistrée depuis ${daysSince} jours. Passer en mode rémission ?`,
        };
      }
    }
  } else {
    // Pas de selles du tout — ne pas suggérer (l'utilisateur n'a peut-être pas commencé)
  }

  return null;
}

function checkSuggestActive() {
  const dismissedTs = storage.getString('suggestionActiveDismissedAt');
  if (dismissedTs) {
    const hoursSince = (Date.now() - parseInt(dismissedTs)) / (1000 * 60 * 60);
    if (hoursSince < 24) return null;
  }

  const stoolsJson = storage.getString('dailySells');
  if (stoolsJson) {
    const stools = JSON.parse(stoolsJson);
    if (stools.length > 0) {
      const latest = Math.max(...stools.map(s => s.timestamp));
      const today = new Date();
      const latestDate = new Date(latest);
      if (latestDate.toDateString() === today.toDateString()) {
        return {
          type: 'suggest_active',
          message: 'Vous avez enregistré une selle aujourd\'hui. Repasser en mode actif ?',
        };
      }
    }
  }

  const surveysJson = storage.getString('dailySurvey');
  if (surveysJson) {
    const surveys = JSON.parse(surveysJson);
    const todayKey = getTodayKey();
    if (surveys[todayKey]) {
      return {
        type: 'suggest_active',
        message: 'Vous avez complété un bilan aujourd\'hui. Repasser en mode actif ?',
      };
    }
  }

  return null;
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkConsecutiveDates(dates) {
  const sorted = [...dates].sort();
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) !== 1) return false;
  }
  return true;
}

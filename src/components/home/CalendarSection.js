import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import AppText from '../ui/AppText';
import storage from '../../utils/storage';
import calculateLichtigerScore from '../../utils/scoreCalculator';
import designSystem from '../../theme/designSystem';

/**
 * CalendarSection - Composant d'affichage du calendrier mensuel
 *
 * Affiche un calendrier avec 2 modes :
 * - score : Affiche le score de Lichtiger par jour
 * - bristol : Affiche le nombre de selles par jour
 */
const CalendarSection = ({
  calendarMonthOffset = 0,
  setCalendarMonthOffset,
  calendarMode = 'score',
  stools = [],
}) => {
  // Calcul des dates du mois
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startingDayOfWeek = firstDay.getDay();
  startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

  // Génération du tableau des jours
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  const remainingCells = days.length % 7;
  if (remainingCells > 0) {
    for (let i = 0; i < (7 - remainingCells); i++) {
      days.push(null);
    }
  }

  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const isCurrentMonth = calendarMonthOffset === 0;

  return (
    <View style={styles.calendarContainer}>
      {/* Header avec navigation mois */}
      <View style={styles.calendarMonthHeader}>
        <TouchableOpacity
          onPress={() => setCalendarMonthOffset(calendarMonthOffset - 1)}
          style={styles.monthNavButton}
        >
          <AppText style={styles.monthNavIcon}>←</AppText>
        </TouchableOpacity>

        <View style={styles.monthTitleContainer}>
          {isCurrentMonth && (
            <View style={styles.currentMonthBadge}>
              <AppText variant="labelSmall" style={styles.currentMonthText}>
                Aujourd'hui
              </AppText>
            </View>
          )}
          <AppText variant="headlineLarge" style={styles.calendarMonth}>
            {monthNames[month]} {year}
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => setCalendarMonthOffset(calendarMonthOffset + 1)}
          style={styles.monthNavButton}
        >
          <AppText style={styles.monthNavIcon}>→</AppText>
        </TouchableOpacity>
      </View>

      {/* Noms des jours */}
      <View style={styles.calendarHeader}>
        {dayNames.map((name, index) => (
          <View key={index} style={styles.dayNameCell}>
            <AppText variant="labelSmall" style={styles.dayName}>
              {name}
            </AppText>
          </View>
        ))}
      </View>

      {/* Grille des jours */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          let cellContent = null;
          let cellStyle = [styles.dayCell];
          let hasData = false;

          if (calendarMode === 'score') {
            const score = calculateLichtigerScore(dateStr, storage);
            if (score !== null) {
              hasData = true;
              // Couleurs sémantiques alignées sur la légende : vert / ambre / rouge
              let scoreColor = '#16A34A'; // Excellent (0-3)
              if (score >= 10) scoreColor = '#DC2626'; // Préoccupant (10+)
              else if (score >= 4) scoreColor = '#F59E0B'; // Acceptable (4-9)

              cellStyle.push(styles.dayCellWithScore, { backgroundColor: scoreColor });
              cellContent = (
                <View style={styles.dayCellContent}>
                  <AppText variant="headlineLarge" style={styles.scoreInCell}>
                    {score}
                  </AppText>
                </View>
              );
            }
          } else {
            const [y, m, d] = dateStr.split('-').map(Number);
            const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
            const dayEnd = dayStart + 24 * 60 * 60 * 1000;
            const dayEntries = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);

            if (dayEntries.length > 0) {
              hasData = true;
              cellStyle.push(styles.dayCellWithStools);
              cellContent = (
                <View style={styles.dayCellContent}>
                  <AppText variant="displayMedium" style={styles.stoolCountLarge}>
                    {dayEntries.length}
                  </AppText>
                </View>
              );
            }
          }

          if (!hasData) {
            cellStyle.push(styles.dayCellEmpty);
            cellContent = (
              <AppText variant="bodyMedium" style={styles.dayNumberEmpty}>
                {day}
              </AppText>
            );
          }

          return (
            <View key={index} style={cellStyle}>
              {cellContent}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: designSystem.borderRadius.lg,
    padding: designSystem.spacing[4],
    marginBottom: designSystem.spacing[4],
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: designSystem.spacing[4],
  },
  monthTitleContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: designSystem.spacing[1],
  },
  calendarMonth: {
    fontSize: 20,
    fontWeight: '700',
    color: '#101010',
    textAlign: 'center',
  },
  currentMonthBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: designSystem.spacing[2],
    paddingVertical: 4,
    borderRadius: designSystem.borderRadius.full,
    marginBottom: designSystem.spacing[1],
  },
  currentMonthText: {
    color: '#4C4DDC',
    fontWeight: '600',
  },
  monthNavButton: {
    padding: designSystem.spacing[2],
  },
  monthNavIcon: {
    fontSize: 24,
    color: '#4C4DDC',
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: designSystem.spacing[2],
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: designSystem.spacing[2],
  },
  dayName: {
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayCellWithScore: {
    borderRadius: designSystem.borderRadius.md,
  },
  dayCellWithStools: {
    backgroundColor: '#E0E7FF',
    borderRadius: designSystem.borderRadius.md,
  },
  dayCellEmpty: {
    // Style pour les cellules vides
  },
  dayCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInCell: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stoolCountLarge: {
    color: '#4C4DDC',
    fontWeight: '700',
  },
  dayNumberEmpty: {
    color: '#CBD5E1',
  },
});

export default CalendarSection;

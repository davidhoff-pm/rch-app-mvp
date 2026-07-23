import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';
import { getFactorChips } from '../../utils/factorChipsUtils';

const { colors, spacing, borderRadius } = designSystem;

const CATEGORY_COLORS = {
  alimentation: colors.secondary[500],
  comportement: colors.accent[500],
  autre: colors.primary[500],
};

/**
 * Overlay léger sous un graphique de tendance : un point par jour où au moins
 * un facteur (chip) a été taponné. Purement informatif — ne mesure aucune
 * corrélation ni causalité (cf. docs/FEATURE_SUIVI_LEGER.md §7).
 */
export default function ChipsOverlay({ dateRange, chipLogsByDate }) {
  const chipsById = React.useMemo(() => {
    const map = {};
    getFactorChips().forEach(c => { map[c.id] = c; });
    return map;
  }, []);

  const hasAnyMarker = dateRange.some(dateStr => (chipLogsByDate[dateStr] || []).length > 0);
  if (!hasAnyMarker) return null;

  const handleTapDay = (dateStr) => {
    const chipIds = chipLogsByDate[dateStr] || [];
    if (chipIds.length === 0) return;
    const labels = chipIds.map(id => chipsById[id]?.label || 'Facteur supprimé').join('\n· ');
    const [y, m, d] = dateStr.split('-');
    Alert.alert(`Facteurs du ${d}/${m}/${y}`, `· ${labels}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {dateRange.map((dateStr) => {
          const chipIds = chipLogsByDate[dateStr] || [];
          if (chipIds.length === 0) {
            return <View key={dateStr} style={styles.dotSlot} />;
          }
          const firstChip = chipsById[chipIds[0]];
          const color = CATEGORY_COLORS[firstChip?.category] || colors.primary[500];
          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dotSlot}
              onPress={() => handleTapDay(dateStr)}
              accessibilityLabel={`Facteurs du ${dateStr}`}
            >
              <View style={[styles.dot, { backgroundColor: color }]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <AppText variant="labelSmall" style={styles.disclaimer}>
        Ces marqueurs sont informatifs, ils n'établissent pas de lien de cause à effet.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
  disclaimer: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing[2],
  },
});

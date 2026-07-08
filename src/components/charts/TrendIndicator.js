import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import AppCard from '../ui/AppCard';
import designSystem from '../../theme/designSystem';

const { colors } = designSystem;

const TrendIndicator = ({ data, period, dataType = 'score' }) => {
  const getTrendAnalysis = () => {
    const validScores = data.filter(score => score !== null);
    if (validScores.length < 2) {
      return {
        direction: 'neutral',
        text: 'Données insuffisantes',
        icon: 'minus',
        color: colors.text.primary,
        backgroundColor: colors.primary[50],
        description: 'Enregistrez au moins 2 jours de données pour voir la tendance.',
        detail: null,
      };
    }

    const halfSize = Math.max(Math.floor(validScores.length / 2), 1);
    const recentHalf = validScores.slice(-halfSize);
    const olderHalf = validScores.slice(0, halfSize);

    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;

    const diff = recentAvg - olderAvg;
    const label = dataType === 'score' ? 'score' : 'nombre de selles';

    const formatAvg = (v) => v % 1 === 0 ? String(v) : v.toFixed(1);

    if (diff < -0.5) {
      return {
        direction: 'improving',
        text: 'En amélioration',
        icon: 'arrow-down',
        color: colors.health.excellent.dark,
        backgroundColor: colors.health.excellent.light,
        description: dataType === 'score'
          ? 'Votre score de Lichtiger est en baisse, ce qui indique une amélioration de vos symptômes.'
          : 'Votre fréquence de selles est en baisse.',
        detail: `Moyenne récente : ${formatAvg(recentAvg)}  ·  Moyenne précédente : ${formatAvg(olderAvg)}`,
      };
    }

    if (diff > 0.5) {
      return {
        direction: 'declining',
        text: 'En hausse',
        icon: 'arrow-up',
        color: colors.health.danger.dark,
        backgroundColor: colors.health.danger.light,
        description: dataType === 'score'
          ? 'Votre score de Lichtiger est en hausse, ce qui peut indiquer une aggravation. Consultez votre médecin si cela persiste.'
          : 'Votre fréquence de selles est en hausse. Consultez votre médecin si cela persiste.',
        detail: `Moyenne récente : ${formatAvg(recentAvg)}  ·  Moyenne précédente : ${formatAvg(olderAvg)}`,
      };
    }

    return {
      direction: 'stable',
      text: 'Stable',
      icon: 'minus',
      color: colors.health.moderate.dark,
      backgroundColor: colors.neutral[100],
      description: dataType === 'score'
        ? 'Votre score de Lichtiger reste stable sur la période.'
        : 'Votre fréquence de selles reste stable sur la période.',
      detail: `Moyenne : ${formatAvg(recentAvg)}`,
    };
  };

  const trend = getTrendAnalysis();

  return (
    <AppCard style={[styles.container, { backgroundColor: trend.backgroundColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: trend.color + '20' }]}>
          <MaterialCommunityIcons name={trend.icon} size={28} color={trend.color} />
        </View>
        <View style={styles.textContainer}>
          <AppText variant="labelSmall" style={styles.label}>
            Tendance
          </AppText>
          <AppText variant="headlineSmall" style={[styles.title, { color: trend.color }]}>
            {trend.text}
          </AppText>
        </View>
      </View>

      <AppText variant="bodyMedium" style={styles.description}>
        {trend.description}
      </AppText>

      {trend.detail && (
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={16} color={colors.text.secondary} />
          <AppText variant="bodySmall" style={styles.detailText}>
            {trend.detail}
          </AppText>
        </View>
      )}

      <View style={styles.methodInfo}>
        <MaterialCommunityIcons name="information-outline" size={14} color={colors.text.tertiary} />
        <AppText variant="labelSmall" style={styles.methodText}>
          Comparaison de la 1re et 2e moitié de la période ({period} jours de données)
        </AppText>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: designSystem.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: colors.text.secondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontWeight: '700',
  },
  description: {
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background.tertiary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: designSystem.borderRadius.sm,
    marginBottom: 12,
  },
  detailText: {
    color: colors.text.secondary,
    flex: 1,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  methodText: {
    color: colors.text.tertiary,
    flex: 1,
    lineHeight: 16,
  },
});

export default TrendIndicator;

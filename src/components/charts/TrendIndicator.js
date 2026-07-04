import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import AppCard from '../ui/AppCard';

const TrendIndicator = ({ data, period, dataType = 'score' }) => {
  // Calculer la tendance
  const getTrendAnalysis = () => {
    const validScores = data.filter(score => score !== null);
    if (validScores.length < 2) {
      return {
        direction: 'neutral',
        percentage: 0,
        text: 'Données insuffisantes',
        icon: 'minus',
        color: '#312620', // Color 03 - Noir pour meilleure lisibilité
        backgroundColor: '#FFF3EE', // Color 02
        description: 'Enregistrez au moins 2 scores pour voir l\'analyse de tendance.'
      };
    }

    // Comparer les 25% plus récents avec les 25% plus anciens
    // Pour 2-3 scores, comparer le premier et le dernier
    const quarterSize = validScores.length >= 4 ? Math.max(Math.floor(validScores.length / 4), 1) : 1;
    const recent = validScores.slice(-quarterSize);
    const older = validScores.slice(0, quarterSize);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const percentChange = olderAvg !== 0 ? ((diff / olderAvg) * 100) : 0;

    if (diff < -0.5) {
      return {
        direction: 'improving',
        percentage: Math.abs(percentChange).toFixed(1),
        text: 'Amélioration',
        icon: 'trending-up',
        color: '#397852', // Vert pastel foncé
        backgroundColor: '#D7F4E0', // Vert pastel clair
        description: dataType === 'score' 
          ? `Votre score moyen a diminué de ${Math.abs(percentChange).toFixed(1)}% sur cette période. C'est une excellente nouvelle !`
          : `Votre nombre de selles moyen a diminué de ${Math.abs(percentChange).toFixed(1)}% sur cette période. C'est une excellente nouvelle !`
      };
    }

    if (diff > 0.5) {
      return {
        direction: 'declining',
        percentage: Math.abs(percentChange).toFixed(1),
        text: 'Dégradation',
        icon: 'trending-down',
        color: '#C0392B', // Rouge pastel foncé
        backgroundColor: '#FBE3DF', // Rouge pastel clair
        description: dataType === 'score'
          ? `Votre score moyen a augmenté de ${Math.abs(percentChange).toFixed(1)}% sur cette période. Consultez votre médecin si nécessaire.`
          : `Votre nombre de selles moyen a augmenté de ${Math.abs(percentChange).toFixed(1)}% sur cette période. Consultez votre médecin si nécessaire.`
      };
    }

    return {
      direction: 'stable',
      percentage: Math.abs(percentChange).toFixed(1),
      text: 'Stable',
      icon: 'minus',
      color: '#C16046', // Color 01
      backgroundColor: '#E6E0DA', // Color 04 - Lavande clair
      description: dataType === 'score'
        ? `Votre score reste stable avec une variation de ${Math.abs(percentChange).toFixed(1)}% sur cette période.`
        : `Votre nombre de selles reste stable avec une variation de ${Math.abs(percentChange).toFixed(1)}% sur cette période.`
    };
  };

  const trend = getTrendAnalysis();

  return (
    <AppCard style={[styles.container, { backgroundColor: trend.backgroundColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: trend.color + '20' }]}>
          <MaterialCommunityIcons name={trend.icon} size={32} color={trend.color} />
        </View>
        <View style={styles.textContainer}>
          <AppText variant="labelSmall" style={styles.label}>
            Analyse de tendance
          </AppText>
          <AppText variant="headlineLarge" style={[styles.title, { color: trend.color }]}>
            {trend.text}
          </AppText>
        </View>
        {trend.percentage > 0 && (
          <View style={[styles.badge, { backgroundColor: trend.color }]}>
            <AppText variant="labelSmall" style={styles.badgeText}>
              {trend.percentage}%
            </AppText>
          </View>
        )}
      </View>

      {trend.description && (
        <AppText variant="bodyMedium" style={styles.description}>
          {trend.description}
        </AppText>
      )}

      <View style={styles.periodInfo}>
        <AppText variant="labelSmall" style={styles.periodText}>
          Basé sur les {period} derniers jours
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
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 28,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    color: '#312620', // Color 03
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  title: {
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  description: {
    color: '#312620', // Color 03
    lineHeight: 22,
    marginBottom: 12,
  },
  periodInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E6E0DA', // Color 04
  },
  periodText: {
    color: '#D4D4D8', // Color 05
    textAlign: 'center',
  },
});

export default TrendIndicator;


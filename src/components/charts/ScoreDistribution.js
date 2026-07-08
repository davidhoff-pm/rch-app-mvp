import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import AppCard from '../ui/AppCard';

const ScoreDistribution = ({ data, dataType = 'score' }) => {
  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 80, 500);
  const chartHeight = 200;

  // Calculer la distribution des scores
  const distribution = useMemo(() => {
    const validScores = data.filter(score => score !== null);
    if (validScores.length === 0) return [];

    // Compter chaque score de 0 à 13
    const counts = {};
    for (let i = 0; i <= 13; i++) {
      counts[i] = 0;
    }

    validScores.forEach(score => {
      counts[score] = (counts[score] || 0) + 1;
    });

    // Convertir en tableau avec pourcentages
    const total = validScores.length;
    const maxCount = Math.max(...Object.values(counts));

    return Object.keys(counts).map(score => ({
      score: parseInt(score),
      count: counts[score],
      percentage: ((counts[score] / total) * 100).toFixed(1),
      heightPercent: maxCount > 0 ? (counts[score] / maxCount) * 100 : 0
    }));
  }, [data]);

  if (distribution.length === 0) {
    return null;
  }

  // Regrouper par catégories
  const categories = useMemo(() => {
    if (dataType === 'score') {
      const excellent = distribution.filter(d => d.score <= 1).reduce((sum, d) => sum + d.count, 0);
      const acceptable = distribution.filter(d => d.score >= 2 && d.score <= 3).reduce((sum, d) => sum + d.count, 0);
      const preoccupant = distribution.filter(d => d.score >= 4).reduce((sum, d) => sum + d.count, 0);
      const total = excellent + acceptable + preoccupant;

      return [
        {
          label: 'Rémission',
          range: '0-1',
          count: excellent,
          percentage: total > 0 ? ((excellent / total) * 100).toFixed(0) : 0,
          color: '#397852', // Vert
          icon: 'circle'
        },
        {
          label: 'Activité légère',
          range: '2-3',
          count: acceptable,
          percentage: total > 0 ? ((acceptable / total) * 100).toFixed(0) : 0,
          color: '#AD7130', // Orange
          icon: 'circle'
        },
        {
          label: 'Activité modérée à sévère',
          range: '4-6',
          count: preoccupant,
          percentage: total > 0 ? ((preoccupant / total) * 100).toFixed(0) : 0,
          color: '#C0392B', // Rouge
          icon: 'circle'
        }
      ];
    } else {
      // Pour les selles : bon (0-3), moyen (4-6), élevé (7+)
      const bon = distribution.filter(d => d.score <= 3).reduce((sum, d) => sum + d.count, 0);
      const moyen = distribution.filter(d => d.score >= 4 && d.score <= 6).reduce((sum, d) => sum + d.count, 0);
      const eleve = distribution.filter(d => d.score >= 7).reduce((sum, d) => sum + d.count, 0);
      const total = bon + moyen + eleve;

      return [
        {
          label: 'Bon',
          range: '0-3',
          count: bon,
          percentage: total > 0 ? ((bon / total) * 100).toFixed(0) : 0,
          color: '#C16046', // Color 01
          icon: 'circle'
        },
        {
          label: 'Moyen',
          range: '4-6',
          count: moyen,
          percentage: total > 0 ? ((moyen / total) * 100).toFixed(0) : 0,
          color: '#C16046', // Color 01
          icon: 'circle'
        },
        {
          label: 'Élevé',
          range: '7+',
          count: eleve,
          percentage: total > 0 ? ((eleve / total) * 100).toFixed(0) : 0,
          color: '#312620', // Color 03 - Noir pour alertes
          icon: 'circle'
        }
      ];
    }
  }, [distribution, dataType]);

  return (
    <AppCard style={styles.container}>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcons name="chart-bar" size={28} color="#C16046" style={{ marginRight: 12 }} />
        <AppText variant="headlineLarge" style={styles.title}>
          {dataType === 'score' ? 'Répartition des Scores' : 'Répartition des Selles'}
        </AppText>
      </View>
      <AppText variant="bodyMedium" style={styles.subtitle}>
        {dataType === 'score' 
          ? 'Distribution de vos scores sur la période'
          : 'Distribution du nombre de selles par jour sur la période'}
      </AppText>

      {/* Barres d'histogramme */}
      <View style={styles.chartContainer}>
        {distribution.filter(d => d.count > 0).map((item) => {
          let barColor;
          if (dataType === 'score') {
            barColor = '#397852'; // Vert (0-1)
            if (item.score >= 4) barColor = '#C0392B'; // Rouge (4-6)
            else if (item.score >= 2) barColor = '#AD7130'; // Orange (2-3)
          } else {
            barColor = '#C16046'; // Color 01
            if (item.score >= 10) barColor = '#312620'; // Color 03 - Noir pour alertes
            else if (item.score >= 4) barColor = '#C16046'; // Color 01
          }

          return (
            <View key={item.score} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${item.heightPercent}%`,
                      backgroundColor: barColor 
                    }
                  ]}
                />
                {item.count > 0 && (
                  <AppText variant="labelSmall" style={styles.barValue}>
                    {item.count}
                  </AppText>
                )}
              </View>
              <AppText variant="labelSmall" style={styles.barLabel}>
                {item.score}
              </AppText>
            </View>
          );
        })}
      </View>

      {/* Catégories */}
      <View style={styles.categoriesContainer}>
        {categories.map((category, index) => (
          <View key={index} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <MaterialCommunityIcons name={category.icon} size={16} color={category.color} />
              <AppText variant="labelSmall" style={styles.categoryRange}>
                {category.range}
              </AppText>
            </View>
            <AppText variant="headlineLarge" style={[styles.categoryPercentage, { color: category.color }]}>
              {category.percentage}%
            </AppText>
            <AppText variant="labelSmall" style={styles.categoryLabel}>
              {category.label}
            </AppText>
            <AppText variant="labelSmall" style={styles.categoryCount}>
              {category.count} jour{category.count > 1 ? 's' : ''}
            </AppText>
          </View>
        ))}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  subtitle: {
    color: '#312620', // Color 03
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  barWrapper: {
    width: '100%',
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '80%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  barValue: {
    color: '#312620', // Color 03
    fontWeight: '600',
    marginTop: 4,
  },
  barLabel: {
    color: '#312620', // Color 03 - Noir pour meilleure lisibilité
    marginTop: 4,
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: '#FFF3EE', // Color 02
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6E0DA', // Color 04
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryRange: {
    color: '#312620', // Color 03
    fontWeight: '700',
  },
  categoryPercentage: {
    fontWeight: '700',
    marginBottom: 4,
  },
  categoryLabel: {
    color: '#312620', // Color 03
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryCount: {
    color: '#312620', // Color 03 - Noir pour meilleure lisibilité
  },
});

export default ScoreDistribution;


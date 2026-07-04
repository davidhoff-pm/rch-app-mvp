import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText, G } from 'react-native-svg';
import AppText from '../ui/AppText';
import AppCard from '../ui/AppCard';

const IBDiskChart = ({ data, date }) => {
  const { width } = Dimensions.get('window');
  const chartSize = Math.min(width - 100, 300);
  const center = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const maxValue = 10;

  // Fonction pour formater la date au format français DD/MM/YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const questions = [
    { key: 'abdominal_pain', label: 'Douleur\nabdominale', shortLabel: 'Douleur' },
    { key: 'bowel_regulation', label: 'Régulation\ndéfécation', shortLabel: 'Régulation' },
    { key: 'social_life', label: 'Vie\nsociale', shortLabel: 'Social' },
    { key: 'professional_activities', label: 'Activités\npro', shortLabel: 'Activités' },
    { key: 'sleep', label: 'Sommeil', shortLabel: 'Sommeil' },
    { key: 'energy', label: 'Énergie', shortLabel: 'Énergie' },
    { key: 'stress_anxiety', label: 'Stress', shortLabel: 'Stress' },
    { key: 'self_image', label: 'Image', shortLabel: 'Image' },
    { key: 'intimate_life', label: 'Intimité', shortLabel: 'Intimité' },
    { key: 'joint_pain', label: 'Articulations', shortLabel: 'Articulations' }
  ];

  // Fonction pour obtenir la couleur selon le score
  const getScoreColor = (value) => {
    if (value <= 3) return '#10B981'; // Vert pour les bons scores (0-3)
    if (value <= 6) return '#AD7130'; // Orange pour les scores moyens (4-6)
    return '#EF4444'; // Rouge pour les mauvais scores (7-10)
  };

  // Calculer les points du polygone
  const getPoints = () => {
    return questions.map((question, index) => {
      const value = data[question.key] || 0;
      const angle = (Math.PI * 2 * index) / questions.length - Math.PI / 2;
      const distance = (value / maxValue) * radius;
      const x = center + distance * Math.cos(angle);
      const y = center + distance * Math.sin(angle);
      return { x, y, value, color: getScoreColor(value) };
    });
  };

  // Calculer les positions des labels
  const getLabelPosition = (index) => {
    const angle = (Math.PI * 2 * index) / questions.length - Math.PI / 2;
    const distance = radius + 25;
    const x = center + distance * Math.cos(angle);
    const y = center + distance * Math.sin(angle);
    return { x, y };
  };

  const points = getPoints();
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Calculer la moyenne des scores
  const scores = Object.values(data).filter(score => typeof score === 'number');
  const averageScore = scores.length > 0 ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="headlineSmall" style={styles.title}>
          IBDisk : {formatDate(date)}
        </AppText>
        <AppText variant="bodyMedium" style={styles.subtitle}>
          Score moyen : {averageScore}/10
        </AppText>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={chartSize} height={chartSize}>
          {/* Cercles concentriques (grilles) */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={radius * ratio}
              stroke="#E2E8F0"
              strokeWidth="1"
              fill="none"
            />
          ))}

          {/* Lignes radiales */}
          {questions.map((_, index) => {
            const angle = (Math.PI * 2 * index) / questions.length - Math.PI / 2;
            const x2 = center + radius * Math.cos(angle);
            const y2 = center + radius * Math.sin(angle);
            return (
              <Line
                key={index}
                x1={center}
                y1={center}
                x2={x2}
                y2={y2}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
            );
          })}

          {/* Polygone des données avec couleur neutre */}
          <Polygon
            points={polygonPoints}
            fill="rgba(100, 116, 139, 0.1)"
            stroke="#84776F"
            strokeWidth="1"
          />

          {/* Points de données avec couleurs selon le score */}
          {points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill={point.color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          ))}

          {/* Labels */}
          {questions.map((question, index) => {
            const pos = getLabelPosition(index);
            return (
              <SvgText
                key={index}
                x={pos.x}
                y={pos.y}
                fontSize="10"
                fontWeight="600"
                fill="#84776F"
                textAnchor="middle"
              >
                {question.shortLabel}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Légende détaillée */}
      <View style={styles.legendContainer}>
        {questions.map((question, index) => {
          const value = data[question.key] || 0;
          const color = getScoreColor(value);
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <AppText variant="labelSmall" style={styles.legendLabel}>
                {question.shortLabel}
              </AppText>
              <AppText variant="labelSmall" style={[styles.legendValue, { color }]}>
                {value}/10
              </AppText>
            </View>
          );
        })}
      </View>

      {/* Légende des couleurs */}
      <View style={styles.colorLegendContainer}>
        <AppText variant="labelSmall" style={styles.colorLegendTitle}>
          Légende des couleurs :
        </AppText>
        <View style={styles.colorLegendItems}>
          <View style={styles.colorLegendItem}>
            <View style={[styles.colorLegendDot, { backgroundColor: '#10B981' }]} />
            <AppText variant="labelSmall" style={styles.colorLegendText}>
              0-3 : Très satisfaisant
            </AppText>
          </View>
          <View style={styles.colorLegendItem}>
            <View style={[styles.colorLegendDot, { backgroundColor: '#AD7130' }]} />
            <AppText variant="labelSmall" style={styles.colorLegendText}>
              4-6 : Modérément satisfaisant
            </AppText>
          </View>
          <View style={styles.colorLegendItem}>
            <View style={[styles.colorLegendDot, { backgroundColor: '#EF4444' }]} />
            <AppText variant="labelSmall" style={styles.colorLegendText}>
              7-10 : Peu satisfaisant
            </AppText>
          </View>
        </View>
      </View>

      {/* Interprétation */}
      <View style={styles.interpretationContainer}>
        <AppText variant="labelSmall" style={styles.interpretationTitle}>
          💡 Interprétation
        </AppText>
        <AppText variant="labelSmall" style={styles.interpretationText}>
          • 0-3 : Très satisfaisant{'\n'}
          • 4-6 : Modérément satisfaisant{'\n'}
          • 7-10 : Peu satisfaisant
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: '#2D3748',
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#312620', // Noir pour meilleure lisibilité
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    color: '#312620', // Noir pour meilleure lisibilité
    flex: 1,
  },
  legendValue: {
    fontWeight: '700',
  },
  colorLegendContainer: {
    backgroundColor: '#F5EFE8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  colorLegendTitle: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  colorLegendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '30%',
  },
  colorLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  colorLegendText: {
    color: '#312620', // Noir pour meilleure lisibilité
    fontSize: 11,
  },
  interpretationContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  interpretationTitle: {
    color: '#059669',
    fontWeight: '700',
    marginBottom: 8,
  },
  interpretationText: {
    color: '#047857',
    lineHeight: 18,
  },
});

export default IBDiskChart;

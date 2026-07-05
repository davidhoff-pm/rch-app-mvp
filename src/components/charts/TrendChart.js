import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import AppText from '../ui/AppText';

const TrendChart = ({ data, labels, period }) => {
  const { width } = Dimensions.get('window');
  const chartWidth = Math.min(width - 40, 600);
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;


  // Calculer les points du graphique
  const points = useMemo(() => {
    const validData = data.filter(d => d !== null);
    if (validData.length === 0) return [];

    const maxScore = Math.max(...validData, 12);
    const minScore = 0;
    const range = maxScore - minScore;

    return data.map((value, index) => {
      if (value === null) return null;

      const x = padding.left + (index / (data.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((value - minScore) / range) * innerHeight;

      // Déterminer la couleur selon le score - Palette unifiée
      let color = '#C16046'; // Color 01 - Principal
      if (value >= 7) color = '#312620'; // Color 03 - Noir pour alertes
      else if (value >= 4) color = '#C16046'; // Color 01 avec opacité différente

      return { x, y, value, color, index };
    }).filter(p => p !== null);
  }, [data, innerWidth, innerHeight, padding]);

  // Créer le chemin SVG pour la ligne
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  }, [points]);

  // Créer le chemin pour l'aire sous la courbe
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    
    let path = `M ${points[0].x} ${chartHeight - padding.bottom}`;
    path += ` L ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    path += ` L ${points[points.length - 1].x} ${chartHeight - padding.bottom}`;
    path += ' Z';
    
    return path;
  }, [points, chartHeight, padding]);


  // Grille horizontale
  const gridLines = [0, 3, 6, 9, 12].map(value => {
    const validData = data.filter(d => d !== null);
    const maxScore = Math.max(...validData, 12);
    const range = maxScore;
    const y = padding.top + innerHeight - (value / range) * innerHeight;

    return { value, y };
  });

  // Labels d'axe X (afficher seulement quelques labels pour éviter le chevauchement)
  const xLabels = useMemo(() => {
    const step = Math.ceil(labels.length / 6);
    return labels
      .map((label, index) => {
        if (index % step !== 0 && index !== labels.length - 1) return null;
        const x = padding.left + (index / (labels.length - 1)) * innerWidth;
        return { label, x, index };
      })
      .filter(l => l !== null);
  }, [labels, innerWidth, padding]);

  if (points.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AppText variant="bodyMedium" style={styles.emptyText}>
          Aucune donnée disponible pour cette période
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <svg width={chartWidth} height={chartHeight} style={styles.svg}>
        {/* Grille de fond */}
        <g>
          {gridLines.map((line, index) => (
            <g key={index}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="#E6E0DA"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 10}
                y={line.y + 4}
                fontSize="10"
                fill="#D4D4D8"
                textAnchor="end"
              >
                {line.value}
              </text>
            </g>
          ))}
        </g>

        {/* Zones colorées */}
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C16046" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#C16046" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Aire sous la courbe */}
        <path
          d={areaPath}
          fill="url(#areaGradient)"
        />

        {/* Ligne de données */}
        <path
          d={linePath}
          stroke="#C16046"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, index) => (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#FFFFFF"
              stroke={point.color}
              strokeWidth="3"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r="3"
              fill={point.color}
            />
          </g>
        ))}

        {/* Axe X */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#E6E0DA"
          strokeWidth="2"
        />

        {/* Labels X */}
        {xLabels.map((label, index) => (
          <text
            key={index}
            x={label.x}
            y={chartHeight - padding.bottom + 20}
            fontSize="10"
            fill="#312620"
            textAnchor="middle"
          >
            {label.label}
          </text>
        ))}

        {/* Axe Y */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="#E6E0DA"
          strokeWidth="2"
        />
      </svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  svg: {
    overflow: 'hidden',
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#312620', // Color 03 - Noir pour meilleure lisibilité
  },
});

export default TrendChart;


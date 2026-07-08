import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';

const MultiAxisTrendChart = ({ scoreData, bloodPercentageData, labels }) => {
  const { width } = Dimensions.get('window');
  // Ajuster pour les marges de la card (spacing[4] * 2 = 32px) + padding interne (40px)
  const chartWidth = Math.min(width - 80, 650);
  const chartHeight = 220;
  const padding = { top: 20, right: 15, bottom: 40, left: 40 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // === GRAPHIQUE 1 : SCORE PRO-2 (0-6) ===
  const scorePoints = useMemo(() => {
    const validData = scoreData.filter(d => d !== null);
    if (validData.length === 0) return [];

    const maxScore = 6;
    const minScore = 0;

    return scoreData.map((value, index) => {
      if (value === null) return null;

      const x = padding.left + (index / Math.max(scoreData.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - ((value - minScore) / (maxScore - minScore)) * innerHeight;

      let color = '#10B981'; // Vert pour bon score (0-1)
      if (value >= 4) color = '#C0392B'; // Rouge pour score élevé (4-6)
      else if (value >= 2) color = '#AD7130'; // Orange pour score moyen (2-3)

      return { x, y, value, color, index };
    }).filter(p => p !== null);
  }, [scoreData, innerWidth, innerHeight, padding]);

  const scoreLinePath = useMemo(() => {
    if (scorePoints.length < 2) return '';
    let path = `M ${scorePoints[0].x} ${scorePoints[0].y}`;
    for (let i = 1; i < scorePoints.length; i++) {
      path += ` L ${scorePoints[i].x} ${scorePoints[i].y}`;
    }
    return path;
  }, [scorePoints]);

  // === GRAPHIQUE 2 : % SELLES SANGLANTES ===
  const bloodPoints = useMemo(() => {
    const validData = bloodPercentageData.filter(d => d !== null);
    if (validData.length === 0) return [];

    const maxPercentage = 100;
    const minPercentage = 0;

    return bloodPercentageData.map((value, index) => {
      if (value === null) return null;

      const x = padding.left + (index / Math.max(bloodPercentageData.length - 1, 1)) * innerWidth;
      const y = padding.top + innerHeight - ((value - minPercentage) / (maxPercentage - minPercentage)) * innerHeight;

      return { x, y, value, index };
    }).filter(p => p !== null);
  }, [bloodPercentageData, innerWidth, innerHeight, padding]);

  const bloodLinePath = useMemo(() => {
    if (bloodPoints.length < 2) return '';
    let path = `M ${bloodPoints[0].x} ${bloodPoints[0].y}`;
    for (let i = 1; i < bloodPoints.length; i++) {
      path += ` L ${bloodPoints[i].x} ${bloodPoints[i].y}`;
    }
    return path;
  }, [bloodPoints]);

  // Labels d'axe X (partagés)
  const xLabels = useMemo(() => {
    const step = Math.ceil(labels.length / 6);
    return labels
      .map((label, index) => {
        if (index % step !== 0 && index !== labels.length - 1) return null;
        const x = padding.left + (index / Math.max(labels.length - 1, 1)) * innerWidth;
        return { label, x, index };
      })
      .filter(l => l !== null);
  }, [labels, innerWidth, padding]);

  if (scorePoints.length === 0 && bloodPoints.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <AppText variant="bodyMedium" style={styles.emptyText}>
          Aucune donnée disponible pour cette période
        </AppText>
      </View>
    );
  }

  // Grilles
  const scoreGridLines = [0, 1, 2, 3, 4, 5, 6].map(value => {
    const y = padding.top + innerHeight - ((value / 6) * innerHeight);
    return { value, y };
  });

  const bloodGridLines = [0, 25, 50, 75, 100].map(value => {
    const y = padding.top + innerHeight - ((value / 100) * innerHeight);
    return { value, y };
  });

  return (
    <View style={styles.container}>
      {/* GRAPHIQUE 1 : Score PRO-2 */}
      <View style={styles.chartSection}>
        <View style={styles.chartHeader}>
          <View style={styles.legendDot} />
          <AppText variant="labelLarge" style={styles.chartLabel}>
            Score PRO-2 (0-6)
          </AppText>
        </View>

        <svg width={chartWidth} height={chartHeight} style={styles.svg}>
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C16046" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#C16046" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grille */}
          {scoreGridLines.map((line, index) => (
            <g key={`score-grid-${index}`}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray={line.value === 0 ? "0" : "3 3"}
              />
              <text
                x={padding.left - 8}
                y={line.y + 4}
                fontSize="10"
                fill="#6B7280"
                textAnchor="end"
                fontWeight="500"
              >
                {line.value}
              </text>
            </g>
          ))}

          {/* Aire sous la courbe */}
          {scorePoints.length >= 2 && (() => {
            let areaPath = `M ${scorePoints[0].x} ${chartHeight - padding.bottom}`;
            areaPath += ` L ${scorePoints[0].x} ${scorePoints[0].y}`;
            for (let i = 1; i < scorePoints.length; i++) {
              areaPath += ` L ${scorePoints[i].x} ${scorePoints[i].y}`;
            }
            areaPath += ` L ${scorePoints[scorePoints.length - 1].x} ${chartHeight - padding.bottom} Z`;
            return <path d={areaPath} fill="url(#scoreGradient)" />;
          })()}

          {/* Ligne */}
          {scoreLinePath && (
            <path
              d={scoreLinePath}
              stroke="#C16046"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {scorePoints.map((point, index) => (
            <g key={`score-point-${index}`}>
              <circle cx={point.x} cy={point.y} r="6" fill="#FFFFFF" stroke={point.color} strokeWidth="2.5" />
              <circle cx={point.x} cy={point.y} r="3" fill={point.color} />
            </g>
          ))}

          {/* Axe X */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#9CA3AF"
            strokeWidth="2"
          />

          {/* Axe Y */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#9CA3AF"
            strokeWidth="2"
          />

          {/* Labels X */}
          {xLabels.map((label, index) => (
            <text
              key={`score-xlabel-${index}`}
              x={label.x}
              y={chartHeight - padding.bottom + 25}
              fontSize="11"
              fill="#6B7280"
              textAnchor="middle"
              fontWeight="500"
            >
              {label.label}
            </text>
          ))}
        </svg>
      </View>

      {/* GRAPHIQUE 2 : % Selles sanglantes */}
      <View style={[styles.chartSection, styles.secondChart]}>
        <View style={styles.chartHeader}>
          <View style={[styles.legendDot, styles.legendDotRed]} />
          <AppText variant="labelLarge" style={styles.chartLabel}>
            % Selles sanglantes (0-100%)
          </AppText>
        </View>

        <svg width={chartWidth} height={chartHeight} style={styles.svg}>
          <defs>
            <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C0392B" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#C0392B" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grille */}
          {bloodGridLines.map((line, index) => (
            <g key={`blood-grid-${index}`}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="#FBE3DF"
                strokeWidth="1"
                strokeDasharray={line.value === 0 ? "0" : "3 3"}
              />
              <text
                x={padding.left - 8}
                y={line.y + 4}
                fontSize="10"
                fill="#C0392B"
                textAnchor="end"
                fontWeight="500"
              >
                {line.value}%
              </text>
            </g>
          ))}

          {/* Aire sous la courbe */}
          {bloodPoints.length >= 2 && (() => {
            let areaPath = `M ${bloodPoints[0].x} ${chartHeight - padding.bottom}`;
            areaPath += ` L ${bloodPoints[0].x} ${bloodPoints[0].y}`;
            for (let i = 1; i < bloodPoints.length; i++) {
              areaPath += ` L ${bloodPoints[i].x} ${bloodPoints[i].y}`;
            }
            areaPath += ` L ${bloodPoints[bloodPoints.length - 1].x} ${chartHeight - padding.bottom} Z`;
            return <path d={areaPath} fill="url(#bloodGradient)" />;
          })()}

          {/* Ligne */}
          {bloodLinePath && (
            <path
              d={bloodLinePath}
              stroke="#C0392B"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {bloodPoints.map((point, index) => (
            <g key={`blood-point-${index}`}>
              <circle cx={point.x} cy={point.y} r="6" fill="#FFFFFF" stroke="#C0392B" strokeWidth="2.5" />
              <circle cx={point.x} cy={point.y} r="3" fill="#C0392B" />
            </g>
          ))}

          {/* Axe X */}
          <line
            x1={padding.left}
            y1={chartHeight - padding.bottom}
            x2={chartWidth - padding.right}
            y2={chartHeight - padding.bottom}
            stroke="#F87171"
            strokeWidth="2"
          />

          {/* Axe Y */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={chartHeight - padding.bottom}
            stroke="#F87171"
            strokeWidth="2"
          />

          {/* Labels X */}
          {xLabels.map((label, index) => (
            <text
              key={`blood-xlabel-${index}`}
              x={label.x}
              y={chartHeight - padding.bottom + 25}
              fontSize="11"
              fill="#6B7280"
              textAnchor="middle"
              fontWeight="500"
            >
              {label.label}
            </text>
          ))}
        </svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: designSystem.spacing[4],
    alignItems: 'center',
    width: '100%',
  },
  chartSection: {
    marginBottom: designSystem.spacing[6],
    width: '100%',
    alignItems: 'center',
  },
  secondChart: {
    marginTop: designSystem.spacing[2],
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[3],
    paddingLeft: designSystem.spacing[2],
    width: '100%',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#C16046',
    marginRight: designSystem.spacing[2],
  },
  legendDotRed: {
    backgroundColor: '#C0392B',
  },
  chartLabel: {
    color: designSystem.colors.text.primary,
    fontWeight: '600',
  },
  svg: {
    overflow: 'hidden',
  },
  emptyContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: designSystem.colors.text.secondary,
  },
});

export default MultiAxisTrendChart;


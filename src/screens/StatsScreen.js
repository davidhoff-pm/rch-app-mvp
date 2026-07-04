import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SegmentedButtons } from 'react-native-paper';
import storage from '../utils/storage';
import AppText from '../components/ui/AppText';
import AppCard from '../components/ui/AppCard';
import StatCard from '../components/ui/StatCard';
import SegmentedControl from '../components/ui/SegmentedControl';
import TrendChart from '../components/charts/TrendChart';
import MultiAxisTrendChart from '../components/charts/MultiAxisTrendChart';
import TrendIndicator from '../components/charts/TrendIndicator';
import ScoreDistribution from '../components/charts/ScoreDistribution';
import KeyInsights from '../components/charts/KeyInsights';
import HourlyHeatmap from '../components/charts/HourlyHeatmap';
import EmptyState from '../components/ui/EmptyState';
import SkeletonStats from '../components/ui/SkeletonStats';
import HistoryOverview from '../components/history/HistoryOverview';
import { useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import designSystem from '../theme/designSystem';

export default function StatsScreen() {
  const [scores, setScores] = useState([]);
  const [stools, setStools] = useState([]);
  const [period, setPeriod] = useState('30'); // 7, 30, 90 jours
  const [dataType, setDataType] = useState('score'); // 'score' ou 'stools'
  const [isLoading, setIsLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    loadData();
    // Simuler un court délai pour montrer les skeletons
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Recharger les données à chaque fois qu'on navigue vers cet écran
  useFocusEffect(
    React.useCallback(() => {
      setIsLoading(true);
      loadData();
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }, [])
  );

  // Recharger les données périodiquement pour capturer les changements
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 2000); // Recharger toutes les 2 secondes

    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    // Charger les scores
    const scoresJson = storage.getString('scoresHistory');
    if (scoresJson) {
      const history = JSON.parse(scoresJson);
      setScores(history);
    } else {
      setScores([]);
    }

    // Charger les selles
    const stoolsJson = storage.getString('dailySells');
    if (stoolsJson) {
      const stoolsData = JSON.parse(stoolsJson);
      setStools(stoolsData);
    } else {
      setStools([]);
    }
  };

  const chartData = useMemo(() => {
    const days = parseInt(period);
    const today = new Date();
    const startDate = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    
    const dateRange = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      dateRange.push(dateStr);
    }

    const labels = dateRange.map(dateStr => {
      const date = new Date(dateStr);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    });

    if (dataType === 'score') {
      // Données des scores
      const chartDataArray = dateRange.map(dateStr => {
        const scoreEntry = scores.find(s => s.date === dateStr);
        return scoreEntry ? scoreEntry.score : null;
      });

      // Calculer le pourcentage de selles sanglantes pour chaque jour
      const bloodPercentageArray = dateRange.map(dateStr => {
        // Convertir la date en timestamps (début et fin du jour)
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        
        // Filtrer les selles de ce jour
        const dayStools = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);
        
        if (dayStools.length === 0) return null;
        
        // Compter les selles avec sang
        const stoolsWithBlood = dayStools.filter(s => s.hasBlood).length;
        
        // Calculer le pourcentage
        const percentage = (stoolsWithBlood / dayStools.length) * 100;
        return Math.round(percentage);
      });

      const validScores = chartDataArray.filter(score => score !== null);
      const average = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null;
      const min = validScores.length > 0 ? Math.min(...validScores) : null;
      const max = validScores.length > 0 ? Math.max(...validScores) : null;

      return {
        labels,
        data: chartDataArray,
        bloodPercentageData: bloodPercentageArray,
        average,
        min,
        max,
        validDays: validScores.length,
        totalDays: days
      };
    } else {
      // Données des selles (nombre de selles par jour)
      const chartDataArray = dateRange.map(dateStr => {
        // Convertir la date en timestamps (début et fin du jour)
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
        const dayEnd = dayStart + 24 * 60 * 60 * 1000;
        
        // Filtrer les selles de ce jour
        const dayStool = stools.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd);
        return dayStool.length > 0 ? dayStool.length : null;
      });

      const validDays = chartDataArray.filter(count => count !== null);
      const average = validDays.length > 0 ? validDays.reduce((a, b) => a + b, 0) / validDays.length : null;
      const min = validDays.length > 0 ? Math.min(...validDays) : null;
      const max = validDays.length > 0 ? Math.max(...validDays) : null;

      // Calcul du nombre total de selles
      const totalStools = validDays.length > 0 ? validDays.reduce((a, b) => a + b, 0) : 0;

      return {
        labels,
        data: chartDataArray,
        average,
        min,
        max,
        validDays: validDays.length,
        totalDays: days,
        totalStools
      };
    }
  }, [scores, stools, period, dataType]);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Sélecteur de type de données */}
      <View style={styles.dataTypeSection}>
        <SegmentedButtons
          value={dataType}
          onValueChange={setDataType}
          buttons={[
            {
              value: 'score',
              label: 'Score Lichtiger',
              icon: 'chart-line',
            },
            {
              value: 'stools',
              label: 'Selles',
              icon: 'toilet',
            },
          ]}
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: '#C16046', // Color 01 pour le bouton sélectionné
              onSecondaryContainer: '#FFFFFF',
            }
          }}
        />
      </View>

      {/* Sélecteur de période */}
      <View style={styles.periodSection}>
        <SegmentedControl
          options={[
            { value: '7', label: '7 jours' },
            { value: '30', label: '30 jours' },
            { value: '90', label: '90 jours' }
          ]}
          selectedValue={period}
          onValueChange={setPeriod}
        />
      </View>

      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonStats count={4} />
        </View>
      ) : chartData.validDays > 0 ? (
        <>
          {/* Cartes de statistiques */}
          <View style={styles.statsGrid}>
            {dataType === 'score' ? (
              <>
                <StatCard
                  title="Score moyen"
                  value={chartData.average !== null ? chartData.average.toFixed(1) : 'N/A'}
                  subtitle={`Sur ${chartData.validDays} jours`}
                  icon="chart-bar"
                  color={chartData.average !== null ? (chartData.average < 5 ? 'success' : chartData.average <= 10 ? 'warning' : 'error') : 'info'}
                />
                
                <StatCard
                  title="Meilleur résultat"
                  value={chartData.min !== null ? chartData.min.toString() : 'N/A'}
                  subtitle="Score minimum"
                  icon="target"
                  color="improvement"
                />
                
                <StatCard
                  title="Score maximum"
                  value={chartData.max !== null ? chartData.max.toString() : 'N/A'}
                  subtitle="Résultat le plus élevé"
                  icon="alert-circle"
                  color="decline"
                />
              </>
            ) : (
              <>
                <StatCard
                  title="Moyenne par jour"
                  value={chartData.average !== null ? chartData.average.toFixed(1) : 'N/A'}
                  subtitle={`Sur ${chartData.validDays} jours`}
                  icon="chart-bar"
                  color={chartData.average !== null ? (chartData.average <= 3 ? 'success' : chartData.average <= 6 ? 'warning' : 'error') : 'info'}
                />
                
                <StatCard
                  title="Jour le plus calme"
                  value={chartData.min !== null ? chartData.min.toString() : 'N/A'}
                  subtitle="Minimum de selles"
                  icon="check-circle"
                  color="improvement"
                />
                
                <StatCard
                  title="Jour le plus actif"
                  value={chartData.max !== null ? chartData.max.toString() : 'N/A'}
                  subtitle="Maximum de selles"
                  icon="alert-circle"
                  color="decline"
                />
              </>
            )}
          </View>

          {/* Graphique d'évolution - style de titre harmonisé */}
          <AppCard style={styles.chartCard}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={28} color="#C16046" style={{ marginRight: 12 }} />
              <AppText variant="headlineLarge" style={styles.chartTitle}>
                {dataType === 'score' ? 'Indicateurs' : 'Évolution des Selles'}
              </AppText>
            </View>
            <AppText variant="bodyMedium" style={styles.chartSubtitle}>
              {dataType === 'score' ? 'Score Lichtiger et pourcentage de selles sanglantes' : 'Nombre de selles par jour sur la période'}
            </AppText>

            {Platform.OS === 'web' ? (
              dataType === 'score' && chartData.bloodPercentageData ? (
                <MultiAxisTrendChart 
                  scoreData={chartData.data} 
                  bloodPercentageData={chartData.bloodPercentageData}
                  labels={chartData.labels}
                />
              ) : (
                <TrendChart 
                  data={chartData.data} 
                  labels={chartData.labels}
                  period={chartData.totalDays}
                />
              )
            ) : (
              <View style={styles.nativeChartPlaceholder}>
                <AppText variant="bodyLarge" style={styles.placeholderText}>
                  Graphique interactif disponible sur la version web
                </AppText>
                <AppText variant="bodyMedium" style={styles.placeholderSubtext}>
                  {chartData.validDays} jours de données disponibles
                </AppText>
              </View>
            )}
          </AppCard>

          {/* Heatmap horaire (uniquement pour les selles) */}
          {dataType === 'stools' && (
            <HourlyHeatmap stools={stools.filter(Boolean)} periodDays={chartData.totalDays} />
          )}

          {/* Analyse de tendance */}
          {chartData.validDays >= 2 && (
            <TrendIndicator 
              data={chartData.data} 
              period={chartData.validDays}
              dataType={dataType}
            />
          )}

          {/* Répartition des scores/selles (Histogramme) */}
          {chartData.validDays >= 3 && (
            <ScoreDistribution 
              data={chartData.data}
              dataType={dataType}
            />
          )}

          {/* Points Clés (Analyses médicales) - uniquement pour les scores */}
          {chartData.validDays >= 7 && dataType === 'score' && (
            <KeyInsights data={chartData.data} />
          )}
        </>
      ) : (
        <EmptyState
          icon="chart-line-variant"
          title="Aucune donnée disponible"
          description="Enregistrez des selles et complétez vos bilans pour voir l'évolution de votre santé. Conseil : Utilisez le Mode Développeur dans les Paramètres pour générer des données de test."
          variant="default"
        />
      )}

      {/* Historique, calendrier et IBDisk (déplacés depuis l'accueil) */}
      <HistoryOverview />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designSystem.colors.background.primary,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingTop: designSystem.spacing[4],
  },
  dataTypeSection: {
    paddingHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[4],
  },
  segmentedButtons: {
    // Le theme est configuré via la prop theme du composant
  },
  periodSection: {
    paddingHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  sectionTitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[3],
  },
  statsGrid: {
    paddingHorizontal: designSystem.spacing[4],
    gap: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  skeletonContainer: {
    paddingHorizontal: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  chartCard: {
    marginLeft: designSystem.spacing[2],
    marginRight: designSystem.spacing[4],
    marginBottom: designSystem.spacing[6],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: designSystem.spacing[1],
    paddingRight: designSystem.spacing[2],
  },
  chartTitle: {
    color: designSystem.colors.text.primary,
    fontWeight: '700',
  },
  chartSubtitle: {
    color: designSystem.colors.text.primary,
    marginBottom: designSystem.spacing[4],
  },
  nativeChartPlaceholder: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: designSystem.colors.background.secondary,
    borderRadius: designSystem.borderRadius.base,
    padding: designSystem.spacing[6],
  },
  placeholderText: {
    color: designSystem.colors.text.secondary,
    textAlign: 'center',
    marginBottom: designSystem.spacing[2],
  },
  placeholderSubtext: {
    color: designSystem.colors.text.tertiary,
    textAlign: 'center',
  },
});

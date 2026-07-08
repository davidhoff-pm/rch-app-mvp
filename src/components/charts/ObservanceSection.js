import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import AppCard from '../ui/AppCard';
import SegmentedControl from '../ui/SegmentedControl';
import designSystem from '../../theme/designSystem';
import {
  getActiveTherapeuticSchemas,
  getHistoricalTherapeuticSchemas,
  getMedications,
  calculateAdherence,
  getDailyAdherenceData,
  formatFrequency,
} from '../../utils/treatmentUtils';

const { colors, spacing, borderRadius } = designSystem;

const PERIOD_OPTIONS = [
  { value: '7', label: '7j' },
  { value: '30', label: '30j' },
  { value: '90', label: '90j' },
  { value: 'all', label: 'Tout' },
];

function AdherenceBar({ ratio, width }) {
  const barHeight = Math.max(width * ratio, ratio > 0 ? 2 : 0);
  const barColor = ratio >= 1 ? colors.secondary[500] : ratio > 0 ? colors.accent[500] : colors.neutral[200];

  return (
    <View style={[styles.barSlot, { width }]}>
      <View style={[styles.barFill, { height: barHeight, backgroundColor: barColor }]} />
    </View>
  );
}

function AdherenceChart({ schema, period }) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - spacing[4] * 2 - spacing[4] * 2;

  const dailyData = useMemo(() => {
    const days = period === 'all'
      ? Math.ceil((Date.now() - new Date(schema.startDate).getTime()) / 86400000) + 1
      : parseInt(period);
    return getDailyAdherenceData(schema, days);
  }, [schema, period]);

  if (dailyData.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <AppText variant="bodySmall" style={styles.emptyChartText}>
          Pas de données sur cette période
        </AppText>
      </View>
    );
  }

  const maxBars = Math.min(dailyData.length, 90);
  const displayData = dailyData.slice(-maxBars);
  const barWidth = Math.max(Math.floor(chartWidth / displayData.length) - 2, 3);

  const daysWithExpected = displayData.filter(d => d.expected > 0);
  const fullyTaken = daysWithExpected.filter(d => d.ratio >= 1).length;
  const periodAdherence = daysWithExpected.length > 0
    ? Math.round((fullyTaken / daysWithExpected.length) * 100)
    : 0;

  return (
    <View>
      <View style={styles.chartSummary}>
        <AppText variant="bodySmall" style={styles.chartSummaryText}>
          {fullyTaken}/{daysWithExpected.length} jours complets · {periodAdherence}% d'observance
        </AppText>
      </View>
      <View style={styles.chartContainer}>
        <View style={[styles.chartBars, { height: barWidth * 1.5 + 20 }]}>
          {displayData.map((day, i) => (
            <AdherenceBar
              key={day.date}
              ratio={day.ratio !== null ? day.ratio : 0}
              width={barWidth}
            />
          ))}
        </View>
        <View style={styles.chartLabels}>
          <AppText variant="labelSmall" style={styles.chartLabel}>
            {displayData[0]?.date.slice(5).replace('-', '/')}
          </AppText>
          <AppText variant="labelSmall" style={styles.chartLabel}>
            {displayData[displayData.length - 1]?.date.slice(5).replace('-', '/')}
          </AppText>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.secondary[500] }]} />
          <AppText variant="labelSmall" style={styles.legendText}>Complet</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent[500] }]} />
          <AppText variant="labelSmall" style={styles.legendText}>Partiel</AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.neutral[200] }]} />
          <AppText variant="labelSmall" style={styles.legendText}>Manqué</AppText>
        </View>
      </View>
    </View>
  );
}

function SchemaTimeline({ schemas, medications, period }) {
  return schemas.map((schema, index) => {
    const med = medications[schema.medicationId];
    if (!med) return null;

    const isLast = index === schemas.length - 1;

    return (
      <View key={schema.id}>
        {index > 0 && (
          <View style={styles.schemaChange}>
            <View style={styles.schemaChangeLine} />
            <AppText variant="labelSmall" style={styles.schemaChangeText}>
              Posologie modifiée le {schema.startDate.slice(8)}/{schema.startDate.slice(5, 7)}
            </AppText>
            <View style={styles.schemaChangeLine} />
          </View>
        )}
        <View style={styles.schemaInfo}>
          <AppText variant="labelSmall" style={styles.schemaFreq}>
            {formatFrequency(schema.frequency)}
            {schema.endDate ? ` · terminé le ${schema.endDate.slice(8)}/${schema.endDate.slice(5, 7)}` : ' · en cours'}
          </AppText>
        </View>
        <AdherenceChart schema={schema} period={period} />
      </View>
    );
  });
}

export default function ObservanceSection() {
  const [expandedMed, setExpandedMed] = useState(null);
  const [period, setPeriod] = useState('30');
  const [showArchived, setShowArchived] = useState(false);

  const { activeGroups, archivedGroups, medications } = useMemo(() => {
    const meds = getMedications();
    const active = getActiveTherapeuticSchemas();
    const historical = getHistoricalTherapeuticSchemas();

    const aGroups = {};
    for (const schema of active) {
      const medId = schema.medicationId;
      if (!aGroups[medId]) aGroups[medId] = [];
      aGroups[medId].push(schema);
    }

    const hGroups = {};
    for (const schema of historical) {
      const medId = schema.medicationId;
      if (aGroups[medId]) continue;
      if (!hGroups[medId]) hGroups[medId] = [];
      hGroups[medId].push(schema);
    }

    for (const medId of Object.keys(hGroups)) {
      hGroups[medId].sort((a, b) => a.startDate.localeCompare(b.startDate));
    }

    return { activeGroups: aGroups, archivedGroups: hGroups, medications: meds };
  }, []);

  const activeMedIds = Object.keys(activeGroups);
  const archivedMedIds = Object.keys(archivedGroups);

  if (activeMedIds.length === 0 && archivedMedIds.length === 0) return null;

  const renderTreatmentCard = (medId, groups) => {
    const med = medications[medId];
    if (!med) return null;

    const schemas = groups[medId];
    const latestSchema = schemas[schemas.length - 1];
    const adherence = calculateAdherence(latestSchema);
    const isActive = !latestSchema.endDate;
    const isExpanded = expandedMed === medId;

    const adherenceColor = adherence >= 80
      ? colors.secondary[500]
      : adherence >= 50
      ? colors.accent[500]
      : colors.health.danger.main;

    return (
      <AppCard key={medId} style={styles.treatmentCard}>
        <TouchableOpacity
          onPress={() => setExpandedMed(isExpanded ? null : medId)}
          style={styles.treatmentRow}
          activeOpacity={0.7}
        >
          <View style={styles.treatmentLeft}>
            <View style={[styles.adherenceCircle, { borderColor: adherenceColor }]}>
              <AppText variant="labelSmall" style={[styles.adherenceText, { color: adherenceColor }]}>
                {adherence}
              </AppText>
            </View>
            <View style={styles.treatmentInfo}>
              <AppText variant="body" style={styles.treatmentName}>{med.name}</AppText>
              <AppText variant="labelSmall" style={styles.treatmentFreq}>
                {formatFrequency(latestSchema.frequency)}
                {!isActive && ' · Terminé'}
              </AppText>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <SegmentedControl
              options={PERIOD_OPTIONS}
              selectedValue={period}
              onValueChange={setPeriod}
              style={styles.periodFilter}
            />
            <SchemaTimeline
              schemas={schemas}
              medications={medications}
              period={period}
            />
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="pill" size={22} color={colors.primary[500]} />
        <AppText variant="h3" style={styles.sectionTitle}>Observance traitement</AppText>
      </View>

      {activeMedIds.map(medId => renderTreatmentCard(medId, activeGroups))}

      {archivedMedIds.length > 0 && (
        <>
          <TouchableOpacity
            onPress={() => setShowArchived(!showArchived)}
            style={styles.archivedToggle}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="archive-outline" size={16} color={colors.text.tertiary} />
            <AppText variant="labelSmall" style={styles.archivedToggleText}>
              Traitements terminés ({archivedMedIds.length})
            </AppText>
            <MaterialCommunityIcons
              name={showArchived ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>
          {showArchived && archivedMedIds.map(medId => renderTreatmentCard(medId, archivedGroups))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  sectionTitle: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  treatmentCard: {
    marginBottom: spacing[3],
  },
  treatmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  treatmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
  },
  adherenceCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adherenceText: {
    fontWeight: '700',
    fontSize: 12,
  },
  treatmentInfo: {
    flex: 1,
  },
  treatmentName: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  treatmentFreq: {
    color: colors.text.tertiary,
    marginTop: 2,
  },
  expandedContent: {
    marginTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[4],
  },
  periodFilter: {
    marginBottom: spacing[4],
  },
  schemaInfo: {
    marginBottom: spacing[2],
  },
  schemaFreq: {
    color: colors.text.secondary,
  },
  schemaChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginVertical: spacing[3],
  },
  schemaChangeLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.light,
  },
  schemaChangeText: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  chartContainer: {
    marginBottom: spacing[2],
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  barSlot: {
    justifyContent: 'flex-end',
  },
  barFill: {
    borderRadius: 2,
    minWidth: 3,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  chartLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
  },
  chartSummary: {
    marginBottom: spacing[2],
  },
  chartSummaryText: {
    color: colors.text.secondary,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing[4],
    marginTop: spacing[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.text.tertiary,
  },
  emptyChart: {
    padding: spacing[4],
    alignItems: 'center',
  },
  emptyChartText: {
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    justifyContent: 'center',
  },
  archivedToggleText: {
    color: colors.text.tertiary,
  },
});

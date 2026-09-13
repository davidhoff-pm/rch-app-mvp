import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import designSystem from '../../theme/designSystem';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue, 
  color = 'primary',
  style 
}) {
  const theme = useTheme();
  
  const getColor = () => {
    switch (color) {
      case 'success': return designSystem.colors.secondary[600]; // Vert pastel pour amélioration/minimum
      case 'warning': return theme.colors.warning;
      case 'error': return designSystem.colors.health.danger.main; // Rouge pastel pour dégradation/maximum
      case 'info': return theme.colors.info;
      case 'improvement': return designSystem.colors.secondary[600]; // Vert pastel
      case 'decline': return designSystem.colors.health.danger.main; // Rouge pastel
      default: return theme.colors.primary;
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      case 'stable': return 'minus';
      default: return null;
    }
  };

  const getTrendColor = () => {
    if (!trend) return theme.colors.onSurfaceVariant;
    switch (trend) {
      case 'up': return theme.colors.success;
      case 'down': return theme.colors.error;
      case 'stable': return theme.colors.warning;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <Card style={[styles.card, style]} elevation={0}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { 
            backgroundColor: (color === 'success' || color === 'improvement') ? designSystem.colors.secondary[100] : 
                            (color === 'error' || color === 'decline') ? designSystem.colors.health.danger.light : 
                            getColor() + '15' 
          }]}>
            <MaterialCommunityIcons name={icon} size={28} color={getColor()} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="labelMedium" style={styles.title}>{title}</AppText>
            {trend && trendValue && (
              <View style={styles.trendContainer}>
                <MaterialCommunityIcons 
                  name={getTrendIcon()} 
                  size={16} 
                  color={getTrendColor()} 
                  style={{ marginRight: 6 }}
                />
                <AppText style={[styles.trendText, { color: getTrendColor() }]}>
                  {trendValue}
                </AppText>
              </View>
            )}
          </View>
        </View>
        
        <AppText variant="displayLarge" style={[styles.value, { color: getColor() }]}>
          {value}
        </AppText>
        
        {subtitle && (
          <AppText variant="labelSmall" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: designSystem.colors.background.tertiary,
    borderWidth: 1,
    borderColor: designSystem.colors.border.light, // bordure beige chaude
    shadowColor: designSystem.colors.neutral[700], // ombre douce chaude
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: designSystem.colors.text.primary, // Color 03
    marginBottom: 6,
    fontWeight: '500',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: 16,
    marginRight: 6,
    fontWeight: '600',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  value: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 36,
    lineHeight: 44,
  },
  subtitle: {
    color: designSystem.colors.text.primary, // Color 03 - Noir pour meilleure lisibilité
    fontWeight: '400',
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';

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
      case 'success': return '#16A34A'; // Vert pastel pour amélioration/minimum
      case 'warning': return theme.colors.warning;
      case 'error': return '#DC2626'; // Rouge pastel pour dégradation/maximum
      case 'info': return theme.colors.info;
      case 'improvement': return '#16A34A'; // Vert pastel
      case 'decline': return '#DC2626'; // Rouge pastel
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
            backgroundColor: (color === 'success' || color === 'improvement') ? '#D1FAE5' : 
                            (color === 'error' || color === 'decline') ? '#FEE2E2' : 
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
    borderRadius: 16, // borderRadius.lg - angles maîtrisés
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8FB', // bordure très légère
    shadowColor: '#1E1B4B', // ombre douce teintée indigo
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#101010', // Color 03
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
    color: '#101010', // Color 03 - Noir pour meilleure lisibilité
    fontWeight: '400',
  },
});

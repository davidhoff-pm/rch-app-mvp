import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from './AppText';
import designSystem from '../../theme/designSystem';

/**
 * Badge de notification pour afficher un compteur
 * Utilisé principalement dans la tab bar
 *
 * Usage:
 * <NotificationBadge count={2} />
 */

const NotificationBadge = ({ count = 0, size = 'medium' }) => {
  if (count <= 0) return null;

  const displayCount = count > 9 ? '9+' : count.toString();

  const sizeConfig = {
    small: {
      container: 16,
      fontSize: 9,
    },
    medium: {
      container: 18,
      fontSize: 10,
    },
    large: {
      container: 20,
      fontSize: 11,
    },
  };

  const config = sizeConfig[size];

  return (
    <View style={[
      styles.badge,
      {
        width: config.container,
        height: config.container,
        borderRadius: config.container / 2,
      }
    ]}>
      <AppText
        style={[
          styles.badgeText,
          { fontSize: config.fontSize }
        ]}
      >
        {displayCount}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#C0392B', // Rouge pour attirer l'attention
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -4,
    right: -4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...designSystem.shadows.sm,
    zIndex: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default NotificationBadge;

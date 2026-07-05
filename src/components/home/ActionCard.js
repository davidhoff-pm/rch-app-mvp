import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';

const { colors, spacing, borderRadius, shadows } = designSystem;

export default function ActionCard({
  title,
  description,
  icon,
  gradient,
  onPress,
  disabled = false,
  style,
}) {
  const content = (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={32} color={colors.text.inverse} />
      </View>
      <View style={styles.textContainer}>
        <AppText variant="h4" weight="semiBold" color="inverse" numberOfLines={1}>
          {title}
        </AppText>
        {description && (
          <AppText variant="bodySmall" color="inverse" numberOfLines={2} style={styles.description}>
            {description}
          </AppText>
        )}
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={24} 
        color={colors.text.inverse} 
        style={styles.chevron}
      />
    </View>
  );

  if (disabled) {
    return (
      <View style={[styles.card, styles.disabled, style]}>
        {content}
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.card, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  gradient: {
    padding: spacing[4],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.base,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  textContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  description: {
    marginTop: spacing[1],
    opacity: 0.9,
  },
  chevron: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.6,
  },
});


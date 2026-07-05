import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import designSystem from '../../theme/designSystem';
import { usePressAnimation } from '../../utils/animations';
import { cardPressFeedback } from '../../utils/haptics';

const { colors, spacing, borderRadius, shadows } = designSystem;

export default function AppCard({ 
  children, 
  style, 
  variant = 'default', 
  gradient = false,
  gradientColors = null,
  noPadding = false,
  onPress,
  pressable = false,
  ...props 
}) {
  const { scaleAnim, handlePressIn, handlePressOut } = usePressAnimation();
  const isPressable = onPress || pressable;

  const handlePress = (e) => {
    if (isPressable) {
      cardPressFeedback();
    }
    if (onPress) {
      onPress(e);
    }
  };

  const variantStyles = {
    default: {
      backgroundColor: colors.background.tertiary,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    elevated: {
      backgroundColor: colors.background.tertiary,
      ...shadows.md,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.medium,
    },
    success: {
      backgroundColor: colors.health.excellent.light,
      borderWidth: 1,
      borderColor: colors.health.excellent.main,
    },
    warning: {
      backgroundColor: colors.health.moderate.light,
      borderWidth: 1,
      borderColor: colors.health.moderate.main,
    },
    danger: {
      backgroundColor: colors.health.danger.light,
      borderWidth: 1,
      borderColor: colors.health.danger.main,
    },
  };

  const cardStyle = [
    styles.card,
    variantStyles[variant],
    noPadding && styles.noPadding,
    style,
  ];

  const cardContent = (
    <>
      {children}
    </>
  );

  if (isPressable) {
    const AnimatedComponent = gradient && gradientColors ? Animated.createAnimatedComponent(LinearGradient) : Animated.View;
    
    if (gradient && gradientColors) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onPress}
          {...props}
        >
          <AnimatedComponent
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[cardStyle, { transform: [{ scale: scaleAnim }] }]}
          >
            {cardContent}
          </AnimatedComponent>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onPress}
        {...props}
      >
        <Animated.View style={[cardStyle, { transform: [{ scale: scaleAnim }] }]}>
          {cardContent}
        </Animated.View>
      </TouchableOpacity>
    );
  }

  if (gradient && gradientColors) {
    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cardStyle}
        {...props}
      >
        {cardContent}
      </LinearGradient>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {cardContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg, // 16px - look santé moderne (angles maîtrisés)
    padding: spacing[5], // 20px
    marginBottom: spacing[4], // 16px entre les cards
  },
  noPadding: {
    padding: 0,
  },
});

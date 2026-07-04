import { MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { Platform } from 'react-native';
import designSystem from './designSystem';

const { colors, typography } = designSystem;

// Hanken Grotesk (UI) avec fallbacks appropriés
const getUIFont = () => {
  if (Platform.OS === 'web') {
    // Sur web, Hanken Grotesk est chargé via Google Fonts (voir App.js)
    return "'Hanken Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  }
  // Native : fallback système si la police n'est pas embarquée
  return 'Hanken Grotesk';
};

const interFont = getUIFont();

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary[500],
    primaryContainer: colors.primary[100],
    secondary: colors.secondary[500],
    secondaryContainer: colors.secondary[100],
    background: colors.background.primary,
    surface: colors.background.tertiary,
    surfaceVariant: colors.background.secondary,
    onPrimary: colors.text.inverse,
    onSecondary: colors.text.inverse,
    onBackground: colors.text.primary,
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    outline: colors.border.medium,
    outlineVariant: colors.border.light,
    error: colors.health.danger.main,
    placeholder: colors.text.tertiary,
    // Couleurs sémantiques personnalisées
    success: colors.health.excellent.main, // vert sauge
    warning: colors.health.moderate.main, // or
    info: colors.secondary[500],
  },
  fonts: {
    ...DefaultTheme.fonts,
    // Titre d'écran (H1) - 36px, Bold
    displayLarge: {
      fontFamily: interFont,
      fontWeight: typography.h1.fontWeight,
      fontSize: typography.h1.fontSize,
      lineHeight: typography.h1.lineHeight,
      letterSpacing: typography.h1.letterSpacing,
    },
    // Titre de section (H2) - 28px, Bold
    displayMedium: {
      fontFamily: interFont,
      fontWeight: typography.h2.fontWeight,
      fontSize: typography.h2.fontSize,
      lineHeight: typography.h2.lineHeight,
      letterSpacing: typography.h2.letterSpacing,
    },
    // Titre de sous-section (H3) - 24px, SemiBold
    headlineLarge: {
      fontFamily: interFont,
      fontWeight: typography.h3.fontWeight,
      fontSize: typography.h3.fontSize,
      lineHeight: typography.h3.lineHeight,
      letterSpacing: typography.h3.letterSpacing,
    },
    // Titre de carte (H4) - 20px, SemiBold
    headlineSmall: {
      fontFamily: interFont,
      fontWeight: typography.h4.fontWeight,
      fontSize: typography.h4.fontSize,
      lineHeight: typography.h4.lineHeight,
      letterSpacing: typography.h4.letterSpacing,
    },
    // Corps de texte important (Body Large) - 18px, Regular
    bodyLarge: {
      fontFamily: interFont,
      fontWeight: typography.bodyLarge.fontWeight,
      fontSize: typography.bodyLarge.fontSize,
      lineHeight: typography.bodyLarge.lineHeight,
      letterSpacing: typography.bodyLarge.letterSpacing,
    },
    // Corps de texte principal (Body) - 16px, Regular
    bodyMedium: {
      fontFamily: interFont,
      fontWeight: typography.body.fontWeight,
      fontSize: typography.body.fontSize,
      lineHeight: typography.body.lineHeight,
      letterSpacing: typography.body.letterSpacing,
    },
    // Label de formulaire - 14px, Medium
    labelMedium: {
      fontFamily: interFont,
      fontWeight: typography.label.fontWeight,
      fontSize: typography.label.fontSize,
      lineHeight: typography.label.lineHeight,
      letterSpacing: typography.label.letterSpacing,
    },
    // Caption - 12px, Regular
    labelSmall: {
      fontFamily: interFont,
      fontWeight: typography.caption.fontWeight,
      fontSize: typography.caption.fontSize,
      lineHeight: typography.caption.lineHeight,
      letterSpacing: typography.caption.letterSpacing,
    },
  },
  roundness: designSystem.borderRadius.md,
  spacing: (m) => designSystem.spacing[2] * m, // Base unit 8px
};

export default theme;

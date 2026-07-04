// Design System - RCH Suivi
// Direction visuelle "chaude / éditoriale" : fond crème, accent terracotta,
// vert sauge (santé), or/ocre (secondaire), typographies Hanken Grotesk + Newsreader.

export const colors = {
  // Terracotta - couleur de marque (primary)
  primary: {
    50: '#FFF3EE',
    100: '#FFE9DE',
    200: '#F6D3C4',
    300: '#E5A98F',
    400: '#D07A5B',
    500: '#C16046', // Principale (terracotta)
    600: '#B05139', // Hover / actif
    700: '#8F4230',
    800: '#6E3325',
    900: '#312620',
  },

  // Vert sauge - santé / rémission (secondary)
  secondary: {
    50: '#F0F7F2',
    100: '#D7F4E0',
    200: '#B4E3C2',
    300: '#8FCEA3',
    400: '#6BB183',
    500: '#4B8A63',
    600: '#397852',
    700: '#2E6142',
    800: '#244D35',
    900: '#1B3A28',
  },

  // Or / ocre - accent secondaire (IBDisk, vigilance)
  accent: {
    50: '#FFF6E9',
    100: '#FFEBD2',
    200: '#F4D6A8',
    300: '#E3B978',
    400: '#C99A52',
    500: '#AD7130',
    600: '#8A5A26',
    700: '#6B451D',
    800: '#4D3115',
    900: '#33200E',
  },

  // États de santé - couleurs sémantiques dans la nouvelle palette
  health: {
    excellent: {
      main: '#4B8A63', // Vert sauge - excellent
      light: '#D7F4E0',
      dark: '#397852',
    },
    good: {
      main: '#4B8A63', // Vert sauge - bon
      light: '#E4F3E8',
      dark: '#397852',
    },
    moderate: {
      main: '#AD7130', // Or - vigilance
      light: '#FFEBD2',
      dark: '#8A5A26',
    },
    warning: {
      main: '#C36A4F', // Terracotta clair - attention
      light: '#FFE9DE',
      dark: '#B05139',
    },
    danger: {
      main: '#C0392B', // Rouge chaud - alerte
      light: '#FBE3DF',
      dark: '#9A2C20',
    },
    improvement: {
      main: '#6BB183',
      light: '#D7F4E0',
      dark: '#397852',
    },
    decline: {
      main: '#D98A72',
      light: '#FBE3DF',
      dark: '#C0392B',
    },
  },

  // Neutres chauds (taupe/brun)
  neutral: {
    50: '#FCF8F3',
    100: '#F5EFE8',
    200: '#E6E0DA',
    300: '#D6CEC5',
    400: '#A99B93',
    500: '#84776F',
    600: '#72665E',
    700: '#5A493E',
    800: '#3D3229',
    900: '#312620',
  },

  // Fonds et surfaces
  background: {
    primary: '#FCF8F3', // Crème - fond de l'app
    secondary: '#F5EFE8', // Beige clair - surfaces subtiles
    tertiary: '#FFFFFF', // Blanc - cartes
  },

  // Texte (bruns chauds)
  text: {
    primary: '#312620',
    secondary: '#72665E',
    tertiary: '#84776F',
    disabled: '#C1B5AB',
    inverse: '#FFFFFF',
  },

  // Bordures
  border: {
    light: '#E6E0DA',
    medium: '#D6CEC5',
    dark: '#C16046',
  },
};

export const typography = {
  // Familles : Hanken Grotesk (UI) + Newsreader (serif, gros titres)
  fontFamily: {
    regular: 'Hanken Grotesk',
    medium: 'Hanken Grotesk',
    semiBold: 'Hanken Grotesk',
    bold: 'Hanken Grotesk',
    serif: 'Newsreader',
    fallback: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },

  // Display serif (greeting type "Bonjour")
  display: {
    fontFamily: 'Newsreader',
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '500',
    letterSpacing: -0.6,
  },
  // H1 - Titre principal d'écran
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // H2 - Titre de section
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // H3 - Titre de sous-section
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // H4 - Titre de carte
  h4: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '400',
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  button: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  fontSize: {
    xs: 12,
    sm: 13.5,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  fontWeight: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    extraBold: '800',
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

export const borderRadius = {
  none: 0,
  sm: 8,
  base: 11,
  md: 14,
  lg: 18,
  xl: 20,
  '2xl': 22,
  '3xl': 28,
  full: 9999,
};

// Ombres : douces et chaudes (brun) pour la profondeur générale.
// Les CTA (boutons terracotta) utilisent `terracotta` pour une ombre colorée.
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#5E402F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  base: {
    shadowColor: '#5E402F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  md: {
    shadowColor: '#5E402F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 4,
  },
  lg: {
    shadowColor: '#5E402F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.11,
    shadowRadius: 32,
    elevation: 8,
  },
  xl: {
    shadowColor: '#5E402F',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.13,
    shadowRadius: 44,
    elevation: 12,
  },
  // Ombre colorée terracotta pour les CTA
  terracotta: {
    shadowColor: '#C16046',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
};

export const gradients = {
  primary: ['#C16046', '#B05139'],
  secondary: ['#4B8A63', '#397852'],
  accent: ['#C99A52', '#AD7130'],
  excellent: ['#4B8A63', '#397852'],
  warning: ['#C99A52', '#AD7130'],
  danger: ['#C0392B', '#9A2C20'],
};

export const layout = {
  containerPadding: spacing[5],
  cardPadding: spacing[5],
  sectionSpacing: spacing[7],
  elementSpacing: spacing[4],
  headerHeight: 60,
  tabBarHeight: 72,
  buttonHeight: 50,
  inputHeight: 50,
};

export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  gradients,
  layout,
  animations,
};

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from './AppText';
import designSystem from '../../theme/designSystem';

const { colors, typography } = designSystem;

/**
 * En-tête d'écran unifié (style "Bonjour" de l'accueil) :
 * titre serif à gauche + icônes d'action à droite, avec un contenu optionnel en dessous.
 *
 * @param {string} title - Titre affiché (serif).
 * @param {Array<{icon,onPress,label}>} actions - Boutons icône à droite (gauche → droite).
 * @param {React.ReactNode} children - Contenu optionnel sous le titre (ex. date · statut).
 */
export default function ScreenHeader({ title, actions = [], children }) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <AppText style={styles.title} numberOfLines={1}>{title}</AppText>
        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.iconBtn}
                onPress={a.onPress}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <MaterialCommunityIcons name={a.icon} size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'web' ? 18 : 52,
    paddingBottom: 16,
    backgroundColor: colors.background.primary,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: typography.fontFamily.serif,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

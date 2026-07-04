import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AppText from '../ui/AppText';
import designSystem from '../../theme/designSystem';
import { useStoolModal } from '../../contexts/StoolModalContext';
import { useSpeedDial } from '../../contexts/SpeedDialContext';
import { buttonPressFeedback } from '../../utils/haptics';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { openModal } = useStoolModal();
  const { handlers } = useSpeedDial();
  const { colors } = designSystem;

  const [isOpen, setIsOpen] = useState(false);

  // Animations
  const animation1 = useRef(new Animated.Value(0)).current;
  const animation2 = useRef(new Animated.Value(0)).current;
  const animation3 = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const toggleOpen = () => {
    buttonPressFeedback();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.spring(animation1, {
          toValue: 1,
          useNativeDriver: true,
          delay: 0,
          speed: 20,
          bounciness: 8,
        }),
        Animated.spring(animation2, {
          toValue: 1,
          useNativeDriver: true,
          delay: 50,
          speed: 20,
          bounciness: 8,
        }),
        Animated.spring(animation3, {
          toValue: 1,
          useNativeDriver: true,
          delay: 100,
          speed: 20,
          bounciness: 8,
        }),
        Animated.spring(rotation, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 6,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animation1, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animation2, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animation3, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(rotation, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handleStoolPress = () => {
    buttonPressFeedback();
    setIsOpen(false);
    openModal();
  };

  const handleSymptomPress = () => {
    buttonPressFeedback();
    setIsOpen(false);
    if (handlers.onSymptomPress) {
      handlers.onSymptomPress();
    }
  };

  const handleNotePress = () => {
    buttonPressFeedback();
    setIsOpen(false);
    if (handlers.onNotePress) {
      handlers.onNotePress();
    }
  };

  const getAnimatedStyle = (animation, angle) => {
    const distance = 80; // Distance from center in pixels
    const angleRad = (angle * Math.PI) / 180;

    return {
      opacity: animation,
      transform: [
        {
          translateX: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, distance * Math.sin(angleRad)],
          }),
        },
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -distance * Math.cos(angleRad)],
          }),
        },
        {
          scale: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      ],
    };
  };

  // Filtrer les routes pour exclure Paramètres de la tab bar
  const visibleRoutes = state.routes.filter(route => route.name !== 'Paramètres');
  const visibleDescriptors = visibleRoutes.reduce((acc, route) => {
    acc[route.key] = descriptors[route.key];
    return acc;
  }, {});

  // Rendre un onglet moderne avec label
  const renderTab = (route, index) => {
    const { options } = visibleDescriptors[route.key];
    const actualIndex = state.routes.findIndex(r => r.key === route.key);
    const isFocused = state.index === actualIndex;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        buttonPressFeedback();
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    };

    // Icônes et labels pour chaque route
    let iconName = 'home';
    let label = route.name;

    if (route.name === 'Accueil') {
      iconName = 'home';
      label = 'Accueil';
    }
    if (route.name === 'Bilan') {
      iconName = 'clipboard-text';
      label = 'Bilan';
    }
    if (route.name === 'Statistiques') {
      iconName = 'chart-line';
      label = 'Stats';
    }
    if (route.name === 'Traitement') {
      iconName = 'pill';
      label = 'Traitement';
    }

    return (
      <TouchableOpacity
        key={route.key}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        style={styles.tabItem}
        activeOpacity={0.7}
      >
        <View style={[
          styles.tabContent,
          isFocused && styles.tabContentFocused
        ]}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name={iconName}
              size={24}
              color={isFocused ? colors.primary[500] : colors.text.tertiary}
            />
            {/* Les rappels (bilan / traitement) sont désormais affichés sur l'écran d'accueil */}
          </View>
          <AppText
            variant="caption"
            style={[
              styles.tabLabel,
              { color: isFocused ? colors.primary[500] : colors.text.tertiary }
            ]}
          >
            {label}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      {isOpen && (
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <View style={styles.tabBar}>
        {/* Premier onglet (Accueil) */}
        {visibleRoutes[0] && renderTab(visibleRoutes[0], 0)}

        {/* Deuxième onglet (Bilan) */}
        {visibleRoutes[1] && renderTab(visibleRoutes[1], 1)}

        {/* Conteneur pour le bouton central et les boutons secondaires */}
        <View style={styles.centralButtonContainer}>
          {/* Boutons secondaires */}
          {isOpen && (
            <>
              {/* Selle - en haut à gauche (-45°) */}
              <Animated.View
                style={[
                  styles.secondaryButtonWrapper,
                  getAnimatedStyle(animation1, -45),
                ]}
              >
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: '#4C4DDC' }]}
                  onPress={handleStoolPress}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="toilet" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.labelContainer}>
                  <AppText variant="caption" style={styles.secondaryLabel}>
                    Selle
                  </AppText>
                </View>
              </Animated.View>

              {/* Symptôme - en haut au centre (0°) */}
              <Animated.View
                style={[
                  styles.secondaryButtonWrapper,
                  getAnimatedStyle(animation2, 0),
                ]}
              >
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: '#DC2626' }]}
                  onPress={handleSymptomPress}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.labelContainer}>
                  <AppText variant="caption" style={styles.secondaryLabel}>
                    Symptôme
                  </AppText>
                </View>
              </Animated.View>

              {/* Note - en haut à droite (45°) */}
              <Animated.View
                style={[
                  styles.secondaryButtonWrapper,
                  getAnimatedStyle(animation3, 45),
                ]}
              >
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: '#F59E0B' }]}
                  onPress={handleNotePress}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="note-text-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.labelContainer}>
                  <AppText variant="caption" style={styles.secondaryLabel}>
                    Note
                  </AppText>
                </View>
              </Animated.View>
            </>
          )}

          {/* Bouton central avec icône + */}
          <TouchableOpacity
            style={styles.centralButton}
            onPress={toggleOpen}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            <Animated.View style={{ transform: [{ rotate: rotationInterpolate }] }}>
              <MaterialCommunityIcons
                name="plus"
                size={32}
                color="#FFFFFF"
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Troisième onglet (Statistiques) */}
        {visibleRoutes[2] && renderTab(visibleRoutes[2], 2)}

        {/* Quatrième onglet (Traitement) */}
        {visibleRoutes[3] && renderTab(visibleRoutes[3], 3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 0,
    backgroundColor: designSystem.colors.background.tertiary,
    ...designSystem.shadows.xl,
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target minimum
    paddingHorizontal: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: designSystem.borderRadius.lg,
    minWidth: 60,
  },
  tabContentFocused: {
    backgroundColor: designSystem.colors.primary[50],
  },
  tabLabel: {
    marginTop: 2,
    fontWeight: '600',
    fontSize: 11,
  },
  iconWrapper: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  centralButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: designSystem.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    ...designSystem.shadows.lg,
    elevation: 8,
    zIndex: 3,
  },
  secondaryButtonWrapper: {
    position: 'absolute',
    bottom: 8, // Aligné avec le bouton central (qui a marginBottom: 8)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    ...designSystem.shadows.md,
    elevation: 6,
  },
  labelContainer: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 12,
  },
  secondaryLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
});

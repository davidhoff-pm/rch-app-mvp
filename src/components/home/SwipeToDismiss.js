import React, { useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

const SWIPE_THRESHOLD = 80;
const SWIPE_OUT_DISTANCE = 500;

/**
 * Enveloppe une carte de tâche de l'accueil pour permettre de la masquer d'un
 * geste de swipe vers la gauche (cf. FEATURE_SUIVI_LEGER / demande d'ordonnancement
 * de l'accueil). La tâche reste disponible ailleurs (onglet Bilan) — seule sa
 * présence sur l'accueil est masquée pour la journée (cf. homeDismissUtils).
 *
 * Implémenté avec PanResponder + Animated (natif RN) plutôt que
 * react-native-gesture-handler, pour un fonctionnement garanti sur web (PWA) sans
 * dépendance/wrapper supplémentaire.
 */
export default function SwipeToDismiss({ children, onDismiss }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;
  const [measuredHeight, setMeasuredHeight] = useState(null);
  const [removed, setRemoved] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -SWIPE_OUT_DISTANCE,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            if (measuredHeight) {
              Animated.timing(heightAnim, {
                toValue: 0,
                duration: 180,
                useNativeDriver: false,
              }).start(() => {
                setRemoved(true);
                onDismiss && onDismiss();
              });
            } else {
              setRemoved(true);
              onDismiss && onDismiss();
            }
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  if (removed) return null;

  const opacity = translateX.interpolate({
    inputRange: [-SWIPE_OUT_DISTANCE, -SWIPE_THRESHOLD, 0],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        height: measuredHeight != null ? heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, measuredHeight] }) : undefined,
      }}
    >
      <Animated.View
        onLayout={(e) => {
          if (measuredHeight == null) setMeasuredHeight(e.nativeEvent.layout.height);
        }}
        style={{ transform: [{ translateX }], opacity }}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

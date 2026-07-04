import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Rect, G, Line, Polyline, Ellipse } from 'react-native-svg';

/**
 * Composant d'icônes médicales inspiré de Health Icons
 * Icônes SVG optimisées pour React Native
 *
 * Usage: <HealthIcon name="stethoscope" size={24} color="#C16046" />
 */

const icons = {
  // Icône stéthoscope
  stethoscope: (color) => (
    <G>
      <Path
        d="M5 3v4a9 9 0 0 0 9 9v0a9 9 0 0 0 9-9V3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Line x1="5" y1="3" x2="5" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="23" y1="3" x2="23" y2="1" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path
        d="M14 16v2a4 4 0 0 1-4 4H8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx="6" cy="22" r="2" fill={color} />
    </G>
  ),

  // Icône pilule/médicament
  pill: (color) => (
    <G>
      <Rect
        x="8"
        y="8"
        width="10"
        height="10"
        rx="5"
        transform="rotate(45 13 13)"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Line x1="8" y1="13" x2="18" y2="13" stroke={color} strokeWidth="2" />
    </G>
  ),

  // Icône graphique de santé
  healthChart: (color) => (
    <G>
      <Polyline
        points="3,18 7,14 11,16 15,10 19,12 23,6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx="3" cy="18" r="2" fill={color} />
      <Circle cx="7" cy="14" r="2" fill={color} />
      <Circle cx="11" cy="16" r="2" fill={color} />
      <Circle cx="15" cy="10" r="2" fill={color} />
      <Circle cx="19" cy="12" r="2" fill={color} />
      <Circle cx="23" cy="6" r="2" fill={color} />
    </G>
  ),

  // Icône cœur battement
  heartbeat: (color) => (
    <G>
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Polyline
        points="3,12 8,12 10,8 14,16 16,12 21,12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  ),

  // Icône calendrier médical
  calendar: (color) => (
    <G>
      <Rect
        x="3"
        y="4"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1.5" fill={color} />
    </G>
  ),

  // Icône rapport/document
  report: (color) => (
    <G>
      <Path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M14 2v6h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Line x1="8" y1="13" x2="16" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  // Icône utilisateur/profil
  user: (color) => (
    <G>
      <Circle cx="12" cy="8" r="5" stroke={color} strokeWidth="2" fill="none" />
      <Path
        d="M3 21c0-5 4-7 9-7s9 2 9 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </G>
  ),

  // Icône journal/notes
  journal: (color) => (
    <G>
      <Rect
        x="4"
        y="2"
        width="16"
        height="20"
        rx="2"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Line x1="8" y1="7" x2="16" y2="7" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="11" x2="16" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Line x1="8" y1="15" x2="12" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  // Icône intestin (stylisé)
  intestine: (color) => (
    <G>
      <Path
        d="M8 3 C 8 3, 5 3, 5 6 C 5 9, 8 9, 8 12 C 8 15, 5 15, 5 18 C 5 21, 8 21, 8 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M16 3 C 16 3, 19 3, 19 6 C 19 9, 16 9, 16 12 C 16 15, 19 15, 19 18 C 19 21, 16 21, 16 21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M8 12 L 16 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </G>
  ),

  // Icône notification/cloche
  bell: (color) => (
    <G>
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </G>
  ),

  // Icône vide (empty state)
  empty: (color) => (
    <G>
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
      <Line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="9" cy="9" r="1" fill={color} />
      <Circle cx="15" cy="9" r="1" fill={color} />
    </G>
  ),

  // Icône recherche
  search: (color) => (
    <G>
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" fill="none" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </G>
  ),

  // Icône paramètres
  settings: (color) => (
    <G>
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none" />
      <Path
        d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </G>
  ),
};

const HealthIcon = ({
  name,
  size = 24,
  color = '#C16046',
  style
}) => {
  const IconComponent = icons[name];

  if (!IconComponent) {
    console.warn(`HealthIcon: Icon "${name}" not found`);
    return null;
  }

  return (
    <View style={style}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
      >
        {IconComponent(color)}
      </Svg>
    </View>
  );
};

export default HealthIcon;

// Export des noms d'icônes disponibles pour l'autocomplétion
export const availableIcons = Object.keys(icons);

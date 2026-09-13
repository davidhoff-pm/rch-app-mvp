/**
 * Boîtes de dialogue homogènes web / mobile.
 *
 * Sur web, Alert.alert de react-native-web n'affiche pas les boutons : on passe
 * par window.confirm / window.alert. Sur mobile, Alert natif, encapsulé en
 * promesse pour pouvoir écrire `if (await confirmDialog(...))`.
 */
import { Alert, Platform } from 'react-native';

export function confirmDialog(title, message, { confirmText = 'Confirmer', cancelText = 'Annuler', destructive = false } = {}) {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function infoDialog(title, message) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [{ text: 'OK', onPress: () => resolve() }], { onDismiss: () => resolve() });
  });
}

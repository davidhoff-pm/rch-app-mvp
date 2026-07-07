import React, { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { StoolModalProvider } from './src/contexts/StoolModalContext';
import { SpeedDialProvider } from './src/contexts/SpeedDialContext';
import { refreshDailyNotifications } from './src/services/notificationService';

// Import du script de mise à jour PWA
import './src/utils/pwaUpdate';

// Import du service worker PWA
import { initPWA } from './src/utils/registerServiceWorker';

export default function App() {
  const navigationRef = useRef(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Charger Hanken Grotesk + Newsreader depuis Google Fonts pour le web et initialiser PWA
  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Newsreader:wght@400;500;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Police de base : Hanken Grotesk
      const style = document.createElement('style');
      style.textContent = `
        * {
          font-family: 'Hanken Grotesk', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
      `;
      document.head.appendChild(style);

      // Initialiser le service worker PWA
      initPWA().then((result) => {
        console.log('✅ PWA initialisée:', result);
      }).catch((error) => {
        console.error('❌ Erreur lors de l\'initialisation PWA:', error);
      });
    }
  }, []);

  useEffect(() => {
    // Réévaluer les notifications au démarrage (mobile seulement)
    if (Platform.OS !== 'web') {
      refreshDailyNotifications();
    }

    // Réévaluer au retour au premier plan
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Platform.OS !== 'web') {
        refreshDailyNotifications();
      }
    });

    // Écouter les notifications reçues quand l'app est ouverte
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification reçue:', notification);
    });

    // Écouter les clics sur les notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      if (data?.action === 'OPEN_SURVEY' && navigationRef.current) {
        navigationRef.current.navigate('Main', {
          screen: 'Accueil',
          params: { openSurveyModal: true },
        });
      }

      if (data?.action === 'OPEN_STOOL_BATCH' && navigationRef.current) {
        navigationRef.current.navigate('Main', { screen: 'Accueil' });
      }

      if (data?.action === 'OPEN_TREATMENT' && navigationRef.current) {
        navigationRef.current.navigate('Main', { screen: 'Traitement' });
      }
    });

    return () => {
      appStateSub.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <PaperProvider theme={theme}>
      <StoolModalProvider>
        <SpeedDialProvider>
          <AppNavigator ref={navigationRef} />
        </SpeedDialProvider>
      </StoolModalProvider>
    </PaperProvider>
  );
}

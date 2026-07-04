import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import 'react-native-gesture-handler';
import { Provider as PaperProvider } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import theme from './src/theme/theme';
import AppNavigator from './src/navigation/AppNavigator';
import { StoolModalProvider } from './src/contexts/StoolModalContext';
import { SpeedDialProvider } from './src/contexts/SpeedDialContext';

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
    // Écouter les notifications reçues quand l'app est ouverte
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification reçue:', notification);
    });

    // Écouter les clics sur les notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification cliquée:', response);
      const data = response.notification.request.content.data;
      
      // Si c'est un rappel de bilan, naviguer vers l'écran Accueil
      if (data?.action === 'OPEN_SURVEY' && navigationRef.current) {
        console.log('🧭 Redirection vers Accueil pour compléter le bilan');
        // Naviguer vers Main (les tabs), puis vers Accueil avec le paramètre
        navigationRef.current.navigate('Main', {
          screen: 'Accueil',
          params: { openSurveyModal: true }
        });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
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

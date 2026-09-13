/**
 * Service Worker Registration for PWA
 * Enregistre le service worker pour permettre les fonctionnalités hors ligne
 * et les notifications push
 */

// Configuration du service worker
const SERVICE_WORKER_URL = '/service-worker.js';

/**
 * Vérifie si le navigateur supporte les service workers
 */
export const isServiceWorkerSupported = () => {
  return 'serviceWorker' in navigator;
};

/**
 * Vérifie si les notifications sont supportées
 */
export const areNotificationsSupported = () => {
  return 'Notification' in window && 'PushManager' in window;
};

/**
 * Demande la permission pour les notifications
 */
export const requestNotificationPermission = async () => {
  if (!areNotificationsSupported()) {
    console.warn('Les notifications ne sont pas supportées sur ce navigateur');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Erreur lors de la demande de permission:', error);
    return 'denied';
  }
};

/**
 * Enregistre le service worker
 */
export const registerServiceWorker = async () => {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {

    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: '/',
    });


    // Vérifier s'il y a une mise à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {

          // Notifier l'utilisateur qu'une mise à jour est disponible
          if (window.confirm('Une nouvelle version de l\'application est disponible. Voulez-vous recharger ?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
    return null;
  }
};

/**
 * Désenregistre le service worker
 */
export const unregisterServiceWorker = async () => {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const success = await registration.unregister();
      return success;
    }

    return false;
  } catch (error) {
    console.error('Erreur lors du désenregistrement du Service Worker:', error);
    return false;
  }
};

/**
 * Vérifie si l'app est installée en mode standalone (PWA)
 */
export const isStandalone = () => {
  // iOS
  if (window.navigator.standalone === true) {
    return true;
  }

  // Android / Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  return false;
};

/**
 * Vérifie si l'utilisateur peut installer l'app
 */
let deferredPrompt = null;

export const canInstallPWA = () => {
  return deferredPrompt !== null;
};

/**
 * Affiche le prompt d'installation PWA
 */
export const showInstallPrompt = async () => {
  if (!deferredPrompt) {
    return false;
  }

  try {
    // Afficher le prompt
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    // Réinitialiser le prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    console.error('Erreur lors de l\'affichage du prompt d\'installation:', error);
    return false;
  }
};

/**
 * Initialise l'écouteur pour le prompt d'installation
 */
export const initInstallPromptListener = () => {
  window.addEventListener('beforeinstallprompt', (e) => {

    // Empêcher le prompt automatique
    e.preventDefault();

    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = e;

    // Déclencher un événement personnalisé pour notifier l'app
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;

    // Déclencher un événement personnalisé
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
};

/**
 * Envoie une notification de test
 */
export const sendTestNotification = async () => {
  if (!areNotificationsSupported()) {
    console.error('Notifications non supportées');
    return false;
  }

  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.error('Permission de notification refusée');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    await registration.showNotification('RCH Suivi', {
      body: 'Ceci est une notification de test !',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      requireInteraction: false,
    });

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification:', error);
    return false;
  }
};

/**
 * Initialise le service worker et les fonctionnalités PWA
 */
export const initPWA = async () => {

  // Initialiser l'écouteur pour le prompt d'installation
  initInstallPromptListener();

  // Enregistrer le service worker
  const registration = await registerServiceWorker();

  // Vérifier le statut standalone
  const standalone = isStandalone();

  return {
    registration,
    standalone,
    canInstall: canInstallPWA(),
  };
};

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  isServiceWorkerSupported,
  areNotificationsSupported,
  requestNotificationPermission,
  isStandalone,
  canInstallPWA,
  showInstallPrompt,
  initInstallPromptListener,
  sendTestNotification,
  initPWA,
};

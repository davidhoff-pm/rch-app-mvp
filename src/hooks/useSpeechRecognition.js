import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer la reconnaissance vocale via Web Speech API
 *
 * IMPORTANT: Cette fonctionnalité utilise l'API Web Speech native du navigateur
 * qui est disponible gratuitement (pas d'API key nécessaire).
 *
 * Compatibilité navigateurs:
 * - Chrome/Edge: Supporté ✓
 * - Safari: Supporté ✓
 * - Firefox: Support limité (nécessite activation manuelle dans about:config)
 *
 * Pour plus d'informations: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 *
 * Configuration:
 * - Langue: fr-FR (Français)
 * - Mode: continuous = false (arrêt automatique après phrase)
 * - Résultats intermédiaires: true (transcription progressive)
 *
 * @param {Object} options - Options de configuration
 * @param {string} options.lang - Code langue (défaut: 'fr-FR')
 * @param {boolean} options.continuous - Mode continu (défaut: false)
 * @param {boolean} options.interimResults - Résultats intermédiaires (défaut: true)
 * @param {number} options.maxAlternatives - Nombre d'alternatives (défaut: 1)
 *
 * @returns {Object} État et méthodes de contrôle
 */
export const useSpeechRecognition = (options = {}) => {
  const {
    lang = 'fr-FR',
    continuous = false,
    interimResults = true,
    maxAlternatives = 1,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Vérifier si le navigateur supporte Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();

      // Configuration de l'instance
      recognitionRef.current.lang = lang;
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      recognitionRef.current.maxAlternatives = maxAlternatives;

      // Gestionnaire: début d'enregistrement
      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setError(null);
        finalTranscriptRef.current = '';
        setTranscript('');
        setInterimTranscript('');
      };

      // Gestionnaire: résultat de transcription
      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            final += transcriptPart + ' ';
          } else {
            interim += transcriptPart;
          }
        }

        if (final) {
          finalTranscriptRef.current += final;
          setTranscript(finalTranscriptRef.current.trim());
        }

        setInterimTranscript(interim);
      };

      // Gestionnaire: fin d'enregistrement
      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      // Gestionnaire: erreur
      recognitionRef.current.onerror = (event) => {
        setIsRecording(false);
        setInterimTranscript('');

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            setError('Autorisez l\'accès au microphone pour utiliser la dictée vocale');
            break;
          case 'no-speech':
            setError('Aucun son détecté. Veuillez réessayer.');
            break;
          case 'audio-capture':
            setError('Aucun microphone détecté. Vérifiez votre matériel.');
            break;
          case 'network':
            // Vérifier si c'est un problème HTTPS
            const isLocalhost = window.location.hostname === 'localhost' ||
                               window.location.hostname === '127.0.0.1' ||
                               window.location.hostname === '[::1]';
            const isHttps = window.location.protocol === 'https:';

            // Détecter les domaines Vercel preview
            const isVercelPreview = window.location.hostname.includes('.vercel.app');

            if (!isLocalhost && !isHttps) {
              setError('HTTPS requis pour la dictée vocale. Utilisez https:// ou localhost');
            } else if (isVercelPreview) {
              setError('La dictée vocale ne fonctionne pas sur les domaines Vercel preview. Testez en localhost ou utilisez un domaine custom.');
            } else {
              setError('Erreur réseau. Vérifiez votre connexion internet ou désactivez les extensions qui bloquent les requêtes.');
            }
            break;
          case 'aborted':
            // Annulation normale, pas d'erreur à afficher
            setError(null);
            break;
          default:
            setError(`Erreur de reconnaissance vocale: ${event.error}`);
        }
      };
    } else {
      setIsSupported(false);
      setError('Votre navigateur ne supporte pas la dictée vocale. Utilisez Chrome ou Safari.');
    }

    // Nettoyage
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorer les erreurs de nettoyage
        }
      }
    };
  }, [lang, continuous, interimResults, maxAlternatives]);

  // Démarrer l'enregistrement
  const startRecording = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('La reconnaissance vocale n\'est pas disponible');
      return;
    }

    // Ne pas démarrer si déjà en cours
    if (isRecording) {
      return;
    }

    try {
      setError(null);
      recognitionRef.current.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
      if (e.name === 'InvalidStateError') {
        // Déjà en cours, arrêter d'abord
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch (retryError) {
            console.error('Retry failed:', retryError);
            setError('Impossible de démarrer l\'enregistrement');
          }
        }, 300);
      } else {
        setError('Impossible de démarrer l\'enregistrement');
      }
    }
  }, [isSupported, isRecording]);

  // Arrêter l'enregistrement
  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignorer les erreurs d'arrêt
      }
    }
  }, [isRecording]);

  // Réinitialiser la transcription
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    setError(null);
  }, []);

  // Basculer l'enregistrement
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isSupported,
    isRecording,
    transcript,
    interimTranscript,
    error,
    startRecording,
    stopRecording,
    resetTranscript,
    toggleRecording,
  };
};

export default useSpeechRecognition;

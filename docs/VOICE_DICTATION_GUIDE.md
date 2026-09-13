# Guide de la Dictée Vocale

## Vue d'ensemble

La fonctionnalité de dictée vocale permet aux utilisateurs de saisir leurs notes quotidiennes en parlant plutôt qu'en tapant au clavier. Cette fonctionnalité utilise l'**API Web Speech native du navigateur** (gratuite, sans API key nécessaire).

## Compatibilité navigateurs

| Navigateur | Support | Notes |
|------------|---------|-------|
| Chrome/Edge | ✅ Complet | Fonctionne parfaitement |
| Safari (iOS/macOS) | ✅ Complet | Fonctionne parfaitement |
| Firefox | ⚠️ Limité | Nécessite activation manuelle dans `about:config` |

## Fonctionnalités

### 1. Bouton microphone
- **Localisation**: En haut à droite du champ de saisie de note
- **États visuels**:
  - 🎤 **Repos**: Bouton bleu avec icône microphone grisée
  - 🔴 **Enregistrement**: Bouton rouge pulsant avec animation
  - ❌ **Erreur**: Message d'erreur affiché sous le champ

### 2. Transcription en temps réel
- Le texte s'affiche progressivement pendant que vous parlez
- Une bannière jaune montre la transcription en cours
- Arrêt automatique après 2-3 secondes de silence
- Le texte transcrit s'ajoute au texte existant (ne le remplace pas)

### 3. Gestion des erreurs

| Erreur | Message affiché | Solution |
|--------|----------------|----------|
| Permission refusée | "Autorisez l'accès au microphone..." | Autoriser l'accès dans les paramètres du navigateur |
| Pas de son détecté | "Aucun son détecté. Réessayez." | Vérifier le microphone et parler plus fort |
| Pas de microphone | "Aucun microphone détecté..." | Brancher un microphone |
| Navigateur non supporté | "Votre navigateur ne supporte pas..." | Utiliser Chrome ou Safari |

## Comment utiliser

### Étape 1: Ouvrir la modal de note
1. Depuis l'écran d'accueil, cliquez sur "+ Nouvelle note"
2. Ou modifiez une note existante

### Étape 2: Activer la dictée
1. Cliquez sur le bouton microphone 🎤 en haut à droite
2. Autorisez l'accès au microphone si demandé
3. Le bouton devient rouge et pulse 🔴

### Étape 3: Parler
1. Parlez clairement en français
2. Exemple: *"Grosse journée de stress, McDo ce midi"*
3. La transcription apparaît en temps réel dans une bannière jaune
4. L'enregistrement s'arrête automatiquement après un silence

### Étape 4: Vérifier et corriger
1. Le texte transcrit est ajouté au champ de note
2. Vous pouvez modifier manuellement si nécessaire
3. Vous pouvez recommencer la dictée en re-cliquant sur le bouton

## Problème avec Vercel Preview

### ⚠️ Erreur "network" sur Vercel

Si vous voyez l'erreur **"Erreur réseau"** sur un domaine Vercel (ex: `*.vercel.app`), c'est normal. Les domaines preview de Vercel changent à chaque déploiement et peuvent être bloqués par l'API Web Speech de Google.

### Solutions

**Pour le développement** :
```bash
# Clonez et lancez en local
git clone <votre-repo>
cd rch-app-mvp
npm install
npm run web

# Ouvrez http://localhost:19006
# La dictée fonctionnera parfaitement
```

**Pour la production** :
1. Configurez un domaine custom dans Vercel (Settings → Domains)
2. Exemple: `app.votre-domaine.com`
3. L'API fonctionnera mieux sur un domaine stable

**Workaround temporaire** (non recommandé pour production) :
- Utilisez Chrome avec le flag `--unsafely-treat-insecure-origin-as-secure`
- ⚠️ Uniquement pour tests, pas pour production

## Tests à effectuer

### Test fonctionnel basique
```
1. Ouvrir une nouvelle note
2. Cliquer sur le bouton microphone
3. Dicter: "Grosse journée de stress, McDo ce midi"
4. Vérifier que la transcription est correcte
5. Sauvegarder la note
```

### Test d'ajout progressif
```
1. Taper manuellement: "Aujourd'hui,"
2. Cliquer sur le microphone
3. Dicter: "j'ai eu très mal au ventre"
4. Vérifier que les deux textes sont combinés avec un espace
```

### Test de gestion d'erreur
```
1. Cliquer sur le microphone
2. Refuser la permission → Vérifier le message d'erreur clair
3. Autoriser la permission
4. Ne rien dire pendant 5 secondes → Vérifier le message "Aucun son détecté"
```

### Test multi-navigateurs
```
1. Tester sur Chrome Desktop → ✅ Devrait fonctionner
2. Tester sur Safari iOS → ✅ Devrait fonctionner
3. Tester sur Firefox → ⚠️ Peut nécessiter configuration
```

## Architecture technique

### Fichiers modifiés/créés

1. **`/src/hooks/useSpeechRecognition.js`** (nouveau)
   - Hook React personnalisé
   - Gère toute la logique Web Speech API
   - États: isRecording, transcript, error, isSupported
   - Méthodes: startRecording, stopRecording, toggleRecording

2. **`/src/components/modals/NoteModal.js`** (modifié)
   - Intégration du hook useSpeechRecognition
   - Bouton microphone avec animation
   - Affichage de la transcription intermédiaire
   - Gestion des messages d'erreur

### Configuration Web Speech API

```javascript
{
  lang: 'fr-FR',              // Langue française
  continuous: false,           // Arrêt auto après phrase
  interimResults: true,        // Transcription progressive
  maxAlternatives: 1          // Une seule alternative
}
```

### Événements gérés

- `onstart`: Début de l'enregistrement → Animation démarre
- `onresult`: Transcription reçue → Ajout au texte
- `onend`: Fin de l'enregistrement → Animation s'arrête
- `onerror`: Erreur → Message explicatif

## Limitations connues

1. **Domaines Vercel preview** ⚠️: L'API Web Speech peut ne pas fonctionner sur les domaines `.vercel.app` temporaires générés par Vercel. **Solution**: Utilisez localhost pour développement ou configurez un domaine custom pour production.
2. **Bruit ambiant**: La transcription peut être imprécise dans un environnement bruyant
3. **Accent/prononciation**: La qualité dépend de la clarté de la voix
4. **Firefox**: Support limité, nécessite configuration manuelle
5. **Longueur**: Arrêt automatique après ~60 secondes d'enregistrement continu
6. **Hors ligne**: Nécessite une connexion internet (l'API utilise les serveurs Google)

## Améliorations futures possibles

- [ ] Ajouter un bouton d'arrêt manuel plus visible
- [ ] Permettre de choisir la langue (multilingue)
- [ ] Ajouter une visualisation du niveau sonore
- [ ] Sauvegarder les transcriptions pour amélioration continue
- [ ] Mode continu pour de longues notes
- [ ] Correction orthographique automatique post-transcription

## Support technique

Pour plus d'informations sur l'API Web Speech:
- [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Can I Use - Web Speech API](https://caniuse.com/speech-recognition)
- [W3C Specification](https://w3c.github.io/speech-api/)

---

**Note**: Cette fonctionnalité est un MVP (Minimum Viable Product). Des améliorations itératives peuvent être apportées en fonction des retours utilisateurs.

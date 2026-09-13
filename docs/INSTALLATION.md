# 📱 Guide d'Installation - RCH Suivi

Ce guide explique comment installer l'application RCH Suivi sur votre téléphone ou ordinateur.

---

## 🌐 Option 1 : Installation PWA (Progressive Web App) - **RECOMMANDÉ**

La méthode la plus simple et rapide ! Fonctionne sur tous les appareils.

### Sur Android (Chrome, Edge, Samsung Internet)

1. Ouvrez l'application dans votre navigateur : https://votre-domaine.vercel.app
2. Allez dans **Paramètres** (onglet en bas)
3. Cliquez sur le bouton **"Installer l'application"**
4. OU : Appuyez sur le menu (⋮) en haut à droite
5. Sélectionnez **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
6. Confirmez l'installation

✅ **L'application est maintenant installée !** Elle apparaît sur votre écran d'accueil comme une vraie app.

### Sur iPhone/iPad (Safari)

1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton **Partager** (icône de partage en bas)
3. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**
4. Nommez l'application "RCH Suivi"
5. Appuyez sur **"Ajouter"**

✅ **L'application est installée !** Vous pouvez la lancer depuis l'écran d'accueil.

### Sur Windows/Mac (Chrome, Edge)

1. Ouvrez l'application dans votre navigateur
2. Cliquez sur l'icône d'installation dans la barre d'adresse (à droite)
3. OU : Menu (⋮) → **"Installer RCH Suivi"**
4. Confirmez l'installation

✅ **L'application est installée !** Elle apparaît dans votre menu Démarrer/Applications.

---

## 🔔 Activer les Notifications

Pour recevoir des rappels quotidiens :

1. Allez dans **Paramètres** (onglet en bas)
2. Dans la section "Installez l'application", cliquez sur **"Activer les notifications"**
3. Autorisez les notifications dans le popup de votre navigateur
4. **Dans la section "Notifications"** :
   - Activez les notifications avec le bouton toggle
   - Configurez l'heure des 2 rappels quotidiens (par défaut : 9h et 20h)

✅ **Vous recevrez maintenant des rappels** pour compléter votre bilan quotidien !

---

## 📦 Option 2 : Application Native Android (APK)

Pour une version native complète, vous pouvez construire un APK.

### Prérequis

- Compte Expo (gratuit) : https://expo.dev/signup
- Node.js installé
- EAS CLI installé : `npm install -g eas-cli`

### Étapes de construction

1. **Se connecter à Expo**
   ```bash
   eas login
   ```

2. **Configurer le projet**
   ```bash
   eas build:configure
   ```

3. **Construire l'APK**
   ```bash
   eas build --platform android --profile preview
   ```

4. **Attendre la construction** (5-10 minutes)
   - EAS Build va compiler l'application dans le cloud
   - Vous recevrez un lien pour télécharger l'APK

5. **Installer l'APK**
   - Téléchargez l'APK sur votre téléphone
   - Ouvrez le fichier et autorisez l'installation depuis des sources inconnues
   - Installez l'application

✅ **L'application native est installée !**

### Pour créer un AAB (Google Play Store)

```bash
eas build --platform android --profile production
```

---

## 🍎 Option 3 : Application Native iOS (IPA)

Nécessite un compte Apple Developer (99$/an).

### Étapes

1. **Se connecter à Expo**
   ```bash
   eas login
   ```

2. **Configurer le profil Apple**
   ```bash
   eas credentials
   ```

3. **Construire l'IPA**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Distribuer via TestFlight ou App Store**

---

## 🌍 Fonctionnalités de la PWA

Lorsque vous installez l'application en PWA (Option 1), vous bénéficiez de :

### ✅ Avantages

- **Installation rapide** : Quelques secondes, pas de téléchargement volumineux
- **Mises à jour automatiques** : Toujours la dernière version
- **Fonctionne hors ligne** : Vos données restent accessibles sans internet
- **Notifications push** : Rappels quotidiens pour votre bilan
- **Icône sur l'écran d'accueil** : Comme une vraie application
- **Pas de Play Store/App Store** : Installation directe
- **Économie de stockage** : Environ 2 MB vs 20-50 MB pour une app native

### 📊 Comparaison PWA vs Native

| Fonctionnalité | PWA | Native (APK/IPA) |
|----------------|-----|------------------|
| Installation | ⚡ Instantanée | ⏳ 5-10 min build |
| Taille | 📦 ~2 MB | 📦 ~20-50 MB |
| Mises à jour | 🔄 Auto | 🔄 Manuel |
| Hors ligne | ✅ Oui | ✅ Oui |
| Notifications | ✅ Oui | ✅ Oui |
| Accès caméra | ⚠️ Limité | ✅ Complet |
| Stores | ❌ Non | ✅ Oui |

**Recommandation** : Pour RCH Suivi, la **PWA est largement suffisante** et plus pratique !

---

## 🚨 Résolution de Problèmes

### Les notifications ne fonctionnent pas

1. Vérifiez que vous avez autorisé les notifications dans les paramètres du navigateur
2. Sur Android : Paramètres → Applications → Chrome → Notifications → Autorisées
3. Sur iOS : Les notifications web sont limitées. Utilisez l'app installée via "Sur l'écran d'accueil"
4. Testez avec le bouton "Test Notification" dans Paramètres

### L'application ne fonctionne pas hors ligne

1. Attendez que l'application se charge complètement au moins une fois en ligne
2. Le service worker doit s'enregistrer (vérifiez dans la console du navigateur)
3. Actualisez la page (F5) pour forcer l'enregistrement

### L'icône d'installation n'apparaît pas

1. Sur Chrome : Menu (⋮) → "Installer l'application"
2. Sur Edge : Même chose
3. Sur Safari iOS : Utilisez le bouton Partager → "Sur l'écran d'accueil"
4. L'installation PWA n'est pas disponible sur tous les navigateurs (ex: Firefox mobile)

### Comment désinstaller l'application ?

**PWA :**
- Android : Maintenez l'icône → Désinstaller
- iOS : Maintenez l'icône → Supprimer l'app
- Windows : Clic droit sur l'icône → Désinstaller

**Native (APK/IPA) :**
- Comme n'importe quelle application

---

## 📞 Support

Pour toute question ou problème :
- Consultez les issues GitHub : https://github.com/votre-repo/issues
- Contactez l'équipe de développement

---

## 🔐 Confidentialité

- ✅ Toutes les données sont stockées **localement** sur votre appareil
- ✅ **Aucune donnée n'est envoyée à un serveur**
- ✅ Vos informations médicales restent **privées et sécurisées**
- ✅ Les notifications sont générées **localement** par votre appareil

---

## 🎉 Profitez de RCH Suivi !

L'application est maintenant prête à vous accompagner dans le suivi de votre santé.

**N'oubliez pas :**
- Enregistrez vos selles quotidiennement
- Complétez le bilan quotidien avant 23h
- Faites le questionnaire IBDisk tous les 30 jours
- Consultez vos statistiques régulièrement

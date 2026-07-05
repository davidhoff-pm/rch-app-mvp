# 📱 Guide de déploiement - Application Native RCH Suivi

## 🎯 Objectif
Créer une **vraie app native** sans passer par les stores, avec des **mises à jour faciles**.

---

## 🚀 Option recommandée : EAS Build + Updates

### Étape 1 : Installation d'EAS CLI

```bash
npm install -g eas-cli
eas login
```

Si vous n'avez pas de compte Expo, créez-en un gratuitement sur [expo.dev](https://expo.dev)

---

### Étape 2 : Configuration du projet

Votre `eas.json` est déjà configuré ! Les profils disponibles :
- **preview** : Pour les tests internes (recommandé pour vous)
- **production** : Pour la version finale

---

### Étape 3 : Premier build Android (APK)

```bash
# Build APK pour distribution interne
eas build --platform android --profile preview
```

**Ce qui va se passer** :
1. EAS va créer un build natif dans le cloud (~15-20 min)
2. Vous recevrez un lien de téléchargement direct
3. Partagez ce lien pour installer l'APK sur n'importe quel Android

**Important** : Sur Android, il faudra autoriser l'installation d'applications de sources inconnues.

---

### Étape 4 : Build iOS (si nécessaire)

```bash
# Build iOS pour distribution interne
eas build --platform ios --profile preview
```

**Pour iOS** :
- Vous aurez besoin d'un compte Apple Developer (99$/an)
- Ou utilisez un certificat Ad-Hoc gratuit (limité à 100 appareils)

---

### Étape 5 : Installer l'application

#### **Android** :
1. Ouvrez le lien reçu sur votre téléphone
2. Téléchargez l'APK
3. Autorisez l'installation depuis Brave/Chrome
4. Installez et lancez !

#### **iOS** :
1. Utilisez TestFlight (si compte Apple Developer)
2. Ou installez directement via le profil de provisioning

---

## 🔄 Mises à jour instantanées (sans rebuild)

### Configuration des Updates

Installez le package :
```bash
npm install expo-updates
```

Dans `app.json`, ajoutez :
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/[votre-project-id]",
      "enabled": true
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Publier une mise à jour

```bash
# Publier une mise à jour OTA
eas update --branch production --message "Fix notifications"
```

**Magie** ✨ :
- Les utilisateurs **reçoivent automatiquement** la mise à jour
- **Pas besoin de rebuild** ni de redistribuer l'APK
- La mise à jour se télécharge au lancement suivant de l'app

**Limitations des updates OTA** :
- ✅ Changements de code JavaScript/TypeScript
- ✅ Changements de ressources (images, etc.)
- ❌ Changements de dépendances natives (nécessite un rebuild)
- ❌ Changements dans `app.json` pour les permissions (nécessite un rebuild)

---

## 📦 Alternative : Distribution via Firebase App Distribution

Gratuit et très pratique pour les tests internes :

```bash
npm install -g firebase-tools
firebase login
firebase init
```

Puis distribuez votre APK :
```bash
firebase appdistribution:distribute app-release.apk \
  --app YOUR_APP_ID \
  --groups "testers"
```

Les testeurs reçoivent une notification et peuvent installer l'app facilement.

---

## 🔑 Avantages de cette approche

| Fonctionnalité | PWA (actuel) | App Native (EAS) |
|----------------|--------------|------------------|
| Notifications en arrière-plan | ❌ | ✅ |
| Accès complet aux APIs natives | ⚠️ Limité | ✅ |
| Fonctionne hors ligne | ⚠️ Partiel | ✅ |
| Installation depuis stores | ❌ | ✅ (optionnel) |
| Mises à jour automatiques | ✅ | ✅ |
| Distribution directe | ✅ | ✅ |
| Icône sur l'écran d'accueil | ⚠️ Nécessite ajout manuel | ✅ |

---

## 💰 Coûts

- **EAS Build** : Gratuit jusqu'à 30 builds/mois
- **EAS Updates** : Gratuit
- **Firebase App Distribution** : Gratuit
- **Apple Developer** : 99$/an (uniquement pour iOS)

---

## 🎯 Workflow recommandé

1. **Développement** : Testez sur le web (Vercel) pour des itérations rapides
2. **Tests internes** : Créez un build Android preview toutes les semaines
3. **Mises à jour quotidiennes** : Utilisez EAS Updates pour les corrections
4. **Rebuild complet** : Uniquement quand vous ajoutez de nouvelles dépendances natives

---

## 🚀 Commandes rapides

```bash
# Build Android pour tests
eas build --platform android --profile preview

# Build iOS pour tests
eas build --platform ios --profile preview

# Publier une mise à jour (sans rebuild)
eas update --branch production

# Voir l'état des builds
eas build:list

# Voir l'état des updates
eas update:list
```

---

## 🏪 Publication sur les stores (Google Play & App Store)

> Objectif : passer de la distribution interne à une **publication publique** sur les stores.
> Cette section liste les étapes à suivre **une fois les comptes développeur créés**.

### Prérequis (comptes à créer)

| Store | Compte | Coût | Délai de validation |
|-------|--------|------|---------------------|
| Google Play | [Google Play Console](https://play.google.com/console) | 25 $ (unique) | quelques heures à 2 jours |
| App Store | [Apple Developer Program](https://developer.apple.com/programs/) | 99 $/an | 1 à 3 jours |

### Étape 0 : lier le projet à votre compte Expo

1. Créez un compte sur [expo.dev](https://expo.dev) puis `eas login`.
2. Ajoutez le champ `owner` dans `app.json` (`expo.owner`) avec **votre nom d'utilisateur Expo**
   (indispensable pour les builds et updates rattachés à votre compte). Exemple :
   ```json
   { "expo": { "owner": "votre-username-expo", "...": "..." } }
   ```
   ⚠️ Ne pas inventer cette valeur : elle doit correspondre exactement au compte Expo.
3. Vérifiez que `extra.eas.projectId` (déjà présent) pointe bien vers votre projet.

### Étape 1 : builds de production

```bash
# Android : génère un AAB (App Bundle) pour le Play Store
eas build --platform android --profile production

# iOS : génère un IPA signé pour l'App Store (nécessite le compte Apple Developer)
eas build --platform ios --profile production
```

Le profil `production` (voir `eas.json`) est configuré avec `android.buildType: "app-bundle"`
(format requis par le Play Store) et `autoIncrement` (incrémente automatiquement le build number).

### Étape 2 : première soumission

#### Google Play
1. Dans la Play Console, créez l'application (nom, description, catégorie **Médical**, captures d'écran).
2. Générez un **compte de service** (Google Cloud → IAM) et téléchargez son fichier JSON ;
   renseignez son chemin dans `eas.json` → `submit.production.android`.
3. Soumettez :
   ```bash
   eas submit --platform android --profile production --latest
   ```
   La première soumission peut aussi se faire manuellement en uploadant l'AAB dans la Play Console.

#### App Store
1. Dans [App Store Connect](https://appstoreconnect.apple.com), créez la fiche app
   (bundle `com.rchsuivi.app`, déjà défini dans `app.json`).
2. Renseignez `appleId`, `ascAppId`, `appleTeamId` dans `eas.json` → `submit.production.ios`.
3. Soumettez :
   ```bash
   eas submit --platform ios --profile production --latest
   ```

### Étape 3 : mises à jour ultérieures

- **Corrections JS/UI** → `eas update --branch production` (OTA, sans repasser par les stores).
- **Nouvelles dépendances natives / changement de permissions / nouvelle version** →
  rebuild `production` puis nouvelle soumission `eas submit`.

### ⚠️ Points d'attention réglementaires (santé)

Cette app manipule des **données de santé**. Avant une publication publique, prévoir :
- une **politique de confidentialité** (URL obligatoire sur les deux stores) ;
- le questionnaire **Data safety** (Google Play) / **App Privacy** (Apple) — préciser que les
  données restent **stockées localement** sur l'appareil ;
- un **disclaimer médical** clair (déjà présent dans le README) : l'app n'est pas un dispositif
  médical certifié.

---

## 📞 Besoin d'aide ?

- Documentation EAS : https://docs.expo.dev/eas/
- Soumission stores : https://docs.expo.dev/submit/introduction/
- Discord Expo : https://chat.expo.dev


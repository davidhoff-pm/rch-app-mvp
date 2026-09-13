# 🏗️ Instructions pour créer votre premier build Android

## Étape 1 : Installer EAS CLI

Dans votre terminal PowerShell ou CMD :

```bash
npm install -g eas-cli
```

## Étape 2 : Se connecter à Expo

```bash
eas login
```

Vous serez invité à entrer vos identifiants Expo. Si vous n'avez pas de compte :
1. Allez sur https://expo.dev
2. Créez un compte gratuit
3. Revenez et utilisez `eas login`

## Étape 3 : Lancer le build Android (APK)

```bash
eas build --platform android --profile preview
```

**Ce qui va se passer :**
1. EAS va vous demander si vous voulez configurer le projet (répondez **Oui**)
2. Il va créer un keystore Android (répondez **Oui** pour générer automatiquement)
3. Le build va démarrer dans le cloud (~15-20 minutes)
4. Vous pouvez suivre la progression sur https://expo.dev/accounts/[votre-username]/projects/rch-suivi/builds

## Étape 4 : Télécharger et installer l'APK

Une fois le build terminé :
1. Vous recevrez un **lien de téléchargement** dans le terminal
2. Ouvrez ce lien sur votre téléphone Android
3. Téléchargez l'APK
4. **Autorisez l'installation** depuis Brave/Chrome dans les paramètres Android
5. Installez l'application
6. Lancez "RCH Suivi" depuis votre écran d'accueil ! 🎉

---

## 📱 Comment installer l'APK sur Android

### Méthode 1 : Directement depuis le lien
1. Ouvrez le lien EAS sur votre téléphone
2. Cliquez sur "Download" (télécharger)
3. Une fois téléchargé, ouvrez le fichier
4. Si Android bloque l'installation :
   - Allez dans **Paramètres** > **Sécurité**
   - Activez **Sources inconnues** pour Brave/Chrome
   - Réessayez d'ouvrir l'APK

### Méthode 2 : Via ordinateur
1. Téléchargez l'APK sur votre ordinateur
2. Envoyez-le sur votre téléphone (email, Drive, câble USB)
3. Ouvrez-le sur votre téléphone et installez

---

## 🔄 Comment mettre à jour l'application

### Option A : Mise à jour OTA (Over-The-Air) - 90% des cas

**Quand utiliser :** Pour tous les changements de code JavaScript, corrections de bugs, nouvelles fonctionnalités qui n'ajoutent pas de nouvelles dépendances natives.

```bash
# 1. Assurez-vous que tous vos changements sont commitées
git add -A
git commit -m "fix: correction des notifications"
git push origin main

# 2. Publiez la mise à jour
eas update --branch preview --message "Correction des notifications"
```

**Résultat :** Les utilisateurs reçoivent automatiquement la mise à jour au prochain lancement de l'app ! ✨

### Option B : Nouveau build complet - 10% des cas

**Quand utiliser :** 
- Ajout de nouvelles dépendances natives (`npm install expo-quelquechose`)
- Changements dans `app.json` (permissions, icônes, etc.)
- Changements dans le code natif (Java/Kotlin/Swift)

```bash
# Créer un nouveau build
eas build --platform android --profile preview
```

**Résultat :** Nouveau lien APK à redistribuer (~15-20 minutes).

---

## 📋 Checklist de mise à jour

### Avant chaque mise à jour :

- [ ] Tester localement sur le web (`npm start`)
- [ ] Vérifier qu'il n'y a pas d'erreurs dans la console
- [ ] Tester les fonctionnalités modifiées
- [ ] Commiter et pusher sur GitHub

### Pour une mise à jour OTA :

- [ ] `eas update --branch preview --message "Description"`
- [ ] Attendre 1-2 minutes
- [ ] Fermer et rouvrir l'app sur le téléphone pour voir la mise à jour

### Pour un nouveau build :

- [ ] `eas build --platform android --profile preview`
- [ ] Attendre ~15-20 minutes
- [ ] Télécharger et installer le nouveau APK

---

## 🎯 Commandes utiles

```bash
# Voir tous vos builds
eas build:list

# Voir toutes vos mises à jour
eas update:list

# Voir les détails d'un build spécifique
eas build:view [BUILD_ID]

# Annuler un build en cours
eas build:cancel

# Voir l'état de votre compte
eas whoami
```

---

## 🆘 Résolution de problèmes

### "Permission denied" lors de l'installation d'EAS CLI
```bash
# Sur Windows, lancez PowerShell en mode administrateur
npm install -g eas-cli
```

### "Not logged in"
```bash
eas logout
eas login
```

### "Invalid credentials"
- Vérifiez votre email/mot de passe sur https://expo.dev
- Réessayez `eas login`

### Le build échoue
1. Vérifiez les logs sur https://expo.dev
2. Assurez-vous que toutes les dépendances sont installées (`npm install`)
3. Vérifiez que `app.json` et `eas.json` sont valides

### L'update OTA ne s'applique pas
1. Fermez **complètement** l'application (pas seulement en arrière-plan)
2. Rouvrez-la
3. Si ça ne marche toujours pas, faites un nouveau build

---

## 💡 Bonnes pratiques

1. **Testez toujours sur le web d'abord** (plus rapide)
2. **Utilisez les updates OTA** autant que possible (instantané)
3. **Créez un nouveau build** seulement quand nécessaire
4. **Gardez une trace** des versions dans vos commits Git
5. **Testez sur un vrai appareil** avant de distribuer largement

---

## 🎉 Prochaines étapes

Une fois votre premier build installé :
1. Testez toutes les fonctionnalités (notifications, bilans, graphiques)
2. Vérifiez que les notifications en arrière-plan fonctionnent
3. Essayez une mise à jour OTA pour voir la magie opérer ✨
4. Si tout fonctionne, vous pouvez distribuer le lien APK !

---

## 📞 Besoin d'aide ?

- Documentation EAS Build : https://docs.expo.dev/build/introduction/
- Documentation EAS Update : https://docs.expo.dev/eas-update/introduction/
- Forum Expo : https://forums.expo.dev
- Discord Expo : https://chat.expo.dev


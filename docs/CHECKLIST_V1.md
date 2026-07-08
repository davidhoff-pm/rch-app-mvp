# Build & checklist de test — avant la V1

Ce doc sert de pense-bête pour la prochaine fois que tu reprends le projet : comment
sortir un build de test, et tout ce qu'il faut vérifier avant de considérer la V1 prête.
Pour le détail complet du workflow (OTA vs build natif, versioning...), voir
`docs/WORKFLOW.md`. Pour l'installation pas-à-pas d'un build EAS, voir
`BUILD_INSTRUCTIONS.md`.

---

## 1. Pourquoi un nouveau build natif est nécessaire

Deux dépendances **natives** ont été ajoutées récemment (`expo-print`, `expo-sharing`,
pour l'export PDF mobile). Une simple mise à jour OTA (`npm run update:preview`) **ne
suffira pas** — il faut un nouveau build complet avant de pouvoir tester quoi que ce soit
sur téléphone (voir `docs/WORKFLOW.md`, section 3, "Cas B — Changement natif").

## 2. Comment lancer le build de test

```bash
# Android (APK installable directement)
npm run build:android:preview

# iOS (si tu as un compte Apple Developer configuré)
npm run build:ios:preview
```

- Le build tourne dans le cloud EAS (~15-20 min). Le terminal donne un lien de
  téléchargement à la fin.
- Une fois installé, **toutes** les mises à jour futures purement JS (texte, écrans,
  logique) pourront repasser par l'OTA (`npm run update:preview`) — pas besoin de
  rebuilder à chaque fois, seulement si une nouvelle dépendance native est ajoutée.

---

## 3. Checklist de test avant V1

### ⚠️ À ne pas oublier (points signalés spécifiquement)

- [ ] **Notifications** — rappel quotidien "Selles du jour", rappels de traitement
      (dose du jour, jour de prise, stock bas). Utiliser les boutons de test dans
      Paramètres (mode développeur → 5 taps sur le numéro de version) : "Test
      Notification", "Test Notif Bilan (5s)", "Test Notif Selles (5s)". Vérifier
      aussi qu'une vraie notification programmée arrive bien en arrière-plan (app
      fermée).
      **Note** : il n'existe pas encore de rappel hebdomadaire dédié au bilan P-SCCAI
      — seul le rappel "Selles du jour" existe aujourd'hui. À ajouter au backlog si tu
      le veux (c'était prévu dans l'US-016 mais jamais implémenté).
- [ ] **Export PDF** (nouveau, à tester en priorité) :
  - [ ] Bouton "Générer le rapport PDF" sur mobile → doit ouvrir la feuille de partage
        native (pas une alerte "bientôt disponible")
  - [ ] Tester les 4 périodes (7j / 30j / 90j / Tout)
  - [ ] Vérifier le graphique "Évolution du Score" — l'échelle doit aller de 0 à 6
        (pas 0-20)
  - [ ] Vérifier le tableau détaillé PRO-2 (colonnes : date, PRO-2, fréquence, nb
        selles, % sang, saignement, nocturnes)
  - [ ] Si tu as au moins un bilan P-SCCAI dans la période : vérifier la section
        "Bilan Hebdomadaire P-SCCAI" (graphique de progression + tableau détail par
        item)
  - [ ] Partager le PDF généré (mail, Fichiers, WhatsApp...) et l'ouvrir pour
        confirmer qu'il s'affiche correctement

### Selles & score PRO-2

- [ ] Ajouter une selle (formulaire rapide + ajout par lot "BatchStoolModal")
- [ ] Sélecteur "Sang" (Pas de sang / Avec du sang / Sang uniquement) lisible sur
      mobile, dans l'ajout **et** l'édition d'une selle
- [ ] Modifier une selle existante depuis l'historique
- [ ] Score PRO-2 du jour affiché correctement sur l'accueil
- [ ] Graphique de tendance (StatsScreen) — échelle 0-6, couleurs cohérentes
      (vert ≤1 / orange 2-3 / rouge ≥4)
- [ ] Répartition des scores (histogramme) — catégories Rémission/Activité
      légère/Activité modérée à sévère
- [ ] Calendrier historique en mode "score" — couleurs cohérentes avec les mêmes
      seuils

### Bilan hebdomadaire P-SCCAI

- [ ] Lancer le questionnaire depuis l'écran Bilan
- [ ] Page résumé (fréquence diurne/nocturne/sang) lisible en liste verticale sur
      mobile
- [ ] Override manuel de la fréquence nocturne — vérifier qu'on peut le **modifier
      plusieurs fois** (pas bloqué après la première fois)
- [ ] Parcours complet des questions (urgence, bien-être, articulations, peau/yeux)
      avec logique conditionnelle (peau / yeux / les deux / non)
- [ ] Écran de résultat — score et "/19" bien lisibles, pas coupés
- [ ] Cooldown de 7 jours actif après un bilan complété
- [ ] Modifier un bilan déjà rempli depuis l'historique (icône crayon dans
      l'écran Bilan) — les réponses doivent se recharger correctement

### Questionnaire IBDisk

- [ ] Lancer le questionnaire mensuel, cooldown de 30 jours
- [ ] Modifier un questionnaire déjà rempli depuis l'historique

### Traitements & observance

- [ ] Ajouter un traitement, un schéma thérapeutique
- [ ] Enregistrer une prise (dans le schéma + prise libre hors schéma)
- [ ] Stats d'observance correctes dans l'export PDF

### Historique

- [ ] Filtre par type, recherche, badge "sang uniquement" sur le badge Bristol
- [ ] Modale d'édition de selle (voir sélecteur Sang ci-dessus)

### Paramètres

- [ ] Export/import JSON manuel — vérifier que `psccaiHistory` et `psccaiLastUsed`
      sont bien inclus
- [ ] Reset des données — vérifie que `psccaiHistory` est bien vidé aussi
- [ ] Mode développeur cache par défaut, activable via 5 taps sur la version

### Régression web (PWA)

- [ ] `npm run web` — l'export PDF web (ouverture d'un onglet + Ctrl+P) fonctionne
      toujours comme avant
- [ ] Les graphiques 0-6 s'affichent correctement aussi côté web

---

## 4. Une fois tout validé

- Bump la version dans `app.json` (`expo.version`) selon semver
- `npm run build:android:prod` + `npm run submit:android` (idem iOS)
- Voir `docs/WORKFLOW.md` section 4 pour le versioning et section 6 pour les comptes
  Google Play / Apple Developer si pas encore configurés

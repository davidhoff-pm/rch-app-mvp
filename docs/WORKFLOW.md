# Workflow de développement & de mise en production — RCH Suivi

Ce document décrit **comment travailler, tester et publier** l'app proprement, pensé
pour un mainteneur non-développeur. L'idée : pouvoir **tester une mise à jour de son côté**
puis **la pousser en prod** en toute confiance, sans casser ce qui marche.

---

## 1. Le modèle mental

Deux plateformes, trois environnements.

| | **Local** (ton PC) | **Preview** (test) | **Production** (public) |
|---|---|---|---|
| **Web (PWA)** | `npm run web` | déploiement Vercel de la branche/PR | `rch-app-mvp.vercel.app` (branche `main`) |
| **Mobile** | Expo Go / dev build | build **preview** + canal OTA `preview` | app des stores + canal OTA `production` |

- **Local** = itération rapide, personne d'autre ne voit.
- **Preview** = tu testes le résultat "comme en vrai" sur ton téléphone avant de publier.
- **Production** = ce que voient les utilisateurs.

---

## 2. La boucle de travail quotidienne (une feature)

1. **Partir de `main` à jour** : `git checkout main && git pull`.
2. **Créer une branche** : `git checkout -b feat/<nom-court>` (jamais coder sur `main`).
3. **Coder + tester en local** : `npm run web` (et/ou `npm start` pour mobile), `npm test`.
4. **Commit + push** la branche.
5. **Ouvrir une PR** vers `main`. Vercel crée automatiquement une **URL de preview** →
   tu ouvres cette URL sur ton mobile pour valider le rendu.
6. **Merge dans `main`** quand c'est bon → la prod web se met à jour toute seule.

> Règle d'or : `main` doit **toujours** être dans un état publiable (tests verts, build OK).

---

## 3. Publier une mise à jour MOBILE

Deux cas, à bien distinguer — c'est le point le plus important.

### Cas A — Changement JS / UI uniquement (le plus fréquent)
Exemples : texte, couleurs, écrans, logique métier, correction de bug JS.
→ **Mise à jour OTA (Over-The-Air)** via EAS Update : les utilisateurs reçoivent la MAJ au
prochain lancement, **sans repasser par la validation des stores**.

Recette « test puis prod » :
```bash
# 1) Publier sur le canal de test, installé sur TON build preview
npm run update:preview -- -m "Test: nouveau design accueil"
#    -> tu ouvres l'app (build preview) sur ton tel, tu vérifies

# 2) Si OK, publier en production (tous les utilisateurs)
npm run update:prod -- -m "Nouveau design accueil"
```

### Cas B — Changement NATIF
Exemples : nouvelle dépendance native, changement de permissions, nouvelle icône/splash,
montée de version Expo, modif de `app.json` (permissions/plugins).
→ Il faut **rebuild** et **resoumettre aux stores** (validation Apple/Google requise).
```bash
npm run build:android:prod   # génère l'AAB
npm run submit:android        # envoie au Play Store
# (idem ios: build:ios:prod / submit:ios)
```

**Comment savoir si c'est A ou B ?** Si tu as ajouté/retiré une dépendance dans
`package.json` qui touche du natif, ou modifié `app.json` (permissions, plugins, icônes),
c'est **B**. Sinon, dans 90% des cas c'est **A** (OTA).

---

## 4. Versionnement

- `app.json` → `expo.version` = version publique (ex : `1.2.0`). On la bump à chaque
  **release native** (semver : patch = correctif, minor = feature, major = refonte).
- `runtimeVersion` est en **policy `appVersion`** : les updates OTA ne s'appliquent qu'aux
  builds ayant la même `version`. Donc après un changement natif + bump de version, il faut
  un nouveau build (les anciens builds ne prendront pas l'OTA — c'est voulu, ça évite les
  incompatibilités natif/JS).
- Les **build numbers** (Android `versionCode`, iOS `buildNumber`) sont **auto-incrémentés**
  par EAS (`autoIncrement` dans `eas.json`, profil production).

Tenir un `CHANGELOG.md` : une ligne par release, ce qui a changé.

---

## 5. Filet de sécurité (qualité)

- `npm test` doit rester **vert** avant tout merge dans `main`.
- Ajouter des tests sur la logique métier sensible (calcul du score, observance).
- (Optionnel mais recommandé) CI GitHub Actions qui lance `npm test` + `expo export` à
  chaque PR : bloque le merge si quelque chose casse. Voir `.github/workflows/ci.yml`.

---

## 6. Prérequis à configurer une seule fois

Ces étapes nécessitent des comptes — à faire quand tu seras prêt à builder/publier.

1. **Compte Expo** (gratuit) : créer sur [expo.dev](https://expo.dev), puis `npx eas login`.
   Ajouter `"owner": "<ton-username-expo>"` dans `app.json` (obligatoire pour les builds).
2. **EAS CLI** : `npm install -g eas-cli`.
3. **Compte Google Play** (25 $ une fois) et/ou **Apple Developer** (99 $/an) pour publier.
   Détails de soumission : voir `DEPLOYMENT_GUIDE.md`.

Tant que ces comptes n'existent pas : on développe et on teste sur **web/Vercel**
(déjà fonctionnel), et on prépare tout le reste.

---

## 7. Résumé ultra-court

- Une feature = une branche `feat/…` → PR → preview → merge dans `main`.
- Bug/UI/texte sur mobile → **OTA** : `update:preview` (test) puis `update:prod`.
- Dépendance native / permissions / version → **rebuild + resubmit** aux stores.
- `main` toujours publiable, tests verts.

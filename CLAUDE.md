# CLAUDE.md — Conventions de travail RCH Suivi

App React Native + Expo (PWA + mobile) de suivi de la Rectocolite Hémorragique.
Objectif : itérer jusqu'à une app propre, buildable et publiable sur les stores, avec
un vrai process de mises à jour. Le mainteneur (David) n'est pas développeur : penser
l'architecture et les réflexes de dev en amont, expliquer les choix.

## Backlog & User Stories

- Les US vivent dans le dossier `backlog/` (non versionné — voir `.gitignore`).
- **Ne PAS prendre en compte** les US dans `backlog/draft/` (pas prêtes) ni `backlog/done/`
  (déjà livrées). On travaille uniquement les US **actives** (à la racine de `backlog/`
  ou dans un sous-dossier autre que `draft`/`done`).
- Une US = un fichier. Quand une US est livrée, la déplacer vers `backlog/done/`.
- Toujours confirmer quelle(s) US on traite avant d'implémenter.

## Workflow Git & releases

- `main` = production (web Vercel + base des builds stores). Ne jamais coder directement
  dessus : créer une branche par lot de travail.
- Branches : `feat/<slug>` (feature), `fix/<slug>` (correctif). Une PR par branche.
- Commits en français, sujet à l'impératif. Terminer par la ligne
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Ne commit/push que sur demande explicite.
- Détail du process dev→preview→prod (web + mobile OTA + stores) : voir `docs/WORKFLOW.md`.

## Commandes

- `npm run web` — dev web (preview local, port 8081)
- `npm start` — Expo dev (mobile via Expo Go / dev client)
- `npm test` — Jest (doit rester vert avant tout merge)
- `npm run build` — export web de production (validation du bundle)
- Releases OTA / builds natifs : voir les scripts `update:*` / `build:*` (package.json) et `docs/WORKFLOW.md`

## Design system

- Direction visuelle "chaude/éditoriale" : fond crème `#FCF8F3`, accent terracotta
  `#C16046`, vert sauge `#4B8A63` (santé), or/ocre `#AD7130`. Polices Hanken Grotesk (UI)
  + Newsreader (serif, gros titres).
- **Toujours** passer par les tokens de `src/theme/designSystem.js` (couleurs, radius,
  ombres, typo). Éviter les couleurs en dur dans les composants.

## Règles

- Après une modif de code previewable : vérifier au preview (pas juste supposer).
- Garder les tests verts. Ajouter des tests pour la logique métier (scores, observance).
- Ne pas embarquer de secrets. Données santé = stockage local uniquement (MMKV).

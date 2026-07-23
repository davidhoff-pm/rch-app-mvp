# Feature : Suivi journalier léger (humeur / sommeil / fatigue + chips configurables)

Document de cadrage — statut : **spécifié, non implémenté**.

## 1. Objectif

Ajouter un questionnaire quotidien très court (3 questions) portant sur l'humeur, le
sommeil et la fatigue, complété par un système de "chips" entièrement configurable par
l'utilisateur pour tracker des facteurs personnels (alimentation, comportement, régimes...)
et leur possible implication sur les symptômes.

## 2. Contexte existant (ne pas dupliquer)

- **IBD-Disk** (`src/screens/IBDiskQuestionnaireScreen.js`) couvre déjà sommeil/énergie/stress,
  mais en questionnaire complet (10 dimensions, échelle 0-10) avec un cooldown de 30 jours.
  Cette nouvelle feature est **complémentaire**, pas un remplacement : granularité quotidienne
  très légère (échelle 0-5) vs bilan mensuel approfondi.
- **`src/utils/tagDefinitions.js`** contient déjà 39 tags (25 aggravants / 14 protecteurs,
  catégories alimentation/comportement) avec un `getTagsForPrompt()` qui suggère un usage IA
  externe désormais retiré (branche `feat/retrait-ia-externe`). **Ce fichier n'est importé
  nulle part dans l'app actuellement (code mort)**. Il sert de **base de contenu par défaut**
  pour les suggestions de chips, pas de système à réactiver tel quel.
- Le suivi symptômes existant a déjà une entrée prédéfinie "Fatigue" (intensité 0-5) —
  distincte du nouvel indicateur "fatigue" 0-5 du questionnaire léger. Pas de fusion prévue,
  mais à garder en tête pour ne pas confondre l'utilisateur dans l'UI/les graphiques.

## 3. Décisions actées

| Sujet | Décision |
|---|---|
| Portée V1 | Capture des données (questionnaire + chips) + affichage visuel simple (overlay sur graphiques existants). **Pas de calcul de corrélation en V1** (biais trop nombreux — cf. §7). |
| Chips vs tags existants | Nouveau modèle de données dédié, alimenté par défaut avec des suggestions issues de `tagDefinitions.js`. |
| Type de chip | Tap quotidien uniquement, booléen (actif/inactif ce jour-là). Pas de distinction événement ponctuel / état durable : un régime "sans résidu" sur 5 jours = 5 taps distincts, un par jour. |
| Intensité | Pas de compteur/quantité — un tap = présent, un re-tap = absent. |
| Nombre de chips | Suggestions pré-remplies (≈10-15 issues des tags existants) activables/désactivables, création libre illimitée par l'utilisateur, mais **affichage simultané limité (~8)** avec écran de gestion pour réordonner/archiver. |
| Rattrapage | Aucun — le questionnaire ne concerne que le jour courant, pas de saisie rétroactive (anti-biais mémoire). Contrairement aux selles/scores existants qui sont éditables dans l'historique. |
| Emplacement UI | Carte d'entrée sur `HomeScreen` et l'onglet `Bilan` (même pattern que P-SCCAI/IBDisk : carte → tap → formulaire dédié `WellbeingCheckinScreen`), avec un slider 0-5 par sous-partie. |
| Notification | **Fusionnée** avec le rappel de selles existant (`stoolReminder`, 20h par défaut) — un seul rappel du soir qui renvoie vers un flow regroupant selles + questionnaire léger. |
| Configuration | Toggle global (désactiver toute la feature) + toggles indépendants par sous-partie : humeur / sommeil / fatigue / chips, dans `SettingsScreen`. |
| Export PDF | Inclus dès la V1 dans `ExportScreen.js`, avec disclaimer explicite pour les chips (cf. §6). |

## 4. Modèle de données (proposition)

### 4.1 Questionnaire léger

Nouvelle clé de storage : `wellbeingCheckins` (array), cohérente avec le pattern
`scoresHistory` / `ibdiskHistory` déjà en place.

```js
{
  date: "YYYY-MM-DD",       // jour concerné, = jour de saisie (pas de rattrapage)
  timestamp: 1234567890,    // horodatage de la saisie
  mood: 0-5 | null,   // null si sous-partie désactivée par l'utilisateur
  sleep: 0-5 | null,
  fatigue: 0-5 | null,
}
```

Nouveau schéma Zod à ajouter dans `src/validation/schemas.js` — **attention**, ne pas
réutiliser le nom `DailySurveySchema` (déjà pris pour le bilan Lichtiger/PRO2, champs
différents : `fecalIncontinence`, `abdominalPain`, etc.). Utiliser par exemple
`WellbeingCheckinSchema`.

Libellés proposés par cran (à valider) :
- **Humeur** : 1 = Difficile · 2 = Neutre · 3 = Bonne
- **Sommeil** : 1 = Mauvais · 2 = Moyen · 3 = Bon
- **Fatigue** : 1 = Fatigué · 2 = Modéré · 3 = En forme

### 4.2 Chips configurables

Deux entités séparées :

**Définitions des chips** — clé `factorChips` (objet ou array), gérées dans un écran de
paramétrage dédié :
```js
{
  id: "chip-<timestamp>-<random>",
  label: "Produits laitiers",
  category: "alimentation" | "comportement" | "autre",
  isDefault: true | false,   // suggérée par défaut vs créée par l'utilisateur
  active: true | false,      // affichée dans le widget (limite ~8 actives)
  archived: false,           // soft-delete : ne jamais supprimer en dur (cf. intégrité historique)
  createdAt: 1234567890,
}
```

**Occurrences quotidiennes** — clé `factorChipLogs` (array), append-only :
```js
{
  chipId: "chip-...",
  date: "YYYY-MM-DD",
  timestamp: 1234567890,
}
```
Un tap ajoute l'entrée, un re-tap le même jour la retire. Garder chip définitions et logs
séparés (comme `medications` / `intakes` existants) pour permettre le renommage d'une chip
sans perdre l'historique, et l'archivage sans casser les logs passés.

## 5. Intégration UI

- **HomeScreen** : nouvelle carte "Bilan du jour" avec les 3 curseurs/segments (1-3) +
  ligne de chips actives en dessous (composant `Badge`/pill, pattern à réutiliser plutôt
  que recréer).
- **Écran de gestion des chips** : liste avec toggle actif/inactif, réordonnancement,
  création (label + catégorie), archivage (pas de suppression dure).
- **Settings** : section dédiée avec toggle global + 4 sous-toggles (humeur, sommeil,
  fatigue, chips), à côté des réglages de notification existants.
- **Notification du soir** : réutilisation de `scheduleStoolReminder` /
  `notificationSettings.stoolReminder` — le texte de la notif doit mentionner explicitement
  que la saisie porte sur "aujourd'hui", pour éviter la confusion signalée à minuit passé
  (l'entrée est toujours associée à la date du jour de clic, jamais à la date d'envoi de
  la notif — même logique que `dailySells`).
- **StatsScreen (V1)** : overlay des chips actives sous l'axe des dates de `TrendChart`
  (petits marqueurs colorés par chip, détail au tap). Accompagné d'un texte fixe :
  *"Ces marqueurs sont informatifs, ils n'établissent pas de lien de cause à effet."*

## 6. Export PDF

`ExportScreen.js` inclut dès la V1 :
- Le résumé du questionnaire léger sur la période exportée (moyennes ou mini-graphe).
- La liste des chips actives par jour.
- Le même disclaimer que dans StatsScreen pour contextualiser aux yeux du médecin.

## 7. Pourquoi la corrélation est reportée (V2/V3)

Risques de biais identifiés à traiter avant tout calcul automatique :
- **Causalité inverse** : un patient qui évite un facteur *parce qu'il se sent mal* produit
  une fausse corrélation inversée (fréquent sur les facteurs "protecteurs"/évitements réactifs).
- **Décalage temporel (lag)** : un effet peut apparaître le jour même ou avec 1-3 jours de
  retard ; une corrélation "même jour" naïve rate l'essentiel des signaux réels.
- **Autocorrélation des symptômes** : un mauvais jour dans une MICI est statistiquement
  suivi d'un autre mauvais jour, indépendamment de toute cause — une chip qui coïncide avec
  un pic déjà en cours semblera "corrélée" à tort.
- **Taille d'échantillon** : une chip tapée 2x/semaine ne donne que ~8 points/mois,
  insuffisant pour une conclusion fiable avant plusieurs mois de données.
- **Comparaisons multiples** : avec 10+ chips corrélées à plusieurs indicateurs (selles,
  douleur, sang, score...), certaines paraîtront "significatives" par pur hasard.
- **Message clinique** : ces résultats peuvent finir dans l'export PDF envoyé au médecin —
  toute future restitution devra être présentée comme exploratoire ("tendance à explorer"),
  jamais comme causalité établie.

Plan de montée en puissance suggéré (hors scope de ce document) :
1. **V1** (ce document) : capture + overlay visuel, lecture humaine.
2. **V2** : comparaison heuristique simple (moyenne du score les jours avec chip vs sans),
   avec seuil minimum de données avant affichage et disclaimers renforcés.
3. **V3** : analyse statistique avec gestion du lag et correction des comparaisons multiples,
   si le besoin est confirmé par l'usage réel.

## 8. Points ouverts / à trancher au moment du dev

- Wording exact des libellés d'échelle (proposition au §4.1, à valider ou ajuster).
- Détail visuel des marqueurs d'overlay sur `TrendChart` (couleur par chip vs icône générique).
- Comportement du widget HomeScreen si toutes les sous-parties sont désactivées dans les
  réglages (masquer entièrement la carte plutôt que l'afficher vide).

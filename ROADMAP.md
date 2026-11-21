# Feuille de route de CaTLX

## Priorité actuelle

Concentrer les prochains travaux sur l’interface de CaTLX et valider les changements sur `preprod`. Le partage multi-utilisateur est prévu pour une étape ultérieure.

## Évolution prévue — Projets partagés

### Décisions prises

- Un projet peut avoir ses propres catalogues de MTE et sa propre liste d’évaluateurs. Il peut aussi réutiliser des catalogues et des évaluateurs d’un autre projet.
- L’**administrateur** crée les projets et invite les personnes dans des projets précis.
- Le **gestionnaire de projet** crée et gère les MTE et les scénarios de son projet, et peut saisir des cotations.
- L’**évaluateur** dispose d’un accès limité aux études qui lui sont attribuées et à ses cotations.
- Un gestionnaire ou un administrateur peut rester connecté avec son propre compte et saisir successivement les cotations de plusieurs évaluateurs. Il sélectionne l’évaluateur dans l’étude à chaque passage. Un évaluateur peut figurer dans la liste sans compte CaTLX.
- Chaque cotation doit conserver l’évaluateur sélectionné pour les résultats et le compte connecté qui a saisi la cotation pour la traçabilité.

### Proposition à valider

Le projet d’origine garde la main sur les modifications d’un catalogue partagé. Les projets qui utilisent le catalogue reçoivent ses mises à jour. Les résultats antérieurs conservent le libellé et la référence de la MTE au moment de la cotation. Le droit de modification par les gestionnaires des projets destinataires reste à décider.

### Points à couvrir lors de l’implémentation

- Appliquer les permissions au niveau de chaque projet dans Supabase. Le partage d’un catalogue ou d’un évaluateur ne donne pas accès aux études, aux résultats ni aux cotations du projet d’origine.
- Préciser qui autorise et retire un partage, ainsi que le devenir des références utilisées dans les études existantes. Prévoir la révocation des accès et la resynchronisation des copies hors ligne.
- Migrer les projets et les cotations existants en conservant leur historique. Vérifier sur `preprod` les rôles, l’isolation entre projets et la saisie successive pour plusieurs évaluateurs avec un seul compte connecté.

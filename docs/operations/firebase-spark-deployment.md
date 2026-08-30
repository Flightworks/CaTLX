# Déploiement Firebase Spark CaTLX

## Objectif

Ce document décrit le staging Firebase sans facturation. Il ne contient aucun identifiant réel, secret ou jeton.

## Projets séparés

- `catlx-staging` : données synthétiques et validation technique ;
- `catlx-prod` : données réelles, à créer seulement après validation de staging.

Le workflow actuel n’autorise volontairement que `catlx-staging`.

## Garde-fous obligatoires

Avant tout déploiement :

1. Vérifier dans la console Firebase que le projet est sur **Spark**.
2. Vérifier qu’aucun compte de facturation n’est associé.
3. Vérifier que les produits payants ne sont pas activés.
4. Vérifier que les données de staging sont synthétiques.
5. Vérifier que le secret GitHub `FIREBASE_SPARK_CONFIRMED` vaut `true`.
6. Saisir manuellement la confirmation `confirm_spark=true` dans le workflow.

Une alerte de budget n’est pas un plafond de facturation. Le garde-fou recherché est l’absence de compte de facturation et l’utilisation du plan Spark.

## Secrets GitHub

À configurer dans l’environnement protégé `firebase-staging` :

- `FIREBASE_TOKEN` : jeton de déploiement, jamais affiché ;
- `FIREBASE_SPARK_CONFIRMED` : valeur `true` après vérification manuelle ;
- `VITE_FIREBASE_API_KEY` ;
- `VITE_FIREBASE_AUTH_DOMAIN` ;
- `VITE_FIREBASE_PROJECT_ID` ;
- `VITE_FIREBASE_APP_ID`.

La configuration web Firebase peut être publique dans le bundle. Le jeton de déploiement ne doit jamais y apparaître.

## Déploiement staging

Le workflow `.github/workflows/firebase-preview.yml` est déclenché uniquement par `workflow_dispatch`.

Il exécute :

```bash
npm ci
npm test
npm run test:rules
npm run build -- --mode firebase
npx firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Il refuse tout autre identifiant de projet que `catlx-staging` et s’arrête si les deux confirmations Spark ne sont pas présentes.

## Vérification après déploiement

- ouvrir l’URL Firebase Hosting du staging ;
- tester connexion, inscription pending et déconnexion ;
- tester l’approbation d’un utilisateur ;
- tester création/révision d’un MTE ;
- vérifier qu’un évaluateur ne lit pas `/mteCatalog` ;
- vérifier qu’il ne voit que son étude et ses snapshots ;
- vérifier les règles depuis le moniteur de requêtes Firebase ;
- vérifier l’absence de données réelles ;
- conserver l’URL, le commit et le rapport de tests dans le compte rendu de release.

## Production

Il n’existe pas encore de workflow de production. Il devra être créé dans un changement séparé avec :

- environnement GitHub protégé ;
- validation humaine distincte ;
- projet `catlx-prod` explicitement allowlisté ;
- sauvegarde/export avant migration ;
- procédure de rollback ;
- décision explicite sur le plan Spark ou Blaze.

Ne jamais transformer le workflow staging en déploiement automatique de production.

# ADR-003 — Déploiement en ligne avec Firebase Spark

- **Statut :** accepté pour l’implémentation progressive
- **Date :** 2026-08-30
- **Projet :** CaTLX

## Décision

CaTLX ajoutera un mode en ligne basé sur :

- Firebase Hosting pour le frontend React/Vite ;
- Firebase Authentication pour les comptes ;
- Cloud Firestore pour les données applicatives ;
- Firestore Security Rules v2 pour l’autorisation ;
- Firebase Local Emulator Suite pour le développement et les tests.

La première cible utilise exclusivement le plan **Firebase Spark**. Aucun moyen de paiement ne doit être associé au projet pendant la phase initiale. Aucun service Blaze, Cloud Run, Cloud Functions, Cloud SQL ou Firebase Storage n’est requis pour cette version.

Le mode Firebase sera ajouté derrière l’abstraction `IDataSource`. Les modes `demo`, `local` et l’API Express/SQLite existante seront conservés jusqu’à la validation complète du mode Firebase.

## Contexte

CaTLX conduit des évaluations NASA-TLX et gère :

- des projets et études ;
- un catalogue de Mission Task Elements (MTE) ;
- des évaluateurs ;
- des affectations étude–MTE–évaluateur ;
- des scores NASA-TLX, commentaires et comparaisons paire-à-paire ;
- des statistiques et résultats agrégés.

Le catalogue MTE peut contenir des informations opérationnelles. Un utilisateur authentifié ne doit donc pas automatiquement avoir accès à toutes les collections.

## Modèle de confidentialité

Le catalogue global sera stocké dans `/mteCatalog/{mteId}` et réservé aux rôles autorisés.

Lorsqu’un MTE est affecté à une étude, une copie contrôlée sera créée dans :

```text
/studies/{studyId}/mtes/{mteId}
```

Cette copie est un **snapshot de l’étude**. Elle contient uniquement les informations nécessaires à l’évaluation et conserve la révision utilisée. Un évaluateur ne pourra jamais lire `/mteCatalog`.

Cette séparation évite qu’un évaluateur découvre le catalogue complet en devinant un identifiant ou en exécutant une requête Firestore différente de celle prévue par l’interface.

## Rôles

- `admin` : gestion globale, comptes, rôles et récupération ;
- `catalog_manager` : création, modification et archivage des MTE ;
- `study_manager` : gestion des projets, études et affectations autorisées ;
- `analyst` : consultation des résultats autorisés ;
- `evaluator` : lecture des snapshots de ses études et écriture de ses propres réponses ;
- `pending` : compte créé mais non approuvé ;
- `disabled` : compte suspendu, sans accès métier.

L’utilisateur ne peut pas choisir son rôle. Une inscription crée un profil `pending`; seul un administrateur peut l’activer et lui attribuer un rôle.

## Données et règles

Collections prévues :

```text
/users/{uid}
/projects/{projectId}
/mteCatalog/{mteId}
/studies/{studyId}
/studies/{studyId}/participants/{uid}
/studies/{studyId}/mtes/{mteId}
/studies/{studyId}/ratings/{ratingId}
/studies/{studyId}/pairwise/{uid}
/auditEvents/{eventId}
```

Les règles doivent appliquer le refus par défaut, vérifier l’état actif et le rôle, puis vérifier l’appartenance à l’étude. Les contrôles dans React servent uniquement à l’ergonomie et ne constituent pas une mesure de sécurité.

Les requêtes frontend doivent être conçues pour satisfaire les règles Firestore : les règles ne filtrent pas automatiquement les résultats d’une requête trop large.

## Comptes sans backend payant

La première version ne dépendra pas de Cloud Functions ou Cloud Run pour créer les comptes. Le parcours sera :

1. inscription email/mot de passe ;
2. création du profil Firestore en `pending` ;
3. validation et attribution du rôle dans l’interface admin ;
4. suspension possible par l’admin.

La création ou suppression technique d’une identité Firebase peut rester une opération de secours dans la console Firebase pendant cette première version.

## Facturation et quotas

Le dépassement d’un quota Spark est accepté comme un arrêt temporaire du produit concerné, pas comme une autorisation implicite de facturation. Le projet doit rester sans compte de facturation.

Le plan doit éviter les lectures globales inutiles et les listeners qui téléchargeraient le catalogue complet à chaque connexion. Les tests doivent vérifier qu’un compte évaluateur ne lit jamais la collection globale.

## Alternatives écartées pour cette étape

- **Blaze + Cloud Run + Cloud SQL :** architecture potentiellement plus robuste, mais facturation à l’usage et absence de plafond dur simple ; reporté.
- **Firestore directement sans règles testées :** rejeté pour risque de divulgation du catalogue.
- **Migration immédiate depuis Express/SQLite :** rejetée pour préserver un retour arrière simple.
- **Hébergement à domicile :** non retenu pour la cible en ligne.

## Critères d’acceptation

La décision sera considérée comme validée lorsque :

- les règles Firestore auront des tests positifs et négatifs ;
- un évaluateur ne pourra pas lire `/mteCatalog` ;
- un évaluateur ne pourra lire que ses études et ses snapshots ;
- un compte `pending` ou `disabled` n’aura aucun accès métier ;
- un gestionnaire MTE ne pourra pas consulter les réponses individuelles hors de son périmètre ;
- l’application fonctionnera avec les émulateurs sans réseau Google ;
- le staging utilisera des données synthétiques ;
- le projet Firebase sera vérifié Spark, sans compte de facturation ;
- l’export et le retour au mode local resteront possibles.

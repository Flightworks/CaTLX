# Matrice de contrôle d’accès CaTLX

## Principes

1. Refus par défaut.
2. L’authentification ne donne pas automatiquement accès aux données.
3. Les règles Firestore sont la protection réelle ; l’interface ne fait que masquer les actions impossibles.
4. Un évaluateur est limité à ses études et à ses MTE snapshots.
5. Le catalogue global ne doit jamais être chargé dans le navigateur d’un évaluateur.
6. Toute modification sensible doit être vérifiable par un événement d’audit minimal.

## États de compte

| État | Connexion | Données métier | Action autorisée |
|---|---:|---:|---|
| `pending` | Oui | Non | Consulter son état et demander une validation |
| `active` | Oui | Selon le rôle | Utiliser les fonctionnalités autorisées |
| `disabled` | Non / refusé | Non | Aucune |

## Rôles

| Fonctionnalité | `admin` | `catalog_manager` | `study_manager` | `analyst` | `evaluator` |
|---|---:|---:|---:|---:|---:|
| Voir les utilisateurs | Oui | Non | Non | Non | Non |
| Modifier rôles/états | Oui | Non | Non | Non | Non |
| Lire le catalogue MTE global | Oui | Oui | Selon périmètre | Non | Non |
| Créer ou modifier un MTE | Oui | Oui | Non | Non | Non |
| Archiver un MTE | Oui | Oui | Non | Non | Non |
| Lire ses études autorisées | Oui | Selon périmètre | Oui | Selon périmètre | Oui |
| Modifier une étude | Oui | Non | Oui | Non | Non |
| Affecter un MTE à une étude | Oui | Selon périmètre | Oui | Non | Non |
| Lire les snapshots MTE d’une étude | Oui | Lecture autorisée | Oui | Selon périmètre | Si participant actif |
| Lire les réponses individuelles | Oui | Non par défaut | Selon étude | Selon autorisation | Ses réponses |
| Lire les résultats agrégés | Oui | Non par défaut | Oui | Oui selon étude | Son résumé |
| Soumettre une notation | Non | Non | Non | Non | Oui, pour lui-même |
| Modifier une notation d’un autre utilisateur | Oui | Non | Selon politique | Non | Non |
| Créer un événement d’audit | Service contrôlé | Service contrôlé | Service contrôlé | Service contrôlé | Service contrôlé |

## Structure Firestore proposée

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

## Règles métier par collection

### `/users`

- Un utilisateur peut lire son propre profil.
- Un utilisateur ne peut pas choisir ou élever son rôle lors de l’inscription.
- Seul un `admin` peut modifier `role`, `status`, `approvedAt` et `approvedBy`.
- Un compte `disabled` n’a plus accès aux collections métier.

### `/mteCatalog`

- `admin` et `catalog_manager` peuvent lire.
- `admin` et `catalog_manager` peuvent créer et modifier.
- La suppression physique est interdite si le MTE a déjà été affecté à une étude ; l’archivage (`active=false`) est utilisé.
- `evaluator` est explicitement refusé, y compris sur un identifiant connu.

### `/studies`

- `admin` voit tout.
- `study_manager` voit uniquement ses projets/études autorisés.
- `evaluator` ne lit que les études pour lesquelles un document participant actif existe.
- Une modification ne doit pas permettre à un utilisateur de s’ajouter lui-même comme administrateur ou participant privilégié.

### `/studies/{studyId}/mtes`

- Ces documents sont des snapshots de la révision utilisée dans l’étude.
- Un évaluateur participant actif peut les lire.
- Un évaluateur ne peut ni les modifier, ni les rattacher à une autre étude.
- Le snapshot ne doit pas contenir de champ non nécessaire à l’évaluation.

### `/ratings` et `/pairwise`

- Un évaluateur peut créer ou modifier uniquement sa propre réponse, selon la politique de verrouillage retenue.
- `evaluatorUid`, `studyId` et `mteId` sont vérifiés par rapport à l’utilisateur authentifié et aux affectations.
- Les scores doivent contenir uniquement les six dimensions TLX attendues et des valeurs dans l’intervalle défini par l’application.
- Les lectures de résultats individuels sont réservées aux rôles et périmètres autorisés.

### `/auditEvents`

- Le client ne peut pas écrire un événement arbitraire en se faisant passer pour un autre acteur.
- L’écriture doit être limitée à une fonction contrôlée par les règles ou, dans cette première version Spark sans backend serveur, à un schéma strict où `actorUid == request.auth.uid` et les champs immuables sont validés.
- Les descriptions détaillées du catalogue ne doivent pas être recopiées dans les journaux.

## Tests obligatoires

Pour chaque règle, écrire un test positif et un test négatif avec l’émulateur :

- utilisateur non connecté ;
- compte `pending` ;
- compte `disabled` ;
- deux évaluateurs affectés à deux études différentes ;
- gestionnaire de catalogue ;
- responsable d’étude ;
- analyste ;
- administrateur.

Les tests doivent notamment prouver :

- impossibilité de lire le catalogue global comme évaluateur ;
- impossibilité de lire une étude non affectée ;
- impossibilité de modifier le rôle d’un autre utilisateur ;
- impossibilité d’écrire une note pour un autre évaluateur ;
- impossibilité de contourner l’autorisation en utilisant directement un identifiant connu ;
- retrait immédiat des droits après passage à `disabled`.

## Décisions encore à prendre avant production

- durée de conservation des réponses individuelles ;
- délai pendant lequel un évaluateur peut modifier sa réponse ;
- accès des analystes aux commentaires libres ;
- liste d’adresses ou domaines autorisés à s’inscrire ;
- nécessité d’une validation manuelle de chaque compte.

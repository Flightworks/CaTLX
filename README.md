# CaTLX

CaTLX sert à créer des études et à recueillir des évaluations de charge de travail NASA TLX. En hébergement Cloudflare Pages, Google protège l’espace privé synchronisé avec Supabase. La cotation rapide (`/#/quick-rating`) est accessible sans compte. Le lancement local permet aussi d’ouvrir les modes Démo et Local.

Voir la [feuille de route](ROADMAP.md) pour les priorités et les évolutions prévues.

## Lancement local

Avec Node.js 22 ou une version LTS plus récente.

```sh
npm ci
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Avec une configuration Supabase dans `.env.local`, Vite lance le mode Google. Les paramètres sont listés dans [.env.example](.env.example). Les données des modes Local et Démo restent isolées dans leur contexte d’origine. Le portage démarre avec un espace Supabase vide.

## Cotation et accès hors ligne

CaTLX ouvre directement le projet quand il n’y en a qu’un. Depuis la liste des études, ouvrez une étude et choisissez son évaluateur pour coter ses MTE. **Ajouter depuis le catalogue** permet aussi de rechercher une tâche par nom ou référence et de l’associer en la cotant. Un scénario sélectionne un sous-ensemble des MTE de l’étude dans un ordre configurable. La cotation avance d’une MTE à la suivante dans cet ordre. Une MTE peut recevoir une cotation distincte dans chaque scénario.

Le Quick Rating reste accessible hors ligne après le premier chargement complet de la PWA. Pour emporter l’espace privé, connectez-vous à Google en ligne et choisissez **Activer le hors-ligne sur cet appareil**. Le déverrouillage de l’appareil permet d’ouvrir la copie chiffrée sur un navigateur compatible avec WebAuthn PRF. Une copie existante peut être ouverte avec son ancienne phrase secrète, puis convertie depuis l’espace privé. CaTLX conserve les modifications sur cet appareil, puis les synchronise après reconnexion. En cas de conflit, choisissez la version à garder. Une déconnexion efface la copie et les changements qui n’ont pas été synchronisés.

## Préproduction

Utiliser un projet Supabase réservé à la préproduction et la branche GitHub `preprod`. Le projet de production utilisera sa propre URL Supabase, sa propre clé publique et une installation distincte du schéma.

### Cloudflare Pages

Dans le projet Pages relié à `Flightworks/CaTLX`, conserver `main` comme branche de production, désactiver ses déploiements automatiques et autoriser les aperçus de `preprod` uniquement. Pour un nouveau projet, définir ces contrôles dès la [création via l’API Pages](https://developers.cloudflare.com/api/resources/pages/subresources/projects/methods/create/) si le formulaire propose de déployer la production immédiatement. Dans `source.config`, utiliser `production_deployments_enabled: false`, `preview_deployment_setting: "custom"` et `preview_branch_includes: ["preprod"]`.

Définir la commande de build `npm run build` et le dossier de sortie `dist`. Configurer uniquement les variables de l’environnement **Preview**.

| Variable | Valeur |
| --- | --- |
| `NODE_VERSION` | `22` |
| `VITE_CATLX_ENV` | `preprod` |
| `VITE_CATLX_SITE_URL` | `https://preprod.<nom-du-projet>.pages.dev/` |
| `VITE_SUPABASE_URL` | `https://<ref-du-projet-de-test>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La clé publique `sb_publishable_…` du projet Supabase de test |

La clé publique est incluse dans le code servi au navigateur. Saisir le secret OAuth Google dans Supabase Authentication. Le frontend n’utilise ni le secret Google ni une clé Supabase privilégiée.

Déclencher le premier [déploiement Git via l’API Pages](https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/) avec le champ explicite `branch=preprod`, ou pousser une mise à jour de `preprod` une fois l’intégration configurée. Utiliser l’alias de branche `preprod.<nom-du-projet>.pages.dev` pour les connexions Google. Les URL de déploiement versionnées redirigent vers cet alias.

### Supabase et Google

1. Appliquer [la migration](supabase/migrations/20261121090000_catlx_workspace.sql) dans le **projet Supabase de test**, via le SQL Editor ou les migrations Supabase. Tant que le compte propriétaire et l’espace ne sont pas renseignés, aucune session n’accède aux données.
2. Dans Google Cloud, configurer un client OAuth de type **Application Web**. Ajouter l’origine Cloudflare de préproduction dans les origines JavaScript autorisées et l’URI `https://<ref-du-projet-de-test>.supabase.co/auth/v1/callback` dans les URI de redirection autorisés. Si l’application Google est en mode Test, ajouter le propriétaire aux utilisateurs de test. Dans Supabase Authentication, activer uniquement le fournisseur Google et saisir son ID client et son secret. Désactiver les connexions anonymes et la liaison manuelle d’identités. [Guide Supabase pour Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
3. Dans **Authentication → URL Configuration**, renseigner l’URL canonique `https://preprod.<nom-du-projet>.pages.dev/` comme Site URL et comme URL de retour autorisée. Autoriser temporairement les inscriptions, ouvrir `preprod` et se connecter avec le compte Google propriétaire. L’application affiche un refus tant que l’espace n’est pas attribué. Vérifier le compte dans **Authentication → Users** et copier son UUID Supabase. Désactiver les inscriptions une fois l’utilisateur créé. [Configuration des redirections](https://supabase.com/docs/guides/auth/redirect-urls)
4. Dans le SQL Editor du projet de test, exécuter le bloc suivant en remplaçant l’UUID d’exemple par celui du compte Google vérifié. Se reconnecter ensuite sur `preprod`.

```sql
do $$
declare
  owner_id constant uuid := '00000000-0000-4000-8000-000000000001';
  google_subject text;
begin
  select identity.provider_id into strict google_subject
  from auth.identities as identity
  where identity.user_id = owner_id and identity.provider = 'google';

  insert into catlx_private.owner (user_id, google_subject) values (owner_id, google_subject);
  insert into public.catlx_workspace (environment) values ('preprod');
end;
$$;
```

### Validation avant publication

- Sur `preprod`, se connecter avec le compte propriétaire et enregistrer un projet, une étude, une tâche et une évaluation fictifs. Sur un autre appareil ou dans un profil séparé, se reconnecter et vérifier la présence de l’évaluation. Vérifier que la ligne du projet Supabase de test porte l’environnement `preprod`.
- Dans une fenêtre privée, vérifier que l’application affiche uniquement la connexion Google. Vérifier également que l’API Supabase refuse les lectures et écritures sans session. Essayer de se connecter avec un autre compte Google et vérifier le refus. La politique SQL peut aussi être testée avec les comptes fictifs du script ci-dessous, y compris quand Supabase a créé une session pour un autre utilisateur.
- Sur deux onglets déjà connectés, enregistrer un changement dans le premier puis essayer d’enregistrer dans le second sans l’avoir rechargé. Le second doit signaler un conflit et préserver les données déjà enregistrées.

Pour tester les politiques SQL, appliquer la migration à une base Supabase locale jetable (`supabase start`), puis exécuter le script avec son URL PostgreSQL locale.

```sh
psql "${LOCAL_DB_URL:?}" -v ON_ERROR_STOP=1 -f supabase/tests/workspace.sql
```

### Production

Après accord explicite de publication, configurer le projet Supabase de production séparé et son client OAuth Google. Appliquer la migration, puis attribuer l’espace au même compte Google à partir de l’UUID Supabase de ce projet, avec `environment = 'production'` dans le bloc d’attribution. Renseigner les variables de l’environnement **Production** dans Pages, dont `VITE_CATLX_ENV=production` et l’URL canonique du site final. Déployer `main` après validation de la préproduction et vérifier la connexion à l’espace de production vide.

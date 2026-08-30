# CaTLX Firebase Spark Transition Implementation Plan

> **For Hermes:** Use `subagent-driven-development` or the Kanban graph in this plan to implement task-by-task. Execution is explicitly deferred until Olivier requests it.

**Goal:** Transition CaTLX from the current optional Express/SQLite API mode to a secure Firebase Spark architecture that supports online hosting, authentication, administration, MTE catalogue editing, study-scoped evaluator access, and zero usage-based billing.

**Architecture:** Preserve `demo` and `local` modes. Add a Firebase-backed production mode behind the existing `IDataSource` boundary, then retire Express/SQLite only after Firebase emulator and staging acceptance gates pass. Firebase Authentication provides identities; Cloud Firestore stores roles and application data; Firestore Security Rules enforce all permissions. Firebase Hosting serves the Vite/PWA bundle. No Blaze billing, Cloud Run, Cloud Functions, Cloud SQL, or payment method is permitted in the initial target.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Firebase Web SDK, Firebase Authentication, Cloud Firestore, Firestore Security Rules v2, Firebase Emulator Suite, `@firebase/rules-unit-testing`, Firebase Hosting.

---

## 1. Scope and non-negotiable constraints

### Included

- Email/password authentication, password reset and email verification.
- Account lifecycle: self-registration into `pending`, administrator approval, suspension and role changes.
- Roles: `admin`, `catalog_manager`, `study_manager`, `analyst`, `evaluator`, `pending`, `disabled`.
- Administrator UI and route guards.
- Full MTE catalogue CRUD for authorised roles.
- Study/project management and evaluator assignment.
- Evaluator access limited to assigned studies and study-specific MTE snapshots.
- NASA-TLX ratings and pairwise comparisons.
- Firebase emulator test environment.
- Firebase Spark staging and production deployment definitions.
- Demo/local modes retained for development and demonstrations.

### Excluded from the first Firebase release

- Cloud Functions, Cloud Run, Cloud SQL and the Blaze plan.
- SMS authentication, phone MFA and paid Identity Platform features.
- Public anonymous evaluator links.
- File uploads and Firebase Storage.
- Multi-tenant organisations and billing.
- Automatic migration of production data that does not yet exist.

### Billing safety gate

Implementation must fail the release gate if the selected Firebase project:

- is on Blaze;
- has a billing account attached;
- requires a paid-only feature;
- contains real MTE data in the staging project.

Spark quota exhaustion is an accepted failure mode: the application may become temporarily unavailable, but it must not incur overage charges.

---

## 2. Target data and authorisation model

### Firestore collections

```text
/users/{uid}
  email, displayName, role, status, createdAt, approvedAt, approvedBy

/projects/{projectId}
  name, description, ownerUid, memberUids[], createdAt, updatedAt

/mteCatalog/{mteId}
  refNumber, name, description, revision, active, createdAt, updatedAt

/studies/{studyId}
  projectId, name, description, date, managerUids[], status, createdAt, updatedAt

/studies/{studyId}/participants/{uid}
  role: "evaluator", assignedAt, active

/studies/{studyId}/mtes/{mteId}
  sourceMteId, sourceRevision, refNumber, name, description

/studies/{studyId}/ratings/{uid_mteId}
  evaluatorUid, mteId, scores, comments, submittedAt

/studies/{studyId}/pairwise/{uid}
  evaluatorUid, weights, isWeighted, submittedAt

/auditEvents/{eventId}
  actorUid, action, entityType, entityId, studyId?, timestamp, summary
```

### Confidentiality rule

Evaluators must never read `/mteCatalog`. They read only `/studies/{studyId}/mtes/*` for studies where `/participants/{uid}` is active. These study MTE documents are deliberate snapshots, preserving the exact wording and revision used during an assessment.

### Role matrix

| Capability | admin | catalog_manager | study_manager | analyst | evaluator |
|---|---:|---:|---:|---:|---:|
| Manage users/roles | yes | no | no | no | no |
| Read global MTE catalogue | yes | yes | assigned studies only | study scope if approved | no |
| Edit global MTE catalogue | yes | yes | no | no | no |
| Manage projects/studies | yes | no | assigned projects | no | no |
| Assign study MTE snapshots | yes | read source | assigned studies | no | no |
| Read individual ratings | yes | no | assigned studies | approved studies | own only |
| Submit ratings | no | no | no | no | own assigned studies |
| Read aggregated results | yes | no | assigned studies | approved studies | own summary only |

All permissions must be enforced in Firestore Rules. Hiding buttons is not security.

---

## 3. Proposed Kanban execution graph

Only the `default` Hermes profile currently exists. Before execution, either switch that profile to the chosen lower-cost model and run the cards serially, or create real specialist profiles and verify their names with `hermes profile list`. Do not assign invented profile names.

```text
K0 Architecture contract and baseline
 ├─> K1 Firebase emulator foundation
 │    ├─> K2 Firestore rules + adversarial tests
 │    └─> K3 Firebase authentication adapter
 │          └─> K4 Firestore IDataSource adapter
 │                ├─> K5 Admin/users/catalogue UI
 │                └─> K6 Evaluator isolation workflow
 │                      └─> K7 Staging deployment
 │                            ├─> K8 Independent security review
 │                            └─> K9 Functional/UX review
 │                                  └─> K10 Production-readiness decision
```

Recommended ownership at execution time:

- Engineering cards K1–K7: engineer-capable profile or native Turing handoff.
- Security/compliance review K8: separate fresh reviewer context.
- Functional/UX review K9: writer/reviewer context plus browser test.
- K10: orchestrator synthesis; no deployment unless Olivier explicitly approves.

Each card must create its own branch/commit, attach exact test evidence, and block rather than guess when credentials or a Firebase console action is required.

---

## 4. Task-by-task implementation plan

### Task K0: Freeze the architecture contract and baseline

**Objective:** Record the approved Firebase Spark design and prove the current branch is green before changes.

**Files:**
- Create: `docs/architecture/ADR-003-firebase-spark.md`
- Create: `docs/security/access-control-matrix.md`
- Modify: `README.md`

**Steps:**

1. Document Spark-only constraints, the data model above, data classification and the decision to preserve demo/local modes.
2. Document that evaluator MTE snapshots are intentionally separate from the catalogue.
3. Run baseline checks:
   ```bash
   npx tsc --noEmit
   npm test
   npm run build
   git status --short
   ```
4. Expected: TypeScript 0 errors, current 19 tests pass, build succeeds, no unrelated working-tree changes.
5. Commit:
   ```bash
   git add docs README.md
   git commit -m "docs: define Firebase Spark architecture and access model"
   ```

**Acceptance gate:** ADR explicitly states that no billing account or Blaze service may be introduced.

---

### Task K1: Add Firebase emulator foundation

**Objective:** Introduce Firebase configuration without connecting development tests to Google.

**Files:**
- Modify: `package.json`, `package-lock.json`, `.gitignore`, `global.d.ts`
- Create: `firebase.json`
- Create: `.firebaserc.example`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `src/firebase/config.ts`
- Create: `.env.example`

**Dependencies:**

```text
firebase
firebase-tools (dev)
@firebase/rules-unit-testing (dev)
```

**Environment contract:**

```dotenv
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_USE_FIREBASE_EMULATORS=true
```

Only public Firebase web configuration belongs in Vite variables. Service-account JSON, refresh tokens and Firebase CLI tokens must never enter the repository.

**TDD steps:**

1. Write `src/firebase/config.test.ts` asserting missing configuration produces a clear error outside demo/local mode.
2. Run the focused test and verify RED.
3. Implement lazy Firebase app initialisation and emulator connections guarded against duplicate connection.
4. Run focused test and full suite; verify GREEN.
5. Add scripts:
   ```json
   {
     "emulators": "firebase emulators:start --only auth,firestore,hosting",
     "test:rules": "firebase emulators:exec --only firestore,auth 'vitest run tests/firestore'"
   }
   ```
6. Commit: `chore: add Firebase emulator foundation`.

**Acceptance gate:** `npm test` performs no network request to Google.

---

### Task K2: Implement Firestore Security Rules first

**Objective:** Make server-enforced access control executable and adversarially tested before UI integration.

**Files:**
- Modify: `firestore.rules`, `firestore.indexes.json`
- Create: `tests/firestore/helpers.ts`
- Create: `tests/firestore/users.rules.test.ts`
- Create: `tests/firestore/catalog.rules.test.ts`
- Create: `tests/firestore/studies.rules.test.ts`
- Create: `tests/firestore/ratings.rules.test.ts`

**Core rule helpers:**

```rules
function signedIn() {
  return request.auth != null;
}
function userDoc() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid));
}
function hasRole(roles) {
  return signedIn()
    && userDoc().data.status == "active"
    && userDoc().data.role in roles;
}
function activeParticipant(studyId) {
  return signedIn()
    && exists(/databases/$(database)/documents/studies/$(studyId)/participants/$(request.auth.uid))
    && get(/databases/$(database)/documents/studies/$(studyId)/participants/$(request.auth.uid)).data.active == true;
}
```

**Required negative tests:**

- unauthenticated users read nothing except their authentication pages;
- `pending` and `disabled` users read no business data;
- evaluator cannot list or get `/mteCatalog` documents, even by known ID;
- evaluator cannot access an unassigned study;
- evaluator cannot write a rating for another UID;
- evaluator cannot change `evaluatorUid`, `studyId`, MTE snapshot or role;
- catalogue manager cannot read individual ratings;
- study manager cannot grant themselves `admin`;
- analysts cannot modify source data;
- ordinary users cannot create or update audit events impersonating another actor.

**Required positive tests:**

- admin manages user status/roles;
- catalogue manager CRUDs MTEs;
- study manager manages only permitted projects/studies;
- evaluator reads assigned study snapshots and creates/updates only their own rating;
- analyst reads authorised results.

**Verification:**

```bash
npm run test:rules
```

Expected: all positive and negative rules tests pass.

**Commit:** `test: enforce Firebase role and study boundaries`.

---

### Task K3: Replace API JWT authentication with Firebase Auth abstraction

**Objective:** Support Firebase sessions while preserving demo/local modes.

**Files:**
- Create: `src/auth/types.ts`
- Create: `src/auth/firebaseAuth.ts`
- Create: `src/auth/firebaseAuth.test.ts`
- Modify: `contexts/AppContext.tsx`
- Modify: `pages/LoginPage.tsx`
- Modify: `components/layout/Header.tsx`
- Modify: `public/locales/fr.json`, `public/locales/en.json`

**Auth state:**

```ts
type AppRole = 'admin' | 'catalog_manager' | 'study_manager' | 'analyst' | 'evaluator' | 'pending' | 'disabled';
interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  status: 'pending' | 'active' | 'disabled';
}
```

**TDD cases:**

- login returns Firebase user plus Firestore profile;
- logout clears session without deleting demo/local data;
- password-reset request reports a neutral success message;
- unverified/pending/disabled states route to explicit screens;
- `onAuthStateChanged` restores the session after reload;
- no token is manually persisted in `localStorage`;
- emulator auth is used only when the emulator flag is enabled.

**UI changes:**

- retain Demo and Local buttons only in development builds;
- add Sign in, Create account, Forgot password;
- add Pending approval and Disabled account screens;
- do not let users select their own role.

**Commit:** `feat: integrate Firebase Authentication and account states`.

---

### Task K4: Add a Firestore implementation of IDataSource

**Objective:** Preserve component compatibility while moving persistence to Firestore.

**Files:**
- Create: `hooks/useFirestoreData.ts`
- Create: `hooks/useFirestoreData.test.ts`
- Create: `src/firestore/converters.ts`
- Create: `src/firestore/repositories/*.ts`
- Modify: `types.ts`
- Modify: `contexts/AppContext.tsx`
- Retain initially: `hooks/useApiData.ts`, `backend/`

**Design changes:**

- Expand `IDataSource` mutations to return `Promise` consistently.
- Add `loading`, `error` and per-operation result states rather than fire-and-forget `.catch(console.error)`.
- Use Firestore converters for timestamps and TLX score records.
- Subscribe only to queries allowed for the current role; never download every collection for every user.
- Queries must match Firestore Rules because rules are not result filters.

**TDD cases:**

- admin receives full authorised datasets;
- evaluator receives only assigned study, study MTE snapshots and own submissions;
- mutation updates local state only after Firestore acknowledgement;
- permission denied surfaces a user-visible error;
- unsubscribe runs on role/logout/study changes;
- timestamp conversion remains milliseconds in application types.

**Commit:** `feat: add role-scoped Firestore data source`.

---

### Task K5: Build account administration and secure MTE catalogue editing

**Objective:** Deliver the requested administration system and catalogue editor.

**Files:**
- Create: `pages/admin/ManageUsers.tsx`
- Create: `pages/admin/ManageUsers.test.tsx`
- Modify: `pages/AdminDashboardPage.tsx`
- Modify: `pages/admin/ManageMTEs.tsx`
- Modify: `pages/admin/ManageStudies.tsx`
- Modify: `types.ts`
- Modify translations.

**User workflow without paid server functions:**

1. User creates an email/password account.
2. User profile is created as `pending` with no privileged role.
3. Admin sees pending users and assigns an approved role.
4. Rules permit only an admin to change role/status.
5. Firebase Console remains the recovery path for deleting authentication identities; the in-app admin manages business access and suspension.

**Catalogue requirements:**

- unique reference number validation;
- revision increment on meaningful edits;
- `active=false` archival instead of deleting an MTE already used in a study;
- study assignment copies an immutable snapshot;
- audit event records create/edit/archive/assignment actions without copying the full sensitive description into logs.

**Security correction:** Remove MTE editing controls from `pages/EvaluatorPage.tsx`. Evaluators must never call `updateMte`.

**Commit:** `feat: add user approval and revisioned MTE catalogue administration`.

---

### Task K6: Implement isolated evaluator workflow

**Objective:** Ensure evaluators see and write only their assigned assessment data.

**Files:**
- Modify: `pages/EvaluatorPage.tsx`
- Modify: `pages/QuickRatingPage.tsx`
- Create: `pages/EvaluatorPage.test.tsx`
- Create: `src/firestore/evaluatorQueries.ts`
- Modify translations.

**TDD cases:**

- evaluator sees only active assigned studies;
- global evaluator selector is absent in authenticated Firebase mode;
- UID always comes from Firebase Auth, never from a form or session selector;
- evaluator reads study MTE snapshots, not global catalogue objects;
- duplicate submission policy is explicit and tested;
- evaluator cannot edit MTEs, other users, studies or projects;
- submission retry preserves unsaved form state;
- summary contains only the evaluator’s own values unless role permits more.

**Commit:** `feat: isolate evaluator assignments and submissions`.

---

### Task K7: Add deterministic emulator fixtures and migration tooling

**Objective:** Make local development repeatable and prepare an optional one-time SQLite migration without touching production data.

**Files:**
- Create: `scripts/seed-firebase-emulator.mjs`
- Create: `scripts/export-sqlite.mjs`
- Create: `scripts/import-firestore.mjs`
- Create: `scripts/validate-import.mjs`
- Create: `tests/fixtures/firebase/*.json`
- Modify: `README.md`

**Safety rules:**

- seed scripts refuse non-emulator hosts unless `--project` and `--confirm-production-import` are both supplied;
- staging uses synthetic NASA examples only;
- export contains no passwords or JWT secrets;
- import is idempotent by stable ID and produces counts/hashes;
- no production migration is executed during implementation.

**Verification:** Seed emulator twice; second run must produce no duplicates. Compare source/export/import counts programmatically.

**Commit:** `chore: add safe Firebase emulator seed and migration tools`.

---

### Task K8: Replace GitHub Pages deployment with Firebase Spark staging

**Objective:** Deploy a synthetic-data staging build without enabling billing.

**Files:**
- Modify or replace: `.github/workflows/deploy.yml`
- Create: `.github/workflows/firebase-preview.yml`
- Modify: `firebase.json`, `.firebaserc.example`, `README.md`
- Create: `docs/operations/firebase-spark-deployment.md`

**Workflow policy:**

- pull requests: tests and build only by default;
- preview deployment requires explicit workflow dispatch or approved environment;
- production deployment is manual and protected;
- service-account credentials stored only as GitHub environment secrets;
- staging and production use separate Firebase projects;
- no real catalogue in staging;
- deployment job prints project ID and requires an allowlisted project ID;
- deployment aborts if billing/plan verification is not explicitly recorded.

**Commands:**

```bash
npm ci
npx tsc --noEmit
npm test
npm run test:rules
npm run build
firebase deploy --only hosting,firestore:rules,firestore:indexes --project catlx-staging
```

**Acceptance:** Hosting, Auth and Firestore operate on Spark; no paid product is configured.

**Commit:** `ci: add guarded Firebase Spark staging deployment`.

---

### Task K9: Independent security and privacy review

**Objective:** Prove confidentiality boundaries with a fresh reviewer context.

**Review matrix:**

- unauthenticated;
- pending;
- disabled;
- evaluator A assigned to Study A;
- evaluator B assigned to Study B;
- catalog manager;
- study manager;
- analyst;
- admin.

**Required attempts:**

- direct Firestore SDK reads with known document IDs;
- unauthorised collection queries;
- modified client payload with another evaluator UID;
- role self-escalation;
- global MTE catalogue read as evaluator;
- access after suspension;
- access to historical browser cache after logout;
- oversized comments and malformed TLX dimensions;
- duplicate writes and concurrent MTE edits.

**Additional checks:**

- CSP and Firebase Hosting headers;
- dependency audit;
- no secrets in Git history/build bundle;
- data region documented before production creation;
- privacy statement and retention policy;
- backup/export procedure and restore test.

**Verdict:** Any catalogue disclosure, cross-study read or role escalation is a blocking NON-PASS.

---

### Task K10: Product acceptance and production-readiness decision

**Objective:** Produce a go/no-go decision; do not deploy production automatically.

**End-to-end scenarios:**

1. New account registers and remains pending.
2. Admin approves account as evaluator.
3. Catalogue manager creates and revisions an MTE.
4. Study manager creates a project/study and assigns an MTE snapshot plus evaluator.
5. Evaluator sees only that study and submits weighted/unweighted NASA-TLX.
6. Analyst views permitted aggregate results.
7. Admin suspends evaluator and access stops immediately.
8. Demo/local modes still work without Firebase.
9. Spark quota/billing constraints are documented and verified.
10. Browser test on desktop and mobile-sized viewport passes with no console errors.

**Final verification:**

```bash
npx tsc --noEmit
npm test
npm run test:rules
npm run build
git diff --check
git status --short
```

**Deliverable:** A release qualification report with PASS/NON-PASS, exact Firebase project IDs, rules test counts, deployment URL, known limitations and rollback procedure. Production creation/deployment requires Olivier’s explicit approval in a separate turn.

---

## 5. Migration and rollback strategy

- Keep `backend/`, `hooks/useApiData.ts` and Docker files until Firebase staging passes K9 and K10.
- Preserve Demo and Local modes throughout.
- Introduce Firebase as a new data-source mode rather than replacing all persistence in one commit.
- If Firebase is rejected, remove the Firebase adapter/config and return to the existing Express/SQLite branch without data loss.
- Do not delete SQLite data or the API backend as part of the initial Firebase transition.
- Once Firebase production is accepted and stable, create a separate cleanup plan for deprecating Express/SQLite; do not bundle that deletion into this migration.

---

## 6. Principal risks and mitigations

| Risk | Mitigation |
|---|---|
| Misconfigured Firestore Rules expose MTEs | Rules-first TDD and independent adversarial review |
| Firebase rules treated as filters | Role-specific queries and query/rule integration tests |
| User self-assigns admin | New profiles forced to pending; only admin can alter role/status |
| Evaluator sees global catalogue | Separate study MTE snapshots; explicit deny on `/mteCatalog` |
| Spark feature requires billing | Billing safety gate; no Cloud Functions/Run/Storage |
| Quota exhaustion causes downtime | Accept fail-closed behavior; minimise reads and avoid broad listeners |
| Firebase vendor lock-in | Retain domain types and `IDataSource`; add deterministic export tooling |
| Existing API cleanup breaks rollback | Defer deletion to a later approved plan |
| Sensitive data enters staging | Synthetic fixtures only; staging validation scan |
| Lower-cost implementation agent drifts | Kanban dependencies, exact acceptance gates, two-stage independent reviews |

---

## 7. Decisions to confirm only at execution time

These do not block the plan but must be answered before production:

1. Final public domain name for CaTLX.
2. European Firestore region selected at project creation; this choice is difficult to change later.
3. Whether self-registration is open to anyone or limited to an allowlist of email domains.
4. Whether an evaluator may amend a submitted rating and for how long.
5. Retention period for individual ratings and audit events.
6. Whether analysts see individual comments or only aggregated scores.
7. Who are the initial administrators and catalogue managers.

---

## 8. Execution instruction for the future model

When Olivier requests execution:

1. Re-read this plan and the current branch; do not assume file state is unchanged.
2. Load `kanban-orchestrator`, `subagent-driven-development`, `test-driven-development`, `github-pr-workflow`, and `requesting-code-review`.
3. Run `hermes profile list`; only assign existing profiles.
4. Switch/configure the requested lower-cost model before creating cards.
5. Create K0 first, then create dependent cards with `parents=[...]` exactly as in the graph.
6. Require each implementer handoff to include commit SHA, exact test commands/results and changed files.
7. Run specification compliance review before code-quality/security review.
8. Never create Firebase projects, attach billing, deploy staging/production, or enter credentials without the explicit human gate for that step.

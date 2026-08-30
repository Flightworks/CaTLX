import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { authenticated, createRulesTestEnvironment, seedDocument, seedUser } from './helpers';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const study = {
  projectId: 'project-a',
  name: 'Synthetic study',
  description: 'Synthetic study only',
  date: 1_700_000_000_000,
  managerUids: ['manager'],
  analystUids: ['analyst'],
  status: 'active',
};

describe('study and assignment rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await createRulesTestEnvironment();
  });
  afterAll(async () => env.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await seedUser(env, 'admin', 'admin');
    await seedUser(env, 'manager', 'study_manager');
    await seedUser(env, 'analyst', 'analyst');
    await seedUser(env, 'evaluator-a', 'evaluator');
    await seedUser(env, 'evaluator-b', 'evaluator');
    await seedDocument(env, 'studies/study-a', study);
    await seedDocument(env, 'studies/study-a/participants/evaluator-a', { role: 'evaluator', active: true });
    await seedDocument(env, 'studies/study-a/participants/evaluator-b', { role: 'evaluator', active: false });
    await seedDocument(env, 'studies/study-a/mtes/mte-1', {
      sourceMteId: 'catalog-1', sourceRevision: 1, refNumber: 'TEST-001', name: 'Synthetic task', description: 'Synthetic',
    });
  });

  it('allows an assigned evaluator to read only the assigned study snapshot', async () => {
    const evaluator = authenticated(env, 'evaluator-a');
    await assertSucceeds(evaluator.firestore().collection('studies').doc('study-a').get());
    await assertSucceeds(evaluator.firestore().collection('studies').doc('study-a').collection('mtes').doc('mte-1').get());
  });

  it('denies an unassigned or inactive evaluator access to the study', async () => {
    await assertFails(authenticated(env, 'evaluator-b').firestore().collection('studies').doc('study-a').get());
    await assertFails(authenticated(env, 'evaluator-b').firestore().collection('studies').doc('study-a').collection('mtes').doc('mte-1').get());
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-other').get());
  });

  it('allows the study manager to create a study but not the evaluator', async () => {
    await assertSucceeds(authenticated(env, 'manager').firestore().collection('studies').doc('study-b').set({ ...study, name: 'Second synthetic study' }));
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-c').set({ ...study, name: 'Forbidden study' }));
  });

  it('does not expose snapshots to the global catalogue manager', async () => {
    await seedUser(env, 'catalog', 'catalog_manager');
    await assertFails(authenticated(env, 'catalog').firestore().collection('studies').doc('study-a').collection('mtes').doc('mte-1').get());
  });
});

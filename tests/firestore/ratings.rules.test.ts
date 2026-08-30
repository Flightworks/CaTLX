import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { authenticated, createRulesTestEnvironment, seedDocument, seedUser } from './helpers';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const scores = {
  'Mental Demand': 50,
  'Physical Demand': 20,
  'Temporal Demand': 40,
  Performance: 70,
  Effort: 30,
  Frustration: 10,
};
const rating = {
  evaluatorUid: 'evaluator-a',
  mteId: 'mte-1',
  scores,
  comments: 'Synthetic comment',
  submittedAt: 1_700_000_000_000,
};

describe('rating and pairwise rules', () => {
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
    await seedDocument(env, 'studies/study-a', {
      projectId: 'project-a', name: 'Synthetic study', managerUids: ['manager'], analystUids: ['analyst'], status: 'active',
    });
    await seedDocument(env, 'studies/study-a/participants/evaluator-a', { role: 'evaluator', active: true });
    await seedDocument(env, 'studies/study-a/mtes/mte-1', { sourceMteId: 'catalog-1', sourceRevision: 1, name: 'Synthetic task' });
    await seedDocument(env, 'studies/study-a/ratings/rating-a', rating);
  });

  it('allows an evaluator to create and update only their own rating', async () => {
    const evaluator = authenticated(env, 'evaluator-a');
    await assertSucceeds(evaluator.firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-b').set(rating));
    await assertSucceeds(evaluator.firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-b').update({ comments: 'Updated synthetic comment' }));
  });

  it('denies impersonation and cross-study writes', async () => {
    const other = authenticated(env, 'evaluator-b');
    await assertFails(other.firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-b').set(rating));
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-c').set({ ...rating, evaluatorUid: 'evaluator-b' }));
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-c').set({ ...rating, mteId: 'unknown-mte' }));
  });

  it('allows authorised management roles to read ratings but not a catalogue manager', async () => {
    await assertSucceeds(authenticated(env, 'manager').firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-a').get());
    await assertSucceeds(authenticated(env, 'analyst').firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-a').get());
    await seedUser(env, 'catalog', 'catalog_manager');
    await assertFails(authenticated(env, 'catalog').firestore().collection('studies').doc('study-a').collection('ratings').doc('rating-a').get());
  });

  it('allows an evaluator to submit only a valid pairwise comparison for themselves', async () => {
    const evaluator = authenticated(env, 'evaluator-a');
    await assertSucceeds(evaluator.firestore().collection('studies').doc('study-a').collection('pairwise').doc('evaluator-a').set({
      evaluatorUid: 'evaluator-a',
      weights: scores,
      isWeighted: true,
      submittedAt: 1_700_000_000_000,
    }));
    await assertFails(evaluator.firestore().collection('studies').doc('study-a').collection('pairwise').doc('evaluator-a').set({
      evaluatorUid: 'evaluator-b', weights: scores, isWeighted: true,
    }));
  });
});

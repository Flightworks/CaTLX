import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, collectionGroup, getDocs, query, where, writeBatch } from 'firebase/firestore';
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
  evaluatorUids: ['evaluator-a'],
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
    await seedDocument(env, 'projects/project-a', {
      name: 'Project A', description: 'Synthetic project', ownerUid: 'manager', memberUids: ['manager'],
    });
    await seedDocument(env, 'studies/study-a', study);
    await seedDocument(env, 'mteCatalog/mte-1', {
      name: 'Synthetic task', description: 'Synthetic', refNumber: 'TEST-001', revision: 1, active: true,
    });
    await seedDocument(env, 'studies/study-a/participants/evaluator-a', { uid: 'evaluator-a', role: 'evaluator', active: true, assignedAt: 1_700_000_000_000 });
    await seedDocument(env, 'studies/study-a/participants/evaluator-b', { uid: 'evaluator-b', role: 'evaluator', active: false, assignedAt: 1_700_000_000_000 });
    await seedDocument(env, 'studies/study-a/mtes/mte-1', {
      sourceMteId: 'mte-1', sourceRevision: 1, refNumber: 'TEST-001', name: 'Synthetic task', description: 'Synthetic',
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
    await assertFails(authenticated(env, 'evaluator-b').firestore().collection('studies').doc('study-a').collection('participants').doc('evaluator-b').get());
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-other').get());
    await seedDocument(env, 'studies/study-without-participant', { ...study, evaluatorUids: [] });
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-without-participant').get());
  });

  it('allows an authorised analyst to read study snapshots', async () => {
    await assertSucceeds(authenticated(env, 'analyst').firestore().collection('studies').doc('study-a').collection('mtes').doc('mte-1').get());
  });

  it('requires scoped queries for evaluator, manager and analyst study reads', async () => {
    const evaluatorDb = authenticated(env, 'evaluator-a').firestore();
    await assertSucceeds(getDocs(query(collectionGroup(evaluatorDb, 'participants'), where('uid', '==', 'evaluator-a'), where('role', '==', 'evaluator'), where('active', '==', true))));
    await assertFails(getDocs(query(collectionGroup(evaluatorDb, 'participants'), where('uid', '==', 'evaluator-a'))));
    await assertFails(evaluatorDb.collection('studies').get());

    const managerDb = authenticated(env, 'manager').firestore();
    await assertSucceeds(getDocs(query(collection(managerDb, 'studies'), where('projectId', '==', 'project-a'))));

    const analystDb = authenticated(env, 'analyst').firestore();
    await assertSucceeds(getDocs(query(collection(analystDb, 'studies'), where('analystUids', 'array-contains', 'analyst'))));
  });

  it('allows the study manager to create a study but not the evaluator', async () => {
    await assertSucceeds(authenticated(env, 'manager').firestore().collection('studies').doc('study-b').set({
      ...study, evaluatorIds: [], evaluatorUids: [], name: 'Second synthetic study',
    }));
    await assertFails(authenticated(env, 'manager').firestore().collection('studies').doc('study-forged-assignment').set({
      ...study, evaluatorIds: ['evaluator-b'], evaluatorUids: ['evaluator-b'], name: 'Forged assignment',
    }));
    await assertFails(authenticated(env, 'evaluator-a').firestore().collection('studies').doc('study-c').set({ ...study, name: 'Forbidden study' }));
    await assertFails(authenticated(env, 'manager').firestore().collection('studies').doc('study-other-project').set({
      ...study, projectId: 'project-unknown', name: 'Forbidden project study',
    }));
  });

  it('uses participant documents as the only mutable evaluator assignment source', async () => {
    const managerDb = authenticated(env, 'manager').firestore();
    const batch = writeBatch(managerDb);
    batch.set(managerDb.collection('studies').doc('study-a').collection('participants').doc('evaluator-b') as any, {
      uid: 'evaluator-b', role: 'evaluator', active: true, assignedAt: 1_700_000_000_000,
    });
    await assertSucceeds(batch.commit());
    await assertFails(managerDb.collection('studies').doc('study-a').update({ evaluatorUids: ['evaluator-b'] }));
    await assertFails(managerDb.collection('studies').doc('study-a').update({ evaluatorIds: ['evaluator-b'] }));
    await assertFails(managerDb.collection('studies').doc('study-a').update({ mteIds: ['mte-forged'] }));
    await assertSucceeds(managerDb.collection('studies').doc('study-a').collection('participants').doc('evaluator-a').delete());
  });

  it('accepts only minimal snapshots from an active catalogue MTE', async () => {
    const managerDb = authenticated(env, 'manager').firestore();
    await assertSucceeds(managerDb.collection('studies').doc('study-a').collection('mtes').doc('mte-1').set({
      sourceMteId: 'mte-1', sourceRevision: 1, refNumber: 'TEST-001', name: 'Synthetic task', description: 'Synthetic',
    }));
    await assertFails(managerDb.collection('studies').doc('study-a').collection('mtes').doc('mte-2').set({
      sourceMteId: 'missing', sourceRevision: 1, refNumber: 'TEST-002', name: 'Unknown', description: 'Unknown',
    }));
    await assertFails(managerDb.collection('studies').doc('study-a').collection('mtes').doc('mte-3').set({
      sourceMteId: 'mte-1', sourceRevision: 1, refNumber: 'TEST-003', name: 'Synthetic task', description: 'Synthetic', secret: 'forbidden',
    }));
  });

  it('does not expose snapshots to the global catalogue manager', async () => {
    await seedUser(env, 'catalog', 'catalog_manager');
    await assertFails(authenticated(env, 'catalog').firestore().collection('studies').doc('study-a').collection('mtes').doc('mte-1').get());
  });
});

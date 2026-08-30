import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  authenticated,
  createRulesTestEnvironment,
  seedUser,
} from './helpers';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

const mte = {
  refNumber: 'TEST-001',
  name: 'Synthetic task',
  description: 'Synthetic description only',
  revision: 1,
  active: true,
};

describe('MTE catalogue rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await createRulesTestEnvironment();
  });
  afterAll(async () => env.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await seedUser(env, 'admin', 'admin');
    await seedUser(env, 'catalog', 'catalog_manager');
    await seedUser(env, 'evaluator', 'evaluator');
    await seedUser(env, 'pending', 'pending', 'pending');
  });

  it('allows admin and catalogue manager to create an MTE', async () => {
    await assertSucceeds(authenticated(env, 'admin').firestore().collection('mteCatalog').doc('mte-1').set(mte));
    await assertSucceeds(authenticated(env, 'catalog').firestore().collection('mteCatalog').doc('mte-2').set({ ...mte, refNumber: 'TEST-002' }));
  });

  it('denies the global catalogue to evaluators, pending users and guests', async () => {
    const admin = authenticated(env, 'admin');
    await assertSucceeds(admin.firestore().collection('mteCatalog').doc('mte-1').set(mte));
    await assertFails(authenticated(env, 'evaluator').firestore().collection('mteCatalog').doc('mte-1').get());
    await assertFails(authenticated(env, 'pending').firestore().collection('mteCatalog').doc('mte-1').get());
    await assertFails(env.unauthenticatedContext().firestore().collection('mteCatalog').doc('mte-1').get());
  });

  it('allows catalogue managers to archive but not delete an assigned MTE', async () => {
    const catalog = authenticated(env, 'catalog');
    await assertSucceeds(catalog.firestore().collection('mteCatalog').doc('mte-1').set(mte));
    await assertFails(catalog.firestore().collection('mteCatalog').doc('mte-1').delete());
    await assertSucceeds(catalog.firestore().collection('mteCatalog').doc('mte-1').update({ active: false, revision: 2 }));
  });
});

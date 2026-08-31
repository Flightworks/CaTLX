import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { authenticated, createRulesTestEnvironment, seedUser } from './helpers';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';

describe('user account rules', () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await createRulesTestEnvironment();
  });
  afterAll(async () => env.cleanup());
  beforeEach(async () => {
    await env.clearFirestore();
    await seedUser(env, 'admin', 'admin');
    await seedUser(env, 'alice', 'evaluator');
    await seedUser(env, 'pending', 'pending', 'pending');
  });

  it('allows a new user to create only their own pending profile', async () => {
    const context = authenticated(env, 'new-user');
    const own = context.firestore().collection('users').doc('new-user');
    await assertSucceeds(own.set({
      email: 'new-user@example.test',
      displayName: 'New user',
      role: 'pending',
      status: 'pending',
    }));
    await assertFails(context.firestore().collection('users').doc('admin').set({ role: 'admin', status: 'active' }));
  });

  it('allows an admin to approve a user but prevents role self-escalation', async () => {
    const admin = authenticated(env, 'admin');
    await assertSucceeds(admin.firestore().collection('users').doc('alice').update({ role: 'catalog_manager', status: 'active' }));
    await assertFails(authenticated(env, 'alice').firestore().collection('users').doc('alice').update({ role: 'admin' }));
    await assertFails(admin.firestore().collection('users').doc('admin').update({ role: 'evaluator', status: 'active' }));
  });

  it('denies business data to pending users', async () => {
    const admin = authenticated(env, 'admin');
    await assertSucceeds(admin.firestore().collection('mteCatalog').doc('mte-1').set({ name: 'Synthetic', description: 'Synthetic description', refNumber: 'TEST-001', active: true, revision: 1 }));
    await assertFails(authenticated(env, 'pending').firestore().collection('mteCatalog').doc('mte-1').get());
  });

  it('accepts only application audit actions and the authenticated actor', async () => {
    const admin = authenticated(env, 'admin');
    await assertSucceeds(admin.firestore().collection('auditEvents').doc('audit-1').set({
      actorUid: 'admin', action: 'update-account', entityType: 'user', entityId: 'alice',
      timestamp: 1_700_000_000_000, summary: 'Account role or status updated',
    }));
    await assertFails(admin.firestore().collection('auditEvents').doc('audit-2').set({
      actorUid: 'admin', action: 'invented-action', entityType: 'user', entityId: 'alice',
      timestamp: 1_700_000_000_000, summary: 'Forged event',
    }));
    await assertFails(authenticated(env, 'alice').firestore().collection('auditEvents').doc('audit-3').set({
      actorUid: 'admin', action: 'update-account', entityType: 'user', entityId: 'alice',
      timestamp: 1_700_000_000_000, summary: 'Wrong actor',
    }));
  });
});

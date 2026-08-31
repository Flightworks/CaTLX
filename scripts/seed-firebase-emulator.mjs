#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) {
  throw new Error('Refusing to seed without FIRESTORE_EMULATOR_HOST; this script is emulator-only.');
}
const separator = emulatorHost.lastIndexOf(':');
const host = emulatorHost.slice(0, separator).replace(/^\[|\]$/g, '');
const portText = emulatorHost.slice(separator + 1);
const port = Number(portText);
if (!['127.0.0.1', 'localhost', '::1'].includes(host) || port !== 8081) {
  throw new Error(`Refusing non-local Firestore emulator endpoint: ${emulatorHost}`);
}

const env = await initializeTestEnvironment({
  projectId: 'demo-catlx',
  firestore: { host, port, rules: readFileSync('firestore.rules', 'utf8') },
});
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.collection('users').doc('demo-admin').set({
      email: 'demo-admin@example.test', displayName: 'Demo administrator', role: 'admin', status: 'active',
    });
    await db.collection('users').doc('demo-evaluator').set({
      email: 'demo-evaluator@example.test', displayName: 'Demo evaluator', role: 'evaluator', status: 'active',
    });
    await db.collection('mteCatalog').doc('demo-mte-1').set({
      refNumber: 'DEMO-001', name: 'Synthetic task', description: 'Emulator-only data', revision: 1, active: true,
    });
    await db.collection('projects').doc('demo-project').set({
      name: 'Synthetic project', description: 'Emulator-only data', ownerUid: 'demo-admin', memberUids: ['demo-evaluator'],
    });
    await db.collection('studies').doc('demo-study').set({
      projectId: 'demo-project', name: 'Synthetic study', description: 'Emulator-only data', date: Date.now(),
      managerUids: ['demo-admin'], analystUids: [], evaluatorUids: ['demo-evaluator'], mteIds: ['demo-mte-1'],
    });
    await db.collection('studies').doc('demo-study').collection('participants').doc('demo-evaluator').set({
      uid: 'demo-evaluator', role: 'evaluator', active: true, assignedAt: Date.now(),
    });
    await db.collection('studies').doc('demo-study').collection('mtes').doc('demo-mte-1').set({
      sourceMteId: 'demo-mte-1', sourceRevision: 1, refNumber: 'DEMO-001', name: 'Synthetic task', description: 'Emulator-only data',
    });
  });
} finally {
  await env.cleanup();
}
console.log('Synthetic Firebase emulator data seeded.');

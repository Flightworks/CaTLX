#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/import-firestore.mjs <export.json>');
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) throw new Error('Refusing to import without FIRESTORE_EMULATOR_HOST; cloud import is disabled.');
const [host, portText] = emulatorHost.split(':');
const port = Number(portText);
if (!host || !Number.isInteger(port)) throw new Error(`Invalid FIRESTORE_EMULATOR_HOST: ${emulatorHost}`);

const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.format !== 'catlx-firestore-export-v1' || !payload.collections) {
  throw new Error('Unsupported CaTLX export format.');
}

const env = await initializeTestEnvironment({
  projectId: 'demo-catlx',
  firestore: { host, port, rules: readFileSync('firestore.rules', 'utf8') },
});
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const collectionName of ['users', 'projects', 'evaluators', 'mteCatalog', 'studies']) {
      for (const item of payload.collections[collectionName] || []) {
        const { id, ...data } = item;
        await db.collection(collectionName).doc(id).set(data);
      }
    }
    for (const item of payload.collections.ratings || []) {
      const { id, studyId, ...data } = item;
      await db.collection('studies').doc(studyId).collection('ratings').doc(id).set(data);
    }
    for (const item of payload.collections.pairwise || []) {
      const { id, studyId, ...data } = item;
      await db.collection('studies').doc(studyId).collection('pairwise').doc(id).set(data);
    }
  });
} finally {
  await env.cleanup();
}
console.log(JSON.stringify({ imported: true, format: payload.format, contentSha256: payload.contentSha256 }));

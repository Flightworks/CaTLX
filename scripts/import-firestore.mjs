#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const [inputPath, uidMapPath] = process.argv.slice(2).filter((argument) => !argument.startsWith('--'));
const allowActiveUsers = process.argv.includes('--allow-active-users');
if (!inputPath) throw new Error('Usage: node scripts/import-firestore.mjs <export.json> [uid-map.json] [--allow-active-users]');
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
if (!emulatorHost) throw new Error('Refusing to import without FIRESTORE_EMULATOR_HOST; cloud import is disabled.');
const separator = emulatorHost.lastIndexOf(':');
const host = emulatorHost.slice(0, separator).replace(/^\[|\]$/g, '');
const portText = emulatorHost.slice(separator + 1);
const port = Number(portText);
if (!['127.0.0.1', 'localhost', '::1'].includes(host) || port !== 8081) {
  throw new Error(`Refusing non-local Firestore emulator endpoint: ${emulatorHost}`);
}

const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.format !== 'catlx-firestore-export-v2' || !payload.collections) {
  throw new Error('Unsupported CaTLX export format.');
}
const collections = payload.collections;
const requiredCollections = ['users', 'projects', 'evaluators', 'mteCatalog', 'studies', 'participants', 'studyMtes', 'ratings', 'pairwise'];
for (const name of requiredCollections) {
  if (!Array.isArray(collections[name])) throw new Error(`Missing collection: ${name}`);
}
const contentSha256 = createHash('sha256').update(JSON.stringify(collections)).digest('hex');
if (contentSha256 !== payload.contentSha256) throw new Error('Content hash mismatch.');

let uidMap = {};
if (uidMapPath) {
  uidMap = JSON.parse(readFileSync(uidMapPath, 'utf8'));
  if (!uidMap || typeof uidMap !== 'object' || Array.isArray(uidMap)) throw new Error('UID map must be a JSON object.');
  const mappedValues = Object.values(uidMap);
  if (mappedValues.some((value) => typeof value !== 'string' || !value.trim())) throw new Error('UID map values must be non-empty strings.');
  if (new Set(mappedValues).size !== mappedValues.length) throw new Error('UID map contains duplicate Firebase UIDs.');
}
const identityIds = new Set([
  ...collections.users.map((item) => item.id),
  ...collections.evaluators.map((item) => item.id),
  ...collections.projects.flatMap((item) => [item.ownerUid, ...(item.memberUids || [])]),
  ...collections.studies.flatMap((item) => [
    ...(item.managerUids || []), ...(item.analystUids || []),
    ...(item.evaluatorIds || []), ...(item.evaluatorUids || []),
  ]),
  ...collections.participants.map((item) => item.uid),
  ...collections.ratings.map((item) => item.evaluatorUid),
  ...collections.pairwise.map((item) => item.evaluatorUid),
].filter((value) => typeof value === 'string' && value.trim()));
if (identityIds.size > 0 && !uidMapPath) {
  throw new Error('Refusing to import legacy identities without an explicit Firebase UID map.');
}
for (const identityId of identityIds) {
  if (typeof uidMap[identityId] !== 'string' || !uidMap[identityId].trim()) {
    throw new Error(`Missing Firebase UID mapping for legacy identity: ${identityId}`);
  }
}
const mapUid = (value) => typeof value === 'string' && typeof uidMap[value] === 'string' ? uidMap[value] : value;
const without = (data, ...keys) => Object.fromEntries(Object.entries(data).filter(([key]) => !keys.includes(key)));

const env = await initializeTestEnvironment({
  projectId: 'demo-catlx',
  firestore: { host, port, rules: readFileSync('firestore.rules', 'utf8') },
});
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const item of collections.users) {
      const data = without(item, 'id');
      const importedData = allowActiveUsers
        ? data
        : {
          ...data,
          legacyRole: data.role,
          legacyStatus: data.status,
          role: 'pending',
          status: 'pending',
        };
      await db.collection('users').doc(mapUid(item.id)).set(importedData);
    }
    for (const item of collections.projects) {
      await db.collection('projects').doc(item.id).set({
        ...without(item, 'id'),
        ownerUid: mapUid(item.ownerUid),
        memberUids: (item.memberUids || []).map(mapUid),
      });
    }
    for (const item of collections.evaluators) {
      await db.collection('evaluators').doc(mapUid(item.id)).set(without(item, 'id'));
    }
    for (const item of collections.mteCatalog) {
      await db.collection('mteCatalog').doc(item.id).set(without(item, 'id'));
    }
    for (const item of collections.studies) {
      await db.collection('studies').doc(item.id).set({
        ...without(item, 'id'),
        managerUids: (item.managerUids || []).map(mapUid),
        analystUids: (item.analystUids || []).map(mapUid),
        evaluatorIds: (item.evaluatorIds || []).map(mapUid),
        evaluatorUids: (item.evaluatorUids || []).map(mapUid),
      });
    }
    for (const item of collections.participants) {
      const uid = mapUid(item.uid);
      await db.collection('studies').doc(item.studyId).collection('participants').doc(uid).set({
        ...without(item, 'id', 'studyId', 'uid'), uid,
      });
    }
    for (const item of collections.studyMtes) {
      await db.collection('studies').doc(item.studyId).collection('mtes').doc(item.id).set(without(item, 'id', 'studyId'));
    }
    for (const item of collections.ratings) {
      const evaluatorUid = mapUid(item.evaluatorUid);
      const id = `${evaluatorUid}_${item.mteId}`;
      await db.collection('studies').doc(item.studyId).collection('ratings').doc(id).set({
        ...without(item, 'id', 'studyId'), evaluatorUid,
      });
    }
    for (const item of collections.pairwise) {
      const evaluatorUid = mapUid(item.evaluatorUid);
      await db.collection('studies').doc(item.studyId).collection('pairwise').doc(evaluatorUid).set({
        ...without(item, 'id', 'studyId'), evaluatorUid,
      });
    }
  });
} finally {
  await env.cleanup();
}
console.log(JSON.stringify({
  imported: true,
  format: payload.format,
  contentSha256: payload.contentSha256,
  allowActiveUsers,
  uidMappings: Object.keys(uidMap).length,
  collections: Object.fromEntries(requiredCollections.map((name) => [name, collections[name].length])),
}));

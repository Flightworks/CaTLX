#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/validate-import.mjs <export.json>');
const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.format !== 'catlx-firestore-export-v2' || !payload.collections) {
  throw new Error('Unsupported CaTLX export format.');
}
const collections = payload.collections;
const names = ['users', 'projects', 'evaluators', 'mteCatalog', 'studies', 'participants', 'studyMtes', 'ratings', 'pairwise'];
for (const name of names) {
  if (!Array.isArray(collections[name])) throw new Error(`Missing collection: ${name}`);
}
const duplicateKey = (items, name, keyFactory) => {
  const keys = items.map(keyFactory);
  if (keys.some((key, index) => keys.indexOf(key) !== index)) throw new Error(`Duplicate IDs in: ${name}`);
};
for (const name of ['users', 'projects', 'evaluators', 'mteCatalog', 'studies']) {
  duplicateKey(collections[name], name, (item) => item.id);
}
for (const name of ['participants', 'studyMtes', 'ratings', 'pairwise']) {
  duplicateKey(collections[name], name, (item) => `${item.studyId}/${item.id}`);
}

const users = new Map(collections.users.map((item) => [item.id, item]));
const projects = new Map(collections.projects.map((item) => [item.id, item]));
const evaluators = new Map(collections.evaluators.map((item) => [item.id, item]));
const catalog = new Map(collections.mteCatalog.map((item) => [item.id, item]));
const studies = new Map(collections.studies.map((item) => [item.id, item]));
const participants = new Map(collections.participants.map((item) => [`${item.studyId}/${item.uid}`, item]));
const snapshots = new Map(collections.studyMtes.map((item) => [`${item.studyId}/${item.id}`, item]));

for (const user of collections.users) {
  if (typeof user.email !== 'string' || typeof user.displayName !== 'string') throw new Error(`Invalid user profile: ${user.id}`);
  if (!['admin', 'catalog_manager', 'study_manager', 'analyst', 'evaluator', 'pending', 'disabled'].includes(user.role)) throw new Error(`Invalid user role: ${user.id}`);
  if (!['active', 'pending', 'disabled'].includes(user.status)) throw new Error(`Invalid user status: ${user.id}`);
  if (user.status === 'active' && ['pending', 'disabled'].includes(user.role)) throw new Error(`Incoherent active user profile: ${user.id}`);
}
for (const project of collections.projects) {
  if (project.ownerUid && !users.has(project.ownerUid)) throw new Error(`Unknown project owner: ${project.id}/${project.ownerUid}`);
  if (!Array.isArray(project.memberUids)) throw new Error(`Invalid project members: ${project.id}`);
}
for (const mte of collections.mteCatalog) {
  if (typeof mte.name !== 'string' || typeof mte.description !== 'string' || typeof mte.refNumber !== 'string') throw new Error(`Invalid MTE: ${mte.id}`);
  if (mte.revision < 1 || typeof mte.active !== 'boolean') throw new Error(`Invalid MTE revision/state: ${mte.id}`);
}
for (const study of collections.studies) {
  if (study.projectId && !projects.has(study.projectId)) throw new Error(`Unknown study project: ${study.id}/${study.projectId}`);
  for (const uid of [...(study.managerUids || []), ...(study.analystUids || [])]) {
    if (!users.has(uid)) throw new Error(`Unknown study user: ${study.id}/${uid}`);
  }
  for (const uid of study.evaluatorUids || []) {
    if (!evaluators.has(uid)) throw new Error(`Unknown study evaluator: ${study.id}/${uid}`);
  }
  const participantUids = collections.participants
    .filter((participant) => participant.studyId === study.id && participant.active === true)
    .map((participant) => participant.uid)
    .sort();
  const indexedUids = [...(study.evaluatorUids || study.evaluatorIds || [])].sort();
  if (JSON.stringify(participantUids) !== JSON.stringify(indexedUids)) {
    throw new Error(`Participant/index mismatch: ${study.id}`);
  }
  const snapshotIds = collections.studyMtes
    .filter((snapshot) => snapshot.studyId === study.id)
    .map((snapshot) => snapshot.id)
    .sort();
  if (JSON.stringify(snapshotIds) !== JSON.stringify([...(study.mteIds || [])].sort())) {
    throw new Error(`MTE snapshot/index mismatch: ${study.id}`);
  }
}
for (const participant of collections.participants) {
  if (!studies.has(participant.studyId) || !evaluators.has(participant.uid) || participant.id !== participant.uid) throw new Error(`Invalid participant reference: ${participant.studyId}/${participant.uid}`);
  if (participant.role !== 'evaluator' || typeof participant.active !== 'boolean') throw new Error(`Invalid participant: ${participant.studyId}/${participant.uid}`);
}
for (const snapshot of collections.studyMtes) {
  if (!studies.has(snapshot.studyId) || !catalog.has(snapshot.sourceMteId) || snapshot.id !== snapshot.sourceMteId) throw new Error(`Invalid study MTE snapshot: ${snapshot.studyId}/${snapshot.id}`);
}
for (const rating of collections.ratings) {
  if (!studies.has(rating.studyId) || !participants.has(`${rating.studyId}/${rating.evaluatorUid}`) || !snapshots.has(`${rating.studyId}/${rating.mteId}`)) throw new Error(`Invalid rating reference: ${rating.studyId}/${rating.id}`);
  if (rating.id !== `${rating.evaluatorUid}_${rating.mteId}`) throw new Error(`Invalid rating ID: ${rating.studyId}/${rating.id}`);
}
for (const comparison of collections.pairwise) {
  if (!studies.has(comparison.studyId) || !participants.has(`${comparison.studyId}/${comparison.evaluatorUid}`)) throw new Error(`Invalid pairwise reference: ${comparison.studyId}/${comparison.id}`);
  if (comparison.id !== comparison.evaluatorUid) throw new Error(`Invalid pairwise ID: ${comparison.studyId}/${comparison.id}`);
}

const canonical = JSON.stringify(collections);
const contentSha256 = createHash('sha256').update(canonical).digest('hex');
if (contentSha256 !== payload.contentSha256) throw new Error('Content hash mismatch.');
console.log(JSON.stringify({
  valid: true,
  format: payload.format,
  contentSha256,
  collections: Object.fromEntries(names.map((name) => [name, collections[name].length])),
}));

#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Database = require('../backend/node_modules/better-sqlite3');
const inputPath = process.env.CATLX_DB_PATH || path.resolve('backend/data.sqlite');
const outputPath = process.argv[2] || path.resolve('emulator-data/catlx-export.json');
const asId = (value) => value === null || value === undefined ? '' : String(value);
const toMillis = (value) => Number.isFinite(Number(value)) ? Number(value) * 1000 : 0;
const parseJson = (value, label) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid JSON in SQLite field: ${label}`);
  }
};
const knownRoles = new Set(['admin', 'catalog_manager', 'study_manager', 'analyst', 'evaluator', 'pending', 'disabled']);
const knownStatuses = new Set(['active', 'pending', 'disabled']);

const database = new Database(inputPath, { readonly: true });
const all = (table) => database.prepare(`SELECT * FROM ${table}`).all();
const relationIds = (table, key, value, field) => database
  .prepare(`SELECT ${field} FROM ${table} WHERE ${key} = ?`)
  .all(value)
  .map((row) => asId(row[field]));

const rawMtes = all('mtes');
const mteCatalog = rawMtes.map((row) => ({
  id: asId(row.id),
  name: row.name || '',
  description: row.description || '',
  refNumber: row.ref_number || '',
  revision: 1,
  active: true,
  createdAt: toMillis(row.created_at),
  updatedAt: toMillis(row.updated_at),
}));
const mtesById = new Map(mteCatalog.map((mte) => [mte.id, mte]));

const evaluators = all('evaluators').map((row) => ({
  id: asId(row.id),
  name: row.name || '',
  quality: row.quality || '',
  company: row.company || '',
  createdAt: toMillis(row.created_at),
  updatedAt: toMillis(row.updated_at),
}));
const evaluatorIds = new Set(evaluators.map((evaluator) => evaluator.id));

const projects = all('projects').map((row) => ({
  id: asId(row.id),
  name: row.name || '',
  description: row.description || '',
  ownerUid: asId(row.owner_id),
  memberUids: relationIds('project_members', 'project_id', row.id, 'evaluator_id'),
  createdAt: toMillis(row.created_at),
  updatedAt: toMillis(row.updated_at),
}));
const projectById = new Map(projects.map((project) => [project.id, project]));

const studies = all('studies').map((row) => {
  const mteIds = relationIds('study_mtes', 'study_id', row.id, 'mte_id');
  const evaluatorIdsForStudy = relationIds('study_evaluators', 'study_id', row.id, 'evaluator_id');
  const project = projectById.get(asId(row.project_id));
  return {
    id: asId(row.id),
    name: row.name || '',
    description: row.description || '',
    date: toMillis(row.date),
    projectId: asId(row.project_id),
    status: 'active',
    managerUids: project?.ownerUid ? [project.ownerUid] : [],
    analystUids: [],
    mteIds,
    evaluatorIds: evaluatorIdsForStudy,
    evaluatorUids: evaluatorIdsForStudy,
    createdAt: toMillis(row.created_at),
    updatedAt: toMillis(row.updated_at),
  };
});

const participants = studies.flatMap((study) => study.evaluatorUids.map((uid) => {
  if (!evaluatorIds.has(uid)) throw new Error(`Dangling evaluator reference: ${study.id}/${uid}`);
  return {
    id: uid,
    studyId: study.id,
    uid,
    role: 'evaluator',
    assignedAt: study.createdAt,
    active: true,
  };
}));

const studyMtes = studies.flatMap((study) => study.mteIds.map((mteId) => {
  const source = mtesById.get(mteId);
  if (!source) throw new Error(`Dangling MTE reference: ${study.id}/${mteId}`);
  return {
    id: mteId,
    studyId: study.id,
    sourceMteId: mteId,
    sourceRevision: source.revision,
    refNumber: source.refNumber,
    name: source.name,
    description: source.description,
  };
}));

const ratings = all('ratings').map((row) => {
  const studyId = asId(row.study_id);
  const evaluatorUid = asId(row.evaluator_id);
  const mteId = asId(row.mte_id);
  if (!mtesById.has(mteId)) throw new Error(`Dangling rating MTE reference: ${studyId}/${mteId}`);
  return {
    id: `${evaluatorUid}_${mteId}`,
    studyId,
    evaluatorUid,
    mteId,
    scores: parseJson(row.scores, `ratings/${row.id}`),
    comments: row.comments || '',
    submittedAt: toMillis(row.timestamp),
  };
});

const pairwise = all('pairwise_comparisons').map((row) => ({
  id: asId(row.evaluator_id),
  studyId: asId(row.study_id),
  evaluatorUid: asId(row.evaluator_id),
  weights: parseJson(row.weights, `pairwise_comparisons/${row.id}`),
  isWeighted: Boolean(row.is_weighted),
  submittedAt: toMillis(row.created_at),
}));

const users = all('users').map((row) => {
  const role = knownRoles.has(row.role) ? row.role : 'pending';
  const fallbackStatus = role === 'admin' ? 'active' : role === 'disabled' ? 'disabled' : 'pending';
  const requestedStatus = knownStatuses.has(row.status) ? row.status : fallbackStatus;
  const status = requestedStatus === 'active' && (role === 'pending' || role === 'disabled') ? 'pending' : requestedStatus;
  return {
    id: asId(row.id),
    email: row.email || '',
    displayName: row.display_name || row.name || '',
    role,
    status,
    createdAt: toMillis(row.created_at),
  };
});

const collections = { users, projects, evaluators, mteCatalog, studies, participants, studyMtes, ratings, pairwise };
const canonical = JSON.stringify(collections);
const exportData = {
  format: 'catlx-firestore-export-v2',
  source: path.basename(inputPath),
  contentSha256: createHash('sha256').update(canonical).digest('hex'),
  collections,
};
await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, { mode: 0o600 });
database.close();
console.log(JSON.stringify({
  output: path.resolve(outputPath),
  collections: Object.fromEntries(Object.entries(collections).map(([key, value]) => [key, value.length])),
  contentSha256: exportData.contentSha256,
}));

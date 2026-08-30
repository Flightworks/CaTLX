#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
const Database = require('../backend/node_modules/better-sqlite3');
const inputPath = process.env.CATLX_DB_PATH || path.resolve('backend/data.sqlite');
const outputPath = process.argv[2] || path.resolve('emulator-data/catlx-export.json');

const database = new Database(inputPath, { readonly: true });
const all = (table) => database.prepare(`SELECT * FROM ${table}`).all();
const relationIds = (table, key, value, field) => database.prepare(`SELECT ${field} FROM ${table} WHERE ${key} = ?`).all(value).map((row) => row[field]);

const projects = all('projects').map((row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  ownerUid: row.owner_id || '',
  memberUids: relationIds('project_members', 'project_id', row.id, 'evaluator_id'),
}));
const evaluators = all('evaluators').map((row) => ({
  id: row.id, name: row.name, quality: row.quality || '', company: row.company || '',
}));
const mteCatalog = all('mtes').map((row) => ({
  id: row.id, name: row.name, description: row.description || '', refNumber: row.ref_number || '', active: true, revision: 1,
}));
const studies = all('studies').map((row) => ({
  id: row.id,
  name: row.name,
  description: row.description || '',
  date: row.date || 0,
  projectId: row.project_id || '',
  mteIds: relationIds('study_mtes', 'study_id', row.id, 'mte_id'),
  evaluatorIds: relationIds('study_evaluators', 'study_id', row.id, 'evaluator_id'),
  managerUids: [],
  analystUids: [],
  evaluatorUids: relationIds('study_evaluators', 'study_id', row.id, 'evaluator_id'),
}));
const ratings = all('ratings').map((row) => ({
  id: row.id,
  studyId: row.study_id,
  evaluatorUid: row.evaluator_id,
  mteId: row.mte_id,
  scores: JSON.parse(row.scores),
  comments: row.comments || '',
  submittedAt: (row.timestamp || 0) * 1000,
}));
const pairwise = all('pairwise_comparisons').map((row) => ({
  id: row.id,
  studyId: row.study_id,
  evaluatorUid: row.evaluator_id,
  weights: JSON.parse(row.weights),
  isWeighted: Boolean(row.is_weighted),
  submittedAt: (row.created_at || 0) * 1000,
}));
const users = all('users').map((row) => ({
  id: row.id, email: row.email, name: row.name || '', role: row.role || 'pending', status: row.role === 'admin' ? 'active' : 'pending',
}));

const collections = { users, projects, evaluators, mteCatalog, studies, ratings, pairwise };
const canonical = JSON.stringify(collections);
const exportData = {
  format: 'catlx-firestore-export-v1',
  source: path.basename(inputPath),
  contentSha256: createHash('sha256').update(canonical).digest('hex'),
  collections,
};
await mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exportData, null, 2)}\n`, { mode: 0o600 });
database.close();
console.log(JSON.stringify({ output: path.resolve(outputPath), collections: Object.fromEntries(Object.entries(collections).map(([key, value]) => [key, value.length])), contentSha256: exportData.contentSha256 }));

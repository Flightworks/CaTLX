import { createRequire } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const Database = require('../backend/node_modules/better-sqlite3');
const execFile = promisify(execFileCallback);
const root = path.resolve(__dirname, '..');

async function createFixture(directory) {
  const dbPath = path.join(directory, 'fixture.sqlite');
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, password_hash TEXT, name TEXT, role TEXT, created_at INTEGER);
    CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT, description TEXT, owner_id TEXT, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE evaluators (id TEXT PRIMARY KEY, name TEXT, quality TEXT, company TEXT, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE studies (id TEXT PRIMARY KEY, name TEXT, description TEXT, date INTEGER, project_id TEXT, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE mtes (id TEXT PRIMARY KEY, name TEXT, description TEXT, ref_number TEXT, created_at INTEGER, updated_at INTEGER);
    CREATE TABLE study_mtes (study_id TEXT, mte_id TEXT);
    CREATE TABLE study_evaluators (study_id TEXT, evaluator_id TEXT);
    CREATE TABLE project_members (project_id TEXT, evaluator_id TEXT);
    CREATE TABLE ratings (id TEXT PRIMARY KEY, evaluator_id TEXT, study_id TEXT, mte_id TEXT, scores TEXT, comments TEXT, timestamp INTEGER);
    CREATE TABLE pairwise_comparisons (id TEXT PRIMARY KEY, evaluator_id TEXT, study_id TEXT, weights TEXT, is_weighted INTEGER, created_at INTEGER, updated_at INTEGER);
  `);
  const scores = JSON.stringify({
    'Mental Demand': 10, 'Physical Demand': 20, 'Temporal Demand': 30,
    Performance: 40, Effort: 50, Frustration: 60,
  });
  const weights = JSON.stringify({
    'Mental Demand': 3, 'Physical Demand': 2, 'Temporal Demand': 4,
    Performance: 1, Effort: 3, Frustration: 2,
  });
  db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)').run('legacy-admin', 'admin@example.test', 'hash', 'Legacy Admin', 'admin', 1_700_000_000);
  db.prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?)').run('project-1', 'Project', 'Description', 'legacy-admin', 1_700_000_000, 1_700_000_001);
  db.prepare('INSERT INTO evaluators VALUES (?, ?, ?, ?, ?, ?)').run('eval-1', 'Evaluator One', 'expert', 'Company', 1_700_000_000, 1_700_000_001);
  db.prepare('INSERT INTO mtes VALUES (?, ?, ?, ?, ?, ?)').run('mte-1', 'Task One', 'Task description', 'MTE-001', 1_700_000_000, 1_700_000_001);
  db.prepare('INSERT INTO studies VALUES (?, ?, ?, ?, ?, ?, ?)').run('study-1', 'Study', 'Study description', 1_700_000_000, 'project-1', 1_700_000_000, 1_700_000_001);
  db.prepare('INSERT INTO study_mtes VALUES (?, ?)').run('study-1', 'mte-1');
  db.prepare('INSERT INTO study_evaluators VALUES (?, ?)').run('study-1', 'eval-1');
  db.prepare('INSERT INTO project_members VALUES (?, ?)').run('project-1', 'eval-1');
  db.prepare('INSERT INTO ratings VALUES (?, ?, ?, ?, ?, ?, ?)').run('rating-1', 'eval-1', 'study-1', 'mte-1', scores, 'Comment', 1_700_000_002);
  db.prepare('INSERT INTO pairwise_comparisons VALUES (?, ?, ?, ?, ?, ?, ?)').run('pair-1', 'eval-1', 'study-1', weights, 1, 1_700_000_002, 1_700_000_002);
  db.close();
  return dbPath;
}

describe('SQLite to Firestore migration export', () => {
  it('exports participants, study MTE snapshots and fail-closed user profiles', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'catlx-migration-'));
    try {
      const dbPath = await createFixture(directory);
      const outputPath = path.join(directory, 'export.json');
      await execFile(process.execPath, [path.join(root, 'scripts/export-sqlite.mjs'), outputPath], {
        cwd: root,
        env: { ...process.env, CATLX_DB_PATH: dbPath },
      });
      const payload = JSON.parse(await readFile(outputPath, 'utf8'));
      expect(payload.format).toBe('catlx-firestore-export-v2');
      expect(payload.collections.participants).toEqual([
        expect.objectContaining({ studyId: 'study-1', uid: 'eval-1', role: 'evaluator', active: true }),
      ]);
      expect(payload.collections.studyMtes).toEqual([
        expect.objectContaining({ studyId: 'study-1', id: 'mte-1', sourceMteId: 'mte-1', sourceRevision: 1 }),
      ]);
      expect(payload.collections.users).toEqual([
        expect.objectContaining({ id: 'legacy-admin', displayName: 'Legacy Admin', role: 'admin', status: 'active' }),
      ]);
      const validation = await execFile(process.execPath, [path.join(root, 'scripts/validate-import.mjs'), outputPath], { cwd: root });
      expect(JSON.parse(validation.stdout)).toMatchObject({ valid: true, format: 'catlx-firestore-export-v2' });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

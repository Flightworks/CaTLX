const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

// --- Configuration ---
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'catlx-dev-secret-change-in-production';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// --- Database Initialization ---
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS evaluators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quality TEXT,
  company TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS studies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  date INTEGER,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS mtes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ref_number TEXT UNIQUE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS study_mtes (
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  mte_id TEXT NOT NULL REFERENCES mtes(id) ON DELETE CASCADE,
  PRIMARY KEY (study_id, mte_id)
);

CREATE TABLE IF NOT EXISTS study_evaluators (
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  PRIMARY KEY (study_id, evaluator_id)
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, evaluator_id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id TEXT PRIMARY KEY,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  mte_id TEXT NOT NULL REFERENCES mtes(id) ON DELETE CASCADE,
  scores TEXT NOT NULL, -- JSON object: { "Mental Demand": 5, ... }
  comments TEXT,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS pairwise_comparisons (
  id TEXT PRIMARY KEY,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  weights TEXT NOT NULL, -- JSON object: { "Mental Demand": 0.2, ... }
  is_weighted INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS evaluator_tokens (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  evaluator_id TEXT NOT NULL REFERENCES evaluators(id) ON DELETE CASCADE,
  study_id TEXT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ratings_evaluator_study ON ratings(evaluator_id, study_id);
CREATE INDEX IF NOT EXISTS idx_ratings_study_mte ON ratings(study_id, mte_id);
CREATE INDEX IF NOT EXISTS idx_pairwise_evaluator_study ON pairwise_comparisons(evaluator_id, study_id);
CREATE INDEX IF NOT EXISTS idx_evaluator_tokens_token ON evaluator_tokens(token);
`);

// --- Helpers ---
function generateId() {
  return randomUUID();
}

function now() {
  return Math.floor(Date.now() / 1000);
}

function parseJsonField(field) {
  try {
    return JSON.parse(field);
  } catch {
    return field;
  }
}

function rowToRating(row) {
  if (!row) return null;
  return {
    id: row.id,
    evaluatorId: row.evaluator_id,
    studyId: row.study_id,
    mteId: row.mte_id,
    scores: parseJsonField(row.scores),
    comments: row.comments,
    timestamp: row.timestamp
  };
}

function rowToPairwise(row) {
  if (!row) return null;
  return {
    id: row.id,
    evaluatorId: row.evaluator_id,
    studyId: row.study_id,
    weights: parseJsonField(row.weights),
    isWeighted: !!row.is_weighted
  };
}

function rowToStudy(row) {
  if (!row) return null;
  const mteIds = db.prepare('SELECT mte_id FROM study_mtes WHERE study_id = ?').all(row.id).map(r => r.mte_id);
  const evaluatorIds = db.prepare('SELECT evaluator_id FROM study_evaluators WHERE study_id = ?').all(row.id).map(r => r.evaluator_id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    date: row.date,
    mteIds,
    evaluatorIds,
    projectId: row.project_id
  };
}

function rowToProject(row) {
  if (!row) return null;
  const memberIds = db.prepare('SELECT evaluator_id FROM project_members WHERE project_id = ?').all(row.id).map(r => r.evaluator_id);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    ownerId: row.owner_id,
    memberIds
  };
}

// --- Auth Middleware ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

// --- Express App ---
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Health / Root ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'CaTLX Backend API', timestamp: now() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', db: 'sqlite', uptime: process.uptime() });
});

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'User already exists' });

  const id = generateId();
  const hash = bcrypt.hashSync(password, 10);
  const role = db.prepare('SELECT COUNT(*) as c FROM users').get().c === 0 ? 'admin' : 'admin';

  db.prepare('INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, email, hash, name || null, role);

  const token = jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ id, email, name, role, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// --- Projects CRUD ---
app.get('/api/projects', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(rows.map(rowToProject));
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(rowToProject(row));
});

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, description, ownerId } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO projects (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description || null, ownerId || req.user.id, ts, ts);

  if (req.body.memberIds && Array.isArray(req.body.memberIds)) {
    const insert = db.prepare('INSERT INTO project_members (project_id, evaluator_id) VALUES (?, ?)');
    for (const eid of req.body.memberIds) insert.run(id, eid);
  }

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(rowToProject(row));
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const { name, description, ownerId, memberIds } = req.body;
  const ts = now();
  db.prepare('UPDATE projects SET name = ?, description = ?, owner_id = ?, updated_at = ? WHERE id = ?')
    .run(name ?? existing.name, description ?? existing.description, ownerId ?? existing.owner_id, ts, req.params.id);

  if (Array.isArray(memberIds)) {
    db.prepare('DELETE FROM project_members WHERE project_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO project_members (project_id, evaluator_id) VALUES (?, ?)');
    for (const eid of memberIds) insert.run(req.params.id, eid);
  }

  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(rowToProject(row));
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Project not found' });
  res.status(204).send();
});

app.post('/api/projects/:id/members', authenticateToken, (req, res) => {
  const { evaluatorId } = req.body;
  if (!evaluatorId) return res.status(400).json({ error: 'evaluatorId required' });
  db.prepare('INSERT OR IGNORE INTO project_members (project_id, evaluator_id) VALUES (?, ?)').run(req.params.id, evaluatorId);
  res.status(204).send();
});

app.delete('/api/projects/:id/members/:evaluatorId', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND evaluator_id = ?').run(req.params.id, req.params.evaluatorId);
  res.status(204).send();
});

// --- Evaluators CRUD ---
app.get('/api/evaluators', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM evaluators ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ id: r.id, name: r.name, quality: r.quality, company: r.company })));
});

app.get('/api/evaluators/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM evaluators WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Evaluator not found' });
  res.json({ id: row.id, name: row.name, quality: row.quality, company: row.company });
});

app.post('/api/evaluators', authenticateToken, (req, res) => {
  const { name, quality, company } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO evaluators (id, name, quality, company, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, quality || null, company || null, ts, ts);
  res.status(201).json({ id, name, quality, company });
});

app.put('/api/evaluators/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM evaluators WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Evaluator not found' });

  const { name, quality, company } = req.body;
  db.prepare('UPDATE evaluators SET name = ?, quality = ?, company = ?, updated_at = ? WHERE id = ?')
    .run(name ?? existing.name, quality ?? existing.quality, company ?? existing.company, now(), req.params.id);
  res.json({ id: req.params.id, name: name ?? existing.name, quality: quality ?? existing.quality, company: company ?? existing.company });
});

app.delete('/api/evaluators/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM evaluators WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Evaluator not found' });
  res.status(204).send();
});

// --- Studies CRUD ---
app.get('/api/studies', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM studies ORDER BY created_at DESC').all();
  res.json(rows.map(rowToStudy));
});

app.get('/api/studies/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM studies WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Study not found' });
  res.json(rowToStudy(row));
});

app.post('/api/studies', authenticateToken, (req, res) => {
  const { name, description, date, projectId, mteIds, evaluatorIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO studies (id, name, description, date, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, description || null, date || ts, projectId || null, ts, ts);

  if (Array.isArray(mteIds)) {
    const insert = db.prepare('INSERT INTO study_mtes (study_id, mte_id) VALUES (?, ?)');
    for (const mid of mteIds) insert.run(id, mid);
  }
  if (Array.isArray(evaluatorIds)) {
    const insert = db.prepare('INSERT INTO study_evaluators (study_id, evaluator_id) VALUES (?, ?)');
    for (const eid of evaluatorIds) insert.run(id, eid);
  }

  const row = db.prepare('SELECT * FROM studies WHERE id = ?').get(id);
  res.status(201).json(rowToStudy(row));
});

app.put('/api/studies/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM studies WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Study not found' });

  const { name, description, date, projectId, mteIds, evaluatorIds } = req.body;
  db.prepare('UPDATE studies SET name = ?, description = ?, date = ?, project_id = ?, updated_at = ? WHERE id = ?')
    .run(name ?? existing.name, description ?? existing.description, date ?? existing.date, projectId ?? existing.project_id, now(), req.params.id);

  if (Array.isArray(mteIds)) {
    db.prepare('DELETE FROM study_mtes WHERE study_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO study_mtes (study_id, mte_id) VALUES (?, ?)');
    for (const mid of mteIds) insert.run(req.params.id, mid);
  }
  if (Array.isArray(evaluatorIds)) {
    db.prepare('DELETE FROM study_evaluators WHERE study_id = ?').run(req.params.id);
    const insert = db.prepare('INSERT INTO study_evaluators (study_id, evaluator_id) VALUES (?, ?)');
    for (const eid of evaluatorIds) insert.run(req.params.id, eid);
  }

  const row = db.prepare('SELECT * FROM studies WHERE id = ?').get(req.params.id);
  res.json(rowToStudy(row));
});

app.delete('/api/studies/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM studies WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Study not found' });
  res.status(204).send();
});

app.post('/api/studies/:id/mtes', authenticateToken, (req, res) => {
  const { mteId } = req.body;
  if (!mteId) return res.status(400).json({ error: 'mteId required' });
  db.prepare('INSERT OR IGNORE INTO study_mtes (study_id, mte_id) VALUES (?, ?)').run(req.params.id, mteId);
  res.status(204).send();
});

app.delete('/api/studies/:id/mtes/:mteId', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM study_mtes WHERE study_id = ? AND mte_id = ?').run(req.params.id, req.params.mteId);
  res.status(204).send();
});

app.post('/api/studies/:id/evaluators', authenticateToken, (req, res) => {
  const { evaluatorId } = req.body;
  if (!evaluatorId) return res.status(400).json({ error: 'evaluatorId required' });
  db.prepare('INSERT OR IGNORE INTO study_evaluators (study_id, evaluator_id) VALUES (?, ?)').run(req.params.id, evaluatorId);
  res.status(204).send();
});

app.delete('/api/studies/:id/evaluators/:evaluatorId', authenticateToken, (req, res) => {
  db.prepare('DELETE FROM study_evaluators WHERE study_id = ? AND evaluator_id = ?').run(req.params.id, req.params.evaluatorId);
  res.status(204).send();
});

// --- MTEs CRUD ---
app.get('/api/mtes', authenticateToken, (req, res) => {
  const rows = db.prepare('SELECT * FROM mtes ORDER BY created_at DESC').all();
  res.json(rows.map(r => ({ id: r.id, name: r.name, description: r.description, refNumber: r.ref_number })));
});

app.get('/api/mtes/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM mtes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'MTE not found' });
  res.json({ id: row.id, name: row.name, description: row.description, refNumber: row.ref_number });
});

app.post('/api/mtes', authenticateToken, (req, res) => {
  const { name, description, refNumber } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const id = generateId();
  const ts = now();
  const finalRef = refNumber || `MTE-${Date.now()}`;
  db.prepare('INSERT INTO mtes (id, name, description, ref_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description || null, finalRef, ts, ts);
  res.status(201).json({ id, name, description, refNumber: finalRef });
});

app.put('/api/mtes/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM mtes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'MTE not found' });

  const { name, description, refNumber } = req.body;
  db.prepare('UPDATE mtes SET name = ?, description = ?, ref_number = ?, updated_at = ? WHERE id = ?')
    .run(name ?? existing.name, description ?? existing.description, refNumber ?? existing.ref_number, now(), req.params.id);
  res.json({ id: req.params.id, name: name ?? existing.name, description: description ?? existing.description, refNumber: refNumber ?? existing.ref_number });
});

app.delete('/api/mtes/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM mtes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'MTE not found' });
  res.status(204).send();
});

// --- Ratings CRUD ---
app.get('/api/ratings', authenticateToken, (req, res) => {
  const { studyId, evaluatorId, mteId } = req.query;
  let sql = 'SELECT * FROM ratings WHERE 1=1';
  const params = [];
  if (studyId) { sql += ' AND study_id = ?'; params.push(studyId); }
  if (evaluatorId) { sql += ' AND evaluator_id = ?'; params.push(evaluatorId); }
  if (mteId) { sql += ' AND mte_id = ?'; params.push(mteId); }
  sql += ' ORDER BY timestamp DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToRating));
});

app.get('/api/ratings/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM ratings WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Rating not found' });
  res.json(rowToRating(row));
});

app.post('/api/ratings', authenticateToken, (req, res) => {
  const { evaluatorId, studyId, mteId, scores, comments } = req.body;
  if (!evaluatorId || !studyId || !mteId || !scores) {
    return res.status(400).json({ error: 'evaluatorId, studyId, mteId, and scores required' });
  }

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO ratings (id, evaluator_id, study_id, mte_id, scores, comments, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, evaluatorId, studyId, mteId, JSON.stringify(scores), comments || null, ts);
  res.status(201).json({ id, evaluatorId, studyId, mteId, scores, comments, timestamp: ts });
});

app.put('/api/ratings/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM ratings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rating not found' });

  const { scores, comments } = req.body;
  db.prepare('UPDATE ratings SET scores = ?, comments = ? WHERE id = ?')
    .run(scores ? JSON.stringify(scores) : existing.scores, comments ?? existing.comments, req.params.id);
  const row = db.prepare('SELECT * FROM ratings WHERE id = ?').get(req.params.id);
  res.json(rowToRating(row));
});

app.delete('/api/ratings/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM ratings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Rating not found' });
  res.status(204).send();
});

// --- Pairwise Comparisons CRUD ---
app.get('/api/pairwise-comparisons', authenticateToken, (req, res) => {
  const { studyId, evaluatorId } = req.query;
  let sql = 'SELECT * FROM pairwise_comparisons WHERE 1=1';
  const params = [];
  if (studyId) { sql += ' AND study_id = ?'; params.push(studyId); }
  if (evaluatorId) { sql += ' AND evaluator_id = ?'; params.push(evaluatorId); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToPairwise));
});

app.get('/api/pairwise-comparisons/:id', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT * FROM pairwise_comparisons WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Pairwise comparison not found' });
  res.json(rowToPairwise(row));
});

app.post('/api/pairwise-comparisons', authenticateToken, (req, res) => {
  const { evaluatorId, studyId, weights, isWeighted } = req.body;
  if (!evaluatorId || !studyId || !weights) {
    return res.status(400).json({ error: 'evaluatorId, studyId, and weights required' });
  }

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO pairwise_comparisons (id, evaluator_id, study_id, weights, is_weighted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, evaluatorId, studyId, JSON.stringify(weights), isWeighted ? 1 : 0, ts, ts);
  res.status(201).json({ id, evaluatorId, studyId, weights, isWeighted: !!isWeighted });
});

app.put('/api/pairwise-comparisons/:id', authenticateToken, (req, res) => {
  const existing = db.prepare('SELECT * FROM pairwise_comparisons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Pairwise comparison not found' });

  const { weights, isWeighted } = req.body;
  db.prepare('UPDATE pairwise_comparisons SET weights = ?, is_weighted = ?, updated_at = ? WHERE id = ?')
    .run(weights ? JSON.stringify(weights) : existing.weights, isWeighted !== undefined ? (isWeighted ? 1 : 0) : existing.is_weighted, now(), req.params.id);
  const row = db.prepare('SELECT * FROM pairwise_comparisons WHERE id = ?').get(req.params.id);
  res.json(rowToPairwise(row));
});

app.delete('/api/pairwise-comparisons/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM pairwise_comparisons WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Pairwise comparison not found' });
  res.status(204).send();
});

// --- Evaluator Token Endpoints (public, no auth) ---

// Generate a token for an evaluator in a study (admin only)
app.post('/api/evaluator-tokens', authenticateToken, requireAdmin, (req, res) => {
  const { evaluatorId, studyId, expiresInHours } = req.body;
  if (!evaluatorId || !studyId) return res.status(400).json({ error: 'evaluatorId and studyId required' });

  const token = randomUUID();
  const id = generateId();
  const ts = now();
  const expiresAt = expiresInHours ? ts + (expiresInHours * 3600) : null;

  db.prepare('INSERT INTO evaluator_tokens (id, token, evaluator_id, study_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, token, evaluatorId, studyId, ts, expiresAt);

  res.status(201).json({ id, token, evaluatorId, studyId, expiresAt });
});

// List tokens for a study (admin only)
app.get('/api/evaluator-tokens/study/:studyId', authenticateToken, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM evaluator_tokens WHERE study_id = ? ORDER BY created_at DESC').all(req.params.studyId);
  res.json(rows.map(r => ({
    id: r.id,
    token: r.token,
    evaluatorId: r.evaluator_id,
    studyId: r.study_id,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    usedAt: r.used_at
  })));
});

// Validate token and get study/evaluator info (public)
app.get('/api/evaluator-access/:token', (req, res) => {
  const row = db.prepare('SELECT * FROM evaluator_tokens WHERE token = ?').get(req.params.token);
  if (!row) return res.status(404).json({ error: 'Invalid token' });
  if (row.expires_at && row.expires_at < now()) return res.status(410).json({ error: 'Token expired' });

  const evaluator = db.prepare('SELECT id, name, quality, company FROM evaluators WHERE id = ?').get(row.evaluator_id);
  const study = db.prepare('SELECT * FROM studies WHERE id = ?').get(row.study_id);
  if (!evaluator || !study) return res.status(404).json({ error: 'Evaluator or study not found' });

  res.json({
    evaluator,
    study: rowToStudy(study),
    token: row.token
  });
});

// Submit rating with evaluator token (public)
app.post('/api/evaluator-access/:token/ratings', (req, res) => {
  const tokenRow = db.prepare('SELECT * FROM evaluator_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Invalid token' });
  if (tokenRow.expires_at && tokenRow.expires_at < now()) return res.status(410).json({ error: 'Token expired' });

  const { mteId, scores, comments } = req.body;
  if (!mteId || !scores) return res.status(400).json({ error: 'mteId and scores required' });

  // Verify the MTE belongs to the study
  const mteCheck = db.prepare('SELECT 1 FROM study_mtes WHERE study_id = ? AND mte_id = ?').get(tokenRow.study_id, mteId);
  if (!mteCheck) return res.status(400).json({ error: 'MTE not assigned to this study' });

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO ratings (id, evaluator_id, study_id, mte_id, scores, comments, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, tokenRow.evaluator_id, tokenRow.study_id, mteId, JSON.stringify(scores), comments || null, ts);

  // Mark token as used
  db.prepare('UPDATE evaluator_tokens SET used_at = ? WHERE id = ?').run(ts, tokenRow.id);

  res.status(201).json({ id, evaluatorId: tokenRow.evaluator_id, studyId: tokenRow.study_id, mteId, scores, comments, timestamp: ts });
});

// Submit pairwise comparison with evaluator token (public)
app.post('/api/evaluator-access/:token/pairwise-comparisons', (req, res) => {
  const tokenRow = db.prepare('SELECT * FROM evaluator_tokens WHERE token = ?').get(req.params.token);
  if (!tokenRow) return res.status(404).json({ error: 'Invalid token' });
  if (tokenRow.expires_at && tokenRow.expires_at < now()) return res.status(410).json({ error: 'Token expired' });

  const { weights, isWeighted } = req.body;
  if (!weights) return res.status(400).json({ error: 'weights required' });

  const id = generateId();
  const ts = now();
  db.prepare('INSERT INTO pairwise_comparisons (id, evaluator_id, study_id, weights, is_weighted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, tokenRow.evaluator_id, tokenRow.study_id, JSON.stringify(weights), isWeighted ? 1 : 0, ts, ts);

  res.status(201).json({ id, evaluatorId: tokenRow.evaluator_id, studyId: tokenRow.study_id, weights, isWeighted: !!isWeighted });
});

// --- Utility: check previous rating ---
app.get('/api/studies/:studyId/evaluators/:evaluatorId/has-rating', authenticateToken, (req, res) => {
  const row = db.prepare('SELECT 1 FROM ratings WHERE study_id = ? AND evaluator_id = ? LIMIT 1').get(req.params.studyId, req.params.evaluatorId);
  res.json({ hasRating: !!row });
});

// --- Error Handling ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`CaTLX Backend API listening on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

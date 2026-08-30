#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: node scripts/validate-import.mjs <export.json>');
const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.format !== 'catlx-firestore-export-v1' || !payload.collections) {
  throw new Error('Unsupported CaTLX export format.');
}
const collections = payload.collections;
const duplicateCollections = [];
for (const [name, items] of Object.entries(collections)) {
  const ids = (items || []).map((item) => item.id);
  if (ids.some((id, index) => ids.indexOf(id) !== index)) duplicateCollections.push(name);
}
if (duplicateCollections.length > 0) throw new Error(`Duplicate IDs in: ${duplicateCollections.join(', ')}`);
const canonical = JSON.stringify(collections);
const contentSha256 = createHash('sha256').update(canonical).digest('hex');
if (contentSha256 !== payload.contentSha256) throw new Error('Content hash mismatch.');
console.log(JSON.stringify({
  valid: true,
  format: payload.format,
  contentSha256,
  collections: Object.fromEntries(Object.entries(collections).map(([name, items]) => [name, (items || []).length])),
}));

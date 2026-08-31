#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const firebaseCli = path.join(root, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
const importArgs = process.argv.slice(2);
const child = spawn(process.execPath, [
  firebaseCli,
  'emulators:exec',
  '--project', 'demo-catlx',
  '--only', 'firestore',
  'node scripts/import-firestore-child.mjs',
], {
  cwd: root,
  env: { ...process.env, CATLX_IMPORT_ARGS: JSON.stringify(importArgs) },
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});

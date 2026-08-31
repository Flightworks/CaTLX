#!/usr/bin/env node
const importArgs = JSON.parse(process.env.CATLX_IMPORT_ARGS || '[]');
if (!Array.isArray(importArgs) || importArgs.some((argument) => typeof argument !== 'string')) {
  throw new Error('Invalid internal import arguments.');
}
process.argv.push(...importArgs);
await import('./import-firestore.mjs');

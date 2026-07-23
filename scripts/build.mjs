#!/usr/bin/env node

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = resolve(__dirname, '../docs/current');
const targetDir = resolve(__dirname, '../docs');

await mkdir(targetDir, { recursive: true });

const sourceEntries = await readdir(sourceDir, { withFileTypes: true });
const allowedNames = new Set(['current']);

for (const entry of sourceEntries) {
  const sourcePath = resolve(sourceDir, entry.name);
  const targetPath = resolve(targetDir, entry.name);
  allowedNames.add(entry.name);

  if (await exists(sourcePath)) {
    if (entry.isDirectory()) {
      await cp(sourcePath, targetPath, { recursive: true });
      continue;
    }

    await cp(sourcePath, targetPath);
  }
}

const targetEntries = await readdir(targetDir, { withFileTypes: true });
for (const entry of targetEntries) {
  if (allowedNames.has(entry.name)) {
    continue;
  }

  const stalePath = resolve(targetDir, entry.name);
  await rm(stalePath, { recursive: true, force: true });
}

console.log(`Build synced: ${sourceDir} -> ${targetDir}`);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

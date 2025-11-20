#!/usr/bin/env node
import { exec } from 'child_process';
import path from 'path';

function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err) return reject({ err, stdout, stderr });
      resolve({ stdout, stderr });
    });
  });
}

async function main() {
  const [,, typeScope, ...descParts] = process.argv;
  if (!typeScope || descParts.length === 0) {
    console.error('Usage: node scripts/commit_prompt.mjs <type(scope)> <short description>');
    process.exit(2);
  }

  const description = descParts.join(' ');
  const header = `${typeScope}: ${description}`;
  const repoRoot = path.join(new URL(import.meta.url).pathname, '..', '..');

  try {
    // Stage all changes (assume prompt-driven edits are localized and atomic)
    await run('git add -A', { cwd: repoRoot });
    // Commit using the constructed header
    await run(`git commit -m ${JSON.stringify(header)}`, { cwd: repoRoot });
    console.log('Committed:', header);
  } catch (e) {
    console.error('Commit failed:', e.stderr || e.err?.message || e);
    process.exit(1);
  }
}

main();

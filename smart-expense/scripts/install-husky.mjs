#!/usr/bin/env node
/**
 * Runs on `npm install` via the `prepare` script.
 *
 * The git repo root is one level above this project (…/HackInMotion-RICR-HIM-1016)
 * so plain `husky` init would pick the wrong location. This script:
 *   1. Locates the real git top-level.
 *   2. Points git at `smart-expense/.husky` for hooks (so hook files stay
 *      inside this project and get tracked in source control).
 *   3. Ensures the pre-commit script exists and is executable.
 *
 * Skips silently in CI or when there's no git repo (npm install in a
 * downloaded tarball, Vercel build, Docker, etc.) so it never blocks a build.
 */
import { execSync } from 'node:child_process';
import { existsSync, chmodSync } from 'node:fs';
import { relative, resolve } from 'node:path';

if (process.env.CI || process.env.HUSKY === '0') {
  process.exit(0);
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
}

let gitTop;
try {
  gitTop = run('git rev-parse --show-toplevel');
} catch {
  // Not a git repo — that's fine, skip.
  process.exit(0);
}

const projectDir = process.cwd(); // …/smart-expense
const hooksDir = resolve(projectDir, '.husky');
const hookFile = resolve(hooksDir, 'pre-commit');

if (!existsSync(hookFile)) {
  console.warn('[husky] .husky/pre-commit is missing — hook wiring skipped.');
  process.exit(0);
}

// core.hooksPath is a path relative to the working-tree root.
const relToRoot = relative(gitTop, hooksDir).replace(/\\/g, '/');

try {
  run(`git config core.hooksPath "${relToRoot}"`, { cwd: gitTop });
} catch (err) {
  console.warn('[husky] Could not set core.hooksPath:', err.message);
  process.exit(0);
}

// Make sure the hook is executable on Unix. No-op on Windows.
try {
  chmodSync(hookFile, 0o755);
} catch {}

console.log(`[husky] core.hooksPath → ${relToRoot}`);

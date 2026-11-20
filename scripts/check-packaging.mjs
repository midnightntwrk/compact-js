#!/usr/bin/env node
// Lint each package's `dist/` the way a consumer receives it: publint for manifest and
// tarball defects, attw for whether the types resolve under each module-resolution mode.
//
// These checks look at the generated dist manifest, which is the one that gets published
// and the one no in-repo import ever resolves through — a defect there is invisible until
// someone installs the tarball.
//
// Usage: node scripts/check-packaging.mjs   (after `yarn build && yarn package`)

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACES = ['compact-js', 'compact-js-node', 'compact-js-command'];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const run = (args) => spawnSync('yarn', args, { cwd: repoRoot, stdio: 'inherit' }).status === 0;

let failed = false;

for (const workspace of WORKSPACES) {
  const dist = join(repoRoot, workspace, 'dist');
  if (!existsSync(join(dist, 'package.json'))) {
    console.error(`check-packaging: no ${workspace}/dist/package.json — run \`yarn build && yarn package\` first.`);
    process.exit(1);
  }

  console.log(`\n=== ${workspace} ===`);

  // publint packs with Yarn by default, which refuses a directory that is not a workspace.
  if (!run(['publint', dist, '--pack', 'npm'])) failed = true;

  // These packages are ESM only by design, so "a CJS require resolves to ESM" is the
  // intended outcome rather than a defect. Every other attw rule stays on.
  if (!run(['attw', '--pack', dist, '--ignore-rules', 'cjs-resolves-to-esm'])) failed = true;
}

process.exit(failed ? 1 : 0);

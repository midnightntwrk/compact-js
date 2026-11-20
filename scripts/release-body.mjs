#!/usr/bin/env node
// Build the body of the aggregate GitHub Release from the CHANGELOG sections
// `changeset version` wrote for a version.
//
// The three packages are a `fixed` group, so a changeset naming only one of them
// still bumps all three — the others get a bare `## <version>` heading and no body.
// Reading a single CHANGELOG would therefore publish an empty release, which is the
// defect the Changesets migration set out to fix.
//
// Usage: node scripts/release-body.mjs <version> <output-file>

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACES = ['compact-js', 'compact-js-node', 'compact-js-command'];

// Matched whole-line rather than by substring, so `4.0.0` does not also match the
// `## 4.0.0-rc.1` section above it.
export const extractSection = (changelog, version) => {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) return '';

  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
};

/** Empty when no package documented this version — the caller treats that as a failure. */
export const buildReleaseBody = (packages, version) => {
  const sections = packages
    .map(({ name, changelog }) => ({ name, body: extractSection(changelog, version) }))
    .filter(({ body }) => body !== '');

  if (sections.length === 0) return '';
  return `${sections.map(({ name, body }) => `## ${name}\n\n${body}`).join('\n\n')}\n`;
};

const readPackages = (repoRoot) =>
  WORKSPACES.map((workspace) => {
    const changelog = join(repoRoot, workspace, 'CHANGELOG.md');
    return {
      name: JSON.parse(readFileSync(join(repoRoot, workspace, 'package.json'), 'utf8')).name,
      changelog: existsSync(changelog) ? readFileSync(changelog, 'utf8') : ''
    };
  });

const main = () => {
  const [version, outputFile] = process.argv.slice(2);
  if (!version || !outputFile) {
    console.error('usage: release-body.mjs <version> <output-file>');
    process.exit(1);
  }

  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const body = buildReleaseBody(readPackages(repoRoot), version);
  if (body === '') {
    console.error(`no CHANGELOG has a non-empty "## ${version}" section`);
    process.exit(1);
  }

  writeFileSync(outputFile, body);
  console.log(`wrote ${outputFile} (${body.length} bytes)`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

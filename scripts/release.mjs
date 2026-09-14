#!/usr/bin/env node
// Publish the built package tarballs of this workspace to npmjs.
//
// Why this exists: packages here publish the `@effect/build-utils pack-v3`
// `dist/` folder as a tarball (produced by `yarn package`), not the workspace
// member directly. `changeset publish` publishes the member root, which would
// ship source (`exports` → `./src/*.ts`) instead of the built `dist/`. So we
// keep the proven pack-then-publish flow and use Changesets only for
// versioning + changelogs + tags/releases.
//
// Invocation modes:
//   --check       report which workspace versions are not yet on the registry
//                 and exit, without needing a build.
//   --from <dir>  publish every `*.tgz` in <dir>, reading name/version from
//                 inside each tarball. Used by CD, which restores tarballs from
//                 a build artifact rather than rebuilding them.
//   (default)     discover `<pkg>/dist/*.tgz` across the workspace.
//
// The dist-tag is derived from the version Changesets wrote, so it needs no
// separate configuration: a `-rc.N` prerelease publishes to `rc` (matching
// `.changeset/pre.json`) and a stable version to `latest`.
//
// Authentication is npmjs Trusted Publishing (GitHub OIDC): the publish job
// exchanges its OIDC token for a short-lived npmjs credential, so no token is
// read from the environment. A `NODE_AUTH_TOKEN` in scope would shadow OIDC.
// Set `RELEASE_DRY_RUN=1` to exercise everything without publishing.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dryRun = process.env.RELEASE_DRY_RUN === '1';
const registry = process.env.NPM_REGISTRY ?? 'https://registry.npmjs.org';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const readFlag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`release: ${name} requires a value`);
    process.exit(1);
  }
  return value;
};
const fromDir = readFlag('--from');
const checkOnly = args.includes('--check');

/** Derive the npm dist-tag from a semver string. */
const distTag = (version) => {
  const dash = version.indexOf('-');
  if (dash === -1) return 'latest';
  const id = version.slice(dash + 1).split('.')[0];
  return id || 'latest';
};

// `npm` resolves a scoped name via its `@scope:registry` mapping and ignores a
// bare `--registry`, so an ambient `.npmrc` pointing the scope elsewhere would
// silently redirect both the probe and the publish.
const registryArgs = (name) => {
  const scope = name.startsWith('@') ? name.split('/')[0] : null;
  return scope ? [`--${scope}:registry=${registry}`] : [`--registry=${registry}`];
};

/**
 * Is `name@version` already on the registry? npmjs rejects republishing an
 * existing version with a 403, so CD skips those to stay re-runnable. Only a
 * 404 counts as absent — treating any failure as absent would turn an auth or
 * network fault into a publish attempt.
 */
const alreadyPublished = (name, version) => {
  try {
    const out = execFileSync('npm', ['view', `${name}@${version}`, 'version', ...registryArgs(name)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return out === version;
  } catch (error) {
    const stderr = error.stderr?.toString() ?? '';
    if (/E404|is not in this registry|No match found/i.test(stderr)) return false;
    console.error(`release: cannot determine whether ${name}@${version} exists on ${registry}`);
    console.error(stderr.trim());
    process.exit(1);
  }
};

/** Read the packed manifest out of a tarball without unpacking it. */
const manifestFromTarball = (tgz) => {
  const raw = execFileSync('tar', ['-xzOf', tgz, 'package/package.json'], { encoding: 'utf8' });
  const { name, version } = JSON.parse(raw);
  if (!name || !version) {
    console.error(`release: ${tgz} has no name/version in package/package.json`);
    process.exit(1);
  }
  return { name, version };
};

/** Tarballs restored from a CI artifact, flattened into one directory. */
const targetsFromDir = (dir) => {
  if (!existsSync(dir)) {
    console.error(`release: --from directory does not exist: ${dir}`);
    process.exit(1);
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tgz'))
    .sort()
    .map((f) => {
      const tarball = join(dir, f);
      return { tarball, ...manifestFromTarball(tarball) };
    });
};

/**
 * Publishable workspace packages: immediate subdirectories (workspaces glob is
 * "*") whose manifest is not private and is not the `*-sources` root.
 */
const workspacePackages = () => {
  const packages = [];
  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(repoRoot, entry.name, 'package.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.private === true) continue;
    if (!manifest.name || manifest.name.endsWith('-sources')) continue;
    packages.push({ dir: join(repoRoot, entry.name), name: manifest.name, version: manifest.version });
  }
  return packages;
};

const targetsFromWorkspace = () => {
  const targets = [];
  for (const manifest of workspacePackages()) {
    const distDir = join(manifest.dir, 'dist');
    const tarballs = existsSync(distDir) ? readdirSync(distDir).filter((f) => f.endsWith('.tgz')) : [];
    if (tarballs.length === 0) {
      console.error(`release: no tarball found in ${distDir} — did "yarn package" run?`);
      process.exit(1);
    }
    // Prefer a tarball whose name embeds the current version; fall back to the sole one.
    const tarball =
      tarballs.find((f) => f.includes(manifest.version)) ?? (tarballs.length === 1 ? tarballs[0] : null);
    if (!tarball) {
      console.error(
        `release: could not disambiguate tarball for ${manifest.name}@${manifest.version} in ${distDir}: ${tarballs.join(', ')}`
      );
      process.exit(1);
    }
    targets.push({ tarball: join(distDir, tarball), name: manifest.name, version: manifest.version });
  }
  return targets;
};

// `--check` answers "would anything publish?" from the manifests alone, so CD
// can decide whether to build and request a deployment approval at all. It
// prints one `name@version` per pending package and nothing when there are none.
if (checkOnly) {
  const packages = workspacePackages();
  if (packages.length === 0) {
    console.error('release: no publishable packages found');
    process.exit(1);
  }
  for (const { name, version } of packages) {
    if (!alreadyPublished(name, version)) console.log(`${name}@${version}`);
  }
  process.exit(0);
}

const targets = fromDir ? targetsFromDir(fromDir) : targetsFromWorkspace();

if (targets.length === 0) {
  console.error('release: no publishable packages found');
  process.exit(1);
}

let publishedCount = 0;
let skippedCount = 0;
for (const { tarball, name, version } of targets) {
  const tag = distTag(version);

  if (!dryRun && alreadyPublished(name, version)) {
    console.log(`release: ${name}@${version} already published — skipping`);
    skippedCount += 1;
    continue;
  }

  // Provenance is generated at publish time from the workflow's OIDC claims, so
  // it attaches to a pre-packed tarball just as it would to a fresh pack.
  const publishArgs = [
    'publish',
    tarball,
    '--tag',
    tag,
    '--access',
    'public',
    '--provenance',
    ...registryArgs(name),
  ];
  if (dryRun) publishArgs.push('--dry-run');
  console.log(`release: publishing ${name}@${version} (tag: ${tag})${dryRun ? ' [dry-run]' : ''}`);
  execFileSync('npm', publishArgs, { stdio: 'inherit' });

  // Consumed by changesets/action to create the git tag + GitHub Release.
  if (!dryRun) console.log(`New tag: ${name}@${version}`);
  publishedCount += 1;
}

console.log(`release: ${publishedCount} package(s) published, ${skippedCount} skipped`);

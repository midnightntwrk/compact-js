#!/usr/bin/env node
// Generate this tag's component release note in the v9 template shape — the
// structure `docs/release-notes/3.0.0.md` follows.
//
// Three layers, each overriding the one before it:
//   1. derived    — changesets, workspace manifests, `.github/env/global.env`, git
//   2. base       — `docs/release-notes/overlays/_base.md`, the sections stable across releases
//   3. per-release— `docs/release-notes/overlays/<version>.md`, this release's human-only fields
//
// Layers 2 and 3 are partial notes: a `## Section` present in one replaces the
// section below it wholesale, except `Tested-with versions`, which merges by row.
// Anything no layer supplies is emitted as a `TODO (owner):` marker rather than
// dropped, so the note is always structurally complete.
//
// Changesets are the content source only — `version.json` remains the published
// version's source of truth, and nothing here consumes or rewrites them. A
// changeset belongs to this release when it was added after the previous release
// tag, so re-running is idempotent and no pruning commit is needed.
//
// Usage:
//   node scripts/generate-release-notes.mjs [--version X.Y.Z] [--out PATH] [--force]
//                                           [--since REF] [--report PATH] [--shasums]
//
// `--shasums` reads each published tarball's `dist.shasum` from the registry, so
// it only works once the packages are live. Omit it for a local dry run.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG_PREFIX = 'compact-js-v';
const CHANGESET_DIR = '.changeset';
const NOTE_DIR = 'docs/release-notes';
const OVERLAY_DIR = `${NOTE_DIR}/overlays`;
const TODO = (what) => `TODO (owner): ${what}`;

const warnings = [];
const warn = (message) => {
  warnings.push(message);
  console.warn(`warning: ${message}`);
};

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? undefined : argv[at + 1];
};
const enabled = (name) => argv.includes(`--${name}`);

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const readIfPresent = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined);

/** Run git, returning '' rather than throwing — every call here is best-effort enrichment. */
const git = (...args) => {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);

// ---------------------------------------------------------------- inputs

/** Mirror of the version arithmetic in `.github/actions/create-package-artifacts`. */
const resolveVersion = () => {
  const { v_info } = readJson(join(repoRoot, 'version.json'));
  const { version, preRelease } = v_info;
  if (!preRelease) return version;
  if (/\.\d+$/.test(preRelease)) return `${version}${preRelease}`;
  const source = git('log', '--format=%h', '-1', '--', 'version.json');
  const height = source ? lines(git('log', '--format=%h', `${source}..`)).length : 0;
  return `${version}${preRelease}.${height}`;
};

/**
 * The previous release, by tag creation date among HEAD's ancestors. Dates rather
 * than version sort: releases are chronological, and `-v:refname` orders
 * `3.0.0-rc.6` above `3.0.0` unless `versionsort.suffix` is configured.
 */
const resolveSince = (version) => {
  const explicit = flag('since');
  if (explicit) return explicit;
  const tags = lines(
    git('tag', '--list', `${TAG_PREFIX}*`, '--sort=-creatordate', '--merged', 'HEAD'),
  ).filter((tag) => tag !== `${TAG_PREFIX}${version}`);
  if (tags.length > 0) return tags[0];
  warn(
    `no ${TAG_PREFIX}* tag reachable from HEAD — every changeset and commit in history ` +
      `is being treated as part of ${version}`,
  );
  return '';
};

const BUMP_RANK = { patch: 0, minor: 1, major: 2 };
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const BUMP_LINE = /^['"]?([^'":]+?)['"]?\s*:\s*(major|minor|patch)$/;

const parseChangeset = (file, text) => {
  const parsed = FRONTMATTER.exec(text);
  if (!parsed) {
    warn(`${CHANGESET_DIR}/${file}: no frontmatter block — not included in the note`);
    return undefined;
  }
  const bumps = {};
  for (const line of lines(parsed[1])) {
    const bump = BUMP_LINE.exec(line);
    if (bump) bumps[bump[1].trim()] = bump[2];
  }
  const body = parsed[2].trim();
  if (Object.keys(bumps).length === 0 || !body) {
    warn(`${CHANGESET_DIR}/${file}: no package bumps or empty summary — not included in the note`);
    return undefined;
  }
  const level = Object.values(bumps).reduce((a, b) => (BUMP_RANK[b] > BUMP_RANK[a] ? b : a));
  return { file, bumps, level, title: titleOf(body, file), body };
};

const TITLE_LIMIT = 80;

/**
 * The summary's first sentence names the item, clipped at a clause boundary when it
 * runs long — a changeset whose opening sentence is a whole paragraph would otherwise
 * become an unreadable `###` heading.
 */
const titleOf = (body, file) => {
  const sentence = /^([\s\S]*?[.!?])(\s|$)/.exec(body);
  const full = (sentence ? sentence[1] : body).replace(/\s+/g, ' ').replace(/\.$/, '');
  if (full.length <= TITLE_LIMIT) return full;
  warn(
    `${CHANGESET_DIR}/${file}: opening sentence is longer than ${TITLE_LIMIT} characters, so the ` +
      `item heading was clipped — shorten it, or set the heading in the overlay`,
  );
  const clause = full.slice(0, TITLE_LIMIT).lastIndexOf(', ');
  if (clause > 0) return full.slice(0, clause);
  const word = full.lastIndexOf(' ', TITLE_LIMIT);
  return full.slice(0, word > 0 ? word : TITLE_LIMIT);
};

const collectChangesets = (since) => {
  const dir = join(repoRoot, CHANGESET_DIR);
  if (!existsSync(dir)) return [];
  const present = readdirSync(dir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort();

  let unreleased = present;
  if (since) {
    const addedSince = new Set(
      lines(
        git(
          'log',
          '--diff-filter=A',
          '--name-only',
          '--format=',
          `${since}..HEAD`,
          '--',
          CHANGESET_DIR,
        ),
      ).map((path) => path.slice(CHANGESET_DIR.length + 1)),
    );
    unreleased = present.filter((file) => addedSince.has(file));
    for (const file of present.filter((file) => !addedSince.has(file))) {
      warn(
        `${CHANGESET_DIR}/${file}: added at or before ${since}, so it is treated as already ` +
          `released and left out of ${TAG_PREFIX}-this-release`,
      );
    }
  }

  const changesets = unreleased
    .map((file) => parseChangeset(file, readFileSync(join(dir, file), 'utf8')))
    .filter(Boolean);
  if (changesets.length === 0) {
    warn(`no changesets found for this release — the note's generated sections will be empty`);
  }
  return changesets.map((changeset) => ({ ...changeset, ...provenance(changeset.file) }));
};

/** Link a changeset to the commit that added it, and to its PR when a merge names one. */
const provenance = (file) => {
  const commit = git('log', '--diff-filter=A', '--format=%h', '-1', '--', `${CHANGESET_DIR}/${file}`);
  if (!commit) return {};
  const merge = lines(
    git('log', '--merges', '--ancestry-path', '--format=%s', `${commit}..HEAD`),
  ).reverse().find((subject) => /^Merge pull request #\d+/.test(subject));
  const pr = merge ? /#(\d+)/.exec(merge)[1] : undefined;
  return { commit, pr };
};

const citation = ({ commit, pr }) =>
  pr ? `(PR #${pr})` : commit ? `(commit ${commit})` : '';

// ------------------------------------------------------- derived sections

const WORKSPACES = ['compact-js', 'compact-js-node', 'compact-js-command'];

const manifests = () =>
  WORKSPACES.map((dir) => ({ dir, ...readJson(join(repoRoot, dir, 'package.json')) })).filter(
    (manifest) => manifest.private !== true,
  );

/** Prefer the installed version; fall back to the declared pin with its range stripped. */
const pinned = (packageName, declared) => {
  const installed = readIfPresent(join(repoRoot, 'node_modules', packageName, 'package.json'));
  if (installed) return JSON.parse(installed).version;
  return declared?.replace(/^[\^~>=<\s]+/, '');
};

const globalEnv = () => {
  const text = readIfPresent(join(repoRoot, '.github/env/global.env')) ?? '';
  return Object.fromEntries(
    lines(text)
      .filter((line) => !line.startsWith('#') && line.includes('='))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );
};

const testedWithRows = (packages) => {
  const core = packages.find((p) => p.name === '@midnight-ntwrk/compact-js');
  const deps = { ...core.dependencies };
  const command = packages.find((p) => p.name === '@midnight-ntwrk/compact-js-command');
  // The ledger 8 era reaches its own runtime line through an aliased install.
  const era8Runtime = /@([\d.]+)$/.exec(deps['compact-runtime-ledger8'] ?? '')?.[1];

  const rows = new Map([
    [
      'compact runtime (`@midnight-ntwrk/compact-runtime`)',
      pinned('@midnight-ntwrk/compact-runtime', deps['@midnight-ntwrk/compact-runtime']),
    ],
    ['compact toolchain/compiler (compactc)', globalEnv().COMPACTC_VERSION],
    ['ledger 9 bindings (`@midnightntwrk/ledger-v9`)', pinned('@midnightntwrk/ledger-v9', deps['@midnightntwrk/ledger-v9'])],
    ['ledger 8 bindings (`@midnightntwrk/ledger-v8`)', pinned('@midnightntwrk/ledger-v8', deps['@midnightntwrk/ledger-v8'])],
    [
      'on-chain runtime (`@midnightntwrk/onchain-runtime-v4`)',
      pinned('@midnightntwrk/onchain-runtime-v4', deps['@midnightntwrk/onchain-runtime-v4']),
    ],
    ['compact runtime, ledger 8 era (`@midnight-ntwrk/compact-runtime`)', era8Runtime],
    ['platform-js (`@midnight-ntwrk/platform-js`)', pinned('@midnight-ntwrk/platform-js', deps['@midnight-ntwrk/platform-js'])],
    [
      'wallet SDK address format (`@midnight-ntwrk/wallet-sdk-address-format`)',
      pinned(
        '@midnight-ntwrk/wallet-sdk-address-format',
        command.dependencies?.['@midnight-ntwrk/wallet-sdk-address-format'],
      ),
    ],
  ]);

  // Not knowable from this repository — the overlay is where an owner fills them in.
  for (const component of ['wallet SDK', 'proof server', 'node', 'indexer', 'midnight.js']) {
    rows.set(component, TODO(`confirm the version this release was tested against, or \`—\``));
  }

  for (const [component, value] of rows) {
    if (!value) {
      rows.set(component, TODO('confirm the version to publish'));
      warn(`tested-with: could not derive a version for "${component}"`);
    }
  }
  return rows;
};

const renderTable = (rows) =>
  ['| Component | Tested-with version |', '| --- | --- |', ...[...rows].map(([k, v]) => `| ${k} | ${v} |`)].join('\n');

const shasum = (name, version) => {
  if (!enabled('shasums')) return undefined;
  try {
    return execFileSync('npm', ['view', `${name}@${version}`, 'dist.shasum'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || undefined;
  } catch {
    warn(`could not read dist.shasum for ${name}@${version} — the artifact is listed without it`);
    return undefined;
  }
};

const itemsFor = (changesets, level) => changesets.filter((changeset) => changeset.level === level);

const describedItems = (changesets) =>
  changesets
    .map(
      (changeset) =>
        `### ${changeset.title}\n\n**Description**: ${changeset.body} ${citation(changeset)}`.trim(),
    )
    .join('\n\n');

const breakingItems = (changesets) =>
  changesets
    .map((changeset) =>
      [
        `### ${changeset.title}`,
        `**What changed**: ${changeset.body} ${citation(changeset)}`.trim(),
        `**What breaks**: ${TODO('describe the exact scenarios that stop working')}`,
        `**Required actions**:`,
        `- ${TODO('the steps a consumer has to take')}`,
        `**Code example**:`,
        '```\n' + TODO('a migration example, or delete this block') + '\n```',
      ].join('\n\n'),
    )
    .join('\n\n');

/**
 * What actually landed on the release branch. First-parent only: a merge commit speaks
 * for its whole PR, so the work-in-progress commits inside it stay out of the note.
 */
const landedChanges = (since) =>
  lines(git('log', '--first-parent', '--format=%h\x1f%p\x1f%s', since ? `${since}..HEAD` : 'HEAD'))
    .map((entry) => {
      const [commit, parents, subject] = entry.split('\x1f');
      const pr = /^Merge pull request #(\d+)/.exec(subject)?.[1];
      if (!pr) return { commit, subject };
      const merged = parents.split(' ')[1];
      return { commit, pr, subject: git('log', '--format=%s', '-1', merged) || subject };
    });

const FIX_SUBJECT = /^fix(\([^)]*\))?!?:\s*/;

const fixedDefects = (since) => {
  const fixes = landedChanges(since).filter((change) => FIX_SUBJECT.test(change.subject));
  if (fixes.length === 0) return 'None.';
  const rows = fixes.map(({ commit, pr, subject }) => {
    const text = subject.replace(FIX_SUBJECT, '').replace(/\s*\(#\d+\)$/, '');
    return `| ${pr ? `PR-${pr}` : commit} | ${text.charAt(0).toUpperCase()}${text.slice(1)}. |`;
  });
  return ['| Defect number | Description |', '| --- | --- |', ...rows].join('\n');
};

// --------------------------------------------------------------- assembly

const SECTION_ORDER = [
  'Metadata',
  'High-level summary',
  'Audience',
  'Dependencies',
  'Tested-with versions',
  'Deployment information',
  'Artifacts',
  'What changed',
  'New features',
  'New features requiring configuration updates',
  'Improvements',
  'Deprecations',
  'Breaking changes',
  'Known issues',
  'Links and references',
  'Fixed defect list',
];

const derive = (version, changesets, since) => {
  const packages = manifests();
  const releaseType = changesets.length
    ? changesets.reduce((a, c) => (BUMP_RANK[c.level] > BUMP_RANK[a] ? c.level : a), 'patch')
    : TODO('no changesets found — state the release type');
  const sections = new Map();

  sections.set(
    'Metadata',
    [
      `- **Release type**: ${releaseType}`,
      `- **Sister-line note**: —`,
      `- **Date**: ${new Date().toISOString().slice(0, 10)}`,
      `- **Environment**: not environment-scoped — the packages carry both the ledger 8 (\`/v8\`) and ledger 9 (\`/v9\`) eras, and a consumer selects one at import`,
      `- **Released artifact(s)**: ${packages.length} npm packages at ${version} — see **Artifacts**`,
      `- **Component class**: library/SDK (drives which operator fields apply; see **Deployment information** below)`,
      `- **Upgrade scope**: N/A — library`,
      `- **Reset required**: N/A — library`,
      `- **Governance action required**: N/A — library`,
    ].join('\n'),
  );

  sections.set('High-level summary', TODO('write the 1–3 sentence summary of this release'));

  sections.set(
    'Audience',
    [
      'These notes are written for:',
      '',
      '- Developers building DApps on the `@midnight-ntwrk/compact-js` packages.',
      '- Developers who compile Compact contracts with compactc and execute them from TypeScript.',
      '- Shielded Technologies engineering teams maintaining consuming SDKs.',
    ].join('\n'),
  );

  sections.set(
    'Dependencies',
    [
      TODO('list the hard, component-local incompatibilities, or `—`'),
      '',
      `**Downstream impact (cascading effects).** ${TODO('how upgrading this component affects its consumers, or `—`')}`,
    ].join('\n'),
  );

  sections.set(
    'Tested-with versions',
    [
      'Read from the package manifests and the CI environment at this tag: these are build pins — not QA-verified.',
      '',
      renderTable(testedWithRows(packages)),
      '',
      'The ledger rows name npm binding packages, which version independently of the ledger component release line.',
    ].join('\n'),
  );

  sections.set(
    'Deployment information',
    [
      '- **Upgrade scope**: N/A — library',
      '- **Reset required**: N/A — library',
      '- **Governance action required**: N/A — library',
      '- **Downtime / coordination**: N/A — library',
    ].join('\n'),
  );

  sections.set(
    'Artifacts',
    packages
      .map((manifest) => {
        const sha = shasum(manifest.name, version);
        return `- \`${manifest.name}@${version}\` — ${manifest.description}${sha ? `; sha1 \`${sha}\` (npm)` : ''}`;
      })
      .join('\n'),
  );

  sections.set(
    'What changed',
    changesets.length
      ? changesets.map((c) => `- ${c.title} ${citation(c)}`.trim() + '.').join('\n')
      : TODO('no changesets found — list what changed'),
  );

  const features = itemsFor(changesets, 'minor');
  const improvements = itemsFor(changesets, 'patch');
  const breaking = itemsFor(changesets, 'major');

  sections.set('New features', features.length ? describedItems(features) : 'None.');
  sections.set(
    'New features requiring configuration updates',
    TODO('describe any setup a consumer must do before the first run, or write `None.`'),
  );
  sections.set('Improvements', improvements.length ? describedItems(improvements) : 'None.');
  sections.set('Deprecations', 'None.');
  sections.set('Breaking changes', breaking.length ? breakingItems(breaking) : 'None.');
  sections.set('Known issues', TODO('list the issues known at release time, or write `None.`'));

  const repo = 'https://github.com/midnightntwrk/compact-js';
  sections.set(
    'Links and references',
    [
      `- **QA test coverage / test evidence**: —`,
      `- **PRs**: [compact-js pull requests merged for this release](${repo}/pulls?q=is%3Apr+is%3Amerged)`,
      `- **Engineering docs**: ${TODO('link the relevant engineering docs, or `—`')}`,
      `- **Migration guides**: ${TODO('link a migration guide, or `—`')}`,
      `- **SDK docs**: [\`@midnight-ntwrk/compact-js\` on npm](https://www.npmjs.com/package/@midnight-ntwrk/compact-js/v/${version})`,
      `- **Known issues board**: [compact-js issues](${repo}/issues)`,
      `- **Public schema**: —`,
      `- **API documentation**: —`,
      `- **Related component releases**: ${TODO('link the paired ledger / proof-server releases, or `—`')}`,
    ].join('\n'),
  );

  sections.set(
    'Fixed defect list',
    [`The following defects were fixed in ${version}.`, '', fixedDefects(since)].join('\n'),
  );

  return sections;
};

// ---------------------------------------------------------------- overlays

const splitSections = (markdown) => {
  const sections = new Map();
  let heading;
  let buffer = [];
  for (const line of markdown.split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      if (heading) sections.set(heading, buffer.join('\n').trim());
      heading = match[1];
      buffer = [];
    } else if (heading) {
      buffer.push(line);
    }
  }
  if (heading) sections.set(heading, buffer.join('\n').trim());
  return sections;
};

const parseTable = (markdown) => {
  const rows = new Map();
  for (const line of markdown.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 2) continue;
    if (cells[0] === 'Component' || /^[-:\s]+$/.test(cells[0])) continue;
    rows.set(cells[0], cells[1]);
  }
  return rows;
};

const LABEL_LINE = /^-\s+\*\*(.+?)\*\*:\s*(.*)$/;

const parseLabelled = (markdown) => {
  const entries = new Map();
  for (const line of markdown.split('\n')) {
    const match = LABEL_LINE.exec(line.trim());
    if (match) entries.set(match[1], match[2].trim());
  }
  return entries;
};

/**
 * Sections that are a flat list of `- **Label**: value`. An overlay supplies only the
 * labels it wants to change, so it cannot silently freeze a derived one — the npm link
 * in Links and references carries this release's version, for instance.
 */
const LABELLED_SECTIONS = new Set(['Metadata', 'Deployment information', 'Links and references']);

const applyOverlay = (sections, overlay, source) => {
  for (const [heading, content] of splitSections(overlay)) {
    if (!SECTION_ORDER.includes(heading)) {
      warn(`${source}: "## ${heading}" is not a release-note section — ignored`);
      continue;
    }
    if (heading === 'Tested-with versions') {
      const merged = new Map([...parseTable(sections.get(heading)), ...parseTable(content)]);
      const prose = content.split('\n').filter((line) => !line.trim().startsWith('|')).join('\n').trim();
      sections.set(heading, [renderTable(merged), prose].filter(Boolean).join('\n\n'));
    } else if (LABELLED_SECTIONS.has(heading)) {
      const merged = new Map([...parseLabelled(sections.get(heading)), ...parseLabelled(content)]);
      sections.set(heading, [...merged].map(([label, value]) => `- **${label}**: ${value}`).join('\n'));
    } else {
      sections.set(heading, content);
    }
  }
};

// -------------------------------------------------------------------- main

const version = flag('version') ?? resolveVersion();
const since = resolveSince(version);
const changesets = collectChangesets(since);
const sections = derive(version, changesets, since);

for (const [file, required] of [
  ['_base.md', false],
  [`${version}.md`, true],
]) {
  const label = `${OVERLAY_DIR}/${file}`;
  const overlay = readIfPresent(join(repoRoot, OVERLAY_DIR, file));
  if (overlay) applyOverlay(sections, overlay, label);
  else if (required) {
    warn(`${label} not found — every human-only field is a TODO marker in the generated note`);
  }
}

const note = [
  `# compact-js ${version}`,
  ...SECTION_ORDER.map((heading) => `## ${heading}\n\n${sections.get(heading)}`),
].join('\n\n') + '\n';

const outPath = resolve(repoRoot, flag('out') ?? `${NOTE_DIR}/${version}.md`);
// A published note may have been hand-edited after it was generated, so replacing one
// is always deliberate. CD passes --force; a local preview should pass --out instead.
if (existsSync(outPath) && !enabled('force')) {
  console.error(
    `release notes: ${outPath} already exists — pass --force to replace it, or --out to write elsewhere`,
  );
  process.exit(1);
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, note);

const todos = note.split('\n').filter((line) => line.includes('TODO (owner):')).length;
console.log(
  `release notes: ${outPath} — ${changesets.length} changeset(s), ` +
    `${todos} owner TODO(s), ${warnings.length} warning(s)`,
);

const reportPath = flag('report');
if (reportPath) {
  writeFileSync(
    resolve(repoRoot, reportPath),
    JSON.stringify(
      {
        version,
        since: since || null,
        changesets: changesets.map(({ file, level, bumps, pr, commit }) => ({ file, level, bumps, pr, commit })),
        todos,
        warnings,
      },
      null,
      2,
    ) + '\n',
  );
}

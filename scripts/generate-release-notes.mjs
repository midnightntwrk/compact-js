#!/usr/bin/env node
// Generate this release's component release note in the v9 template shape — the
// structure `docs/release-notes/3.0.0.md` follows.
//
// Three layers, each overriding the one before it:
//   1. derived    — package CHANGELOGs, workspace manifests, `.github/env/global.env`
//   2. base       — `docs/release-notes/overlays/_base.md`, the sections stable across releases
//   3. per-release— `docs/release-notes/overlays/<version>.md`, this release's human-only fields
//
// Layers 2 and 3 are partial notes: a `## Section` present in one replaces the
// section below it wholesale, except `Tested-with versions`, which merges by row.
// Anything no layer supplies is emitted as a `TODO (owner):` marker rather than
// dropped, so the note is always structurally complete.
//
// Runs as the second half of `yarn release:prepare`, after `changeset version`
// has set the manifest versions and written each package's CHANGELOG. Those two
// are the whole input: the version is read from the manifest and the content from
// the CHANGELOG section `changeset version` just added. Nothing is derived from
// tags or commit archaeology, so a release that follows release candidates reads
// the same as one that does not.
//
// Usage:
//   node scripts/generate-release-notes.mjs [--version X.Y.Z] [--out PATH] [--force]
//                                           [--report PATH] [--shasums]
//
// `--shasums` reads each published tarball's `dist.shasum` from the registry, so
// it only works once the packages are live. Omit it for a local dry run.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

const lines = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);

// ---------------------------------------------------------------- inputs

const BUMP_RANK = { patch: 0, minor: 1, major: 2 };
const CHANGELOG_LEVELS = new Map([
  ['Major Changes', 'major'],
  ['Minor Changes', 'minor'],
  ['Patch Changes', 'patch'],
]);

/**
 * The CHANGELOG section `changeset version` wrote for `version`, as `### <Level> Changes`
 * blocks. Returns undefined when the file has no section for it, which is how a package
 * that this release did not touch is told apart from one whose entry is empty.
 */
const changelogSection = (dir, version) => {
  const text = readIfPresent(join(repoRoot, dir, 'CHANGELOG.md'));
  if (!text) return undefined;
  const at = text.indexOf(`\n## ${version}\n`);
  if (at === -1) return undefined;
  const body = text.slice(at + `\n## ${version}\n`.length);
  const next = body.search(/^## /m);
  return next === -1 ? body : body.slice(0, next);
};

/**
 * `@changesets/changelog-github` renders each entry as
 * `- [#37](…/pull/37) [\`sha\`](…) Thanks [@who](…)! - <summary>`, continuation lines
 * indented by two spaces. Keep the PR link, drop the commit link and the thanks: the
 * note cites work, not authorship.
 */
const ENTRY_START = /^-\s+(.*)$/;
const ENTRY_PREAMBLE =
  /^(?:\[#(\d+)\]\([^)]*\)\s*)?(?:\[`[0-9a-f]+`\]\([^)]*\)\s*)?(?:Thanks\s+\[@[^\]]+\]\([^)]*\)!\s*)?-?\s*/;

const parseEntries = (section) => {
  const entries = [];
  let current;
  for (const line of section.split('\n')) {
    const start = ENTRY_START.exec(line);
    if (start) {
      if (current) entries.push(current);
      const rest = start[1];
      // Dependency roll-ups restate sibling bumps; they are noise in a release note.
      if (/^Updated dependencies\b/.test(rest)) {
        current = undefined;
        continue;
      }
      const pr = ENTRY_PREAMBLE.exec(rest)?.[1];
      current = { pr, body: [rest.replace(ENTRY_PREAMBLE, '')] };
    } else if (current && line.trim()) {
      current.body.push(line.trim());
    }
  }
  if (current) entries.push(current);
  return entries
    .map(({ pr, body }) => ({ pr, body: body.join('\n').trim() }))
    .filter((entry) => entry.body);
};

const TITLE_LIMIT = 80;

/**
 * The summary's first sentence names the item, clipped at a clause boundary when it
 * runs long — a changeset whose opening sentence is a whole paragraph would otherwise
 * become an unreadable `###` heading.
 */
const titleOf = (body) => {
  const sentence = /^([\s\S]*?[.!?])(\s|$)/.exec(body);
  const full = (sentence ? sentence[1] : body).replace(/\s+/g, ' ').replace(/\.$/, '');
  if (full.length <= TITLE_LIMIT) return full;
  warn(
    `an entry's opening sentence is longer than ${TITLE_LIMIT} characters, so the item heading ` +
      `was clipped — shorten the changeset, or set the heading in the overlay`,
  );
  const clause = full.slice(0, TITLE_LIMIT).lastIndexOf(', ');
  if (clause > 0) return full.slice(0, clause);
  const word = full.lastIndexOf(' ', TITLE_LIMIT);
  return full.slice(0, word > 0 ? word : TITLE_LIMIT);
};

/**
 * Every package's entries for this version, de-duplicated. One changeset bumps several
 * packages, so the same summary appears in each CHANGELOG — at the highest level any
 * package gave it, which is the level the release as a whole changed at.
 */
const collectEntries = (version, packages) => {
  const byBody = new Map();
  for (const { dir } of packages) {
    const section = changelogSection(dir, version);
    if (section === undefined) {
      warn(`${dir}/CHANGELOG.md has no "## ${version}" section — that package contributes nothing`);
      continue;
    }
    for (const [heading, level] of CHANGELOG_LEVELS) {
      const at = section.indexOf(`### ${heading}`);
      if (at === -1) continue;
      const rest = section.slice(at + `### ${heading}`.length);
      const next = rest.search(/^### /m);
      for (const entry of parseEntries(next === -1 ? rest : rest.slice(0, next))) {
        const seen = byBody.get(entry.body);
        if (!seen) byBody.set(entry.body, { ...entry, level });
        else if (BUMP_RANK[level] > BUMP_RANK[seen.level]) seen.level = level;
      }
    }
  }
  const entries = [...byBody.values()].map((entry) => ({ ...entry, title: titleOf(entry.body) }));
  if (entries.length === 0) {
    warn(`no CHANGELOG entries found for ${version} — the note's generated sections will be empty`);
  }
  return entries;
};

const citation = ({ pr }) => (pr ? `(PR #${pr})` : '');

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

const itemsFor = (entries, level) => entries.filter((entry) => entry.level === level);

const describedItems = (entries) =>
  entries
    .map((entry) => `### ${entry.title}\n\n**Description**: ${entry.body} ${citation(entry)}`.trim())
    .join('\n\n');

const breakingItems = (entries) =>
  entries
    .map((entry) =>
      [
        `### ${entry.title}`,
        `**What changed**: ${entry.body} ${citation(entry)}`.trim(),
        `**What breaks**: ${TODO('describe the exact scenarios that stop working')}`,
        `**Required actions**:`,
        `- ${TODO('the steps a consumer has to take')}`,
        `**Code example**:`,
        '```\n' + TODO('a migration example, or delete this block') + '\n```',
      ].join('\n\n'),
    )
    .join('\n\n');

/**
 * Patch entries indexed by the PR that merged them. A changeset carries no fix/feature
 * distinction, so this is the same work **Improvements** describes in prose — the v9
 * template wants both, and `3.0.0.md` lists PR-38 in each.
 */
const fixedDefects = (entries) => {
  const fixes = itemsFor(entries, 'patch');
  if (fixes.length === 0) return 'None.';
  const rows = fixes.map(
    ({ pr, title }) => `| ${pr ? `PR-${pr}` : TODO('defect number')} | ${title}. |`,
  );
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

const derive = (version, entries, packages) => {
  const releaseType = entries.length
    ? entries.reduce((a, e) => (BUMP_RANK[e.level] > BUMP_RANK[a] ? e.level : a), 'patch')
    : TODO('no CHANGELOG entries found — state the release type');
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
      'Read from the package manifests and the CI environment at this release: these are build pins — not QA-verified.',
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
    entries.length
      ? entries.map((e) => `- ${e.title} ${citation(e)}`.trim() + '.').join('\n')
      : TODO('no CHANGELOG entries found — list what changed'),
  );

  const features = itemsFor(entries, 'minor');
  const improvements = itemsFor(entries, 'patch');
  const breaking = itemsFor(entries, 'major');

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
    [`The following defects were fixed in ${version}.`, '', fixedDefects(entries)].join('\n'),
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

const nonTableProse = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => !line.trim().startsWith('|'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * TEMPLATE.md carries its guidance in HTML comments so that copying it verbatim cannot
 * publish "Only the rows the repository cannot derive…" as release-note prose.
 */
const stripGuidance = (markdown) => markdown.replace(/<!--[\s\S]*?-->/g, '').trim();

const applyOverlay = (sections, overlay, source) => {
  for (const [heading, raw] of splitSections(overlay)) {
    if (!SECTION_ORDER.includes(heading)) {
      warn(`${source}: "## ${heading}" is not a release-note section — ignored`);
      continue;
    }
    const content = stripGuidance(raw);
    if (!content) continue;
    if (heading === 'Tested-with versions') {
      // The generated prose is a caveat about where the table's versions came from, so a
      // row merge keeps it and appends whatever the overlay adds below.
      const generated = sections.get(heading);
      const merged = new Map([...parseTable(generated), ...parseTable(content)]);
      sections.set(
        heading,
        [renderTable(merged), nonTableProse(generated), nonTableProse(content)]
          .filter(Boolean)
          .join('\n\n'),
      );
    } else if (LABELLED_SECTIONS.has(heading)) {
      const merged = new Map([...parseLabelled(sections.get(heading)), ...parseLabelled(content)]);
      sections.set(heading, [...merged].map(([label, value]) => `- **${label}**: ${value}`).join('\n'));
    } else {
      sections.set(heading, content);
    }
  }
};

// -------------------------------------------------------------------- main

const packages = manifests();
const core = packages.find((manifest) => manifest.name === '@midnight-ntwrk/compact-js');
const version = flag('version') ?? core.version;
const entries = collectEntries(version, packages);
const sections = derive(version, entries, packages);

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
// A note is edited after it is generated — that is what the TODO markers are for — so
// replacing one is always deliberate. Pass --out to preview without touching it.
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
  `release notes: ${outPath} — ${entries.length} entr(ies), ` +
    `${todos} owner TODO(s), ${warnings.length} warning(s)`,
);

const reportPath = flag('report');
if (reportPath) {
  writeFileSync(
    resolve(repoRoot, reportPath),
    JSON.stringify(
      {
        version,
        entries: entries.map(({ title, level, pr }) => ({ title, level, pr })),
        todos,
        warnings,
      },
      null,
      2,
    ) + '\n',
  );
}

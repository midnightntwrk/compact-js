# Plan — auto-generated release notes on manual CD

**Status:** proposed, not implemented
**Date:** 2026-11-04
**Target look:** [shieldedtech/agent-rules#71](https://github.com/shieldedtech/agent-rules/pull/71) —
Keep a Changelog sections, each entry a bolded claim followed by the consequence for a consumer.

## 1. Why

The CD workflow is manual (`workflow_dispatch`) and already creates a GitHub Release. The notes in
it are wrong, and three separate faults produce that:

| Where | Fault |
| --- | --- |
| `.github/actions/create-package-artifacts/action.yaml` | Runs `yarn changelog` per package. **No package defines a `changelog` script.** The `\|\| true` swallows the failure, so no per-package `CHANGELOG.md` is ever written — none of the three exists. |
| `generate-changelog.js` | Matches `^([a-z]+)\/(.*)` — a *slash*. Commits here are conventional (`feat: …`), so nothing ever matches and every commit is dropped. The file is also referenced by nothing: no script, no workflow. |
| `.github/workflows/cd.yaml` → *Extract changelog* | `sed`s the top section out of the root `CHANGELOG.md`. That file's newest entry is `2.5.5-rc.1 (2026-06-19)` and its bodies are bare commit subjects from a *different* repo's history (`midnight-ntwrk/artifacts` links). Today a release of 3.0.0 would be announced with June's text. |

Meanwhile the prose the notes should contain **already exists, already reviewed**, in
`.changeset/*.md` — written in precisely the target style. `.changeset/compact-runtime-0-21.md`
names the consequence (`recompile them with compactc 0.36`), not the commit. Three such files are
pending and no release has ever consumed one.

So this is not "write a note generator". It is: point the release at the prose the repo is already
producing, and render it in the agreed shape.

## 2. Decisions taken

| Question | Decision |
| --- | --- |
| Source of prose | **Changesets.** Hand-written at PR time, rendered at release time. Deterministic, reviewed with the change that caused it, no API key in CD. |
| Added / Changed / Removed / Fixed | **Explicit tag in the changeset body.** A changeset records only a semver bump; the bump does not imply a section (`ledger-v9-rc-7` is a `patch` but a *Changed*; `drop-commonjs-build` is a `major` but a *Removed*). |
| Release granularity | **One aggregate release**, `compact-js-v<version>`, as today. Keeps the existing tag scheme and matches how compact-js is announced as a single Midnight component. |
| Version number ownership | **`version.json` keeps it** (see §7). This plan changes notes only. |

## 3. Target output

CD produces one block, used verbatim as the GitHub Release body and prepended to the root
`CHANGELOG.md`:

```markdown
## [3.0.0] — 2026-11-04

### Changed

- **Ledger 9 now pairs with compact-runtime 0.21 (compactc 0.36).** The ledger 9 era now pairs
  with runtime line `0.21`, still over onchain-runtime-v4, so `Ledger.era.runtime` and
  `CompactRuntime.line` on the unsuffixed and `/v9` entries read `'0.21'`. Contracts compiled by
  compactc 0.35 or earlier expect runtime 0.20 and fail its version check on import; recompile
  them with compactc 0.36. … ([#37](https://github.com/midnightntwrk/compact-js/pull/37))
- **Ledger 9 builds against `@midnightntwrk/ledger-v9` `1.0.0`**, so transcripts are
  partitioned with the cost model of midnight-node `2.1.100-rc.4`, and calls that overwrite
  existing ledger state no longer fail its gas-budget check.
  ([#38](https://github.com/midnightntwrk/compact-js/pull/38))

### Removed

- **The CommonJS build.** The packages are now published as ESM only: the `build-cjs` step and its
  `tsconfig.cjs.json` are gone … Consumers still on `require` should switch to an ESM `import`.
  ([#21](https://github.com/midnightntwrk/compact-js/pull/21))

**Packages:** `@midnight-ntwrk/compact-js`, `@midnight-ntwrk/compact-js-node`,
`@midnight-ntwrk/compact-js-command` — all `3.0.0`.
```

Rules the renderer enforces:

- Only non-empty sections are emitted, in Keep a Changelog order:
  **Added, Changed, Deprecated, Removed, Fixed, Security**.
- An entry whose changeset names all three packages carries no package annotation. One that names
  a subset is suffixed `(compact-js-command)`.
- Identical bodies are emitted once. Every existing changeset repeats one body across all three
  packages, so without this the notes triple.
- Each entry is followed by its PR link, resolved from the commit that introduced the changeset
  file.

## 4. The changeset convention

A changeset body's first token becomes the section:

```markdown
---
'@midnight-ntwrk/compact-js': major
'@midnight-ntwrk/compact-js-node': patch
'@midnight-ntwrk/compact-js-command': patch
---

[removed] **The CommonJS build.** The packages are now published as ESM only: …
```

Accepted tags: `[added] [changed] [deprecated] [removed] [fixed] [security]`. The renderer strips
the tag and the following whitespace; it never appears in output.

This is the only authoring change. The prose convention already in use — lead with a bolded claim,
then the consequence for someone consuming the package — stays as it is and gets written into
`.changeset/README.md`.

## 5. Work items

### 5.1 `scripts/release-notes.mjs` (new, the core of the change)

A single ESM script, no new dependencies. Run with `--dry-run` it prints the notes and touches
nothing; that is how an author previews before cutting.

1. Read every `.changeset/*.md` except `README.md`, parsing frontmatter (package → bump) and body.
2. Extract and strip the leading `[tag]`. **An untagged changeset is a hard error** naming the file
   — not a silent default. The release stops rather than mis-filing an entry.
3. For each file, resolve its introducing commit
   (`git log --diff-filter=A --format=%H -1 -- <file>`), then its PR via
   `gh api /repos/{owner}/{repo}/commits/{sha}/pulls`. No PR found → omit the link rather than
   fail; a changeset can land by direct push.
4. Group by section, dedupe by body text, annotate partial package sets, sort within a section by
   bump severity (major → minor → patch) so breaking entries lead.
5. Emit `## [<version>] — <ISO date>` + sections + the packages footer.
6. Unless `--dry-run`: write the block to a path given by `--out` (CD passes a temp file, for the
   release body), prepend it to the root `CHANGELOG.md`, and `git rm` the consumed changeset files.

Guards, each failing loudly:

- **Zero changesets** → exit non-zero. A release with nothing to say is a mistake, not an empty
  section.
- **An untagged or unknown-tagged changeset** → exit non-zero, naming the file and the accepted
  tags.
- **A frontmatter package name not in the workspace** → exit non-zero. Catches typos that would
  otherwise silently drop an entry's annotation.

### 5.2 `scripts/lint-changesets.mjs` (new) + CI wiring

Runs on every PR, in `ci.yaml`, over `.changeset/*.md` only. Fails if a changeset has no section
tag or an unknown one. This is what makes §5.1's hard error cheap: the author learns at PR time,
not when someone is mid-release. It deliberately does **not** require a changeset to exist — many
PRs here are chores.

### 5.3 `.github/actions/create-package-artifacts/action.yaml` (fix)

Delete the *Generate CHANGELOGs from commits* step. It calls a script that does not exist and
hides the failure. Nothing replaces it inside this action — notes are a release-job concern, not a
packaging one.

### 5.4 `.github/workflows/cd.yaml` (rewrite the `release` job)

Replace *Extract changelog* (the `sed` over a five-month-old file) with:

```yaml
- name: Generate release notes
  id: notes
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    VERSION: ${{ needs.publish.outputs.base_version }}
  run: node scripts/release-notes.mjs --version "$VERSION" --out "$RUNNER_TEMP/notes.md"

- name: Create GitHub Release
  run: gh release create "compact-js-v${BASE_VERSION}" \
         --title "compact-js v${BASE_VERSION}" \
         --notes-file "$RUNNER_TEMP/notes.md" --repo "$REPO"
```

Three incidental fixes while in there:

- `--notes-file` replaces `--notes "$NOTES"`. The current step flattens the body to `\n`-escaped
  text through `$GITHUB_OUTPUT`, which cannot carry multi-line markdown intact.
- The `publish` job writes `base_version` to `$GITHUB_OUTPUT` but does not declare it in
  `outputs:`, so it is unreachable. Both `release` steps recompute it with the same `sed`. Declare
  it and use it.
- The checkout in `release` needs `fetch-depth: 0`; step 3 of §5.1 walks history.

### 5.5 Persisting the notes — a release PR

The runner's `CHANGELOG.md` edit and the changeset deletions have to reach `main`, or the next
release re-emits the same entries. `main` is protected and `docs/releasing.md` is explicit that CD
does not push to it.

So a final CD step opens a PR — `chore: release notes for compact-js v<version>` — carrying the
`CHANGELOG.md` prepend and the `git rm` of the consumed changesets, labelled `bot:ai-assisted` per
the Shielded engineering rules. The GitHub Release does not wait on it; the PR is the bookkeeping.

**Guard:** the `release` job fails early if a release-notes PR is already open. Otherwise a second
CD run before the first PR merges sees the same unconsumed changesets and double-publishes the
entries.

### 5.6 Docs

- `.changeset/README.md` — the section tags, the prose convention, a worked example.
- `docs/releasing.md` — its closing line ("notes come from the top section of `CHANGELOG.md`") is
  now wrong in both direction and source. Replace with: notes are rendered from the pending
  changesets, `CHANGELOG.md` is the *output*, and a release with no changesets is refused.
- `CONTRIBUTING.md` — currently says nothing about changesets at all. Add: a user-visible change
  needs a tagged changeset.

### 5.7 Delete `generate-changelog.js`

Dead (referenced by nothing), broken (wrong regex), and reading a `version.json` field the new
path does not use. Drop `conventional-changelog-cli` from the root `devDependencies` with it —
nothing else invokes it.

### 5.8 Backfill the three pending changesets

Add `[changed]` to `compact-runtime-0-21.md` and `ledger-v9-rc-7.md`, `[removed]` to
`drop-commonjs-build.md`. Their prose needs no edit — it is already the target style, which is the
evidence the convention fits how this repo writes.

## 6. Validation

1. `node scripts/release-notes.mjs --version 3.0.0 --dry-run` on the current tree. Expect the §3
   block: two Changed entries, one Removed, each deduped from three package listings to one.
2. Flip a tag to `[nonsense]` and to nothing; confirm each exits non-zero naming the file.
3. `git stash` the changesets; confirm the empty-release guard fires.
4. Run CD from a throwaway branch with the publish steps skipped (they already gate on
   `releaseBranches`) and read the draft release body end to end.

## 7. Deliberately out of scope

**Changesets does not take over versioning.** `version.json` stays the single source of truth, as
`docs/releasing.md` documents and `create-package-artifacts` implements. This plan uses changesets
purely as a notes database — it never runs `changeset version`, which is why §5.1 renders the
markdown itself instead of configuring a custom `@changesets/changelog-*` formatter.

The reason is blast radius: `changeset version` would compute the number from the bump types,
which would have to agree with `version.json`'s `preRelease`/`tag` and with the commit-height
`-alpha.<height>` behaviour that changesets has no equivalent for. Rewiring that mid-RC is a
separate change with its own risk, and it is not what was asked for.

Two consequences to accept, both acceptable:

- No per-package `CHANGELOG.md`. There are none today either, and the aggregate release is the
  chosen granularity.
- PR links are resolved by the script rather than by `@changesets/changelog-github`.

**Known drift to fix separately:** `.changeset/pre.json` records `initialVersions` of `2.5.5-rc.8`
while `version.json` says `3.0.0-rc.6`. Harmless while `changeset version` never runs — and
exactly the landmine that a later versioning migration would step on. Worth a one-line issue now.

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Author forgets the section tag | §5.2 lints it on every PR; §5.1 refuses the release. Fails at PR time, loudly. |
| Two CD runs before the release PR merges | §5.5's open-PR guard. |
| A changeset's prose is poor, so the note is poor | Unfixable by tooling, and the honest trade for determinism. Review changesets as code; the three on disk show the bar. |
| PR-link lookup rate-limited or offline | Links are optional; the entry renders without one. |
| `main` protection blocks even the bot PR | The release itself does not depend on the merge. Worst case the PR sits until someone approves it, and the guard prevents a second release in the meantime. |

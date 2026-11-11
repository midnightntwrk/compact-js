# Release notes

One file per release, named for its version — `3.0.0.md` is the note for compact-js 3.0.0.

```
docs/release-notes/
├── README.md          this file
├── 3.0.0.md           generated notes, one per release
└── overlays/
    ├── TEMPLATE.md    copy this to start an overlay
    └── <version>.md   the human-written half of a release's note
```

The **canonical, public** release note is the **GitHub Release** — these files are the
reviewable copy that lives with the code. The **CD** workflow generates the note on every
run and puts it in three places:

- the **GitHub Release** body,
- `docs/release-notes/<version>.md`, committed by the release job,
- a **run artifact**, so it is reviewable from the run page even if a later step fails.

The generated note follows the v9 component release-note template — the structure
[`3.0.0.md`](3.0.0.md) follows.

## Where the content comes from

| Layer | Source | Carries |
| --- | --- | --- |
| derived | `.changeset/*.md`, workspace manifests, `.github/env/global.env`, git | release type, what changed, breaking changes, features, improvements, tested-with pins, artifacts, fixed defects |
| base | `overlays/_base.md` (optional) | anything stable across releases |
| per-release | `overlays/<version>.md` (optional) | this release's human-only fields |

Each layer overrides the one above it. A field no layer supplies is emitted as a
`TODO (owner):` marker, never dropped — the note is always structurally complete, and the
count of remaining TODOs is printed in the CD job summary.

## Changesets are the content source, not the version source

`version.json` remains the single source of truth for the published version — see
[releasing.md](../releasing.md). Changesets only supply release-note content, and the
generator never consumes or rewrites them:

| Changeset bump | Section |
| --- | --- |
| `major` | Breaking changes |
| `minor` | New features |
| `patch` | Improvements |

The highest bump across the release's changesets becomes the **Release type**. Every changeset
also contributes a **What changed** bullet, cited to the PR that merged it.

A changeset belongs to this release when it was added to `.changeset/` after the previous
`compact-js-v*` tag, so re-running the generator is idempotent and no pruning commit is needed.
One changeset becomes one item — a changeset describing several distinct breaking changes
produces one item covering all of them, and the overlay is where it gets split.

Write the changeset so its **first sentence names the change**: that sentence becomes the item's
heading. Sentences over 80 characters are clipped at a clause boundary, with a CD warning.

## Writing an overlay

Copy [`overlays/TEMPLATE.md`](overlays/TEMPLATE.md) to `overlays/<version>.md` and fill in what
applies. Commit it in the release PR, so the human-written half of the note is reviewed like
any other change. Sections you omit keep their generated content.

Three sections merge rather than replace, so an overlay cannot silently freeze a derived value:
**Metadata**, **Deployment information** and **Links and references** merge by `- **Label**:`,
and **Tested-with versions** merges by the table's first column.

## Running it locally

```sh
node scripts/generate-release-notes.mjs --out /tmp/note.md
```

It reads `version.json` for the version and needs no install — only `node:*` built-ins. Add
`--version X.Y.Z` to target a different release, `--since <ref>` to override the previous-release
anchor, and `--report <path>` for the warnings as JSON. `--shasums` reads each tarball's
`dist.shasum` from the registry, so it only works once the packages are published.

Without `--out` it writes `docs/release-notes/<version>.md`, and it refuses to replace a note
that already exists — a published one may have been hand-edited since. Pass `--force` to
replace it anyway, as CD does.

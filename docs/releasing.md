# Releasing

Packages are published from the **CD** workflow (`.github/workflows/cd.yaml`),
which is **manual only** (`workflow_dispatch`). Merging to `main` does **not**
publish — that only runs CI (build/test).

## How to cut a release

1. Merge your change to `main`.
2. Actions → **CD** → **Run workflow** → set *Use workflow from* = `main`.

The job only publishes when run from a branch listed in `version.json` →
`releaseBranches` (`main` or `release/compact-js/.*`). Run from any other branch
and the publish steps are skipped.

## Versioning — `version.json`

`version.json` is the **single source of truth** for the published version:

| field             | meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `version`         | base semver, e.g. `3.0.0`                            |
| `preRelease`      | suffix (see below)                                   |
| `tag`             | npm dist-tag used in `npm publish --tag <tag>`       |
| `releaseBranches` | regexes of branches allowed to publish               |

The published version is derived from `version` + `preRelease`:

| `preRelease` | publishes              | use for                 |
| ------------ | ---------------------- | ----------------------- |
| `""` (empty) | `3.0.0`                | a stable release        |
| `-rc.1`      | `3.0.0-rc.1` (exact)   | a specific pre-release  |
| `-alpha`     | `3.0.0-alpha.<height>` | continuous pre-releases |

`<height>` = number of commits since `version.json` last changed.

**You only edit `version.json`.** The CD job bumps every workspace `package.json`
to the computed version **on the runner only** (so the packed tarball is correct)
— this commit is **not** pushed back to `main`, so branch protection is unaffected.

## Git tags

A `compact-js-v<version>` git tag is pushed after a successful publish, along
with a GitHub release.

## Release notes

The release body is **generated** by `scripts/generate-release-notes.mjs`, in the
v9 component release-note format. It is also committed to
`docs/release-notes/<version>.md` and uploaded as a run artifact.

Content comes from the `.changeset/*.md` entries added since the previous tag —
`major` → Breaking changes, `minor` → New features, `patch` → Improvements — plus
the workspace manifests, `.github/env/global.env` and git history. Changesets are
a **content** source only; they do not affect the published version, which stays
`version.json`'s to decide, and the generator never consumes them.

Fields no automation can know (the summary, known issues, the proof-server / node
/ indexer rows) come from an optional `docs/release-notes/overlays/<version>.md`
written during the release PR. Without one the note still generates, carrying
`TODO (owner):` markers in their place; CD prints how many remain in the job
summary.

See [release-notes/README.md](release-notes/README.md) for the full layering rules
and [release-notes/overlays/TEMPLATE.md](release-notes/overlays/TEMPLATE.md) to
start an overlay.

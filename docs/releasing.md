# Releasing

Versions come from [Changesets](https://github.com/changesets/changesets). Packages are
published from the **CD** workflow (`.github/workflows/cd.yaml`), which is **manual only**
(`workflow_dispatch`). Merging to `main` does **not** publish — that only runs CI.

CD never writes to this repository: it builds, publishes the tarballs and creates the
GitHub Release. Everything that changes a file — the version bump, the CHANGELOGs, the
release note — happens in a **release PR** that goes through normal review.

## 1. Describe the change (every PR)

```bash
yarn changeset
```

Pick the semver bump per package, write the summary a consumer will read, and commit the
generated `.changeset/*.md` file with your change.

> A release with no changesets is a no-op — `changeset version` has nothing to apply, so
> nothing is published. If a change should ship, it needs a changeset.

## 2. Prepare the release (release PR)

On a branch off `main`:

```bash
yarn release:prepare
```

That runs `changeset version` — which bumps every workspace `package.json`, writes each
package's `CHANGELOG.md` and deletes the changesets it consumed — and then generates
`docs/release-notes/<version>.md` from those CHANGELOGs.

`changeset version` needs `GITHUB_TOKEN` set to a token with `read:user` and `repo:status`;
without it `@changesets/changelog-github` cannot resolve PR links and the command fails.

The note carries `TODO (owner):` markers for every field no automation can know — the
summary, known issues, and the proof-server / node / indexer rows. Fill them in by writing
`docs/release-notes/overlays/<version>.md` (start from
[`overlays/TEMPLATE.md`](release-notes/overlays/TEMPLATE.md)) and re-running with `--force`,
or edit the note directly. Open the PR, get it reviewed, merge it.

## 3. Publish

Actions → **CD** → **Run workflow** → *Use workflow from* = `main`.

CD reads the version from `compact-js/package.json` and the body from
`docs/release-notes/<version>.md`. It fails if that note is missing, and warns if it still
carries TODO markers. The npm dist-tag follows the version: `3.0.2` → `latest`,
`3.0.2-rc.1` → `rc`, `3.1.0-alpha.4` → `alpha`.

Only branches matching the `release-branches` input of
`.github/actions/create-package-artifacts` (`main` or `release/compact-js/.*`) produce
artifacts; CD run from anywhere else skips the publish steps.

## Release candidates

```bash
yarn changeset pre enter rc   # in its own PR
```

While pre mode is on, every `release:prepare` yields `X.Y.Z-rc.N`. Graduate the line with
`yarn changeset pre exit` in its own PR, then run `release:prepare` once more for the
stable version.

## Git tags and releases

`gh release create` creates the `compact-js-v<version>` tag server-side from the released
commit, so there is no tag push. Re-dispatching CD for a version that already has a Release
updates its notes instead of failing.

## Known limitation

The **Artifacts** section lists each package without its npm `dist.shasum`, because the
note is written before the packages are published. To add them after a release, re-run
`node scripts/generate-release-notes.mjs --shasums --force` and open a follow-up PR.

`CHANGELOG.md` at the repository root is frozen history from the pre-Changesets flow; the
per-package `CHANGELOG.md` files are the live ones.

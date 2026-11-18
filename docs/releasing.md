# Releasing

Versions, changelogs and GitHub Releases all come from
[Changesets](https://github.com/changesets/changesets). **CD** (`.github/workflows/cd.yaml`)
runs on every push to `main` and does one of two things:

- **changesets are pending** — it opens or updates the **Version Packages** pull request
  and publishes nothing.
- **no changesets remain** (the Version Packages PR has just merged) — it builds, publishes
  to **GitHub Packages**, tags and creates the GitHub Releases.

So the release is cut by *merging a pull request*, not by dispatching a workflow. Reaching
**npmjs** is a separate, manual step in another repository — see step 4.

## 1. Describe the change (every PR)

```bash
yarn changeset
```

Pick the semver bump, write the summary a consumer will read, and commit the generated
`.changeset/*.md` file with your change. `check-changeset.yml` fails a PR that has none.

The summary is the release note: it is what appears under **Minor Changes** / **Major
Changes** in the package CHANGELOG and in the body of the GitHub Release. Write it for
someone upgrading, not for the reviewer.

The three packages are a `fixed` group, so they always publish at the same version — a bump
to any of them bumps all three.

## 2. Merge the Version Packages PR

CD keeps that PR up to date. It runs `yarn release:prepare`, which is
`changeset version` plus a lockfile refresh — bumping every workspace `package.json`,
writing each package's `CHANGELOG.md` and deleting the changesets it consumed.

Review it like any other PR. Edits to the CHANGELOG entries land in the published Release
body, so this is where release-note wording gets fixed.

## 3. Publish to GitHub Packages

Merging that PR leaves `main` with no changesets, which is the signal CD publishes on. It
runs CI, then `changeset publish`:

- publishes each package, skipping any version already on the registry, so a re-run is a
  no-op rather than a failure;
- pushes a `@midnight-ntwrk/<package>@<version>` tag per package;
- creates one GitHub Release per package, with the body taken from its `CHANGELOG.md`.
  A version carrying a prerelease part is flagged as a prerelease, so an `rc` never
  becomes the repository's "Latest" release.

CD then adds one aggregate **`compact-js-v<version>`** tag and a matching GitHub Release.
The three packages are a `fixed` group and always share a version, so this is the release
as a whole — the form the QA test evidence and the component release note cite, and the
one to link when a single URL is wanted. It is in addition to the per-package tags and
Releases, not instead of them. Its body is the same `compact-js/CHANGELOG.md` section, and
re-running leaves the tag in place and refreshes the notes.

The npm dist-tag follows the version: a plain `3.0.3` publishes under `latest`, and while
pre mode is on, `3.0.3-rc.1` publishes under `rc`.

## 4. Mirror to npmjs

**CD stops at GitHub Packages.** Nothing reaches npmjs until someone dispatches
[`push-npm-package.yml`](https://github.com/midnight-ntwrk/artifacts/actions/workflows/push-npm-package.yml)
in `midnight-ntwrk/artifacts`, picking the library and typing the version. Run it once per
package — `compact-js`, `compact-js-node`, `compact-js-command`.

That workflow packs the tarball we published here and re-publishes it to npmjs, so the two
registries carry byte-identical artifacts. It derives the npmjs dist-tag from the version
suffix itself and will move `latest` onto the highest-priority prerelease when a package
has no stable version yet — leave `use_legacy_behavior` at `false` so that logic runs.

Because this dispatch is manual, it is the gate on anything becoming public: CD needs no
approval step of its own.

> The mirror hard-codes the `@midnight-ntwrk` scope, in both the package lookup and the
> tarball filename it expects. It has to be taught `@midnightntwrk` before these packages
> can be renamed — see [#20](https://github.com/midnightntwrk/compact-js/issues/20).

## Release candidates

```bash
yarn changeset pre enter rc   # in its own PR
```

While pre mode is on, every Version Packages PR yields `X.Y.Z-rc.N`. Graduate the line with
`yarn changeset pre exit` in its own PR; the next Version Packages PR then carries the
stable version.

## Notes

- The per-package `CHANGELOG.md` files do not exist yet — the first release creates them.
  `CHANGELOG.md` at the repository root is frozen history from the pre-Changesets flow.
- CD only runs on `main`. Maintenance releases from a `release/compact-js/*` branch are not
  supported; a 2.x patch would otherwise be able to take the `latest` dist-tag.
- Publishing targets **GitHub Packages** under the `@midnight-ntwrk` scope, using the
  long-lived `MIDNIGHTCI_PACKAGES_WRITE` token. The scope is being retired org-wide in
  favour of `@midnightntwrk`; that migration, and the matching change to the npmjs mirror,
  is [#20](https://github.com/midnightntwrk/compact-js/issues/20).

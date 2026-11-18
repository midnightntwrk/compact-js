# Releasing

Versions, changelogs and GitHub Releases all come from
[Changesets](https://github.com/changesets/changesets). **CD** (`.github/workflows/cd.yaml`)
runs on every push to `main` and does one of two things:

- **changesets are pending** — it opens or updates the **Version Packages** pull request
  and publishes nothing.
- **no changesets remain** (the Version Packages PR has just merged) — it builds, publishes
  to **npmjs**, tags and creates the GitHub Releases, behind a reviewer gate.

So the release is cut by *merging a pull request*, not by dispatching a workflow.

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

## 3. Approve the publish

Merging that PR leaves `main` with no changesets, which is the signal CD publishes on. It
runs CI, then waits on the **`npm-publish-stable`** environment. Approve it and
`changeset publish`:

- publishes each package **to npmjs** under `@midnightntwrk`, skipping any version already
  on the registry, so a re-run is a no-op rather than a failure;
- pushes a `@midnightntwrk/<package>@<version>` tag per package;
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

## How publishing is authenticated

CD publishes to npmjs with **Trusted Publishing**: GitHub mints a short-lived OIDC token
and npm exchanges it for publish rights. There is no npm token anywhere in the workflow,
and each package gets a SLSA provenance attestation.

That means three things have to agree exactly, or the exchange fails:

| | |
| --- | --- |
| Repository | `midnightntwrk/compact-js` |
| Workflow filename | `cd.yaml` |
| Environment | `npm-publish-stable` |

A mismatch fails with `403 OIDC token exchange failed`; a missing or expired publisher
config fails with `404`. Two further traps: Trusted Publishing needs **npm ≥ 11.5.1** (CD
installs it explicitly, because `.nvmrc`'s bundled npm is older and simply never attempts
OIDC), and **no `NODE_AUTH_TOKEN` or `always-auth` may be set on the publish step** — a
token in the environment shadows OIDC, and `always-auth` writes an empty `_authToken` line
into `~/.npmrc`.

Installing is separate and still uses a token: upstream `@midnight-ntwrk` dependencies
come from GitHub Packages, which rejects anonymous reads
([#56](https://github.com/midnightntwrk/compact-js/issues/56)).

> These packages used to reach npmjs by a manual dispatch of `push-npm-package.yml` in
> `midnight-ntwrk/artifacts`, which re-published our GitHub Packages tarballs. That path is
> no longer used, and should not be dispatched for `compact-js*`.

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
- The packages are `@midnightntwrk/*`. They were `@midnight-ntwrk/*` up to and including
  `3.0.2`, which is where that scope stops: those versions stay on npmjs as history and
  receive no further releases.

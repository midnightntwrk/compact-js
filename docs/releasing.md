# Releasing

Versions, changelogs and GitHub Releases all come from
[Changesets](https://github.com/changesets/changesets). **CD** (`.github/workflows/cd.yaml`)
runs on every push to `main`:

- it opens or updates the **Version Packages** pull request from whatever changesets are
  pending;
- and it publishes when `main`'s version is one npm has never seen — which is exactly what
  merging that pull request produces.

So the release is cut by *merging a pull request*, not by dispatching a workflow.

CD asks the registry rather than reading the push event. That means an unrelated merge is
never mistaken for a release, and a publish that failed half-way is finished by pushing
again rather than being stuck.

## 1. Describe the change (every PR)

```bash
yarn changeset
```

Pick the semver bump, write the summary a consumer will read, and commit the generated
`.changeset/*.md` file with your change.

`check-changeset.yml` enforces one rule: **a PR that changes a published package needs a
changeset.** A PR touching only docs, CI, `scripts/` or the repository root passes without
one. When a package did change but nothing changes for consumers — a test, a comment —
record that with `yarn changeset --empty`.

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

Merging that PR bumps `main` to a version npm has never seen, which is the signal CD
publishes on. It runs CI, then waits on the **`npm-publish-stable`** environment. The
publish ships the `dist/` directories that CI job built for the same commit rather than
rebuilding them, so what reaches npm is what the tests ran against. Approve it and
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
pre mode is on, `3.0.3-rc.1` publishes under `rc`. One exception matters while the
`@midnightntwrk` names are still new: a package npm has never seen takes `latest` on its
**first** publish whatever the version, and Changesets agrees with it — a package it finds
no regular release for is published to `latest` even in pre mode. Nothing downstream can
repair that, because OIDC cannot move a dist-tag, so CD refuses to publish a prerelease
under a name that has no stable version on npm rather than reporting it afterwards.

## How publishing is authenticated

CD publishes to npmjs with **Trusted Publishing**: GitHub mints a short-lived OIDC token
and npm exchanges it for publish rights. There is no npm *publish* token anywhere in the
workflow, and each package gets a SLSA provenance attestation.

That means three things have to agree exactly, or the exchange fails:

| | |
| --- | --- |
| Repository | `midnightntwrk/compact-js` |
| Workflow filename | `cd.yaml` |
| Environment | `npm-publish-stable` |

A mismatch fails with `403 OIDC token exchange failed`; a missing or expired publisher
config fails with `404`. One further trap: `setup-node` with a `registry-url` **always**
writes an `_authToken=${NODE_AUTH_TOKEN}` line into `~/.npmrc`, so the rule is not to keep
that line out of the file but to keep a **real token out of `NODE_AUTH_TOKEN`** — one in
the environment shadows OIDC. Trusted Publishing also needs npm ≥ 11.5.1, which the Node
pinned in `.nvmrc` already bundles.

Installing is separate and needs no token: every dependency, upstream `@midnight-ntwrk`
ones included, resolves anonymously from npmjs
([#56](https://github.com/midnightntwrk/compact-js/issues/56)).

Naming an `environment:` is not by itself a human gate: GitHub creates a missing
environment on first use with **no** protection rules, so configuring the Trusted
Publishers before the environment exists would let the next push publish unreviewed. The
publish job's first step therefore refuses to run unless `npm-publish-stable` has required
reviewers.

## Two prerelease channels

They differ in what the version is *on the way to*.

| | rc | canary |
| --- | --- | --- |
| Version | `5.0.0-rc.0` — becomes `5.0.0` | `0.0.0-canary-<sha>` — becomes nothing |
| dist-tag | `rc` | `canary`, or whatever was dispatched |
| Changelog, tags, Releases | yes, as for a stable release | none |
| Cut by | merging a Version Packages PR | dispatching CD on a branch |
| Afterwards | graduated to the stable version | discarded |

Neither is reachable from a stable range, so a consumer on `^4.0.0` resolves to neither.

### Release candidates

```bash
yarn changeset pre enter rc   # in its own PR
```

While pre mode is on, every Version Packages PR yields `X.Y.Z-rc.N` and CD publishes it
under the `rc` dist-tag, leaving `latest` where it is. Graduate the line with
`yarn changeset pre exit` in its own PR; the next Version Packages PR then carries the
stable version, which is built from *every* changeset the line accumulated — pre mode keeps
the changeset files rather than consuming them, and `pre.json` records which have been
applied so far. That is also how CD tells an rc that is ready to publish from one that is
still waiting on a version bump.

### Canaries

Dispatch **CD** from the branch, with a dist-tag (`canary` by default):

```bash
gh workflow run cd.yaml --ref my-branch -f dist-tag=canary
```

That builds and tests the branch as `0.0.0-<tag>-<commit sha>` and publishes it under that
dist-tag. The `0.0.0` base is deliberate: it keeps a canary out of every range, which is
also why a canary is never promoted — the change lands on `main` and is released normally.
Install one by exact version, or by tag:

```bash
npm install @midnightntwrk/compact-js@canary
```

A canary needs a pending changeset to version, and it goes through the same
`npm-publish-stable` reviewer gate as a release, because it reaches the same registry. It
writes no changelog entry, no git tag and no GitHub Release.

## Notes

- A package's `CHANGELOG.md` is written by the first `changeset version` that bumps it.
  `CHANGELOG.md` at the repository root is frozen history from the pre-Changesets flow.
- CD *releases* only from `main`. Maintenance releases from a `release/compact-js/*` branch
  are not supported; a 2.x patch would otherwise be able to take the `latest` dist-tag. A
  canary is the one thing CD will publish from another branch, and it is version-fenced out
  of `latest` rather than trusted not to take it.
- The canary jobs live in `cd.yaml` rather than a workflow of their own because npm binds a
  Trusted Publisher to a workflow **filename** — a `canary.yaml` would need three more
  publisher entries before it could publish at all.
- The packages are `@midnightntwrk/*`. They were `@midnight-ntwrk/*` up to and including
  `3.0.2`, which is where that scope stops: those versions stay on npmjs as history, are
  deprecated in favour of the new names, and receive no further releases.
- **We do not mirror to the old scope**, which is where this differs from midnight-wallet —
  its `cd.yml` still runs `publish-alias.mjs` after every publish because it kept both
  scopes live. We are retiring the dashed scope instead, so there is no alias step to port.

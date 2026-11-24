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
**first** publish whatever the version, so the first release under a new name must not be a
release candidate. Check `npm dist-tag ls` after it.

## The first publish of a new package name

**Trusted Publishing cannot make a package's first publish.** A trusted publisher is
attached to a package that already exists on the registry, so for a name npm has never
seen there is nothing to attach it to and nothing to exchange the OIDC token against. npm
answers the `PUT` with **404** — not 403, because it will not confirm that an unknown name
exists — which reads as if the release, rather than the authentication, were at fault.
This is [npm/cli#8544](https://github.com/npm/cli/issues/8544); npm has no equivalent of
PyPI's pending publishers.

That costs one token-authenticated publish per name, which CD makes itself. Nothing about
how a release is triggered changes: it is still the merge of the Version Packages PR, and
a publish that failed is still retried by re-running the job.

1. Put a granular access token with publish rights on the **`npm-publish-stable`**
   environment as **`NPM_TOKEN`**.
2. Re-run the publish job. CD asks the registry whether any of the three names is unknown
   to it and uses the token only for that, so the token path opens and closes on a
   registry fact rather than on anyone's say-so. Everything else is unchanged — same
   reviewer gate, same artifacts, same provenance.
3. Attach the trusted publishers. The run prints the three commands; each is
   `npm trust github <name> --file cd.yaml --repo midnightntwrk/compact-js --env npm-publish-stable --allow-publish -y`,
   run as an npm account with publish rights. CD cannot do this itself — npm takes the
   configuration only from an authenticated account, never from the OIDC identity it
   governs.
4. **Delete the `NPM_TOKEN` secret.** Every later release goes through OIDC, and a token
   left in that variable would shadow it.

This is a per-*name* cost, not a per-release one. It was paid for `@midnightntwrk/compact-js`,
`-node` and `-command` at 4.0.0, and is owed again only if a fourth package is ever added.
If a first publish is ever left to a laptop instead, CD will not tag it: once the registry
has the version, `assess` reports nothing to publish and the job never runs again.

## How publishing is authenticated

CD publishes to npmjs with **Trusted Publishing**: GitHub mints a short-lived OIDC token
and npm exchanges it for publish rights. Outside a new name's first publish there is no
npm *publish* token anywhere in the workflow, and each package gets a SLSA provenance
attestation.

That means three things have to agree exactly, or the exchange fails:

| | |
| --- | --- |
| Repository | `midnightntwrk/compact-js` |
| Workflow filename | `cd.yaml` |
| Environment | `npm-publish-stable` |

A mismatch fails with `403 OIDC token exchange failed`; a missing, expired or not-yet-made
publisher config fails with `404`. One further trap: `setup-node` with a `registry-url`
**always** writes an `_authToken=${NODE_AUTH_TOKEN}` line into `~/.npmrc`, so the rule is
not to keep that line out of the file but to keep a **real token out of `NODE_AUTH_TOKEN`**
— one in the environment shadows OIDC, which is why the workflow sets it only for a new
name's first publish and empty otherwise. Trusted Publishing also needs npm ≥ 11.5.1, which the
Node pinned in `.nvmrc` already bundles.

Installing is separate and needs no token: every dependency, upstream `@midnight-ntwrk`
ones included, resolves anonymously from npmjs
([#56](https://github.com/midnightntwrk/compact-js/issues/56)).

Naming an `environment:` is not by itself a human gate: GitHub creates a missing
environment on first use with **no** protection rules, so configuring the Trusted
Publishers before the environment exists would let the next push publish unreviewed. The
publish job's first step therefore refuses to run unless `npm-publish-stable` has required
reviewers.

## Release candidates

```bash
yarn changeset pre enter rc   # in its own PR
```

While pre mode is on, every Version Packages PR yields `X.Y.Z-rc.N`. Graduate the line with
`yarn changeset pre exit` in its own PR; the next Version Packages PR then carries the
stable version.

## Notes

- A package's `CHANGELOG.md` is written by the first `changeset version` that bumps it.
  `CHANGELOG.md` at the repository root is frozen history from the pre-Changesets flow.
- CD only runs on `main`. Maintenance releases from a `release/compact-js/*` branch are not
  supported; a 2.x patch would otherwise be able to take the `latest` dist-tag.
- The packages are `@midnightntwrk/*`. They were `@midnight-ntwrk/*` up to and including
  `3.0.2`, which is where that scope stops: those versions stay on npmjs as history and
  receive no further releases. Pointing them at the new names is a one-off done by hand,
  because deprecating is an account action and OIDC cannot make one:

  ```bash
  for p in compact-js compact-js-node compact-js-command; do
    npm deprecate "@midnight-ntwrk/$p@<=3.0.2" "moved to @midnightntwrk/$p"
  done
  ```

  The old scope's stale `rc` and `alpha` dist-tags (`3.0.1-rc.2`, `2.4.0-alpha.23`) can go
  the same way, with `npm dist-tag rm`.
- **We do not mirror to the old scope**, which is where this differs from midnight-wallet —
  its `cd.yml` still runs `publish-alias.mjs` after every publish because it kept both
  scopes live. We are retiring the dashed scope instead, so there is no alias step to port.

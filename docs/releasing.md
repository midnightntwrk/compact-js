# Releasing

Releases are driven by **Changesets**. The **CD** workflow
(`.github/workflows/cd.yaml`) runs on every push to `main` and decides what to do
from the changesets present: pending changesets produce a *Version Packages* pull
request, and merging that pull request publishes.

## How to cut a release

1. **Describe your change.** On your feature branch, run `yarn changeset`, pick
   the affected packages and bump types, and commit the generated
   `.changeset/*.md` file with your PR. A change that needs no release (docs, CI)
   needs no changeset.
2. **Merge to `main`.** CD opens or updates a **Version Packages** PR that applies
   every pending changeset: it bumps versions, rewrites each package's
   `CHANGELOG.md`, deletes the consumed changeset files and refreshes the lockfile.
   Nothing is published yet.
3. **Merge the Version Packages PR** when you want the release. CD now finds no
   changesets, sees versions that are not on the registry, builds, and pauses for
   approval on the `npm-publish-stable` environment.
4. **Approve the deployment.** The packages publish, then each gets a git tag and
   a GitHub release with its changelog entry.

`yarn changeset status` lists what is pending.

## Versioning

Versions come from the bump types in the changesets — you never hand-edit a
`package.json` version. Prerelease mode is recorded in `.changeset/pre.json`:

| mode | `changeset version` produces | dist-tag |
| ---- | ---------------------------- | -------- |
| pre mode, tag `rc` (current) | `3.0.0-rc.0`, `3.0.0-rc.1`, … | `rc` |
| normal | `3.0.0` | `latest` |

Enter and leave prerelease mode with `yarn changeset pre enter rc` and
`yarn changeset pre exit`, committing the `pre.json` change. Leaving pre mode and
running CD is what promotes a line of `rc` builds to `latest`.

## Git tags and releases

Each published package gets its own `<name>@<version>` tag and a GitHub release
whose notes are that version's section of the package's `CHANGELOG.md`. Only
packages actually published by that run are tagged, so re-running after a partial
failure never retags an earlier release. Versions containing a `-` are marked as
prereleases.

## Dist-tags

The dist-tag comes from the version being published: a `-rc.N` prerelease goes to
`rc`, `-alpha.N` to `alpha`, and a bare version to `latest`. Nothing configures it
separately, so it cannot disagree with the version.

## Where packages are published

All three packages publish to **npmjs** (`registry.npmjs.org`) using **npmjs
Trusted Publishing**: the publish job exchanges its GitHub OIDC token for a
short-lived npmjs credential, so no long-lived npm token exists anywhere in the
repo. Every published version carries a **provenance attestation**.

Upstream `@midnight-ntwrk` dependencies are still *installed* from GitHub
Packages — `.yarnrc.yml` keeps `npmRegistryServer` and CI keeps its
`MIDNIGHTCI_PACKAGES_WRITE` auth for that. Only publishing moved.

### Reviewer gate

The `publish` job runs in the `npm-publish-stable` GitHub Environment, which
requires a reviewer to approve the run. Build and test run first, so an approval
request means CI already passed.

A `check` job decides whether anything is unpublished *before* that gate, so
ordinary pushes to `main` — and the push that merges a Version Packages PR's
predecessor — never queue an approval. Approvals are only requested for runs that
will genuinely publish.

### One-time setup (per package)

Each npmjs package needs a Trusted Publisher configured under *Settings →
Trusted publisher*:

| field | value |
| ----- | ----- |
| Provider | GitHub Actions |
| Owner / repository | `midnightntwrk/compact-js` |
| Workflow | `cd.yaml` |
| Environment | `npm-publish-stable` |

The values must match exactly — the OIDC claim carries the workflow *filename*,
so a rename breaks publishing until the publisher config is updated too.

### Re-running a release

Publishing is idempotent. `scripts/release.mjs` checks each package version
against npmjs and skips the ones already there, so re-running CD after a partial
failure publishes only what is missing. This matters because npmjs rejects
republishing an existing version with a `403`, unlike GitHub Packages.

Re-run by dispatching CD manually (Actions → **CD** → *Run workflow*); it takes
the same path as a push to `main`.

One gap to know about: tags are created only for packages that run published. If
a run publishes some packages and then fails — either on a later package or while
tagging — those versions are live but untagged, and a re-run skips them as already
published. Create the missing `<name>@<version>` tags and releases by hand if that
happens.

### Verifying provenance

```sh
npm view @midnight-ntwrk/compact-js@<version> --json | jq '.dist.attestations'
npm audit signatures   # in a project that depends on the package
```

`attestations` is `null` for every version published before this migration.

### Failure modes

| symptom | cause |
| ------- | ----- |
| `403 OIDC token exchange failed` | Repo, workflow filename (`cd.yaml`) or environment does not match the Trusted Publisher config. |
| `404` on publish | Publisher config missing on that package. |
| OIDC never attempted; falls back to token auth | npm older than 11.5.1. CD asserts this before publishing. |
| Publish succeeds, no provenance | `id-token: write` missing on the job, or setup-node wrote an empty `_authToken` into `~/.npmrc` via `always-auth` / `NODE_AUTH_TOKEN`. |
| `403 cannot publish over existing version` | The idempotency probe read the wrong registry. `npm` resolves a scoped name through its `@scope:registry` mapping and **ignores a bare `--registry`**, so the probe pins `--@midnight-ntwrk:registry` explicitly. |

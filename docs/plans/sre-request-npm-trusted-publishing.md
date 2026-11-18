# SRE request — Trusted Publishing for compact-js to npmjs

**Repo:** `midnightntwrk/compact-js`
**Goal:** publish the three compact-js packages directly to npmjs from our own CD, with
Trusted Publishing (OIDC, no long-lived token) and provenance — bypassing the manual
`midnight-ntwrk/artifacts` → `push-npm-package.yml` mirror.

**Precedent:** this is already working in the same npmjs org for the wallet SDK.
`@midnightntwrk/wallet-sdk@2.0.1` shows `_npmUser: "GitHub Actions"` and a SLSA provenance
attestation, published from `midnightntwrk/midnight-wallet` (`.github/workflows/cd.yml`),
gated on an environment also named `npm-publish-stable`. We are asking for the same shape.

---

## 1. GitHub Environment

In **`midnightntwrk/compact-js`** → Settings → Environments:

| Setting | Value |
| --- | --- |
| Name | **`npm-publish-stable`** (exact — the Trusted Publisher config must match) |
| Required reviewers | TBC — whoever should approve a public release |
| Deployment branches | **`main` only** (CD does not run anywhere else) |
| Wait timer | 0 |
| Allow self-review | Your call; with a single reviewer it must be allowed or nothing can be approved |

Requested because repository admin is needed and the team has `write`. API equivalent:

```sh
gh api -X PUT repos/midnightntwrk/compact-js/environments/npm-publish-stable \
  -f wait_timer=0 -F prevent_self_review=false \
  -f 'reviewers[][type]=User' -F 'reviewers[][id]=<user-id>' \
  -F 'deployment_branch_policy[protected_branches]=false' \
  -F 'deployment_branch_policy[custom_branch_policies]=true'
```

(then add `main` to the environment's branch policy)

---

## 2. npmjs Trusted Publisher — three packages

The **`@midnightntwrk` org is already claimed** (`ledger-v9`, `ledger-v8`,
`onchain-runtime-v4`, `wallet-sdk` all live there). These three do **not** exist yet:

| Package | npmjs status |
| --- | --- |
| `@midnightntwrk/compact-js` | **404 — new** |
| `@midnightntwrk/compact-js-node` | **404 — new** |
| `@midnightntwrk/compact-js-command` | **404 — new** |

For each, configure a Trusted Publisher with:

| Field | Value |
| --- | --- |
| Provider | GitHub Actions |
| Organization / repository | `midnightntwrk/compact-js` |
| Workflow filename | **`cd.yaml`** |
| Environment | **`npm-publish-stable`** |

> The workflow filename must match **exactly**. Ours is `cd.yaml`, *not*
> `cd-compact-js.yaml` as in the midnight-sdk monorepo — a mismatch fails with
> `403 OIDC token exchange failed`, and a missing or expired config fails with `404`.

### The one thing that needs a decision: these are new packages

npm normally attaches a Trusted Publisher to an **existing** package. For a package that
does not exist yet, either:

- **(a) Pending publisher** — npm supports configuring a trusted publisher before the first
  publish. Note this **expires if unused** (~30 days), so it wants to be timed near our
  merge; or
- **(b) Seed publish** — publish `0.0.0` (or the real first version) once by another means,
  then attach the Trusted Publisher and let OIDC take over.

Please advise which you prefer — it changes our sequencing, not our workflow.

### Also worth confirming

- Whether the `@midnightntwrk` org has **"Require two-factor authentication"** or
  **"Require trusted publishing"** set, and whether enabling the latter on these packages
  would affect anything else.
- Whether `ntwrk-bot` should retain maintainer access to these packages once OIDC is live.

---

## 3. What happens to the existing `@midnight-ntwrk` packages

`@midnight-ntwrk/compact-js{,-node,-command}` are on npmjs at `3.0.2`, published by
`ntwrk-bot` via the `artifacts` mirror. Once we publish under the new scope we would stop
feeding that path. Decision needed on whether they are:

- frozen at `3.0.2` as-is, or
- given a final `npm deprecate "moved to @midnightntwrk/compact-js"`.

Either way the `artifacts` mirror should stop being dispatched for these three libraries.

---

## 4. What we change on our side (no SRE involvement)

- Rename the three packages to `@midnightntwrk/*`.
- `cd.yaml` publish job: `registry-url: https://registry.npmjs.org`,
  `scope: '@midnightntwrk'`, `permissions: id-token: write`,
  `NPM_CONFIG_PROVENANCE: 'true'`, `environment: npm-publish-stable`.
- **No** `NODE_AUTH_TOKEN` and **no** `always-auth` on that step — a token in the
  environment shadows OIDC, and `always-auth` writes an empty `_authToken` line into
  `~/.npmrc`, which is the usual reason OIDC is silently never attempted.
- `npm install -g npm@latest` before publishing: Trusted Publishing needs **npm ≥ 11.5.1**
  and our `.nvmrc`'s bundled npm is older.
- Drop `packages: write` / `MIDNIGHTCI_PACKAGES_WRITE` from the publish path.

Installing our *upstream* `@midnight-ntwrk` dependencies is unaffected and still needs its
token — that is a separate piece of work (#56).

---

## Summary of asks

1. Create the `npm-publish-stable` environment in `midnightntwrk/compact-js`, `main`-only,
   with required reviewers.
2. Configure Trusted Publishers on the three (new) `@midnightntwrk` packages →
   `midnightntwrk/compact-js`, workflow `cd.yaml`, environment `npm-publish-stable`.
3. Tell us whether to use the pending-publisher flow or a seed publish.
4. Decide the fate of the three existing `@midnight-ntwrk` packages.

# compact-js QA Test Execution and Report Summary — 3.0.2

## Overview

| Field | Value |
|---|---|
| Date | 17 November 2026 |
| QA Contact | Giuseppe Salvatore (giuseppe.salvatore@shielded.io) |
| compact-js version | 3.0.2 (`@midnight-ntwrk/compact-js`, `compact-js-node`, `compact-js-command`) |
| Source | tag `compact-js-v3.0.2`, commit `a2a00d1e47aadf1710d5e451db07d35b6a5f5003` |
| Build run | CD [run 44060643851](https://github.com/midnightntwrk/compact-js/actions/runs/44060643851) (17 November 2026). GitHub deletes its logs and artifacts on 2027-02-15; the raw log and coverage report are kept in `ci-build-run/`. |
| compactc / compact runtime | 0.36.1 / 0.21.0 (ledger 9 era); 0.31.1 / 0.16.0 (ledger 8 era) |
| Ledger bindings | `@midnightntwrk/ledger-v9` 1.0.2, `@midnightntwrk/onchain-runtime-v4` 4.0.2, `@midnightntwrk/ledger-v8` 8.1.3 |
| QA Sign-off | ✅ Approved |

compact-js is a library, so its tests are unit, type and integration tests run in CI. It is not
tested against a deployed network.

## Test Execution Summary

Two runs are recorded. Both pass with the same counts.

| Package | Ledger era | Runner | Passed | Failed | Skipped | Total |
| --- | :---: | --- | ---: | ---: | ---: | ---: |
| `compact-js` | 9 | vitest | 236 | 0 | 0 | 236 |
| `compact-js` | 9 | tstyche (types) | 91 | 0 | 0 | 91 |
| `compact-js` | 8 | vitest | 42 | 0 | 0 | 42 |
| `compact-js-node` | 9 | vitest | 20 | 0 | 0 | 20 |
| `compact-js-command` | 9 | vitest | 127 | 0 | 0 | 127 |
| `compact-js-command` | 8 | vitest | 3 | 0 | 0 | 3 |
| **Total** | | | **519** | **0** | **0** | **519** |

| Run | What it is | Evidence |
|---|---|---|
| **CI build run** | The CD run that built, tested and published the 3.0.2 packages. Its tarballs are byte-identical to the ones on npm. | [`ci-build-run/test-job.raw.log.gz`](ci-build-run/test-job.raw.log.gz) (the test job log, unedited), [`ci-build-run/test-step.log`](ci-build-run/test-step.log) (readable excerpt of the "Run tests" step), [`ci-build-run/coverage-report-compact-js.zip`](ci-build-run/coverage-report-compact-js.zip), [`ci-build-run/package-integrity.md`](ci-build-run/package-integrity.md) |
| **Local re-run** | The same commands run again at the tag in Docker `node:24.18.0-bookworm`, with junit output kept. Not the run that built the packages. | [`local-rerun/compact-js-test-report.md`](local-rerun/compact-js-test-report.md), [`local-rerun/junit/`](local-rerun/junit/), [`local-rerun/rerun.log`](local-rerun/rerun.log) |

Line coverage reported by the CI build run: `compact-js-node` 64.44%, `compact-js` 84.91%,
`compact-js-command` 89.23%. The HTML coverage report is the run's `Coverage Report compact-js`
artifact, kept unchanged as
[`ci-build-run/coverage-report-compact-js.zip`](ci-build-run/coverage-report-compact-js.zip)
(sha256 `82cfc11319797cf6636671f8095f1422f556f75f01d9019389cc938aada84468`, the digest GitHub
reports for the artifact).

## Why a re-run

The CI writes junit and HTML reports to each package's `reports/report/` folder but does not
upload them, and it keeps run logs and artifacts only until 2027-02-15. The re-run gives a
structured junit record, and this folder keeps the build run's output after GitHub deletes it.
The ledger 8 vitest configs use only the default reporter, so the re-run ran them a second time
with a junit reporter (the last part of [`local-rerun/rerun.log`](local-rerun/rerun.log)).

## Gaps

- **Token needed to install.** `.yarnrc.yml` routes the `@midnight-ntwrk` scope to
  `npm.pkg.github.com` and `yarn.lock` has `npm.pkg.github.com` archive URLs, so `yarn install`
  without a token fails with `Invalid authentication (as an anonymous user)`. The re-run used a
  personal GitHub token with `read:packages`, passed only as an environment variable. The fix is
  tracked in [#56](https://github.com/midnightntwrk/compact-js/issues/56).
- **tstyche has no junit output.** The 91 type tests are counted from the logs only.
- **Raw and edited logs.** [`ci-build-run/test-job.raw.log.gz`](ci-build-run/test-job.raw.log.gz)
  is the test job log exactly as GitHub returns it (`gh api
  repos/midnightntwrk/compact-js/actions/jobs/133961363968/logs`; sha256 of the uncompressed
  log `69cb1eaa3a05a4da3bbaf1b7da05171463949f87bd77e71fce7c0e2c06aecfa1`). GitHub's own `***`
  masks are the only redaction. `ci-build-run/test-step.log` is a readable excerpt of it:
  timestamps, ANSI colour codes and the `env:` block removed, runner path prefix
  (`/home/runner/work/compact-js/compact-js/`) cut. `local-rerun/rerun.log` has ANSI codes and
  the local worktree path removed. Results are unchanged in every file.
- **Evidence lives in git, not on the release.** CD does not upload test reports, logs or
  coverage anywhere permanent, so this folder is the lasting copy.

## Test Execution Guide

From the repository root at tag `compact-js-v3.0.2`, with a token that can read
`@midnight-ntwrk` packages from `npm.pkg.github.com`:

```bash
yarn config set 'npmScopes.midnight-ntwrk.npmAuthToken' "$GITHUB_TOKEN" -H
set -a; . .github/env/global.env; set +a
yarn install
yarn build --cache-dir ./turbo
yarn lint
GITHUB_TOKEN=$GITHUB_TOKEN yarn test --concurrency 1 --cache-dir ./turbo

# ledger 8 era with junit output
(cd compact-js && npx vitest run --config vitest.era8.config.ts \
  --reporter=default --reporter=junit --outputFile.junit=reports/report/test-report-era8.xml)
(cd compact-js-command && npx vitest run --config vitest.era8.config.ts \
  --reporter=default --reporter=junit --outputFile.junit=reports/report/test-report-era8.xml)
```

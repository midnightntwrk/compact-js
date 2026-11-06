# compact-js QA Test Execution and Report Summary — 3.0.0

## Overview

| Field | Value |
|---|---|
| Date | 6 November 2026 |
| QA Contact | Giuseppe Salvatore (giuseppe.salvatore@shielded.io) |
| compact-js version | 3.0.0 (`@midnight-ntwrk/compact-js`, `compact-js-node`, `compact-js-command`) |
| Source | tag `compact-js-v3.0.0`, commit `5b35fccae3d775d4f0b597d0dc8d83750d200d0c` |
| Build run | CD [run 42076462064](https://github.com/midnightntwrk/compact-js/actions/runs/42076462064) (5 November 2026) |
| compactc / compact runtime | 0.36.0 / 0.21.0 (ledger 9 era); 0.31.1 / 0.16.0 (ledger 8 era) |
| Ledger bindings | `@midnightntwrk/ledger-v9` 1.0.0, `@midnightntwrk/ledger-v8` 8.1.3 |
| QA Sign-off | ✅ |

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
| **CI build run** | The CD run that built, tested and published the 3.0.0 packages. Its tarballs are byte-identical to the ones on npm. | [`ci-build-run/test-step.log`](ci-build-run/test-step.log) (the "Run tests" step output), [`ci-build-run/package-integrity.md`](ci-build-run/package-integrity.md) |
| **Local re-run** | The same commands run again on the tag in Docker `node:24.18.0`, with junit output kept. Not the run that built the packages. | [`local-rerun/compact-js-test-report.md`](local-rerun/compact-js-test-report.md), [`local-rerun/junit/`](local-rerun/junit/), [`local-rerun/rerun.log`](local-rerun/rerun.log) |

Line coverage reported by the CI build run: `compact-js-node` 64.44%, `compact-js` 84.91%,
`compact-js-command` 89.23%. The HTML coverage report is the run's `Coverage Report compact-js`
artifact.

## Why a re-run

The CI writes junit and HTML reports to each package's `reports/report/` folder but does not
upload them, and it keeps run logs and artifacts only until 2027-02-03. The re-run gives a
structured junit record, and this folder keeps the build run's output after GitHub deletes it.
The ledger 8 vitest configs use only the default reporter, so the re-run ran them a second time
with a junit reporter ([`local-rerun/rerun-era8-junit.log`](local-rerun/rerun-era8-junit.log)).

## Test Execution Guide

From the repository root at tag `compact-js-v3.0.0`, with a token that can read
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

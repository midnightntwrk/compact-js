# Package integrity — compact-js 3.0.0

This file links the published npm packages to the CI run whose tests are recorded in
[`test-step.log`](test-step.log).

## Build run

| Field | Value |
| --- | --- |
| Workflow | CD (`.github/workflows/cd.yaml`), manual `workflow_dispatch` on `main` |
| Run | [42076462064](https://github.com/midnightntwrk/compact-js/actions/runs/42076462064) |
| Test job | [Build, Lint and Test](https://github.com/midnightntwrk/compact-js/actions/runs/42076462064/job/127417851120) |
| Publish job | [Publish Packages](https://github.com/midnightntwrk/compact-js/actions/runs/42076462064/job/127420122503) |
| Commit | `5b35fccae3d775d4f0b597d0dc8d83750d200d0c` (tag `compact-js-v3.0.0`) |
| "Run tests" step | 2026-11-05 17:39:24 to 17:40:55 UTC |
| Packages archived | 2026-11-05 17:41:31 UTC (artifact `Packages compact-js`) |
| Published | 2026-11-05 17:41:54 UTC to npm.pkg.github.com; 17:45:42 UTC on registry.npmjs.org |

## Tarball hashes

The `Packages compact-js` artifact of the run was downloaded and each tarball hashed.

| Package | sha512 (artifact) | Matches registry.npmjs.org `dist.integrity` |
| --- | --- | --- |
| `@midnight-ntwrk/compact-js@3.0.0` | `sha512-W7uZjICxfVDQJeeNpLYEIey93yuujFlK2377Eo7VrNLTUKp/CVpV8cs1ytyICHhkC8LYtFZMYVZ0ddCS9pXYPQ==` | ✓ (also 233 of 233 files identical after unpacking) |
| `@midnight-ntwrk/compact-js-node@3.0.0` | `sha512-rAVb90kD7mnAwu9VMM2XAHG3CepxdmY60QVR+DyqZX6e6ga9WH7wbKactFpjNj/f30HaugCezbDJ06HeyNYn+A==` | ✓ |
| `@midnight-ntwrk/compact-js-command@3.0.0` | `sha512-FbcSjKVs2tjhsN2IJicHN4PDmwKEgBNgjTsoltzVYHGctAzl87t00QXST4ClVL1XyW4kDG3wfkCKfSrJcEODSw==` | ✓ |

## How to re-check

```bash
npm view @midnight-ntwrk/compact-js@3.0.0 dist.integrity
gh run download 42076462064 -R midnightntwrk/compact-js -n "Packages compact-js"
unzip compact-js-3.0.0.zip
openssl dgst -sha512 -binary midnight-ntwrk-compact-js-3.0.0.tgz | base64 -w0
```

The run's artifacts and logs are kept by GitHub Actions until 2027-02-03. This folder keeps
the test output so the evidence outlives them.

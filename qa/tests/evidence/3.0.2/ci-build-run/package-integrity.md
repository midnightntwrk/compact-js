# Package integrity — compact-js 3.0.2

This file links the published npm packages to the CI run whose tests are recorded in
[`test-step.log`](test-step.log).

## Build run

| Field | Value |
| --- | --- |
| Workflow | CD (`.github/workflows/cd.yaml`), manual `workflow_dispatch` on `main` |
| Run | [44060643851](https://github.com/midnightntwrk/compact-js/actions/runs/44060643851) |
| Test job | [Build, Lint and Test](https://github.com/midnightntwrk/compact-js/actions/runs/44060643851/job/133961363968) |
| Publish job | [Publish Packages](https://github.com/midnightntwrk/compact-js/actions/runs/44060643851/job/133962915444) |
| Commit | `a2a00d1e47aadf1710d5e451db07d35b6a5f5003` (tag `compact-js-v3.0.2`) |
| "Run tests" step | 2026-11-17 10:00:57 to 10:02:06 UTC |
| Packages archived | 2026-11-17 10:02:31 UTC (artifact `Packages compact-js`) |
| Published | 2026-11-17 10:02:45 to 10:02:47 UTC to npm.pkg.github.com; 10:09:23 to 10:11:30 UTC on registry.npmjs.org |

## Tarball hashes

Method: the run kept the packed tarballs as an artifact. The `Packages compact-js` artifact
was downloaded, each tarball hashed, and compared with registry.npmjs.org. The tarballs from
`npm pack @midnight-ntwrk/<pkg>@3.0.2` (registry.npmjs.org) are also byte-identical to the
artifact tarballs. The publish job log prints the same integrity values (`npm notice integrity:`).

| Package | sha512 (artifact) | Matches registry.npmjs.org `dist.integrity` |
| --- | --- | --- |
| `@midnight-ntwrk/compact-js@3.0.2` | `sha512-QBngS83B/pg4qfh+AHMuQB8S7SFBvcTtCTPSvs9PsUngDT/LTv+BrVer9SR9F9k/bNd1IiXdrohdg0KHP4+kZg==` | ✓ (byte-identical, 233 files) |
| `@midnight-ntwrk/compact-js-node@3.0.2` | `sha512-l3f8DKGIhblhd7E9yYUgW617rncN6piErt5/k2C0k9gvQ1Vre8KO3nDkZzXiE6lpHjNxCaCFBMT6w/5hBgbgMw==` | ✓ (byte-identical, 29 files) |
| `@midnight-ntwrk/compact-js-command@3.0.2` | `sha512-gRhv4Hr9u3Jq1Uv562iSpnuxdhq7+rw9Ktxo2i4kaH2qAXLCBnGmeR0796wvi6Z2VQCiKkCL/JRTsUd1w1xdlw==` | ✓ (byte-identical, 102 files) |

## How to re-check

```bash
npm view @midnight-ntwrk/compact-js@3.0.2 dist.integrity
gh run download 44060643851 -R midnightntwrk/compact-js -n "Packages compact-js"
unzip compact-js-3.0.2.zip
openssl dgst -sha512 -binary midnight-ntwrk-compact-js-3.0.2.tgz | base64 -w0
npm pack @midnight-ntwrk/compact-js@3.0.2 --pack-destination npmjs/
cmp npmjs/midnight-ntwrk-compact-js-3.0.2.tgz midnight-ntwrk-compact-js-3.0.2.tgz
```

The run's artifacts and logs are kept by GitHub Actions until 2027-02-15. This folder keeps
the test output so the evidence outlives them.

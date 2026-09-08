---
'@midnight-ntwrk/compact-js': major
'@midnight-ntwrk/compact-js-node': patch
'@midnight-ntwrk/compact-js-command': patch
---

Remove the CommonJS build. The packages are now published as ESM only: the `build-cjs`
step and its `tsconfig.cjs.json` are gone, no `dist/cjs` output is produced, and the
published manifests no longer reference `./dist/cjs/*.js` — neither the `main` entry
point nor the `exports` conditions. Each export now resolves to its ESM file, so
`require('@midnight-ntwrk/compact-js')` either loads it via Node's `require(esm)`
support or fails with `ERR_REQUIRE_ESM`. Consumers still on `require` should switch
to an ESM `import`.
